import { hexToRgba, hexToRgb } from '../utils.js';
import { roundRect } from './draw-utils.js';

export function applyDropShadow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.dropShadow) return;

  const shadowColor = effects.shadowColor || '#000000';
  const shadowOpacity = effects.shadowOpacity != null ? effects.shadowOpacity : 0.5;
  const baseBlur = effects.shadowBlur || 60;
  const baseOffsetX = effects.shadowOffsetX || 0;
  const baseOffsetY = effects.shadowOffsetY || 20;
  const layers = effects.shadowLayers || 1;
  const spread = effects.shadowSpread || 0;

  for (let layer = 0; layer < layers; layer++) {
    const blurMult = 1 + layer;
    const opacityMult = 1 / (1 + layer * 0.8);
    const offsetMult = layer === 0 ? 1 : (layer === 1 ? 1.5 : 0.5);

    ctx.save();
    ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity * opacityMult);
    ctx.shadowBlur = baseBlur * blurMult;
    ctx.shadowOffsetX = baseOffsetX * offsetMult;
    ctx.shadowOffsetY = baseOffsetY * offsetMult;

    ctx.fillStyle = hexToRgba(shadowColor, shadowOpacity * 0.6 * opacityMult);
    roundRect(ctx, x - spread, y - spread, width + spread * 2, height + spread * 2, cornerRadius);
    ctx.fill();

    ctx.restore();
  }
}

export function applyGlow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.glow) return;

  const glowColor = effects.glowColor || '#00ffcc';
  const glowColor2 = effects.glowColor2 || null;
  const glowRadius = effects.glowRadius || 40;
  const passes = effects.glowPasses || 3;
  const intensity = effects.glowIntensity != null ? effects.glowIntensity : 1.0;

  ctx.save();

  for (let i = passes; i >= 1; i--) {
    const spread = glowRadius * (i / passes);
    const alpha = 0.08 * intensity * (passes + 1 - i);
    const color = (glowColor2 && i % 2 === 0) ? glowColor2 : glowColor;

    ctx.shadowColor = hexToRgba(color, alpha);
    ctx.shadowBlur = spread;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = hexToRgba(color, alpha * 0.5);
    ctx.lineWidth = 2;
    roundRect(ctx, x - 1, y - 1, width + 2, height + 2, cornerRadius);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticles(ctx, width, height, effects, seed = 42) {
  if (!effects.particles) return;

  const particleColor = effects.particleColor || '#ffffff';
  const { r, g, b } = hexToRgb(particleColor);
  const count = effects.particleCount || 30;
  const sizeMin = effects.particleSizeMin || 1;
  const sizeMax = effects.particleSizeMax || 5;
  const shape = effects.particleShape || 'mixed';

  let rng = seed;
  const random = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  const shapes = ['circle', 'star', 'square', 'diamond'];

  for (let i = 0; i < count; i++) {
    const px = random() * width;
    const py = random() * height;
    const size = sizeMin + random() * (sizeMax - sizeMin);
    const alpha = 0.1 + random() * 0.5;
    const particleShape = shape === 'mixed' ? shapes[Math.floor(random() * shapes.length)] : shape;

    ctx.save();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
    ctx.shadowBlur = size * 3;

    switch (particleShape) {
      case 'star':
        drawStar(ctx, px, py, size, 5);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(px - size, py - size, size * 2, size * 2);
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(px, py - size * 1.4);
        ctx.lineTo(px + size, py);
        ctx.lineTo(px, py + size * 1.4);
        ctx.lineTo(px - size, py);
        ctx.closePath();
        ctx.fill();
        break;
      default: // circle
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    // Cross sparkle for larger particles
    if (size > sizeMax * 0.5) {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`;
      ctx.lineWidth = 0.5;
      const armLen = size * 3;
      ctx.beginPath();
      ctx.moveTo(px - armLen, py);
      ctx.lineTo(px + armLen, py);
      ctx.moveTo(px, py - armLen);
      ctx.lineTo(px, py + armLen);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawStar(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ── Device Outline ──

export function applyDeviceOutline(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.deviceOutline) return;

  const color = effects.outlineColor || '#00ffcc';
  const lineWidth = effects.outlineWidth || 3;
  const opacity = effects.outlineOpacity != null ? effects.outlineOpacity : 1.0;
  const offset = effects.outlineOffset || 0;

  ctx.save();
  ctx.strokeStyle = hexToRgba(color, opacity);
  ctx.lineWidth = lineWidth;
  roundRect(
    ctx,
    x - offset - lineWidth / 2,
    y - offset - lineWidth / 2,
    width + (offset + lineWidth / 2) * 2,
    height + (offset + lineWidth / 2) * 2,
    cornerRadius + offset
  );
  ctx.stroke();
  ctx.restore();
}

// ── Inner Glow ──

export function applyInnerGlow(ctx, screen, effects) {
  if (!effects.glowInner) return;

  const color = effects.glowInnerColor || '#ffffff';
  const radius = effects.glowInnerRadius || 20;
  const opacity = effects.glowInnerOpacity != null ? effects.glowInnerOpacity : 0.3;
  const { screenX, screenY, screenWidth, screenHeight, screenCornerRadius } = screen;

  ctx.save();

  // Clip to screen area
  roundRect(ctx, screenX, screenY, screenWidth, screenHeight, screenCornerRadius);
  ctx.clip();

  // Draw inward glow using a large stroke with shadow
  const inset = radius * 2;
  ctx.shadowColor = hexToRgba(color, opacity);
  ctx.shadowBlur = radius;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = hexToRgba(color, opacity * 0.5);
  ctx.lineWidth = inset;

  // Draw a rect just outside the screen so only the inner shadow is visible
  roundRect(
    ctx,
    screenX - inset / 2,
    screenY - inset / 2,
    screenWidth + inset,
    screenHeight + inset,
    screenCornerRadius
  );
  ctx.stroke();

  ctx.restore();
}

// ── Floating Background Shapes ──

export function drawFloatingShapes(ctx, width, height, effects, seed = 42) {
  if (!effects.floatingShapes) return;

  const color = effects.shapeColor || '#ffffff';
  const { r, g, b } = hexToRgb(color);
  const count = effects.shapeCount || 8;
  const sizeMin = effects.shapeSizeMin || 40;
  const sizeMax = effects.shapeSizeMax || 150;
  const baseOpacity = effects.shapeOpacity != null ? effects.shapeOpacity : 0.08;
  const shapeType = effects.shapeTypes || 'mixed';
  const blur = effects.shapeBlur || 0;
  const filled = effects.shapeFilled !== false;
  const strokeWidth = effects.shapeStrokeWidth || 2;

  let rng = seed;
  const random = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  const types = ['circle', 'triangle', 'square', 'hexagon', 'ring'];

  for (let i = 0; i < count; i++) {
    const px = random() * width;
    const py = random() * height;
    const size = sizeMin + random() * (sizeMax - sizeMin);
    const alpha = baseOpacity * (0.5 + random() * 0.5);
    const rotation = random() * Math.PI * 2;
    const type = shapeType === 'mixed' ? types[Math.floor(random() * types.length)] : shapeType;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rotation);

    if (blur > 0) {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    if (filled && type !== 'ring') {
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = strokeWidth;
    }

    switch (type) {
      case 'triangle':
        ctx.beginPath();
        for (let v = 0; v < 3; v++) {
          const angle = (v * Math.PI * 2) / 3 - Math.PI / 2;
          const vx = Math.cos(angle) * size;
          const vy = Math.sin(angle) * size;
          if (v === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        filled ? ctx.fill() : ctx.stroke();
        break;

      case 'square':
        if (filled) {
          ctx.fillRect(-size, -size, size * 2, size * 2);
        } else {
          ctx.strokeRect(-size, -size, size * 2, size * 2);
        }
        break;

      case 'hexagon':
        ctx.beginPath();
        for (let v = 0; v < 6; v++) {
          const angle = (v * Math.PI * 2) / 6;
          const vx = Math.cos(angle) * size;
          const vy = Math.sin(angle) * size;
          if (v === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        filled ? ctx.fill() : ctx.stroke();
        break;

      case 'ring':
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        break;

      default: // circle
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        filled ? ctx.fill() : ctx.stroke();
        break;
    }

    ctx.restore();
  }
}

// ── Background Blur ──

export async function applyBackgroundBlur(ctx, canvas, effects) {
  if (!effects.backgroundBlur) return;
  const radius = effects.backgroundBlurRadius || 10;
  const sigma = Math.max(0.3, radius);

  const { default: sharp } = await import('sharp');
  const { loadImage } = await import('@napi-rs/canvas');

  const buf = canvas.toBuffer('image/png');
  const blurred = await sharp(buf).blur(sigma).png().toBuffer();
  const img = await loadImage(blurred);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// ── Vignette ──

export function applyVignette(ctx, width, height, effects) {
  if (!effects.vignette) return;
  const radius = effects.vignetteRadius || 0.7;
  const opacity = effects.vignetteOpacity || 0.4;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);
  const innerR = maxR * radius;

  const gradient = ctx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${opacity})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function applyReflection(ctx, deviceX, deviceY, deviceWidth, deviceHeight, cornerRadius, effects) {
  if (!effects.reflection) return;
  const reflOpacity = effects.reflectionOpacity || 0.3;
  const reflHeight = effects.reflectionHeight || 0.3;

  const reflY = deviceY + deviceHeight;
  const reflH = deviceHeight * reflHeight;

  ctx.save();
  ctx.translate(0, reflY + reflH);
  ctx.scale(1, -1);

  ctx.globalAlpha = reflOpacity;
  roundRect(ctx, deviceX, reflY, deviceWidth, reflH, cornerRadius);
  ctx.clip();

  // Draw a fading reflection
  const fadeGrad = ctx.createLinearGradient(0, reflY, 0, reflY + reflH);
  fadeGrad.addColorStop(0, `rgba(255,255,255,${reflOpacity})`);
  fadeGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = fadeGrad;
  ctx.fillRect(deviceX, reflY, deviceWidth, reflH);

  ctx.restore();
}

export function applyNoiseGrain(ctx, width, height, effects) {
  if (!effects.grain) return;
  const grainOpacity = effects.grainOpacity || 0.05;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let seed = 12345;

  for (let i = 0; i < data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    const noise = ((seed >>> 16) & 0xff) - 128;
    const amount = noise * grainOpacity;
    data[i] = Math.min(255, Math.max(0, data[i] + amount));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount));
  }

  ctx.putImageData(imageData, 0, 0);
}

