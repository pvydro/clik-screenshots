/**
 * Per-template default layout values.
 * These are merged with scene.layout — scene values override template defaults.
 */

export const LAYOUT_DEFAULTS = {
  'device-centered': {
    text: { x: 0.5, y: 0.06, align: 'center', maxWidth: 0.84, gap: 0.015 },
    device: { x: 0.5, y: null, scale: 1.0, rotation: 0 },
    textAreaHeight: 0.22,
  },
  'device-angled': {
    text: { x: 0.5, y: 0.06, align: 'center', maxWidth: 0.84, gap: 0.015 },
    device: { x: 0.5, y: null, scale: 0.9, rotation: -5 },
    textAreaHeight: 0.22,
  },
  'full-bleed': {
    text: { x: 0.5, y: 0.78, align: 'center', maxWidth: 0.84, gap: 0.015 },
    device: { x: 0.5, y: 0.5, scale: 1.0, rotation: 0 },
    fadeStart: 0.65,
  },
  'minimal': {
    text: { x: 0.5, y: null, align: 'center', maxWidth: 0.9, gap: 0 },
    device: { x: 0.5, y: 0.5, scale: 1.0, rotation: 0 },
    stripHeight: 0.06,
  },
  'side-by-side': {
    text: { x: 0.5, y: 0.05, align: 'center', maxWidth: 0.88, gap: 0.01 },
    device: { x: 0.5, y: null, scale: 1.0, rotation: 0 },
    textAreaHeight: 0.2,
    deviceGap: 0.04,
  },
};

/**
 * Resolve layout for a scene by deep-merging template defaults with scene overrides.
 */
export function resolveLayout(templateName, sceneLayout) {
  const defaults = LAYOUT_DEFAULTS[templateName] || LAYOUT_DEFAULTS['device-centered'];
  return deepMergeLayout(defaults, sceneLayout || {});
}

function deepMergeLayout(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    if (overrides[key] !== null && typeof overrides[key] === 'object' && !Array.isArray(overrides[key])
        && defaults[key] && typeof defaults[key] === 'object') {
      result[key] = { ...defaults[key], ...overrides[key] };
    } else if (overrides[key] !== undefined) {
      result[key] = overrides[key];
    }
  }
  return result;
}
