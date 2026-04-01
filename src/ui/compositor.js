import { createCanvas } from 'canvas';
import { resolveLayout } from '../composite/layout.js';
import { loadFont } from '../composite/text-renderer.js';

let fontLoaded = false;

export async function ensureFonts(theme) {
  if (!fontLoaded) {
    await loadFont(theme);
    fontLoaded = true;
  }
}

export async function compositePreview(captureBuffer, scene, theme, targetSize, previewScale = 0.4) {
  const width = Math.round(targetSize.width * previewScale);
  const height = Math.round(targetSize.height * previewScale);

  const template = resolveLayout(scene, { width, height }, theme);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  await template.render(ctx, canvas, captureBuffer, scene, theme, { width, height });

  return canvas.toBuffer('image/png');
}

export async function compositeExport(captureBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;

  const template = resolveLayout(scene, { width, height }, theme);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  await template.render(ctx, canvas, captureBuffer, scene, theme, { width, height });

  return canvas.toBuffer('image/png');
}
