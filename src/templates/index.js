import * as deviceCentered from './device-centered.js';
import * as deviceAngled from './device-angled.js';
import * as fullBleed from './full-bleed.js';
import * as minimal from './minimal.js';
import * as sideBySide from './side-by-side.js';

const TEMPLATES = {
  'device-centered': deviceCentered,
  'device-angled': deviceAngled,
  'full-bleed': fullBleed,
  'minimal': minimal,
  'side-by-side': sideBySide,
};

export function getTemplate(name) {
  return TEMPLATES[name] || null;
}

export function listTemplates() {
  return Object.keys(TEMPLATES);
}
