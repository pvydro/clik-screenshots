import { hexToRgba } from '../utils.js';

export function drawBackground(ctx, width, height, theme) {
  const gradient = theme.backgroundGradient;

  if (gradient) {
    let canvasGradient;

    if (gradient.type === 'radial') {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.7;
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
