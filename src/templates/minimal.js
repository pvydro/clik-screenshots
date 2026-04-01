import { drawSubhead } from '../composite/text-renderer.js';
import sharp from 'sharp';

// Minimal: clean screenshot at target resolution, optional subtle text watermark

export async function render(ctx, canvas, screenshotBuffer, scene, theme, targetSize) {
  const { width, height } = targetSize;

  // 1. Draw screenshot filling entire canvas
  const resized = await sharp(screenshotBuffer)
    .resize(width, height, { fit: 'cover' })
    .png()
    .toBuffer();

  const { loadImage } = await import('canvas');
  const img = await loadImage(resized);
  ctx.drawImage(img, 0, 0, width, height);

  // 2. Optional subtle text at bottom
  if (scene.headline || scene.subhead) {
    // Light semi-transparent background strip
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    const stripHeight = height * 0.06;
    ctx.fillRect(0, height - stripHeight, width, stripHeight);

    const text = scene.headline || scene.subhead;
    drawSubhead(
      ctx, text, width / 2, height - stripHeight + stripHeight * 0.2,
      width * 0.9,
      { ...theme, subheadColor: 'rgba(255,255,255,0.8)', subheadSize: 28 },
      width
    );
  }
}
