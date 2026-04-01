// ── State ──

const state = {
  selectedScene: null,
  selectedSize: null,
  captures: {},           // { sceneId: true }
  scenes: {},             // { sceneId: { template, headline, subhead, overrides } }
  theme: {},
  config: null,
};

let previewBlobUrl = null;
let previewAbort = null;
let debounceTimer = null;

// ── Init ──

async function init() {
  const res = await fetch('/api/config');
  const config = await res.json();
  state.config = config;
  state.theme = { ...config.theme };
  state.selectedSize = config.sizes[0]?.id || 'iphone-6.7';

  // Initialize per-scene state
  for (const s of config.scenes) {
    state.scenes[s.id] = {
      id: s.id,
      name: s.name,
      template: s.template,
      headline: s.headline,
      subhead: s.subhead,
      overrides: s.overrides,
      layout: s.layout || null,
      setup: [],  // setup is only used for capture, not preview
    };
  }

  buildSceneList(config.scenes);
  buildTemplateSelect(config.templates);
  buildSizeSelect(config.sizes);
  loadThemeControls(config.theme);
  loadEffectsControls(config.theme.effects);
  loadFontControls(config.theme);
  loadTextEffectsControls(config.theme.textEffects);
  loadLayoutControls(null, config.scenes[0]?.template || 'device-centered');

  // Select first scene
  if (config.scenes.length > 0) {
    selectScene(config.scenes[0].id);
  }

  // Check capture status
  await checkCaptureStatus();
}

// ── Scene List ──

function buildSceneList(scenes) {
  const list = document.getElementById('scene-list');
  list.innerHTML = '';
  for (const s of scenes) {
    const item = document.createElement('div');
    item.className = 'scene-item';
    item.dataset.id = s.id;
    item.innerHTML = `<div class="scene-dot" id="dot-${s.id}"></div><span>${s.name || s.id}</span>`;
    item.addEventListener('click', () => selectScene(s.id));
    list.appendChild(item);
  }
}

function selectScene(id) {
  state.selectedScene = id;

  // Update active state
  document.querySelectorAll('.scene-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });

  // Load scene controls
  const scene = state.scenes[id];
  if (scene) {
    document.getElementById('ctrl-template').value = scene.template || 'device-centered';
    document.getElementById('ctrl-headline').value = scene.headline || '';
    document.getElementById('ctrl-subhead').value = scene.subhead || '';
    loadLayoutControls(scene.layout, scene.template || 'device-centered');
    renderLayersList();
  }

  requestPreview();
}

// ── Selects ──

function buildTemplateSelect(templates) {
  const sel = document.getElementById('ctrl-template');
  sel.innerHTML = '';
  for (const t of templates) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  }
}

function buildSizeSelect(sizes) {
  const sel = document.getElementById('size-select');
  sel.innerHTML = '';
  for (const s of sizes) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.label} (${s.width}×${s.height})`;
    sel.appendChild(opt);
  }
  sel.value = state.selectedSize;
}

// ── Load Controls from Config ──

function loadThemeControls(theme) {
  setColor('ctrl-bg-color', theme.backgroundColor);
  setColor('ctrl-headline-color', theme.headlineColor);
  setRange('ctrl-headline-size', theme.headlineSize);
  setColor('ctrl-subhead-color', theme.subheadColor);
  setRange('ctrl-subhead-size', theme.subheadSize);
  document.getElementById('ctrl-frame-style').value = theme.frameStyle || 'modern';
  setColor('ctrl-frame-color', theme.frameColor);
  setColor('ctrl-accent-color', theme.accentColor);

  // Gradient
  const grad = theme.backgroundGradient;
  const gradOn = document.getElementById('ctrl-gradient-on');
  gradOn.checked = !!grad;
  toggleSubControls('gradient-controls', !!grad);
  if (grad) {
    document.getElementById('ctrl-gradient-type').value = grad.type || 'radial';
    setColor('ctrl-gradient-color1', grad.colors?.[0] || '#1a1a3f');
    setColor('ctrl-gradient-color2', grad.colors?.[1] || '#0a0a0f');
    // Third color stop
    const hasColor3 = grad.colors && grad.colors.length >= 3;
    document.getElementById('ctrl-gradient-color3-on').checked = hasColor3;
    if (hasColor3) setColor('ctrl-gradient-color3', grad.colors[2]);
    setRange('ctrl-gradient-angle', grad.angle || 180);
    // Radial center/radius
    const cx = grad.center?.x != null ? Math.round(grad.center.x * 100) : 50;
    const cy = grad.center?.y != null ? Math.round(grad.center.y * 100) : 50;
    const radius = grad.radius != null ? Math.round(grad.radius * 100) : 70;
    setLayoutRange('ctrl-gradient-cx', cx);
    setLayoutRange('ctrl-gradient-cy', cy);
    setLayoutRange('ctrl-gradient-radius', radius);
    updateRadialControlsVisibility(grad.type || 'radial');
  }

  // Pattern
  const pat = theme.backgroundPattern;
  setToggle('ctrl-pattern-on', 'pattern-controls', !!pat);
  if (pat) {
    document.getElementById('ctrl-pattern-type').value = pat.type || 'dots';
    setColor('ctrl-pattern-color', pat.color || '#ffffff');
    document.getElementById('ctrl-pattern-opacity').value = Math.round((pat.opacity || 0.05) * 100);
    document.getElementById('ctrl-pattern-opacity-val').textContent = Math.round((pat.opacity || 0.05) * 100) + '%';
    setRange('ctrl-pattern-spacing', pat.spacing || 20);
    setRange('ctrl-pattern-size', pat.size || 2);
  }
}

function updateRadialControlsVisibility(type) {
  const radialEl = document.getElementById('radial-controls');
  if (radialEl) radialEl.style.display = type === 'radial' ? 'block' : 'none';
}

function loadEffectsControls(effects) {
  if (!effects) return;
  // Drop shadow
  setToggle('ctrl-shadow-on', 'shadow-controls', effects.dropShadow);
  setColor('ctrl-shadow-color', effects.shadowColor || '#000000');
  document.getElementById('ctrl-shadow-opacity').value = Math.round((effects.shadowOpacity != null ? effects.shadowOpacity : 0.5) * 100);
  document.getElementById('ctrl-shadow-opacity-val').textContent = Math.round((effects.shadowOpacity != null ? effects.shadowOpacity : 0.5) * 100) + '%';
  setRange('ctrl-shadow-blur', effects.shadowBlur);
  setRange('ctrl-shadow-ox', effects.shadowOffsetX || 0);
  setRange('ctrl-shadow-offset', effects.shadowOffsetY);
  // Glow
  setToggle('ctrl-glow-on', 'glow-controls', effects.glow);
  setColor('ctrl-glow-color', effects.glowColor);
  setRange('ctrl-glow-radius', effects.glowRadius);
  document.getElementById('ctrl-glow-intensity').value = Math.round((effects.glowIntensity != null ? effects.glowIntensity : 1.0) * 100);
  document.getElementById('ctrl-glow-intensity-val').textContent = Math.round((effects.glowIntensity != null ? effects.glowIntensity : 1.0) * 100) + '%';
  // Particles
  setToggle('ctrl-particles-on', 'particle-controls', effects.particles);
  setColor('ctrl-particle-color', effects.particleColor);
  setRange('ctrl-particle-count', effects.particleCount || 30);
  document.getElementById('ctrl-particle-shape').value = effects.particleShape || 'mixed';
  // Vignette
  setToggle('ctrl-vignette-on', 'vignette-controls', effects.vignette);
  document.getElementById('ctrl-vignette-radius').value = Math.round((effects.vignetteRadius || 0.7) * 100);
  document.getElementById('ctrl-vignette-radius-val').textContent = Math.round((effects.vignetteRadius || 0.7) * 100) + '%';
  document.getElementById('ctrl-vignette-opacity').value = Math.round((effects.vignetteOpacity || 0.4) * 100);
  document.getElementById('ctrl-vignette-opacity-val').textContent = Math.round((effects.vignetteOpacity || 0.4) * 100) + '%';
  // Grain
  setToggle('ctrl-grain-on', 'grain-controls', effects.grain);
  document.getElementById('ctrl-grain-opacity').value = Math.round((effects.grainOpacity || 0.05) * 100);
  document.getElementById('ctrl-grain-opacity-val').textContent = Math.round((effects.grainOpacity || 0.05) * 100) + '%';
}

function loadFontControls(theme) {
  const presetSel = document.getElementById('ctrl-font-preset');
  presetSel.value = theme.fontPreset || '';
  toggleCustomFontControls(!theme.fontPreset);

  if (theme.headlineFont) {
    document.getElementById('ctrl-headline-font').value = theme.headlineFont.family || '';
    setRange('ctrl-headline-weight', theme.headlineFont.weight || 900);
  } else {
    document.getElementById('ctrl-headline-font').value = theme.fontFamily || '';
    setRange('ctrl-headline-weight', 900);
  }

  if (theme.subheadFont) {
    document.getElementById('ctrl-subhead-font').value = theme.subheadFont.family || '';
    setRange('ctrl-subhead-weight', theme.subheadFont.weight || 400);
  } else {
    document.getElementById('ctrl-subhead-font').value = theme.fontFamily || '';
    setRange('ctrl-subhead-weight', 400);
  }
}

function toggleCustomFontControls(show) {
  const el = document.getElementById('custom-font-controls');
  if (el) el.style.display = show ? 'block' : 'none';
}

function loadTextEffectsControls(te) {
  if (!te) return;

  // Gradient
  setToggle('ctrl-text-gradient-on', 'text-gradient-controls', te.gradient?.enabled);
  if (te.gradient) {
    setColor('ctrl-text-gradient-color1', te.gradient.colors?.[0] || '#00ffcc');
    setColor('ctrl-text-gradient-color2', te.gradient.colors?.[1] || '#aa44ff');
    setRange('ctrl-text-gradient-angle', te.gradient.angle || 0);
  }

  // Glow
  setToggle('ctrl-text-glow-on', 'text-glow-controls', te.glow?.enabled);
  if (te.glow) {
    setColor('ctrl-text-glow-color', te.glow.color || '#00ffcc');
    setRange('ctrl-text-glow-blur', te.glow.blur || 20);
    setRange('ctrl-text-glow-strength', te.glow.strength || 3);
  }

  // Outline
  setToggle('ctrl-text-outline-on', 'text-outline-controls', te.outline?.enabled);
  if (te.outline) {
    setColor('ctrl-text-outline-color', te.outline.color || '#ffffff');
    setRange('ctrl-text-outline-width', te.outline.width || 2);
    document.getElementById('ctrl-text-outline-fill').checked = te.outline.fillEnabled !== false;
  }

  // Shadow
  setToggle('ctrl-text-shadow-on', 'text-shadow-controls', te.shadow?.enabled);
  if (te.shadow) {
    setColor('ctrl-text-shadow-color', te.shadow.color || '#000000');
    setRange('ctrl-text-shadow-ox', te.shadow.offsetX || 0);
    setRange('ctrl-text-shadow-oy', te.shadow.offsetY || 4);
    setRange('ctrl-text-shadow-blur', te.shadow.blur || 8);
  }

  // Glitch
  setToggle('ctrl-text-glitch-on', 'text-glitch-controls', te.glitch?.enabled);
  if (te.glitch) {
    const intensityVal = Math.round((te.glitch.intensity || 0.5) * 100);
    document.getElementById('ctrl-text-glitch-intensity').value = intensityVal;
    document.getElementById('ctrl-text-glitch-intensity-val').textContent = (intensityVal / 100).toFixed(1);
    setRange('ctrl-text-glitch-rgb', te.glitch.rgbSplit || 3);
    setRange('ctrl-text-glitch-slices', te.glitch.sliceCount || 5);
    document.getElementById('ctrl-text-glitch-scanlines').checked = te.glitch.scanlines !== false;
  }
}

// ── Layout Controls ──

const LAYOUT_TEMPLATE_DEFAULTS = {
  'device-centered': { text: { x: 50, y: 6, maxWidth: 84, align: 'center' }, textAreaHeight: 22, device: { x: 50, scale: 100, rotation: 0 } },
  'device-angled': { text: { x: 50, y: 6, maxWidth: 84, align: 'center' }, textAreaHeight: 22, device: { x: 50, scale: 90, rotation: -5 } },
  'full-bleed': { text: { x: 50, y: 78, maxWidth: 84, align: 'center' }, textAreaHeight: 22, device: { x: 50, scale: 100, rotation: 0 } },
  'minimal': { text: { x: 50, y: 50, maxWidth: 90, align: 'center' }, textAreaHeight: 6, device: { x: 50, scale: 100, rotation: 0 } },
  'side-by-side': { text: { x: 50, y: 5, maxWidth: 88, align: 'center' }, textAreaHeight: 20, device: { x: 50, scale: 100, rotation: 0 } },
};

function loadLayoutControls(layout, template) {
  const defaults = LAYOUT_TEMPLATE_DEFAULTS[template] || LAYOUT_TEMPLATE_DEFAULTS['device-centered'];

  const textX = layout?.text?.x != null ? Math.round(layout.text.x * 100) : defaults.text.x;
  const textY = layout?.text?.y != null ? Math.round(layout.text.y * 100) : defaults.text.y;
  const textMaxW = layout?.text?.maxWidth != null ? Math.round(layout.text.maxWidth * 100) : defaults.text.maxWidth;
  const textAlign = layout?.text?.align || defaults.text.align;
  const textArea = layout?.textAreaHeight != null ? Math.round(layout.textAreaHeight * 100) : defaults.textAreaHeight;
  const devX = layout?.device?.x != null ? Math.round(layout.device.x * 100) : defaults.device.x;
  const devScale = layout?.device?.scale != null ? Math.round(layout.device.scale * 100) : defaults.device.scale;
  const devRot = layout?.device?.rotation != null ? layout.device.rotation : defaults.device.rotation;

  setLayoutRange('ctrl-layout-text-x', textX);
  setLayoutRange('ctrl-layout-text-y', textY);
  setLayoutRange('ctrl-layout-text-maxw', textMaxW);
  document.getElementById('ctrl-layout-text-align').value = textAlign;
  setLayoutRange('ctrl-layout-text-area', textArea);
  setLayoutRange('ctrl-layout-dev-x', devX);
  setLayoutRange('ctrl-layout-dev-scale', devScale);
  document.getElementById('ctrl-layout-dev-rot').value = devRot;
  document.getElementById('ctrl-layout-dev-rot-val').textContent = devRot + '°';
}

function setLayoutRange(id, value) {
  const el = document.getElementById(id);
  el.value = value;
  const val = document.getElementById(id + '-val');
  if (val) val.textContent = id.includes('rot') ? value + '°' : value + '%';
}

function readLayout() {
  return {
    text: {
      x: parseInt(document.getElementById('ctrl-layout-text-x').value) / 100,
      y: parseInt(document.getElementById('ctrl-layout-text-y').value) / 100,
      maxWidth: parseInt(document.getElementById('ctrl-layout-text-maxw').value) / 100,
      align: document.getElementById('ctrl-layout-text-align').value,
    },
    textAreaHeight: parseInt(document.getElementById('ctrl-layout-text-area').value) / 100,
    device: {
      x: parseInt(document.getElementById('ctrl-layout-dev-x').value) / 100,
      scale: parseInt(document.getElementById('ctrl-layout-dev-scale').value) / 100,
      rotation: parseInt(document.getElementById('ctrl-layout-dev-rot').value),
    },
  };
}

// ── Helpers ──

function setColor(id, value) {
  if (!value) return;
  const el = document.getElementById(id);
  el.value = value;
  const hex = document.getElementById(id + '-hex');
  if (hex) hex.textContent = value;
}

function setRange(id, value) {
  if (value == null) return;
  const el = document.getElementById(id);
  el.value = value;
  const val = document.getElementById(id + '-val');
  if (val) val.textContent = id.includes('angle') ? value + '°' : value;
}

function setToggle(toggleId, subId, checked) {
  document.getElementById(toggleId).checked = !!checked;
  toggleSubControls(subId, !!checked);
}

function toggleSubControls(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('visible', show);
}

// ── Read Current State from Controls ──

function readTheme() {
  const gradOn = document.getElementById('ctrl-gradient-on').checked;
  const fontPreset = document.getElementById('ctrl-font-preset').value || null;

  const theme = {
    backgroundColor: document.getElementById('ctrl-bg-color').value,
    backgroundGradient: gradOn ? readGradient() : null,
    backgroundPattern: document.getElementById('ctrl-pattern-on').checked ? readPattern() : null,
    headlineColor: document.getElementById('ctrl-headline-color').value,
    headlineSize: parseInt(document.getElementById('ctrl-headline-size').value),
    subheadColor: document.getElementById('ctrl-subhead-color').value,
    subheadSize: parseInt(document.getElementById('ctrl-subhead-size').value),
    accentColor: document.getElementById('ctrl-accent-color').value,
    frameStyle: document.getElementById('ctrl-frame-style').value,
    frameColor: document.getElementById('ctrl-frame-color').value,
    effects: {
      dropShadow: document.getElementById('ctrl-shadow-on').checked,
      shadowColor: document.getElementById('ctrl-shadow-color').value,
      shadowOpacity: parseInt(document.getElementById('ctrl-shadow-opacity').value) / 100,
      shadowBlur: parseInt(document.getElementById('ctrl-shadow-blur').value),
      shadowOffsetX: parseInt(document.getElementById('ctrl-shadow-ox').value),
      shadowOffsetY: parseInt(document.getElementById('ctrl-shadow-offset').value),
      glow: document.getElementById('ctrl-glow-on').checked,
      glowColor: document.getElementById('ctrl-glow-color').value,
      glowRadius: parseInt(document.getElementById('ctrl-glow-radius').value),
      glowIntensity: parseInt(document.getElementById('ctrl-glow-intensity').value) / 100,
      particles: document.getElementById('ctrl-particles-on').checked,
      particleColor: document.getElementById('ctrl-particle-color').value,
      particleCount: parseInt(document.getElementById('ctrl-particle-count').value),
      particleShape: document.getElementById('ctrl-particle-shape').value,
      vignette: document.getElementById('ctrl-vignette-on').checked,
      vignetteRadius: parseInt(document.getElementById('ctrl-vignette-radius').value) / 100,
      vignetteOpacity: parseInt(document.getElementById('ctrl-vignette-opacity').value) / 100,
      grain: document.getElementById('ctrl-grain-on').checked,
      grainOpacity: parseInt(document.getElementById('ctrl-grain-opacity').value) / 100,
    },
    textEffects: readTextEffects(),
  };

  // Font system
  if (fontPreset) {
    theme.fontPreset = fontPreset;
  } else {
    const hlFont = document.getElementById('ctrl-headline-font').value;
    const shFont = document.getElementById('ctrl-subhead-font').value;
    if (hlFont) {
      theme.headlineFont = {
        family: hlFont,
        weight: parseInt(document.getElementById('ctrl-headline-weight').value),
      };
    }
    if (shFont) {
      theme.subheadFont = {
        family: shFont,
        weight: parseInt(document.getElementById('ctrl-subhead-weight').value),
      };
    }
    // Legacy fallback
    theme.fontFamily = hlFont || 'sans-serif';
  }

  return theme;
}

function readGradient() {
  const type = document.getElementById('ctrl-gradient-type').value;
  const colors = [
    document.getElementById('ctrl-gradient-color1').value,
    document.getElementById('ctrl-gradient-color2').value,
  ];
  if (document.getElementById('ctrl-gradient-color3-on').checked) {
    colors.push(document.getElementById('ctrl-gradient-color3').value);
  }
  const grad = { type, colors, angle: parseInt(document.getElementById('ctrl-gradient-angle').value) };
  if (type === 'radial') {
    grad.center = {
      x: parseInt(document.getElementById('ctrl-gradient-cx').value) / 100,
      y: parseInt(document.getElementById('ctrl-gradient-cy').value) / 100,
    };
    grad.radius = parseInt(document.getElementById('ctrl-gradient-radius').value) / 100;
  }
  return grad;
}

function readPattern() {
  return {
    type: document.getElementById('ctrl-pattern-type').value,
    color: document.getElementById('ctrl-pattern-color').value,
    opacity: parseInt(document.getElementById('ctrl-pattern-opacity').value) / 100,
    spacing: parseInt(document.getElementById('ctrl-pattern-spacing').value),
    size: parseInt(document.getElementById('ctrl-pattern-size').value),
  };
}

function readTextEffects() {
  return {
    gradient: {
      enabled: document.getElementById('ctrl-text-gradient-on').checked,
      colors: [
        document.getElementById('ctrl-text-gradient-color1').value,
        document.getElementById('ctrl-text-gradient-color2').value,
      ],
      angle: parseInt(document.getElementById('ctrl-text-gradient-angle').value),
    },
    glow: {
      enabled: document.getElementById('ctrl-text-glow-on').checked,
      color: document.getElementById('ctrl-text-glow-color').value,
      blur: parseInt(document.getElementById('ctrl-text-glow-blur').value),
      strength: parseInt(document.getElementById('ctrl-text-glow-strength').value),
    },
    outline: {
      enabled: document.getElementById('ctrl-text-outline-on').checked,
      color: document.getElementById('ctrl-text-outline-color').value,
      width: parseInt(document.getElementById('ctrl-text-outline-width').value),
      fillEnabled: document.getElementById('ctrl-text-outline-fill').checked,
    },
    shadow: {
      enabled: document.getElementById('ctrl-text-shadow-on').checked,
      color: document.getElementById('ctrl-text-shadow-color').value,
      offsetX: parseInt(document.getElementById('ctrl-text-shadow-ox').value),
      offsetY: parseInt(document.getElementById('ctrl-text-shadow-oy').value),
      blur: parseInt(document.getElementById('ctrl-text-shadow-blur').value),
    },
    glitch: {
      enabled: document.getElementById('ctrl-text-glitch-on').checked,
      intensity: parseInt(document.getElementById('ctrl-text-glitch-intensity').value) / 100,
      rgbSplit: parseInt(document.getElementById('ctrl-text-glitch-rgb').value),
      sliceCount: parseInt(document.getElementById('ctrl-text-glitch-slices').value),
      scanlines: document.getElementById('ctrl-text-glitch-scanlines').checked,
    },
  };
}

function readScene() {
  const id = state.selectedScene;
  if (!id) return null;
  return {
    id,
    template: document.getElementById('ctrl-template').value,
    headline: document.getElementById('ctrl-headline').value,
    subhead: document.getElementById('ctrl-subhead').value,
    layout: readLayout(),
    layers: getSceneLayers(),
  };
}

// ── Preview ──

function requestPreview() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doPreview, 250);
}

async function doPreview() {
  const sceneId = state.selectedScene;
  if (!sceneId || !state.captures[sceneId]) return;

  // Update scene state
  const scene = readScene();
  if (scene) {
    state.scenes[sceneId] = { ...state.scenes[sceneId], ...scene };
  }

  // Cancel previous request
  if (previewAbort) previewAbort.abort();
  previewAbort = new AbortController();

  const sizeId = document.getElementById('size-select').value;
  setStatus('Rendering preview...');
  const start = performance.now();

  try {
    const res = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneId,
        sizeId,
        previewScale: 0.4,
        scene: readScene(),
        theme: readTheme(),
      }),
      signal: previewAbort.signal,
    });

    if (!res.ok) {
      const err = await res.json();
      setStatus(`Error: ${err.error}`);
      return;
    }

    const blob = await res.blob();
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    previewBlobUrl = URL.createObjectURL(blob);

    const container = document.getElementById('preview-container');
    container.innerHTML = `<img class="preview-img" src="${previewBlobUrl}" alt="Preview">`;

    const elapsed = Math.round(performance.now() - start);
    setTiming(`${elapsed}ms`);
    setStatus('Ready');
  } catch (err) {
    if (err.name !== 'AbortError') {
      setStatus(`Error: ${err.message}`);
    }
  }
}

// ── Capture ──

async function captureAll() {
  const btn = document.getElementById('btn-capture');
  btn.disabled = true;
  btn.textContent = 'Capturing...';
  setStatus('Starting capture...');

  // Mark all dots as capturing
  document.querySelectorAll('.scene-dot').forEach(d => d.classList.add('capturing'));

  try {
    const res = await fetch('/api/capture', { method: 'POST' });
    const data = await res.json();

    if (data.error) {
      setStatus(`Capture error: ${data.error}`);
      return;
    }

    for (const s of data.scenes) {
      state.captures[s.id] = true;
      const dot = document.getElementById(`dot-${s.id}`);
      if (dot) {
        dot.classList.remove('capturing');
        dot.classList.add('cached');
      }
    }

    setStatus(`Captured ${data.scenes.length} scenes`);
    requestPreview();
  } catch (err) {
    setStatus(`Capture failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Capture All';
    document.querySelectorAll('.scene-dot.capturing').forEach(d => d.classList.remove('capturing'));
  }
}

// ── Export ──

async function exportAll() {
  const btn = document.getElementById('btn-export');
  btn.disabled = true;
  btn.textContent = 'Exporting...';
  setStatus('Exporting full-resolution screenshots...');

  try {
    const sceneConfigs = Object.values(state.scenes);
    const sizes = state.config.sizes.map(s => s.id);

    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: sceneConfigs,
        theme: readTheme(),
        sizes,
        mode: 'composited',
      }),
    });

    const data = await res.json();
    if (data.error) {
      setStatus(`Export error: ${data.error}`);
      return;
    }

    setStatus(`Exported ${data.results.length} screenshots to ${data.outputDir}`);
  } catch (err) {
    setStatus(`Export failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Export';
  }
}

// ── Capture Status ──

async function checkCaptureStatus() {
  try {
    const res = await fetch('/api/capture/status');
    const data = await res.json();
    for (const s of data.scenes) {
      if (s.cached) {
        state.captures[s.id] = true;
        const dot = document.getElementById(`dot-${s.id}`);
        if (dot) dot.classList.add('cached');
      }
    }
  } catch {}
}

// ── Status Bar ──

function setStatus(text) {
  document.getElementById('status-text').textContent = text;
}

function setTiming(text) {
  document.getElementById('status-timing').textContent = text ? `Preview: ${text}` : '';
}

// ── Event Bindings ──

function bindEvents() {
  // Buttons
  document.getElementById('btn-capture').addEventListener('click', captureAll);
  document.getElementById('btn-export').addEventListener('click', exportAll);

  // Size select
  document.getElementById('size-select').addEventListener('change', () => {
    state.selectedSize = document.getElementById('size-select').value;
    requestPreview();
  });

  // Per-scene controls → update state + preview
  for (const id of ['ctrl-template', 'ctrl-headline', 'ctrl-subhead']) {
    document.getElementById(id).addEventListener('input', () => {
      const scene = readScene();
      if (scene) state.scenes[state.selectedScene] = { ...state.scenes[state.selectedScene], ...scene };
      requestPreview();
    });
  }

  // Theme color pickers
  for (const id of [
    'ctrl-bg-color', 'ctrl-headline-color', 'ctrl-subhead-color',
    'ctrl-frame-color', 'ctrl-accent-color', 'ctrl-gradient-color1',
    'ctrl-gradient-color2', 'ctrl-gradient-color3',
    'ctrl-shadow-color',
    'ctrl-glow-color', 'ctrl-particle-color', 'ctrl-pattern-color',
    // Text effects colors
    'ctrl-text-gradient-color1', 'ctrl-text-gradient-color2',
    'ctrl-text-glow-color', 'ctrl-text-outline-color', 'ctrl-text-shadow-color',
  ]) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const hex = document.getElementById(id + '-hex');
      if (hex) hex.textContent = el.value;
      requestPreview();
    });
  }

  // Range sliders
  for (const id of [
    'ctrl-headline-size', 'ctrl-subhead-size', 'ctrl-gradient-angle',
    'ctrl-shadow-blur', 'ctrl-shadow-offset', 'ctrl-shadow-ox',
    'ctrl-glow-radius',
    'ctrl-particle-count', 'ctrl-pattern-spacing', 'ctrl-pattern-size',
    // Font weights
    'ctrl-headline-weight', 'ctrl-subhead-weight',
    // Text effects ranges
    'ctrl-text-gradient-angle',
    'ctrl-text-glow-blur', 'ctrl-text-glow-strength',
    'ctrl-text-outline-width',
    'ctrl-text-shadow-ox', 'ctrl-text-shadow-oy', 'ctrl-text-shadow-blur',
    'ctrl-text-glitch-rgb', 'ctrl-text-glitch-slices',
  ]) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = document.getElementById(id + '-val');
      if (val) val.textContent = id.includes('angle') ? el.value + '°' : el.value;
      requestPreview();
    });
  }

  // Glitch intensity has special formatting (0-100 → 0.0-1.0)
  document.getElementById('ctrl-text-glitch-intensity').addEventListener('input', (e) => {
    document.getElementById('ctrl-text-glitch-intensity-val').textContent = (parseInt(e.target.value) / 100).toFixed(1);
    requestPreview();
  });

  // Radial gradient sliders (% formatted)
  for (const id of ['ctrl-gradient-cx', 'ctrl-gradient-cy', 'ctrl-gradient-radius']) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      document.getElementById(id + '-val').textContent = el.value + '%';
      requestPreview();
    });
  }

  // %-formatted effects sliders
  for (const id of [
    'ctrl-pattern-opacity', 'ctrl-shadow-opacity', 'ctrl-glow-intensity',
    'ctrl-vignette-radius', 'ctrl-vignette-opacity', 'ctrl-grain-opacity',
  ]) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      document.getElementById(id + '-val').textContent = el.value + '%';
      requestPreview();
    });
  }

  // Gradient type change → show/hide radial controls
  document.getElementById('ctrl-gradient-type').addEventListener('change', (e) => {
    updateRadialControlsVisibility(e.target.value);
    requestPreview();
  });

  // Third color stop toggle
  document.getElementById('ctrl-gradient-color3-on').addEventListener('change', requestPreview);

  // Pattern type select
  document.getElementById('ctrl-pattern-type').addEventListener('change', requestPreview);

  // Toggles
  bindToggle('ctrl-gradient-on', 'gradient-controls');
  bindToggle('ctrl-shadow-on', 'shadow-controls');
  bindToggle('ctrl-glow-on', 'glow-controls');
  bindToggle('ctrl-particles-on', 'particle-controls');
  bindToggle('ctrl-pattern-on', 'pattern-controls');
  bindToggle('ctrl-vignette-on', 'vignette-controls');
  bindToggle('ctrl-grain-on', 'grain-controls');
  // Text effects toggles
  bindToggle('ctrl-text-gradient-on', 'text-gradient-controls');
  bindToggle('ctrl-text-glow-on', 'text-glow-controls');
  bindToggle('ctrl-text-outline-on', 'text-outline-controls');
  bindToggle('ctrl-text-shadow-on', 'text-shadow-controls');
  bindToggle('ctrl-text-glitch-on', 'text-glitch-controls');

  // Standalone toggles (no sub-controls, just trigger preview)
  for (const id of ['ctrl-text-outline-fill', 'ctrl-text-glitch-scanlines']) {
    document.getElementById(id).addEventListener('change', requestPreview);
  }

  // Layout sliders
  for (const id of [
    'ctrl-layout-text-x', 'ctrl-layout-text-y', 'ctrl-layout-text-maxw',
    'ctrl-layout-text-area', 'ctrl-layout-dev-x', 'ctrl-layout-dev-scale',
  ]) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = document.getElementById(id + '-val');
      if (val) val.textContent = el.value + '%';
      requestPreview();
    });
  }
  // Device rotation (degrees, not %)
  document.getElementById('ctrl-layout-dev-rot').addEventListener('input', (e) => {
    document.getElementById('ctrl-layout-dev-rot-val').textContent = e.target.value + '°';
    requestPreview();
  });
  // Layout alignment select
  document.getElementById('ctrl-layout-text-align').addEventListener('change', requestPreview);

  // Template change → reset layout to template defaults
  document.getElementById('ctrl-template').addEventListener('change', () => {
    const tmpl = document.getElementById('ctrl-template').value;
    loadLayoutControls(null, tmpl);
  });

  // Other selects
  document.getElementById('ctrl-frame-style').addEventListener('change', requestPreview);
  document.getElementById('ctrl-particle-shape').addEventListener('change', requestPreview);

  // Font preset select
  document.getElementById('ctrl-font-preset').addEventListener('change', (e) => {
    toggleCustomFontControls(!e.target.value);
    requestPreview();
  });

  // Font inputs (debounced more aggressively — triggers font download)
  for (const id of ['ctrl-headline-font', 'ctrl-subhead-font']) {
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doPreview, 800);
    });
  }
}

function bindToggle(toggleId, subId) {
  document.getElementById(toggleId).addEventListener('change', (e) => {
    toggleSubControls(subId, e.target.checked);
    requestPreview();
  });
}

// ── Content Layers ──

function getSceneLayers() {
  const id = state.selectedScene;
  if (!id || !state.scenes[id]) return [];
  if (!state.scenes[id].layers) state.scenes[id].layers = [];
  return state.scenes[id].layers;
}

function addLayer(layer) {
  getSceneLayers().push(layer);
  renderLayersList();
  requestPreview();
}

function removeLayer(index) {
  getSceneLayers().splice(index, 1);
  renderLayersList();
  requestPreview();
}

function renderLayersList() {
  const list = document.getElementById('layers-list');
  const layers = getSceneLayers();
  list.innerHTML = '';

  layers.forEach((layer, i) => {
    const item = document.createElement('div');
    item.className = 'layer-item';
    const label = layer.text || layer.type;
    item.innerHTML = `
      <div class="layer-info">
        <span class="layer-type">${layer.type}</span>
        <span class="layer-label">${label}</span>
      </div>
      <button class="btn-remove" data-index="${i}">&times;</button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => removeLayer(parseInt(btn.dataset.index)));
  });
}

function bindLayerButtons() {
  document.getElementById('btn-add-badge').addEventListener('click', () => {
    addLayer({
      type: 'badge', text: '#1 Puzzle', style: 'pill',
      position: { x: 0.8, y: 0.05 },
      color: '#ff4444', textColor: '#ffffff', fontSize: 24,
    });
  });

  document.getElementById('btn-add-rating').addEventListener('click', () => {
    addLayer({
      type: 'rating', stars: 4.8,
      position: { x: 0.5, y: 0.94 },
      color: '#ffcc00', size: 28, count: '12.4K',
    });
  });

  document.getElementById('btn-add-text').addEventListener('click', () => {
    addLayer({
      type: 'text', text: 'New!',
      position: { x: 0.8, y: 0.1 },
      font: { family: 'sans-serif', weight: 700, size: 20 },
      color: '#00ffcc', rotation: -15,
    });
  });

  document.getElementById('btn-add-divider').addEventListener('click', () => {
    addLayer({
      type: 'divider', y: 0.5,
      color: '#ffffff', opacity: 0.2, width: 2, length: 0.8,
    });
  });
}

// ── Collapsible Sections ──

function initCollapsibleSections() {
  document.querySelectorAll('.control-section h3').forEach(h3 => {
    h3.addEventListener('click', () => {
      h3.parentElement.classList.toggle('collapsed');
    });
  });
}

// ── Start ──

bindEvents();
bindLayerButtons();
initCollapsibleSections();
init();
