import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const DEFAULTS = {
  game: {
    accessor: 'window.game',
    canvasSelector: 'canvas',
    muteCommand: '',
    baseWidth: 420,
    baseHeight: 720,
  },
  theme: {
    backgroundColor: '#0a0a0f',
    backgroundGradient: null,
    backgroundPattern: null,
    fontFamily: 'sans-serif',
    fontUrl: null,
    headlineColor: '#ffffff',
    headlineSize: 72,
    subheadColor: '#aaaacc',
    subheadSize: 36,
    accentColor: '#00ffcc',
    frameStyle: 'modern',
    frameColor: '#1a1a1a',
    effects: {
      glow: false,
      glowColor: '#00ffcc',
      glowRadius: 40,
      dropShadow: true,
      shadowBlur: 60,
      shadowOffsetY: 20,
      particles: false,
      particleColor: '#ffffff',
    },
    // Font system
    fontPreset: null,           // 'gaming', 'clean', 'bold', 'retro'
    headlineFont: null,         // { family, weight, url, file }
    subheadFont: null,          // { family, weight, url, file }
    // Text effects
    textEffects: {
      gradient: { enabled: false, colors: ['#00ffcc', '#aa44ff'], angle: 0 },
      glow: { enabled: false, color: '#00ffcc', blur: 20, strength: 3 },
      outline: { enabled: false, color: '#ffffff', width: 2, fillEnabled: true },
      shadow: { enabled: false, color: 'rgba(0,0,0,0.5)', offsetX: 0, offsetY: 4, blur: 8 },
      glitch: { enabled: false, intensity: 0.5, rgbSplit: 3, sliceCount: 5, scanlines: true },
    },
  },
  outputModes: ['clean', 'composited'],
  outputDir: './screenshots',
};

export async function loadConfig(configPath) {
  const resolved = path.resolve(configPath);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Config file not found: ${resolved}\n` +
      `  Create a clik-screenshots.config.js in your project root.\n` +
      `  Run 'clik-screenshots init' to generate one interactively.`
    );
  }

  const fileUrl = pathToFileURL(resolved).href;
  const mod = await import(fileUrl);
  const userConfig = mod.default || mod;

  return mergeConfig(DEFAULTS, userConfig);
}

function mergeConfig(defaults, user) {
  const config = { ...defaults, ...user };

  // Deep merge game
  config.game = { ...defaults.game, ...user.game };

  // Deep merge theme
  config.theme = { ...defaults.theme, ...user.theme };
  config.theme.effects = {
    ...defaults.theme.effects,
    ...(user.theme?.effects || {}),
  };

  // Deep merge textEffects
  if (user.theme?.textEffects) {
    config.theme.textEffects = { ...defaults.theme.textEffects };
    for (const key of Object.keys(defaults.theme.textEffects)) {
      config.theme.textEffects[key] = {
        ...defaults.theme.textEffects[key],
        ...(user.theme.textEffects[key] || {}),
      };
    }
  } else {
    config.theme.textEffects = { ...defaults.theme.textEffects };
  }

  // Deep merge per-scene layout
  if (config.scenes) {
    config.scenes = config.scenes.map(scene => {
      if (scene.layout && typeof scene.layout === 'object') {
        const merged = { ...scene.layout };
        for (const key of Object.keys(scene.layout)) {
          if (scene.layout[key] && typeof scene.layout[key] === 'object' && !Array.isArray(scene.layout[key])) {
            merged[key] = { ...scene.layout[key] };
          }
        }
        return { ...scene, layout: merged };
      }
      return scene;
    });
  }

  // Validate required fields
  if (!config.serve?.url) {
    throw new Error('Config must include serve.url (e.g., "http://localhost:8080")');
  }
  if (!config.scenes || config.scenes.length === 0) {
    throw new Error('Config must include at least one scene');
  }

  return config;
}
