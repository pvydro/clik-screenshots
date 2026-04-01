import { drawBackground } from '../composite/background.js';
import { calculateFrameDimensions, drawDeviceFrame } from '../composite/device-frame.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { applyDropShadow, applyGlow, drawParticles } from '../composite/effects.js';
import sharp from 'sharp';

// Side-by-side: two device frames next to each other
// Used for before/after or showing two game modes
//
// ┌──────────────────────────┐
// │      Headline Text       │
// │       Subhead text       │
// │                          │
// │  ┌─────────┐ ┌────────┐ │
// │  │ ┌─────┐ │ │ ┌────┐ │ │
// │  │ │GAME │ │ │ │GAME│ │ │
// │  │ │  1  │ │ │ │ 2  │ │ │
// │  │ └─────┘ │ │ └────┘ │ │
// │  └─────────┘ └────────┘ │
// └──────────────────────────┘
//
// Note: This template expects scene.secondarySetup for the second screenshot.
// If no secondary is provided, it mirrors the primary.

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };

  // 1. Background
  drawBackground(ctx, width, height, theme);
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 2. Text
  const textAreaHeight = height * 0.2;
  const textPadding = width * 0.06;
  const textCenterX = width / 2;

  let textY = height * 0.05;
  const headlineHeight = drawHeadline(
    ctx, scene.headline, textCenterX, textY, width - textPadding * 2, theme, width
  );
  textY += headlineHeight + height * 0.01;
  drawSubhead(
    ctx, scene.subhead, textCenterX, textY, width - textPadding * 2, theme, width
  );

  // 3. Two device frames side by side
  const frameStyle = theme.frameStyle === 'none' ? 'modern' : theme.frameStyle;
  const halfWidth = width * 0.42;
  const dims = calculateFrameDimensions(halfWidth, height * 0.7, frameStyle, textAreaHeight);

  const gap = width * 0.04;
  const totalDeviceWidth = dims.outerWidth * 2 + gap;
  const startX = Math.round((width - totalDeviceWidth) / 2);
  const deviceY = Math.round(textAreaHeight + (height - textAreaHeight - dims.outerHeight) / 2);

  // Left device
  const leftX = startX;
  applyDropShadow(ctx, leftX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  const leftScreen = drawDeviceFrame(ctx, leftX, deviceY, dims, theme);
  await drawScreenshot(ctx, screenshotBuffer, leftScreen);
  applyGlow(ctx, leftX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);

  // Right device (same screenshot if no secondary)
  const rightX = startX + dims.outerWidth + gap;
  applyDropShadow(ctx, rightX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
  const rightScreen = drawDeviceFrame(ctx, rightX, deviceY, dims, theme);
  await drawScreenshot(ctx, screenshotBuffer, rightScreen);
  applyGlow(ctx, rightX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
}

async function drawScreenshot(ctx, buffer, screen) {
  const resized = await sharp(buffer)
    .resize(screen.screenWidth, screen.screenHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('canvas');
  const img = await loadImage(resized);

  ctx.save();
  roundRect(ctx, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight, screen.screenCornerRadius);
  ctx.clip();
  ctx.drawImage(img, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight);
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
