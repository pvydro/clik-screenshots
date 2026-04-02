import { drawBackground, drawBackgroundBanners } from '../composite/background.js';
import { calculateFrameDimensions, drawDeviceFrame } from '../composite/device-frame.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { applyDropShadow, applyGlow, applyDeviceOutline, applyInnerGlow, drawParticles, drawFloatingShapes, applyBackgroundBlur, applyVignette, applyNoiseGrain } from '../composite/effects.js';
import { drawScreenshot, hashString, applyDeviceTransform } from '../composite/draw-utils.js';
import { renderLayers } from '../composite/layers.js';
import { resolveLayout } from './defaults.js';

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };
  const layout = resolveLayout('device-angled', scene.layout);

  // Stronger shadow for angled view
  const angledEffects = {
    ...effects,
    dropShadow: true,
    shadowBlur: (effects.shadowBlur || 60) * 1.5,
    shadowOffsetY: (effects.shadowOffsetY || 20) * 1.8,
  };

  // 1. Background
  drawBackground(ctx, width, height, theme);
  drawBackgroundBanners(ctx, width, height, theme.backgroundBanners);

  // 2. Particles & floating shapes
  drawParticles(ctx, width, height, effects, hashString(scene.id));
  drawFloatingShapes(ctx, width, height, effects, hashString(scene.id) + 7);

  // 3. Background blur
  await applyBackgroundBlur(ctx, canvas, effects);

  // 3. Text
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

  // 4. Device (scale controls sizing via calculateFrameDimensions)
  const frameStyle = theme.frameStyle === 'none' ? 'modern' : theme.frameStyle;
  const dims = calculateFrameDimensions(width, height, frameStyle, textAreaHeight, {
    scale: layout.device.scale,
  });

  const deviceCenterX = width * layout.device.x;
  const deviceX = Math.round(deviceCenterX - dims.outerWidth / 2);
  const deviceY = layout.device.y != null
    ? Math.round(height * layout.device.y - dims.outerHeight / 2)
    : Math.round(textAreaHeight + (height - textAreaHeight - dims.outerHeight) / 2);

  // 5. Apply rotation
  const rotation = layout.device.rotation;
  const centerX = deviceX + dims.outerWidth / 2;
  const centerY = deviceY + dims.outerHeight / 2;

  const hasRotation = applyDeviceTransform(ctx, centerX, centerY, rotation);

  // 6. Shadow + frame + screenshot + outline + inner glow
  applyDropShadow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, angledEffects);
  const screen = drawDeviceFrame(ctx, deviceX, deviceY, dims, theme);
  await drawScreenshot(ctx, screenshotBuffer, screen);
  applyDeviceOutline(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  applyInnerGlow(ctx, screen, effects);

  if (hasRotation) ctx.restore();

  // 7. Glow (re-apply rotation)
  const hasRotation2 = applyDeviceTransform(ctx, centerX, centerY, rotation);
  applyGlow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, angledEffects);
  if (hasRotation2) ctx.restore();

  renderLayers(ctx, width, height, scene.layers);
  applyVignette(ctx, width, height, effects);
  applyNoiseGrain(ctx, width, height, effects);
}
