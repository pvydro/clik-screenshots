import { drawBackground } from '../composite/background.js';
import { calculateFrameDimensions, drawDeviceFrame } from '../composite/device-frame.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { applyDropShadow, applyGlow, drawParticles } from '../composite/effects.js';
import sharp from 'sharp';

// Device with slight perspective rotation and stronger shadow
// Same layout as device-centered but with a canvas rotation transform

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };

  // Stronger shadow for angled view
  const angledEffects = {
    ...effects,
    dropShadow: true,
    shadowBlur: (effects.shadowBlur || 60) * 1.5,
    shadowOffsetY: (effects.shadowOffsetY || 20) * 1.8,
  };

  // 1. Background
  drawBackground(ctx, width, height, theme);

  // 2. Particles
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 3. Text area
  const textAreaHeight = height * 0.22;
  const textPadding = width * 0.08;
  const textCenterX = width / 2;

  let textY = height * 0.06;
  const headlineHeight = drawHeadline(
    ctx, scene.headline, textCenterX, textY, width - textPadding * 2, theme, width
  );
  textY += headlineHeight + height * 0.015;
  drawSubhead(
    ctx, scene.subhead, textCenterX, textY, width - textPadding * 2, theme, width
  );

  // 4. Calculate device (slightly smaller to account for rotation)
  const frameStyle = theme.frameStyle === 'none' ? 'modern' : theme.frameStyle;
  const dims = calculateFrameDimensions(width * 0.9, height * 0.9, frameStyle, textAreaHeight);

  const deviceX = Math.round((width - dims.outerWidth) / 2);
  const deviceY = Math.round(textAreaHeight + (height - textAreaHeight - dims.outerHeight) / 2);

  // 5. Apply rotation
  const angle = -5 * (Math.PI / 180); // -5 degrees
  const centerX = deviceX + dims.outerWidth / 2;
  const centerY = deviceY + dims.outerHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.translate(-centerX, -centerY);

  // 6. Shadow
  applyDropShadow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, angledEffects);

  // 7. Device frame
  const screen = drawDeviceFrame(ctx, deviceX, deviceY, dims, theme);

  // 8. Screenshot
  const resized = await sharp(screenshotBuffer)
    .resize(screen.screenWidth, screen.screenHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('canvas');
  const img = await loadImage(resized);

  roundRect(ctx, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight, screen.screenCornerRadius);
  ctx.clip();
  ctx.drawImage(img, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight);

  ctx.restore();

  // 9. Glow (after restoring transform so it's axis-aligned)
  // Re-apply rotation for glow
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.translate(-centerX, -centerY);
  applyGlow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, angledEffects);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
