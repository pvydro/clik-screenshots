// Programmatic device frame renderer
// Draws iPhone/iPad bezels with dynamic island or notch at runtime.

const FRAME_PROFILES = {
  // Modern iPhone with Dynamic Island
  modern: {
    bezelWidth: 0.012,       // as fraction of device width
    cornerRadius: 0.12,      // as fraction of device width
    island: {
      width: 0.28,           // as fraction of screen width
      height: 0.022,         // as fraction of screen height
      cornerRadius: 0.5,     // fully rounded
      topOffset: 0.012,      // from top of screen
    },
  },
  // Classic iPhone with notch
  classic: {
    bezelWidth: 0.012,
    cornerRadius: 0.12,
    notch: {
      width: 0.45,
      height: 0.032,
      cornerRadius: 0.015,
    },
  },
  // iPad (minimal bezel, no notch/island)
  tablet: {
    bezelWidth: 0.015,
    cornerRadius: 0.05,
  },
};

export function calculateFrameDimensions(targetWidth, targetHeight, frameStyle, textSpace) {
  const profile = FRAME_PROFILES[frameStyle] || FRAME_PROFILES.modern;
  const bezelFraction = profile.bezelWidth;

  // Available space for device (after reserving text space)
  const availWidth = targetWidth * 0.75;
  const availHeight = (targetHeight - textSpace) * 0.85;

  // Device aspect ratio (screen area matches game aspect ratio approximately)
  // For phones, assume ~1:2.17 screen ratio (iPhone 6.7")
  const screenRatio = 1290 / 2796;

  let deviceWidth, deviceHeight;
  if (availWidth / availHeight < screenRatio) {
    deviceWidth = availWidth;
    deviceHeight = deviceWidth / screenRatio;
  } else {
    deviceHeight = availHeight;
    deviceWidth = deviceHeight * screenRatio;
  }

  const bezel = Math.round(deviceWidth * bezelFraction);
  const cornerR = Math.round(deviceWidth * profile.cornerRadius);

  const outerWidth = Math.round(deviceWidth + bezel * 2);
  const outerHeight = Math.round(deviceHeight + bezel * 2);
  const screenWidth = Math.round(deviceWidth);
  const screenHeight = Math.round(deviceHeight);

  return {
    outerWidth,
    outerHeight,
    screenWidth,
    screenHeight,
    bezel,
    cornerRadius: cornerR,
    profile,
  };
}

export function drawDeviceFrame(ctx, x, y, dims, theme) {
  const { outerWidth, outerHeight, screenWidth, screenHeight, bezel, cornerRadius, profile } = dims;
  const frameColor = theme.frameColor || '#1a1a1a';

  // Outer bezel (rounded rect)
  ctx.fillStyle = frameColor;
  roundRect(ctx, x, y, outerWidth, outerHeight, cornerRadius);
  ctx.fill();

  // Screen area (slightly smaller rounded rect, clipped for screenshot)
  const screenX = x + bezel;
  const screenY = y + bezel;
  const screenCorner = Math.max(cornerRadius - bezel, 4);

  ctx.fillStyle = '#000000';
  roundRect(ctx, screenX, screenY, screenWidth, screenHeight, screenCorner);
  ctx.fill();

  // Dynamic Island
  if (profile.island) {
    const island = profile.island;
    const islandW = Math.round(screenWidth * island.width);
    const islandH = Math.round(screenHeight * island.height);
    const islandX = screenX + (screenWidth - islandW) / 2;
    const islandY = screenY + Math.round(screenHeight * island.topOffset);
    const islandR = islandH / 2;

    ctx.fillStyle = frameColor;
    roundRect(ctx, islandX, islandY, islandW, islandH, islandR);
    ctx.fill();
  }

  // Notch
  if (profile.notch) {
    const notch = profile.notch;
    const notchW = Math.round(screenWidth * notch.width);
    const notchH = Math.round(screenHeight * notch.height);
    const notchX = screenX + (screenWidth - notchW) / 2;
    const notchY = y; // Flush with top of device
    const notchR = Math.round(screenWidth * notch.cornerRadius);

    ctx.fillStyle = frameColor;
    roundRect(ctx, notchX, notchY, notchW, notchH, notchR);
    ctx.fill();
  }

  // Subtle bezel highlight (top edge)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, outerWidth - 1, outerHeight - 1, cornerRadius);
  ctx.stroke();

  return {
    screenX,
    screenY,
    screenWidth,
    screenHeight,
    screenCornerRadius: screenCorner,
  };
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
