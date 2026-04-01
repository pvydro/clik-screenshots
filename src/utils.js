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

// Fetch Google Fonts CSS (with woff2 user-agent)
export function fetchGoogleFontsCss(fontUrl) {
  return new Promise((resolve, reject) => {
    const getter = fontUrl.startsWith('https') ? https : http;
    getter.get(fontUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
