import { drawBackground } from '../composite/background.js';
import { calculateFrameDimensions, drawDeviceFrame } from '../composite/device-frame.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { applyDropShadow, applyGlow, drawParticles, applyVignette, applyNoiseGrain } from '../composite/effects.js';
import { drawScreenshot, hashString, applyDeviceTransform } from '../composite/draw-utils.js';
import { renderLayers } from '../composite/layers.js';
import { resolveLayout } from './defaults.js';

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };
  const layout = resolveLayout('side-by-side', scene.layout);

  // 1. Background
  drawBackground(ctx, width, height, theme);
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 2. Text
  const textAreaHeight = height * layout.textAreaHeight;
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

  // 3. Two device frames side by side
  const frameStyle = theme.frameStyle === 'none' ? 'modern' : theme.frameStyle;
  const halfWidth = width * 0.42;
  const dims = calculateFrameDimensions(halfWidth, height * 0.7, frameStyle, textAreaHeight, {
    scale: layout.device?.scale ?? 1.0,
  });

  const gap = width * (layout.deviceGap || 0.04);
  const totalDeviceWidth = dims.outerWidth * 2 + gap;
  const startX = Math.round((width - totalDeviceWidth) / 2);
  const deviceY = Math.round(textAreaHeight + (height - textAreaHeight - dims.outerHeight) / 2);

  const rotation = layout.device?.rotation || 0;

  // Left device
  const leftX = startX;
  const leftCenterX = leftX + dims.outerWidth / 2;
  const leftCenterY = deviceY + dims.outerHeight / 2;

  let hasRot = applyDeviceTransform(ctx, leftCenterX, leftCenterY, rotation);
  applyDropShadow(ctx, leftX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  const leftScreen = drawDeviceFrame(ctx, leftX, deviceY, dims, theme);
  await drawScreenshot(ctx, screenshotBuffer, leftScreen);
  applyGlow(ctx, leftX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  if (hasRot) ctx.restore();

  // Right device (same screenshot if no secondary)
  const rightX = startX + dims.outerWidth + gap;
  const rightCenterX = rightX + dims.outerWidth / 2;
  const rightCenterY = deviceY + dims.outerHeight / 2;

  hasRot = applyDeviceTransform(ctx, rightCenterX, rightCenterY, rotation);
  applyDropShadow(ctx, rightX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  const rightScreen = drawDeviceFrame(ctx, rightX, deviceY, dims, theme);
  await drawScreenshot(ctx, screenshotBuffer, rightScreen);
  applyGlow(ctx, rightX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  if (hasRot) ctx.restore();

  renderLayers(ctx, width, height, scene.layers);

  applyVignette(ctx, width, height, effects);
  applyNoiseGrain(ctx, width, height, effects);
}
