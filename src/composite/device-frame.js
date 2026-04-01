// Programmatic device frame renderer
// Draws iPhone/iPad bezels with dynamic island or notch at runtime.

import { roundRect } from './draw-utils.js';

function hexToRgba2(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  // Frameless — zero bezel, just rounded corners
  frameless: {
    bezelWidth: 0,
    cornerRadius: 0.08,
  },
  // Shadow only — no visible frame, just corners + shadow
  'shadow-only': {
    bezelWidth: 0,
    cornerRadius: 0.06,
  },
  // Clay — thick bezel with 3D bevel look
  clay: {
    bezelWidth: 0.035,
    cornerRadius: 0.12,
  },
  // Android — punch-hole camera, smaller corner radius
  android: {
    bezelWidth: 0.01,
    cornerRadius: 0.06,
    punchHole: {
      x: 0.5,              // centered
      y: 0.01,             // near top
      radius: 0.012,       // fraction of screen width
    },
  },
};

export function calculateFrameDimensions(targetWidth, targetHeight, frameStyle, textSpace, options) {
  const profile = FRAME_PROFILES[frameStyle] || FRAME_PROFILES.modern;
  const bezelFraction = profile.bezelWidth;

  // Available space for device (after reserving text space)
  const scale = Math.max(0.1, Math.min(2.0, options?.scale ?? 1.0));
  const availWidth = targetWidth * 0.75 * scale;
  const availHeight = (targetHeight - textSpace) * 0.85 * scale;

  // Device aspect ratio — configurable, defaults to iPhone 6.7"
  const screenRatio = options?.aspectRatio || 1290 / 2796;

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

  // Punch-hole camera (Android style)
  if (profile.punchHole) {
    const ph = profile.punchHole;
    const phX = screenX + screenWidth * ph.x;
    const phY = screenY + screenHeight * ph.y;
    const phR = screenWidth * ph.radius;

    ctx.fillStyle = frameColor;
    ctx.beginPath();
    ctx.arc(phX, phY, phR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Clay 3D bevel effect
  if (theme.frameStyle === 'clay') {
    // Top highlight
    const bevelGrad = ctx.createLinearGradient(x, y, x, y + outerHeight);
    bevelGrad.addColorStop(0, 'rgba(255,255,255,0.15)');
    bevelGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
    bevelGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
    bevelGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = bevelGrad;
    roundRect(ctx, x, y, outerWidth, outerHeight, cornerRadius);
    ctx.fill();
  }

  // Subtle bezel highlight (top edge) — configurable
  const highlight = theme.frameHighlight || {};
  const hlColor = highlight.color || '#ffffff';
  const hlOpacity = highlight.opacity != null ? highlight.opacity : 0.08;
  const hlWidth = highlight.width || 1;
  if (hlOpacity > 0 && bezel > 0) {
    ctx.strokeStyle = hexToRgba2(hlColor, hlOpacity);
    ctx.lineWidth = hlWidth;
    roundRect(ctx, x + 0.5, y + 0.5, outerWidth - 1, outerHeight - 1, cornerRadius);
    ctx.stroke();
  }

  return {
    screenX,
    screenY,
    screenWidth,
    screenHeight,
    screenCornerRadius: screenCorner,
  };
}

