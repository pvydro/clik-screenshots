import { createCanvas } from '@napi-rs/canvas';
import { hexToRgb, hexToRgba } from '../utils.js';

/**
 * Apply text shadow before drawing text.
 * Call this, then fillText/strokeText, then restore.
 */
export function applyTextShadow(ctx, config) {
  if (!config?.enabled) return;
  ctx.shadowColor = config.color || 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = config.blur || 8;
  ctx.shadowOffsetX = config.offsetX || 0;
  ctx.shadowOffsetY = config.offsetY || 4;
}

/**
 * Draw glowing text via multiple shadow passes.
 */
export function drawTextGlow(ctx, text, x, y, config) {
  if (!config?.enabled) return;

  const strength = config.strength || 3;
  const blur = config.blur || 20;
  const color = config.color || '#00ffcc';

  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  for (let i = 0; i < strength; i++) {
    ctx.shadowColor = hexToRgba(color, 0.6 - i * 0.1);
    ctx.shadowBlur = blur * (1 + i * 0.5);
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}

/**
 * Draw text outline (strokeText).
 */
export function drawTextOutline(ctx, text, x, y, config) {
  if (!config?.enabled) return;

  ctx.save();
  ctx.strokeStyle = config.color || '#ffffff';
  ctx.lineWidth = (config.width || 2) * 2; // doubled because stroke straddles the path
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  // Clear shadows for outline pass
  ctx.shadowColor = 'transparent';
  ctx.strokeText(text, x, y);
  ctx.restore();
}

/**
 * Create a gradient fillStyle for text.
 * Returns the gradient object to set as ctx.fillStyle.
 */
export function createTextGradient(ctx, x, y, width, height, config) {
  if (!config?.enabled) return null;

  const colors = config.colors || ['#00ffcc', '#aa44ff'];
  const angle = (config.angle || 0) * Math.PI / 180;

  const dx = Math.cos(angle) * width;
  const dy = Math.sin(angle) * height;

  const grad = ctx.createLinearGradient(
    x - dx / 2, y - dy / 2,
    x + dx / 2, y + dy / 2
  );

  colors.forEach((color, i) => {
    grad.addColorStop(i / (colors.length - 1), color);
  });

  return grad;
}

/**
 * Apply glitch effect to a region of the canvas.
 * Draws RGB channel splits, slice displacement, and scanlines.
 */
export function applyGlitch(ctx, canvas, textX, textY, textWidth, textHeight, config) {
  if (!config?.enabled) return;

  const intensity = config.intensity ?? 0.5;
  const rgbSplit = Math.round((config.rgbSplit ?? 3) * intensity);
  const sliceCount = Math.round((config.sliceCount ?? 5) * intensity);
  const scanlines = config.scanlines !== false;

  // Region to glitch (with padding for RGB split)
  const pad = rgbSplit + 4;
  const rx = Math.max(0, Math.round(textX - textWidth / 2 - pad));
  const ry = Math.max(0, Math.round(textY - pad));
  const rw = Math.min(canvas.width - rx, Math.round(textWidth + pad * 2));
  const rh = Math.min(canvas.height - ry, Math.round(textHeight + pad * 2));

  if (rw <= 0 || rh <= 0) return;

  // Capture the text region
  const imageData = ctx.getImageData(rx, ry, rw, rh);
  const { data } = imageData;

  // 1. RGB channel split
  if (rgbSplit > 0) {
    const tempCanvas = createCanvas(rw, rh);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // Clear original region
    ctx.clearRect(rx, ry, rw, rh);

    // Draw red channel offset left
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Red channel
    const redCanvas = createCanvas(rw, rh);
    const redCtx = redCanvas.getContext('2d');
    redCtx.putImageData(imageData, 0, 0);
    const redData = redCtx.getImageData(0, 0, rw, rh);
    for (let i = 0; i < redData.data.length; i += 4) {
      redData.data[i + 1] = 0; // zero green
      redData.data[i + 2] = 0; // zero blue
    }
    redCtx.putImageData(redData, 0, 0);
    ctx.drawImage(redCanvas, rx - rgbSplit, ry);

    // Cyan channel (green + blue)
    const cyanCanvas = createCanvas(rw, rh);
    const cyanCtx = cyanCanvas.getContext('2d');
    cyanCtx.putImageData(imageData, 0, 0);
    const cyanData = cyanCtx.getImageData(0, 0, rw, rh);
    for (let i = 0; i < cyanData.data.length; i += 4) {
      cyanData.data[i] = 0; // zero red
    }
    cyanCtx.putImageData(cyanData, 0, 0);
    ctx.drawImage(cyanCanvas, rx + rgbSplit, ry);

    ctx.restore();
  }

  // 2. Slice displacement
  if (sliceCount > 0) {
    let rng = 12345;
    const random = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };

    for (let i = 0; i < sliceCount; i++) {
      const sliceY = ry + Math.floor(random() * rh);
      const sliceH = 1 + Math.floor(random() * 4);
      const shift = Math.round((random() - 0.5) * rgbSplit * 4);

      if (shift === 0) continue;

      const sliceData = ctx.getImageData(rx, sliceY, rw, sliceH);
      ctx.putImageData(sliceData, rx + shift, sliceY);
    }
  }

  // 3. Scanlines
  if (scanlines) {
    ctx.save();
    ctx.globalAlpha = 0.08 * intensity;
    ctx.fillStyle = '#000000';
    for (let y = ry; y < ry + rh; y += 3) {
      ctx.fillRect(rx, y, rw, 1);
    }
    ctx.restore();
  }
}

/**
 * Draw a single line of text with all effects applied.
 * This is the main entry point called by text-renderer.
 */
export function drawTextWithEffects(ctx, canvas, text, x, y, fillColor, textEffects, lineWidth) {
  if (!textEffects) {
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
    return;
  }

  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const fontSize = parseInt(ctx.font);
  const lineH = fontSize * 1.2;

  // 1. Shadow (set before any drawing)
  if (textEffects.shadow?.enabled) {
    ctx.save();
    applyTextShadow(ctx, textEffects.shadow);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 2. Glow (multiple passes)
  if (textEffects.glow?.enabled) {
    drawTextGlow(ctx, text, x, y, textEffects.glow);
  }

  // 3. Outline (stroke before fill)
  if (textEffects.outline?.enabled) {
    drawTextOutline(ctx, text, x, y, textEffects.outline);
  }

  // 4. Gradient fill or solid fill
  if (textEffects.gradient?.enabled) {
    const grad = createTextGradient(ctx, x, y, textW, lineH, textEffects.gradient);
    if (grad) {
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = fillColor;
    }
  } else {
    ctx.fillStyle = fillColor;
  }

  // 5. Draw the fill text (skip if outline-only without fill)
  const shouldFill = !textEffects.outline?.enabled || textEffects.outline?.fillEnabled !== false;
  if (shouldFill) {
    ctx.save();
    ctx.shadowColor = 'transparent'; // don't double shadow
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // 6. Glitch (post-process)
  if (textEffects.glitch?.enabled) {
    applyGlitch(ctx, canvas, x, y, textW, lineH, textEffects.glitch);
  }
}
