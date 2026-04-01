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

  // Validate required fields
  if (!config.serve?.url) {
    throw new Error('Config must include serve.url (e.g., "http://localhost:8080")');
  }
  if (!config.scenes || config.scenes.length === 0) {
    throw new Error('Config must include at least one scene');
  }

  return config;
}
