import { createCanvas } from '@napi-rs/canvas';
import { resolveLayout } from '../composite/layout.js';
import { loadThemeFonts } from '../composite/font-loader.js';

let lastFontKey = '';

export async function ensureFonts(theme) {
  const key = buildFontKey(theme);
  if (key !== lastFontKey) {
    await loadThemeFonts(theme);
    lastFontKey = key;
  }
}

function buildFontKey(theme) {
  const parts = [
    theme.fontPreset || '',
    theme.fontFamily || '',
    theme.fontUrl || '',
    theme.headlineFont?.family || '',
    theme.headlineFont?.weight || '',
    theme.subheadFont?.family || '',
    theme.subheadFont?.weight || '',
  ];
  return parts.join('|');
}

export async function compositePreview(captureBuffer, scene, theme, targetSize, previewScale = 0.4, rightBuffer = null) {
  // Ensure fonts are loaded for this theme (handles dynamic changes from UI)
  await ensureFonts(theme);

  const width = Math.round(targetSize.width * previewScale);
  const height = Math.round(targetSize.height * previewScale);

  const template = resolveLayout(scene, { width, height }, theme);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  await template.render(ctx, canvas, captureBuffer, scene, theme, { width, height }, rightBuffer);

  return canvas.toBuffer('image/png');
}

export async function compositeExport(captureBuffer, scene, theme, targetSize, rightBuffer = null) {
  await ensureFonts(theme);

  const { width, height } = targetSize;

  const template = resolveLayout(scene, { width, height }, theme);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  await template.render(ctx, canvas, captureBuffer, scene, theme, { width, height }, rightBuffer);

  return canvas.toBuffer('image/png');
}
