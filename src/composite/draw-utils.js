import sharp from 'sharp';

/**
 * Draw a rounded rectangle path (does NOT fill or stroke — caller does that).
 */
export function roundRect(ctx, x, y, w, h, r) {
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

/**
 * Draw a captured screenshot buffer into a device screen area with clipping.
 */
export async function drawScreenshot(ctx, buffer, screen) {
  const resized = await sharp(buffer)
    .resize(screen.screenWidth, screen.screenHeight, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('@napi-rs/canvas');
  const img = await loadImage(resized);

  ctx.save();
  roundRect(ctx, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight, screen.screenCornerRadius);
  ctx.clip();
  ctx.drawImage(img, screen.screenX, screen.screenY, screen.screenWidth, screen.screenHeight);
  ctx.restore();
}

/**
 * Deterministic hash of a string → positive integer (for seeded RNG).
 */
export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Apply device rotation around a center point.
 * Returns true if transform was applied (caller must ctx.restore()), false if no-op.
 */
export function applyDeviceTransform(ctx, centerX, centerY, rotation = 0) {
  if (rotation === 0) return false;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.translate(-centerX, -centerY);
  return true;
}
