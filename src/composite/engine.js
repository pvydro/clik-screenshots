import { createCanvas } from 'canvas';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { resolveLayout } from './layout.js';
import { loadFont } from './text-renderer.js';
import { ensureDir } from '../utils.js';

export async function compositeAll(captures, config) {
  const outputDir = path.resolve(config.outputDir || './screenshots');
  const compositedDir = path.join(outputDir, 'composited');
  ensureDir(compositedDir);

  // Load fonts once
  await loadFont(config.theme);

  const results = [];

  for (const capture of captures) {
    const { sceneId, sizeId, width, height, buffer, scene } = capture;

    // Merge theme with per-scene overrides
    const theme = mergeTheme(config.theme, scene.overrides);

    // Get template
    const template = resolveLayout(scene, { width, height }, theme);

    console.log(`    Compositing: ${sceneId} @ ${sizeId}`);

    // Create output canvas at target size
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Render template
    await template.render(ctx, canvas, buffer, scene, theme, { width, height });

    // Export as PNG
    const filename = `${sceneId}_${sizeId}.png`;
    const outputPath = path.join(compositedDir, filename);
    const pngBuffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, pngBuffer);

    results.push({
      sceneId,
      sizeId,
      path: outputPath,
      width,
      height,
      size: pngBuffer.length,
    });

    console.log(`      ✓ ${filename} (${width}×${height}, ${formatSize(pngBuffer.length)})`);
  }

  return results;
}

function mergeTheme(base, overrides) {
  if (!overrides) return base;
  const merged = { ...base, ...overrides };
  if (overrides.effects) {
    merged.effects = { ...base.effects, ...overrides.effects };
  }
  return merged;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
