import { createCanvas, registerFont } from 'canvas';
import { scaleValue, fetchGoogleFontsCss, extractFontUrls, downloadFont } from '../utils.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const REFERENCE_WIDTH = 1290; // Scale text relative to iPhone 6.7" width
let fontsLoaded = new Set();

export async function loadFont(theme) {
  if (!theme.fontUrl || fontsLoaded.has(theme.fontFamily)) return;

  try {
    console.log(`  Loading font: ${theme.fontFamily}`);

    const css = await fetchGoogleFontsCss(theme.fontUrl);
    const fontUrls = extractFontUrls(css);

    if (fontUrls.length === 0) {
      console.warn(`  No font files found in Google Fonts response`);
      return;
    }

    const tmpDir = path.join(os.tmpdir(), 'clik-screenshots-fonts');
    fs.mkdirSync(tmpDir, { recursive: true });

    // Download each font weight
    for (let i = 0; i < fontUrls.length; i++) {
      const url = fontUrls[i];
      const ext = url.includes('.woff2') ? '.woff2' : url.includes('.woff') ? '.woff' : '.ttf';
      const fontPath = path.join(tmpDir, `${theme.fontFamily}-${i}${ext}`);

      if (!fs.existsSync(fontPath)) {
        const fontData = await downloadFont(url);
        fs.writeFileSync(fontPath, fontData);
      }

      try {
        registerFont(fontPath, {
          family: theme.fontFamily,
          weight: i === 0 ? '400' : i === 1 ? '700' : '900',
        });
      } catch {
        // node-canvas may not support woff2; that's okay, we'll use system fonts
      }
    }

    fontsLoaded.add(theme.fontFamily);
    console.log(`  Font loaded: ${theme.fontFamily}`);
  } catch (err) {
    console.warn(`  Could not load font ${theme.fontFamily}: ${err.message}`);
    console.warn(`  Falling back to system sans-serif`);
  }
}

export function drawHeadline(ctx, text, x, y, maxWidth, theme, targetWidth) {
  if (!text) return 0;

  const fontSize = scaleValue(theme.headlineSize || 72, REFERENCE_WIDTH, targetWidth);
  const fontFamily = theme.fontFamily || 'sans-serif';

  ctx.font = `900 ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = theme.headlineColor || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Handle multiline text
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.2;
  let currentY = y;

  for (const line of lines) {
    // Word wrap if needed
    const wrappedLines = wrapText(ctx, line, maxWidth);
    for (const wrappedLine of wrappedLines) {
      ctx.fillText(wrappedLine, x, currentY);
      currentY += lineHeight;
    }
  }

  return currentY - y; // Total height used
}

export function drawSubhead(ctx, text, x, y, maxWidth, theme, targetWidth) {
  if (!text) return 0;

  const fontSize = scaleValue(theme.subheadSize || 36, REFERENCE_WIDTH, targetWidth);
  const fontFamily = theme.fontFamily || 'sans-serif';

  ctx.font = `400 ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.fillStyle = theme.subheadColor || '#aaaacc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const lines = text.split('\n');
  const lineHeight = fontSize * 1.3;
  let currentY = y;

  for (const line of lines) {
    const wrappedLines = wrapText(ctx, line, maxWidth);
    for (const wrappedLine of wrappedLines) {
      ctx.fillText(wrappedLine, x, currentY);
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
