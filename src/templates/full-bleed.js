import { drawBackground, drawGradientFade } from '../composite/background.js';
import { drawHeadline, drawSubhead } from '../composite/text-renderer.js';
import { drawParticles } from '../composite/effects.js';
import sharp from 'sharp';

// Full-bleed: game screenshot fills canvas, text overlaid at bottom with gradient fade
//
// ┌─────────────────────┐
// │                     │
// │     GAME SCREEN     │
// │     (edge to edge)  │
// │                     │
// │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← gradient fade
// │   Headline Text     │
// │    Subhead text     │
// └─────────────────────┘

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;
  const effects = { ...theme.effects, ...(scene.overrides?.effects || {}) };

  // 1. Draw screenshot filling entire canvas
  const resized = await sharp(screenshotBuffer)
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('canvas');
  const img = await loadImage(resized);
  ctx.drawImage(img, 0, 0, width, height);

  // 2. Gradient fade at bottom for text readability
  const textAreaStart = height * 0.65;
  const bgColor = theme.backgroundColor || '#0a0a0f';
  drawGradientFade(ctx, width, height, textAreaStart, bgColor, 'up');

  // 3. Particles over the fade area
  drawParticles(ctx, width, height, effects, hashString(scene.id));

  // 4. Headline text
  const textPadding = width * 0.08;
  const textCenterX = width / 2;
  let textY = height * 0.78;

  const headlineHeight = drawHeadline(
    ctx, scene.headline, textCenterX, textY, width - textPadding * 2, theme, width
  );
  textY += headlineHeight + height * 0.015;

  // 5. Subhead
  drawSubhead(
    ctx, scene.subhead, textCenterX, textY, width - textPadding * 2, theme, width
  );
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
