import { hexToRgba, hexToRgb } from '../utils.js';

export function applyDropShadow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.dropShadow) return;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = effects.shadowBlur || 60;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = effects.shadowOffsetY || 20;

  // Draw a filled shape that will cast the shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundRect(ctx, x, y, width, height, cornerRadius);
  ctx.fill();

  ctx.restore();
}

export function applyGlow(ctx, x, y, width, height, cornerRadius, effects) {
  if (!effects.glow) return;

  const glowColor = effects.glowColor || '#00ffcc';
  const glowRadius = effects.glowRadius || 40;

  ctx.save();

  // Multiple passes for smooth glow
  for (let i = 3; i >= 1; i--) {
    const spread = glowRadius * (i / 3);
    const alpha = 0.08 * (4 - i);

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

  // Seeded pseudo-random for deterministic particles
  let rng = seed;
  const random = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = random() * height;
    const size = 1 + random() * 4;
    const alpha = 0.1 + random() * 0.5;

    ctx.save();

    // Draw a sparkle: small circle with subtle glow
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.8})`;
    ctx.shadowBlur = size * 3;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Cross sparkle for larger particles
    if (size > 2.5) {
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`;
      ctx.lineWidth = 0.5;

      const armLen = size * 3;
      ctx.beginPath();
      ctx.moveTo(x - armLen, y);
      ctx.lineTo(x + armLen, y);
      ctx.moveTo(x, y - armLen);
      ctx.lineTo(x, y + armLen);
      ctx.stroke();
    }

    ctx.restore();
  }
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
