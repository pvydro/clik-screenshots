import { hexToRgba } from '../utils.js';
import { roundRect } from './draw-utils.js';

export function drawBackground(ctx, width, height, theme) {
  const gradient = theme.backgroundGradient;

  if (gradient) {
    let canvasGradient;

    if (gradient.type === 'radial') {
      const center = gradient.center || { x: 0.5, y: 0.5 };
      const cx = width * center.x;
      const cy = height * center.y;
      const radius = Math.max(width, height) * (gradient.radius || 0.7);
      canvasGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    } else {
      // Linear gradient
      const angle = (gradient.angle || 180) * Math.PI / 180;
      const dx = Math.cos(angle) * height;
      const dy = Math.sin(angle) * height;
      canvasGradient = ctx.createLinearGradient(
        width / 2 - dx / 2, height / 2 - dy / 2,
        width / 2 + dx / 2, height / 2 + dy / 2
      );
    }

    const colors = gradient.colors || [theme.backgroundColor, theme.backgroundColor];
    colors.forEach((color, i) => {
      canvasGradient.addColorStop(i / (colors.length - 1), color);
    });

    ctx.fillStyle = canvasGradient;
  } else {
    ctx.fillStyle = theme.backgroundColor;
  }

  ctx.fillRect(0, 0, width, height);

  // Background pattern overlay
  if (theme.backgroundPattern) {
    drawPattern(ctx, width, height, theme.backgroundPattern);
  }
}

function drawPattern(ctx, width, height, pattern) {
  const { type = 'dots', color = '#ffffff', opacity = 0.05, spacing = 20, size = 2 } = pattern;

  ctx.save();
  ctx.globalAlpha = opacity;

  switch (type) {
    case 'dots':
      ctx.fillStyle = color;
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'grid':
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      for (let x = 0; x <= width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'diagonal':
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      for (let d = -height; d < width + height; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + height, height);
        ctx.stroke();
      }
      break;

    case 'crosshatch':
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      for (let d = -height; d < width + height; d += spacing) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + height, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d + height, 0);
        ctx.lineTo(d, height);
        ctx.stroke();
      }
      break;

    case 'waves':
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      const amp = spacing * 0.3;
      for (let y = spacing; y < height; y += spacing) {
        ctx.beginPath();
        for (let x = 0; x <= width; x += 2) {
          ctx.lineTo(x, y + Math.sin(x / spacing * Math.PI * 2) * amp);
        }
        ctx.stroke();
      }
      break;

    case 'noise': {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      // Simple pseudo-random noise
      let seed = 42;
      for (let i = 0; i < data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        const noise = ((seed >>> 16) & 0xff) / 255;
        if (noise > 0.5) {
          const alpha = (noise - 0.5) * 2 * opacity * 255;
          data[i] = Math.min(255, data[i] + r * alpha / 255);
          data[i + 1] = Math.min(255, data[i + 1] + g * alpha / 255);
          data[i + 2] = Math.min(255, data[i + 2] + b * alpha / 255);
        }
      }
      ctx.putImageData(imageData, 0, 0);
      ctx.restore();
      return; // noise handles its own alpha
    }
  }

  ctx.restore();
}

// Draw a gradient fade overlay (used for full-bleed template text area)
export function drawGradientFade(ctx, width, height, startY, color, direction = 'up') {
  const gradientHeight = height - startY;
  const gradient = ctx.createLinearGradient(0, startY, 0, height);

  if (direction === 'up') {
    gradient.addColorStop(0, hexToRgba(color, 0));
    gradient.addColorStop(0.4, hexToRgba(color, 0.7));
    gradient.addColorStop(1, hexToRgba(color, 0.95));
  } else {
    gradient.addColorStop(0, hexToRgba(color, 0.95));
    gradient.addColorStop(0.6, hexToRgba(color, 0.7));
    gradient.addColorStop(1, hexToRgba(color, 0));
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, startY, width, gradientHeight);
}

// Draw decorative background banners/rectangles
export function drawBackgroundBanners(ctx, width, height, banners) {
  if (!banners || !Array.isArray(banners) || banners.length === 0) return;

  for (const banner of banners) {
    const bx = (banner.x || 0) * width;
    const by = (banner.y || 0) * height;
    const bw = (banner.width || 1.0) * width;
    const bh = (banner.height || 0.08) * height;
    const color = banner.color || '#ffffff';
    const opacity = banner.opacity != null ? banner.opacity : 0.15;
    const cr = banner.cornerRadius || 0;
    const rotation = banner.rotation || 0;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;

    if (rotation !== 0) {
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      ctx.translate(cx, cy);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-cx, -cy);
    }

    if (cr > 0) {
      roundRect(ctx, bx, by, bw, bh, cr);
      ctx.fill();
    } else {
      ctx.fillRect(bx, by, bw, bh);
    }

    ctx.restore();
  }
}
