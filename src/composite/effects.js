import { hexToRgba, hexToRgb } from '../utils.js';
import { roundRect } from './draw-utils.js';

export function applyDropShadow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.dropShadow) return;

  const shadowColor = effects.shadowColor || '#000000';
  const shadowOpacity = effects.shadowOpacity != null ? effects.shadowOpacity : 0.5;

  ctx.save();
  ctx.shadowColor = hexToRgba(shadowColor, shadowOpacity);
  ctx.shadowBlur = effects.shadowBlur || 60;
  ctx.shadowOffsetX = effects.shadowOffsetX || 0;
  ctx.shadowOffsetY = effects.shadowOffsetY || 20;

  ctx.fillStyle = hexToRgba(shadowColor, shadowOpacity * 0.6);
  roundRect(ctx, x, y, width, height, cornerRadius);
  ctx.fill();

  ctx.restore();
}

export function applyGlow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.glow) return;

  const glowColor = effects.glowColor || '#00ffcc';
  const glowRadius = effects.glowRadius || 40;
  const passes = effects.glowPasses || 3;
  const intensity = effects.glowIntensity != null ? effects.glowIntensity : 1.0;

  ctx.save();

  for (let i = passes; i >= 1; i--) {
    const spread = glowRadius * (i / passes);
    const alpha = 0.08 * intensity * (passes + 1 - i);

    ctx.shadowColor = hexToRgba(glowColor, alpha);
    ctx.shadowBlur = spread;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = hexToRgba(glowColor, alpha * 0.5);
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

// ── New Effects ──

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

