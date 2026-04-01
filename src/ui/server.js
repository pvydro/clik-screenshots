import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { runSceneSetup } from '../capture/scene-runner.js';
import { startServer, stopServer } from '../capture/server.js';
import { resolveSizes, SIZES } from '../sizes.js';
import { listTemplates } from '../templates/index.js';
import { ensureFonts, compositePreview, compositeExport } from './compositor.js';
import { ensureDir } from '../utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory capture cache: sceneId → PNG Buffer
const captureCache = new Map();
let captureInProgress = false;

export async function startUI(config, port = 3456) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Serve static UI files
  app.use(express.static(path.join(__dirname, 'public')));

  // Pre-load fonts from initial config (will also reload dynamically on preview)
  await ensureFonts(config.theme);

  // ── API Routes ──

  // GET /api/config — return loaded config for UI initialization
  app.get('/api/config', (req, res) => {
    res.json({
      scenes: config.scenes.map(s => ({
        id: s.id,
        name: s.name || s.id,
        template: s.template || 'device-centered',
        headline: s.headline || '',
        subhead: s.subhead || '',
        overrides: s.overrides || null,
        layout: s.layout || null,
      })),
      theme: config.theme,
      sizes: resolveSizes(config.sizes),
      allSizes: SIZES,
      templates: listTemplates(),
      game: config.game,
    });
  });

  // GET /api/capture/status — which scenes have cached captures
  app.get('/api/capture/status', (req, res) => {
    const status = config.scenes.map(s => ({
      id: s.id,
      cached: captureCache.has(s.id),
      bytes: captureCache.has(s.id) ? captureCache.get(s.id).length : 0,
    }));
    res.json({ scenes: status, inProgress: captureInProgress });
  });

  // POST /api/capture — trigger Puppeteer capture
  app.post('/api/capture', async (req, res) => {
    if (captureInProgress) {
      return res.status(409).json({ error: 'Capture already in progress' });
    }

    captureInProgress = true;
    const sceneFilter = req.query.scene;

    try {
      const scenesToCapture = sceneFilter
        ? config.scenes.filter(s => s.id === sceneFilter)
        : config.scenes;

      if (scenesToCapture.length === 0) {
        return res.status(404).json({ error: `Scene not found: ${sceneFilter}` });
      }

      // Start game server if needed
      const serverChild = await startServer(config.serve);

      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
        });

        const { baseWidth, baseHeight } = config.game;
        const dpr = 4;
        const page = await browser.newPage();
        await page.setViewport({ width: baseWidth, height: baseHeight, deviceScaleFactor: dpr });

        // Inject pre-load scripts (e.g. suppress tutorials) before each page navigation
        if (config.game.preloadScript) {
          await page.evaluateOnNewDocument(config.game.preloadScript);
        }

        for (const scene of scenesToCapture) {
          await page.goto(config.serve.url, { waitUntil: 'networkidle0', timeout: 30000 });
          await page.waitForSelector(config.game.canvasSelector, { timeout: 10000 });
          await page.evaluate(() => document.fonts.ready);
          await new Promise(r => setTimeout(r, 1500));

          if (config.game.muteCommand) {
            await page.evaluate(config.game.muteCommand).catch(() => {});
          }

          await runSceneSetup(page, scene, null);
          await page.evaluate(() => new Promise(r =>
            requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))
          ));
          await new Promise(r => setTimeout(r, 200));

          const canvasEl = await page.$(config.game.canvasSelector);
          const buffer = await canvasEl.screenshot({ type: 'png' });

          captureCache.set(scene.id, buffer);
        }

        await browser.close();
      } finally {
        stopServer(serverChild);
      }

      const results = scenesToCapture.map(s => ({
        id: s.id,
        cached: true,
        bytes: captureCache.get(s.id).length,
      }));

      res.json({ scenes: results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    } finally {
      captureInProgress = false;
    }
  });

  // POST /api/preview — composite and return PNG
  app.post('/api/preview', async (req, res) => {
    const { sceneId, sizeId, previewScale = 0.4, scene, theme } = req.body;

    const buffer = captureCache.get(sceneId);
    if (!buffer) {
      return res.status(404).json({ error: `Scene "${sceneId}" not captured yet. Click Capture first.` });
    }

    const sizes = resolveSizes(config.sizes);
    const targetSize = sizes.find(s => s.id === sizeId) || SIZES.find(s => s.id === sizeId) || SIZES[0];

    try {
      const png = await compositePreview(buffer, scene, theme, targetSize, previewScale);
      res.set('Content-Type', 'image/png');
      res.send(png);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/export — full-res export to disk
  app.post('/api/export', async (req, res) => {
    const { scenes: sceneConfigs, theme, sizes: sizeIds, mode = 'composited' } = req.body;
    const outputDir = path.resolve(config.outputDir || './screenshots');
    const results = [];

    try {
      const sizes = sizeIds
        ? sizeIds.map(id => SIZES.find(s => s.id === id) || resolveSizes(config.sizes).find(s => s.id === id)).filter(Boolean)
        : resolveSizes(config.sizes);

      for (const sceneConfig of sceneConfigs) {
        const buffer = captureCache.get(sceneConfig.id);
        if (!buffer) continue;

        for (const size of sizes) {
          if (mode === 'clean' || mode === 'both') {
            const cleanDir = path.join(outputDir, 'clean');
            ensureDir(cleanDir);
            const filename = `${sceneConfig.id}_${size.id}.png`;
            fs.writeFileSync(path.join(cleanDir, filename), buffer);
            results.push({ type: 'clean', file: filename, width: size.width, height: size.height });
          }

          if (mode === 'composited' || mode === 'both') {
            const compDir = path.join(outputDir, 'composited');
            ensureDir(compDir);
            const filename = `${sceneConfig.id}_${size.id}.png`;
            const png = await compositeExport(buffer, sceneConfig, theme, size);
            fs.writeFileSync(path.join(compDir, filename), png);
            results.push({ type: 'composited', file: filename, width: size.width, height: size.height, bytes: png.length });
          }
        }
      }

      res.json({ outputDir, results });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/templates
  app.get('/api/templates', (req, res) => {
    res.json(listTemplates());
  });

  // GET /api/sizes
  app.get('/api/sizes', (req, res) => {
    res.json(SIZES);
  });

  // Start server
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`\n  clik-screenshots UI`);
      console.log(`  ────────────────────`);
      console.log(`  http://localhost:${port}\n`);
      resolve(server);
    });
  });
}
