import { drawBackground } from '../composite/background.js';
import { calculateFrameDimensions, drawDeviceFrame } from '../composite/device-frame.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { applyDropShadow, applyGlow, drawParticles } from '../composite/effects.js';
import sharp from 'sharp';

// Device centered, headline text above
//
// ┌─────────────────────┐
// │                     │
// │    Headline Text    │
// │     Subhead text    │
// │                     │
// │   ┌─────────────┐   │
// │   │  ┌───────┐  │   │
// │   │  │ GAME  │  │   │
// │   │  │SCREEN │  │   │
// │   │  └───────┘  │   │
// │   └─────────────┘   │
// │                     │
// └─────────────────────┘

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };

  // 1. Background
  drawBackground(ctx, width, height, theme);

  // 2. Particles (behind device)
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 3. Calculate text space
  const textAreaHeight = height * 0.22;
  const textPadding = width * 0.08;
  const textCenterX = width / 2;

  // 4. Draw headline + subhead
  let textY = height * 0.06;
  const headlineHeight = drawHeadline(
    ctx, scene.headline, textCenterX, textY, width - textPadding * 2, theme, width
  );
  textY += headlineHeight + height * 0.015;
  drawSubhead(
    ctx, scene.subhead, textCenterX, textY, width - textPadding * 2, theme, width
  );

  // 5. Calculate device frame dimensions
  const frameStyle = theme.frameStyle === 'none' ? 'modern' : theme.frameStyle;
  const dims = calculateFrameDimensions(width, height, frameStyle, textAreaHeight);

  // Center device horizontally, position below text
  const deviceX = Math.round((width - dims.outerWidth) / 2);
  const deviceY = Math.round(textAreaHeight + (height - textAreaHeight - dims.outerHeight) / 2);

  // 6. Drop shadow (before device)
  applyDropShadow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);

  // 7. Draw device frame
  const screen = drawDeviceFrame(ctx, deviceX, deviceY, dims, theme);

  // 8. Draw screenshot into screen area
  await drawScreenshot(ctx, screenshotBuffer, screen);

  // 9. Glow effect (after device)
  applyGlow(ctx, deviceX, deviceY, dims.outerWidth, dims.outerHeight, dims.cornerRadius, effects);
}

async function drawScreenshot(ctx, buffer, screen) {
  // Resize screenshot to fit screen area using sharp
  const resized = await sharp(buffer)
    .resize(screen.screenWidth, screen.screenHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const { createCanvas, loadImage } = await import('canvas');
  const img = await loadImage(resized);

  // Clip to rounded screen area
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
