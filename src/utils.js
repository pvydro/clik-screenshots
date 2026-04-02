import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function downloadFont(url) {
  return new Promise((resolve, reject) => {
    const getter = url.startsWith('https') ? https : http;
    getter.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFont(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Extract font file URLs from a Google Fonts CSS response
export function extractFontUrls(css) {
  const urls = [];
  const regex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

// Extract font entries with weight + URL from Google Fonts CSS @font-face blocks
export function extractFontEntries(css) {
  const entries = [];
  const regex = /@font-face\s*\{[^}]*font-weight:\s*(\d+)[^}]*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)[^}]*\}/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    entries.push({ weight: parseInt(match[1]), url: match[2] });
  }
  return entries;
}

// Fetch Google Fonts CSS (with woff2 user-agent)
export function fetchGoogleFontsCss(fontUrl) {
  return new Promise((resolve, reject) => {
    const getter = fontUrl.startsWith('https') ? https : http;
    getter.get(fontUrl, {
      headers: {
        'User-Agent': 'node',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString()));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export function scaleValue(value, referenceWidth, targetWidth) {
  return Math.round(value * (targetWidth / referenceWidth));
}
