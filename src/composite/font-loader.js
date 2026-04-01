import { registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fetchGoogleFontsCss, extractFontUrls, downloadFont } from '../utils.js';

const loaded = new Set();
const TMP_DIR = path.join(os.tmpdir(), 'clik-screenshots-fonts');

export const FONT_PRESETS = {
  gaming: {
    headline: { family: 'Orbitron', weight: 900, url: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900' },
    subhead:  { family: 'Rajdhani', weight: 500, url: 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;700' },
  },
  clean: {
    headline: { family: 'Inter', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700' },
    subhead:  { family: 'Inter', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700' },
  },
  bold: {
    headline: { family: 'Bebas Neue', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue' },
    subhead:  { family: 'Open Sans', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600' },
  },
  retro: {
    headline: { family: 'Press Start 2P', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Press+Start+2P' },
    subhead:  { family: 'VT323', weight: 400, url: 'https://fonts.googleapis.com/css2?family=VT323' },
  },
};

/**
 * Load fonts from a theme config. Handles:
 * - Legacy: theme.fontFamily + theme.fontUrl (applies to both headline/subhead)
 * - New: theme.headlineFont + theme.subheadFont objects
 * - Presets: theme.fontPreset name
 */
export async function loadThemeFonts(theme) {
  // Preset takes priority
  if (theme.fontPreset && FONT_PRESETS[theme.fontPreset]) {
    const preset = FONT_PRESETS[theme.fontPreset];
    await loadFontConfig(preset.headline);
    await loadFontConfig(preset.subhead);
    return;
  }

  // New font config objects
  if (theme.headlineFont) {
    await loadFontConfig(theme.headlineFont);
  }
  if (theme.subheadFont) {
    await loadFontConfig(theme.subheadFont);
  }

  // Legacy fallback
  if (theme.fontFamily && theme.fontUrl && !theme.headlineFont && !theme.subheadFont) {
    await loadGoogleFont(theme.fontUrl, theme.fontFamily);
  }
}

/**
 * Load a single font from config: { family, weight, url, file }
 */
export async function loadFontConfig(fontConfig) {
  if (!fontConfig || !fontConfig.family) return;
  if (loaded.has(fontConfig.family)) return;

  try {
    if (fontConfig.file) {
      await loadLocalFont(fontConfig.file, fontConfig.family, fontConfig.weight);
    } else if (fontConfig.url) {
      await loadGoogleFont(fontConfig.url, fontConfig.family);
    }
    // If no file or url, relies on system font
  } catch (err) {
    console.warn(`  Could not load font "${fontConfig.family}": ${err.message}`);
  }
}

/**
 * Load a local .ttf/.otf file
 */
async function loadLocalFont(filePath, family, weight = '400') {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Font file not found: ${resolved}`);
  }

  try {
    registerFont(resolved, { family, weight: String(weight) });
    loaded.add(family);
    console.log(`  Font loaded (local): ${family}`);
  } catch (err) {
    throw new Error(`Failed to register font ${family}: ${err.message}`);
  }
}

/**
 * Load a Google Font by URL
 */
async function loadGoogleFont(fontUrl, family) {
  if (loaded.has(family)) return;

  console.log(`  Loading font: ${family}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const css = await fetchGoogleFontsCss(fontUrl);
  const fontUrls = extractFontUrls(css);

  if (fontUrls.length === 0) {
    console.warn(`  No font files found for ${family}`);
    return;
  }

  for (let i = 0; i < fontUrls.length; i++) {
    const url = fontUrls[i];
    const ext = url.includes('.woff2') ? '.woff2' : url.includes('.woff') ? '.woff' : '.ttf';
    const fontPath = path.join(TMP_DIR, `${family.replace(/\s+/g, '-')}-${i}${ext}`);

    if (!fs.existsSync(fontPath)) {
      const data = await downloadFont(url);
      fs.writeFileSync(fontPath, data);
    }

    try {
      registerFont(fontPath, {
        family,
        weight: i === 0 ? '400' : i === 1 ? '700' : '900',
      });
    } catch {
      // node-canvas may not support woff2
    }
  }

  loaded.add(family);
  console.log(`  Font loaded: ${family}`);
}

/**
 * Resolve font family + weight for headline or subhead from theme
 */
export function resolveFont(theme, role = 'headline') {
  // Preset
  if (theme.fontPreset && FONT_PRESETS[theme.fontPreset]) {
    const preset = FONT_PRESETS[theme.fontPreset];
    const cfg = role === 'headline' ? preset.headline : preset.subhead;
    return { family: cfg.family, weight: cfg.weight };
  }

  // Explicit font config
  const fontKey = role === 'headline' ? 'headlineFont' : 'subheadFont';
  if (theme[fontKey]) {
    return { family: theme[fontKey].family || 'sans-serif', weight: theme[fontKey].weight || (role === 'headline' ? 900 : 400) };
  }

  // Legacy
  return { family: theme.fontFamily || 'sans-serif', weight: role === 'headline' ? 900 : 400 };
}
