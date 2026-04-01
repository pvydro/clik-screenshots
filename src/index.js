import fs from 'fs';
import path from 'path';
import { resolveSizes } from './sizes.js';
import { startServer, stopServer } from './capture/server.js';
import { captureScenes } from './capture/puppeteer.js';
import { compositeAll } from './composite/engine.js';
import { clikAdapter } from './adapters/clik.js';
import { ensureDir } from './utils.js';

export async function generate(config, options = {}) {
  const { sceneFilter, sizeFilter, mode = 'both' } = options;

  // Resolve sizes
  let sizes = resolveSizes(config.sizes);
  if (sizeFilter) {
    sizes = sizes.filter(s => s.id === sizeFilter);
    if (sizes.length === 0) throw new Error(`Size not found: "${sizeFilter}"`);
  }

  // Filter scenes
  let scenes = config.scenes;
  if (sceneFilter) {
    scenes = scenes.filter(s => s.id === sceneFilter);
    if (scenes.length === 0) throw new Error(`Scene not found: "${sceneFilter}"`);
  }

  console.log(`\n  clik-screenshots`);
  console.log(`  ─────────────────`);
  console.log(`  Scenes: ${scenes.map(s => s.id).join(', ')}`);
  console.log(`  Sizes:  ${sizes.map(s => s.id).join(', ')}`);
  console.log(`  Mode:   ${mode}\n`);

  // Start game server
  const serverChild = await startServer(config.serve);

  try {
    // Detect adapter
    let adapter = null;
    const hasClikScenes = scenes.some(s => s.adapter === 'clik');
    if (hasClikScenes) {
      adapter = clikAdapter;
      console.log('  Using clik-engine adapter\n');
    }

    // Phase 1: Capture raw screenshots
    console.log('  Phase 1: Capturing game screenshots');
    const captures = await captureScenes(config, scenes, sizes, adapter);

    // Save clean captures if requested
    if (mode === 'clean' || mode === 'both') {
      const cleanDir = path.join(config.outputDir || './screenshots', 'clean');
      ensureDir(cleanDir);

      for (const capture of captures) {
        const filename = `${capture.sceneId}_${capture.sizeId}.png`;
        const outputPath = path.join(cleanDir, filename);
        fs.writeFileSync(outputPath, capture.buffer);
        console.log(`    Clean: ${filename}`);
      }
    }

    // Phase 2: Composite marketing screenshots
    let compositedResults = [];
    if (mode === 'composited' || mode === 'both') {
      console.log('\n  Phase 2: Compositing marketing screenshots');
      compositedResults = await compositeAll(captures, config);
    }

    // Report
    console.log('\n  ─────────────────');
    console.log('  Done!\n');

    const totalCaptures = captures.length;
    if (mode === 'clean' || mode === 'both') {
      console.log(`  Clean screenshots: ${totalCaptures}`);
    }
    if (mode === 'composited' || mode === 'both') {
      console.log(`  Composited screenshots: ${compositedResults.length}`);
    }
    console.log(`  Output: ${path.resolve(config.outputDir || './screenshots')}\n`);

    return { captures, composited: compositedResults };

  } finally {
    stopServer(serverChild);
  }
}
