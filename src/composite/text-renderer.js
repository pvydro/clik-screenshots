import { scaleValue } from '../utils.js';
import { resolveFont, loadThemeFonts } from './font-loader.js';
import { drawTextWithEffects } from './text-effects.js';

const REFERENCE_WIDTH = 1290;

/**
 * Load fonts for the theme. Call once before rendering.
 */
export async function loadFont(theme) {
  await loadThemeFonts(theme);
}

/**
 * Draw headline text with effects.
 */
export function drawHeadline(ctx, text, x, y, maxWidth, theme, targetWidth, canvas, align) {
  if (!text) return 0;

  const { family, weight } = resolveFont(theme, 'headline');
  const fontSize = scaleValue(theme.headlineSize || 72, REFERENCE_WIDTH, targetWidth);

  ctx.font = `${weight} ${fontSize}px "${family}", sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'top';

  const textEffects = theme.textEffects || null;
  const fillColor = theme.headlineColor || '#ffffff';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.2;
  let currentY = y;

  for (const line of lines) {
    const wrappedLines = wrapText(ctx, line, maxWidth);
    for (const wrappedLine of wrappedLines) {
      drawTextWithEffects(ctx, canvas, wrappedLine, x, currentY, fillColor, textEffects, maxWidth);
      currentY += lineHeight;
    }
  }

  return currentY - y;
}

/**
 * Draw subhead text with effects.
 */
export function drawSubhead(ctx, text, x, y, maxWidth, theme, targetWidth, canvas, align) {
  if (!text) return 0;

  const { family, weight } = resolveFont(theme, 'subhead');
  const fontSize = scaleValue(theme.subheadSize || 36, REFERENCE_WIDTH, targetWidth);

  ctx.font = `${weight} ${fontSize}px "${family}", sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'top';

  const textEffects = theme.textEffects || null;
  const fillColor = theme.subheadColor || '#aaaacc';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.3;
  let currentY = y;

  for (const line of lines) {
    const wrappedLines = wrapText(ctx, line, maxWidth);
    for (const wrappedLine of wrappedLines) {
      drawTextWithEffects(ctx, canvas, wrappedLine, x, currentY, fillColor, textEffects, maxWidth);
      currentY += lineHeight;
    }
  }

  return currentY - y;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}
