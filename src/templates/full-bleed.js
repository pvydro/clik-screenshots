import { drawBackground, drawGradientFade } from '../composite/background.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { drawParticles, applyVignette, applyNoiseGrain } from '../composite/effects.js';
import { hashString } from '../composite/draw-utils.js';
import { renderLayers } from '../composite/layers.js';
import { resolveLayout } from './defaults.js';
import sharp from 'sharp';

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };
  const layout = resolveLayout('full-bleed', scene.layout);

  // 1. Draw screenshot filling entire canvas
  const resized = await sharp(screenshotBuffer)
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('canvas');
  const img = await loadImage(resized);
  ctx.drawImage(img, 0, 0, width, height);

  // 2. Gradient fade at bottom for text readability
  const fadeStart = height * (layout.fadeStart || 0.65);
  const bgColor = theme.backgroundColor || '#0a0a0f';
  drawGradientFade(ctx, width, height, fadeStart, bgColor, 'up');

  // 3. Particles over the fade area
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 4. Text
  const maxTextWidth = width * layout.text.maxWidth;
  const textX = width * layout.text.x;
  let textY = height * layout.text.y;

  const headlineHeight = drawHeadline(
    ctx, scene.headline, textX, textY, maxTextWidth, theme, width, canvas, layout.text.align
  );
  textY += headlineHeight + height * layout.text.gap;

  drawSubhead(
    ctx, scene.subhead, textX, textY, maxTextWidth, theme, width, canvas, layout.text.align
  );

  renderLayers(ctx, width, height, scene.layers);

  applyVignette(ctx, width, height, effects);
  applyNoiseGrain(ctx, width, height, effects);
}
