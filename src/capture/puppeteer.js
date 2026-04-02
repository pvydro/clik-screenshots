import puppeteer from 'puppeteer';
import { runSceneSetup } from './scene-runner.js';

export async function captureScenes(config, scenes, sizes, adapter) {
  console.log('  Launching browser...');

  const { baseWidth, baseHeight } = config.game;

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
    ],
  });

  const captures = [];

  try {
    const page = await browser.newPage();

    // Use a high deviceScaleFactor to get a sharp capture from the native canvas.
    // The game renders at baseWidth × baseHeight internally; we use DPR to get
    // a higher-resolution capture from Puppeteer's page.screenshot().
    // We capture once per scene (not per size) — sharp handles final sizing.
    const maxTarget = sizes.reduce((max, s) => Math.max(max, s.width, s.height), 0);
    const dpr = Math.min(Math.ceil(maxTarget / Math.min(baseWidth, baseHeight)), 4);

    await page.setViewport({
      width: baseWidth,
      height: baseHeight,
      deviceScaleFactor: dpr,
    });

    console.log(`  Viewport: ${baseWidth}×${baseHeight} @ ${dpr}x DPR (capture: ${baseWidth * dpr}×${baseHeight * dpr})`);

    // Inject pre-load scripts (e.g. suppress tutorials) before each page navigation
    if (config.game.preloadScript) {
      await page.evaluateOnNewDocument(config.game.preloadScript);
    }

    for (const scene of scenes) {
      console.log(`\n  Capturing: ${scene.name || scene.id}`);

      // Navigate fresh for each scene
      await page.goto(config.serve.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForSelector(config.game.canvasSelector, { timeout: 10000 });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Additional wait for game to initialize (BootScene → MenuScene transition)
      await new Promise(r => setTimeout(r, 1500));

      // Mute audio
      if (config.game.muteCommand) {
        await page.evaluate(config.game.muteCommand).catch(() => {});
      }

      // Run scene setup actions
      await runSceneSetup(page, scene, adapter);

      // Wait for rendering to settle
      await page.evaluate(() => new Promise(r => {
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)));
      }));
      await new Promise(r => setTimeout(r, 200));

      // Capture the canvas element at high DPR via Puppeteer screenshot
      const canvasElement = await page.$(config.game.canvasSelector);
      if (!canvasElement) throw new Error('Canvas element not found');

      const buffer = await canvasElement.screenshot({ type: 'png' });

      console.log(`    ✓ Captured ${buffer.length} bytes (${baseWidth * dpr}×${baseHeight * dpr})`);

      // Capture second screenshot for side-by-side right device
      let rightBuffer = null;
      if (scene.setupRight) {
        console.log(`    Capturing right device...`);
        await page.goto(config.serve.url, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector(config.game.canvasSelector, { timeout: 10000 });
        await page.evaluate(() => document.fonts.ready);
        await new Promise(r => setTimeout(r, 1500));
        if (config.game.muteCommand) {
          await page.evaluate(config.game.muteCommand).catch(() => {});
        }
        const rightScene = { ...scene, setup: scene.setupRight };
        await runSceneSetup(page, rightScene, adapter);
        await page.evaluate(() => new Promise(r =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))
        ));
        await new Promise(r => setTimeout(r, 200));
        const canvasEl2 = await page.$(config.game.canvasSelector);
        rightBuffer = await canvasEl2.screenshot({ type: 'png' });
        console.log(`    ✓ Right device: ${rightBuffer.length} bytes`);
      }

      // Produce one capture entry per target size (compositing will resize)
      for (const size of sizes) {
        captures.push({
          sceneId: scene.id,
          sizeId: size.id,
          width: size.width,
          height: size.height,
          buffer,
          rightBuffer,
          scene,
        });
      }
    }
  } finally {
    await browser.close();
    console.log('\n  Browser closed');
  }

  return captures;
}
