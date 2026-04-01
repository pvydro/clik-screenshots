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
      setup: [],  // setup is only used for capture, not preview
    };
  }

  buildSceneList(config.scenes);
  buildTemplateSelect(config.templates);
  buildSizeSelect(config.sizes);
  loadThemeControls(config.theme);
  loadEffectsControls(config.theme.effects);

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
  document.getElementById('ctrl-font').value = theme.fontFamily || '';
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
    setRange('ctrl-gradient-angle', grad.angle || 180);
  }
}

function loadEffectsControls(effects) {
  if (!effects) return;
  setToggle('ctrl-shadow-on', 'shadow-controls', effects.dropShadow);
  setRange('ctrl-shadow-blur', effects.shadowBlur);
  setRange('ctrl-shadow-offset', effects.shadowOffsetY);
  setToggle('ctrl-glow-on', 'glow-controls', effects.glow);
  setColor('ctrl-glow-color', effects.glowColor);
  setRange('ctrl-glow-radius', effects.glowRadius);
  setToggle('ctrl-particles-on', 'particle-controls', effects.particles);
  setColor('ctrl-particle-color', effects.particleColor);
  setRange('ctrl-particle-count', effects.particleCount || 30);
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
  return {
    backgroundColor: document.getElementById('ctrl-bg-color').value,
    backgroundGradient: gradOn ? {
      type: document.getElementById('ctrl-gradient-type').value,
      colors: [
        document.getElementById('ctrl-gradient-color1').value,
        document.getElementById('ctrl-gradient-color2').value,
      ],
      angle: parseInt(document.getElementById('ctrl-gradient-angle').value),
    } : null,
    fontFamily: document.getElementById('ctrl-font').value || 'sans-serif',
    headlineColor: document.getElementById('ctrl-headline-color').value,
    headlineSize: parseInt(document.getElementById('ctrl-headline-size').value),
    subheadColor: document.getElementById('ctrl-subhead-color').value,
    subheadSize: parseInt(document.getElementById('ctrl-subhead-size').value),
    accentColor: document.getElementById('ctrl-accent-color').value,
    frameStyle: document.getElementById('ctrl-frame-style').value,
    frameColor: document.getElementById('ctrl-frame-color').value,
    effects: {
      dropShadow: document.getElementById('ctrl-shadow-on').checked,
      shadowBlur: parseInt(document.getElementById('ctrl-shadow-blur').value),
      shadowOffsetY: parseInt(document.getElementById('ctrl-shadow-offset').value),
      glow: document.getElementById('ctrl-glow-on').checked,
      glowColor: document.getElementById('ctrl-glow-color').value,
      glowRadius: parseInt(document.getElementById('ctrl-glow-radius').value),
      particles: document.getElementById('ctrl-particles-on').checked,
      particleColor: document.getElementById('ctrl-particle-color').value,
      particleCount: parseInt(document.getElementById('ctrl-particle-count').value),
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
    'ctrl-gradient-color2', 'ctrl-glow-color', 'ctrl-particle-color',
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
    'ctrl-shadow-blur', 'ctrl-shadow-offset', 'ctrl-glow-radius',
    'ctrl-particle-count',
  ]) {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      const val = document.getElementById(id + '-val');
      if (val) val.textContent = id.includes('angle') ? el.value + '°' : el.value;
      requestPreview();
    });
  }

  // Toggles
  bindToggle('ctrl-gradient-on', 'gradient-controls');
  bindToggle('ctrl-shadow-on', 'shadow-controls');
  bindToggle('ctrl-glow-on', 'glow-controls');
  bindToggle('ctrl-particles-on', 'particle-controls');

  // Other selects
  for (const id of ['ctrl-frame-style', 'ctrl-gradient-type']) {
    document.getElementById(id).addEventListener('change', requestPreview);
  }

  // Font input (debounced more aggressively)
  document.getElementById('ctrl-font').addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(doPreview, 800);
  });
}

function bindToggle(toggleId, subId) {
  document.getElementById(toggleId).addEventListener('change', (e) => {
    toggleSubControls(subId, e.target.checked);
    requestPreview();
  });
}

// ── Start ──

bindEvents();
init();
