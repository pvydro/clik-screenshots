import { drawSubhead } from '../composite/text-renderer.js';
import { drawBackgroundBanners } from '../composite/background.js';
import { drawFloatingShapes, applyBackgroundBlur } from '../composite/effects.js';
import { hashString } from '../composite/draw-utils.js';
import { renderLayers } from '../composite/layers.js';
import { resolveLayout } from './defaults.js';
import sharp from 'sharp';

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };
  const layout = resolveLayout('minimal', scene.layout);

  // 1. Draw screenshot filling entire canvas
  const resized = await sharp(screenshotBuffer)
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('@napi-rs/canvas');
  const img = await loadImage(resized);
  ctx.drawImage(img, 0, 0, width, height);

  // Background overlays
  drawBackgroundBanners(ctx, width, height, theme.backgroundBanners);
  drawFloatingShapes(ctx, width, height, effects, hashString(scene.id) + 7);
  await applyBackgroundBlur(ctx, canvas, effects);

  // 2. Optional subtle text at bottom
  if (scene.headline || scene.subhead) {
    const stripHeight = height * (layout.stripHeight || 0.06);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, height - stripHeight, width, stripHeight);

    const text = scene.headline || scene.subhead;
    const maxTextWidth = width * layout.text.maxWidth;
    drawSubhead(
      ctx, text, width * layout.text.x, height - stripHeight + stripHeight * 0.2,
      maxTextWidth,
      { ...theme, subheadColor: 'rgba(255,255,255,0.8)', subheadSize: 28 },
      width, canvas, layout.text.align
    );
  }

  renderLayers(ctx, width, height, scene.layers);
}
