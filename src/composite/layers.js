import { roundRect } from './draw-utils.js';

/**
 * Render all content layers on top of the composited image.
 * Each layer has a type and position (normalized 0-1 coordinates).
 */
export function renderLayers(ctx, width, height, layers) {
  if (!layers || !Array.isArray(layers) || layers.length === 0) return;

  for (const layer of layers) {
    ctx.save();
    try {
      switch (layer.type) {
        case 'badge':
          renderBadge(ctx, width, height, layer);
          break;
        case 'rating':
          renderRating(ctx, width, height, layer);
          break;
        case 'text':
          renderTextLayer(ctx, width, height, layer);
          break;
        case 'divider':
          renderDivider(ctx, width, height, layer);
          break;
      }
    } catch (e) {
      // Skip broken layers silently
    }
    ctx.restore();
  }
}

function renderBadge(ctx, width, height, layer) {
  const x = width * (layer.position?.x || 0.5);
  const y = height * (layer.position?.y || 0.05);
  const text = layer.text || '';
  const bgColor = layer.color || '#ff4444';
  const textColor = layer.textColor || '#ffffff';
  const fontSize = layer.fontSize || 24;
  const style = layer.style || 'pill'; // 'pill' | 'chip' | 'ribbon'

  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(text);
  const padX = fontSize * 0.8;
  const padY = fontSize * 0.4;
  const badgeW = metrics.width + padX * 2;
  const badgeH = fontSize + padY * 2;
  const bx = x - badgeW / 2;
  const by = y - badgeH / 2;

  switch (style) {
    case 'ribbon': {
      const tabW = 12;
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.moveTo(bx - tabW, by);
      ctx.lineTo(bx + badgeW + tabW, by);
      ctx.lineTo(bx + badgeW + tabW, by + badgeH);
      ctx.lineTo(bx + badgeW, by + badgeH + 8);
      ctx.lineTo(bx, by + badgeH + 8);
      ctx.lineTo(bx - tabW, by + badgeH);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'chip': {
      const r = 6;
      ctx.fillStyle = bgColor;
      roundRect(ctx, bx, by, badgeW, badgeH, r);
      ctx.fill();
      break;
    }
    default: { // pill
      const r = badgeH / 2;
      ctx.fillStyle = bgColor;
      roundRect(ctx, bx, by, badgeW, badgeH, r);
      ctx.fill();
    }
  }

  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
}

function renderRating(ctx, width, height, layer) {
  const x = width * (layer.position?.x || 0.5);
  const y = height * (layer.position?.y || 0.94);
  const stars = layer.stars || 4.8;
  const starColor = layer.color || '#ffcc00';
  const size = layer.size || 28;
  const count = layer.count || '';

  const totalStars = 5;
  const gap = size * 0.3;
  const totalWidth = totalStars * size + (totalStars - 1) * gap;
  let startX = x - totalWidth / 2;

  for (let i = 0; i < totalStars; i++) {
    const cx = startX + i * (size + gap) + size / 2;
    const fill = Math.min(1, Math.max(0, stars - i));

    // Empty star
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    drawStarShape(ctx, cx, y, size / 2, 5);
    ctx.fill();

    // Filled portion
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - size / 2, y - size / 2, size * fill, size);
      ctx.clip();
      ctx.fillStyle = starColor;
      drawStarShape(ctx, cx, y, size / 2, 5);
      ctx.fill();
      ctx.restore();
    }
  }

  // Count text
  if (count) {
    ctx.font = `${Math.round(size * 0.7)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(count, startX + totalWidth + gap, y);
  }
}

function renderTextLayer(ctx, width, height, layer) {
  const x = width * (layer.position?.x || 0.5);
  const y = height * (layer.position?.y || 0.5);
  const text = layer.text || '';
  const font = layer.font || {};
  const color = layer.color || '#ffffff';
  const rotation = layer.rotation || 0;

  const family = font.family || 'sans-serif';
  const weight = font.weight || 700;
  const size = font.size || 20;

  ctx.font = `${weight} ${size}px "${family}", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (rotation !== 0) {
    ctx.translate(x, y);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.fillText(text, 0, 0);
  } else {
    ctx.fillText(text, x, y);
  }
}

function renderDivider(ctx, width, height, layer) {
  const y = height * (layer.y || 0.5);
  const color = layer.color || '#ffffff';
  const opacity = layer.opacity || 0.2;
  const lineWidth = layer.width || 2;
  const length = layer.length || 0.8;

  const startX = width * (1 - length) / 2;
  const endX = width - startX;

  ctx.strokeStyle = color;
  ctx.globalAlpha = opacity;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
}

function drawStarShape(ctx, cx, cy, r, points) {
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
