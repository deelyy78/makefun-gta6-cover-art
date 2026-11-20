// Vice Panels — the editor.
//
// Wires the page's controls to the renderer in render.js: photo slots, the
// layout / grade / decor pickers, the lettering fields, per-panel framing
// (sliders or dragging on the cover itself) and the PNG export. It also
// serves the screenshot scenes: with ?shot=cover the page is only the cover
// at a post size, with ?shot=editor it is the editor with a sample photo
// loaded; either way it sets window.__shotReady once the scene is drawn.

import { POST_SIZES, PANEL_LAYOUTS, drawCoverArt } from './render.js';

const SAMPLES = {
  pier: './samples/pier.jpg',
  boulevard: './samples/boulevard.jpg',
};

const state = {
  layout: 'quad',
  grade: 'vice',
  decor: 'palms',
  title: 'SUNSET HEIST',
  caption: 'ONE LAST SCORE IN VICE TERRITORY',
  letterAt: 'bottom',
  size: 'square',
  panels: [
    { image: null, zoom: 1, panX: 0.5, panY: 0.5 },
    { image: null, zoom: 1, panX: 0.5, panY: 0.5 },
    { image: null, zoom: 1, panX: 0.5, panY: 0.5 },
  ],
};

let selectedPanel = 0;

const canvas = document.getElementById('coverCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function say(message) {
  if (status) status.textContent = message;
}

// The panels of the current layout as pixel rectangles of a width × height
// cover, gutters included the way the renderer draws them.
function panelRects(width, height) {
  const gutter = Math.max(8, Math.round(Math.min(width, height) * 0.011));
  return PANEL_LAYOUTS[state.layout].panels.map((frac) => ({
    x: Math.round(frac.x * width) + gutter / 2,
    y: Math.round(frac.y * height) + gutter / 2,
    w: Math.round(frac.w * width) - gutter,
    h: Math.round(frac.h * height) - gutter,
  }));
}

function render() {
  const size = POST_SIZES[state.size];
  if (canvas.width !== size.width) canvas.width = size.width;
  if (canvas.height !== size.height) canvas.height = size.height;
  drawCoverArt(ctx, size.width, size.height, state);
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function loadImageFromFile(file) {
  const url = URL.createObjectURL(file);
  return loadImageFromUrl(url);
}

async function setPanelPhoto(index, source) {
  try {
    state.panels[index].image = await source;
    state.panels[index].zoom = 1;
    state.panels[index].panX = 0.5;
    state.panels[index].panY = 0.5;
    selectPanel(index);
    render();
    say(`Photo set on panel ${index + 1}. Drag it on the cover to frame it.`);
  } catch {
    say('That file could not be read as an image.');
  }
}

/* ---- panel selection and framing ---- */

const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');
const panelName = document.getElementById('panelName');

function selectPanel(index) {
  const count = PANEL_LAYOUTS[state.layout].panels.length;
  selectedPanel = Math.min(index, count - 1);
  const panel = state.panels[selectedPanel];
  panelName.textContent = `Panel ${selectedPanel + 1} of ${count}`;
  zoomRange.value = String(panel.zoom);
  panXRange.value = String(panel.panX);
  panYRange.value = String(panel.panY);
}

function bindFraming() {
  const apply = () => {
    const panel = state.panels[selectedPanel];
    panel.zoom = Number(zoomRange.value);
    panel.panX = Number(panXRange.value);
    panel.panY = Number(panYRange.value);
    render();
  };
  zoomRange.addEventListener('input', apply);
  panXRange.addEventListener('input', apply);
  panYRange.addEventListener('input', apply);

  // Dragging on the cover pans the panel under the pointer; a plain click
  // selects it. Pan is stored as a fraction of the photo's slack, the same
  // numbers the sliders hold.
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const rects = panelRects(canvas.width, canvas.height);
    const hit = rects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
    if (hit < 0) return;
    selectPanel(hit);
    const panel = state.panels[hit];
    drag = { x: event.clientX, y: event.clientY, panX: panel.panX, panY: panel.panY, rect: rects[hit] };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const panel = state.panels[selectedPanel];
    if (!panel.image) return;
    const box = canvas.getBoundingClientRect();
    const dx = (event.clientX - drag.x) * (canvas.width / box.width);
    const dy = (event.clientY - drag.y) * (canvas.height / box.height);
    const scale = Math.max(drag.rect.w / panel.image.width, drag.rect.h / panel.image.height) * panel.zoom;
    const slackX = panel.image.width * scale - drag.rect.w;
    const slackY = panel.image.height * scale - drag.rect.h;
    if (slackX > 0) panel.panX = clamp01(drag.panX - dx / slackX);
    if (slackY > 0) panel.panY = clamp01(drag.panY - dy / slackY);
    panXRange.value = String(panel.panX);
    panYRange.value = String(panel.panY);
    render();
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - box.left) * (canvas.width / box.width),
    y: (event.clientY - box.top) * (canvas.height / box.height),
  };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/* ---- controls ---- */

function bindControls() {
  const photoInputs = ['photoA', 'photoB', 'photoC'].map((id) => document.getElementById(id));
  photoInputs.forEach((input, i) => {
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) setPanelPhoto(i, loadImageFromFile(input.files[0]));
    });
  });

  document.getElementById('samplePier').addEventListener('click', () => setPanelPhoto(0, loadImageFromUrl(SAMPLES.pier)));
  document.getElementById('sampleBoulevard').addEventListener('click', () => setPanelPhoto(1, loadImageFromUrl(SAMPLES.boulevard)));

  document.getElementById('layoutPick').addEventListener('change', (e) => {
    state.layout = e.target.value;
    selectPanel(selectedPanel);
    render();
  });
  document.getElementById('gradePick').addEventListener('change', (e) => {
    state.grade = e.target.value;
    render();
  });
  document.getElementById('decorPick').addEventListener('change', (e) => {
    state.decor = e.target.value;
    render();
  });
  document.getElementById('letterPick').addEventListener('change', (e) => {
    state.letterAt = e.target.value;
    render();
  });
  document.getElementById('titleText').addEventListener('input', (e) => {
    state.title = e.target.value;
    render();
  });
  document.getElementById('captionText').addEventListener('input', (e) => {
    state.caption = e.target.value;
    render();
  });
  document.getElementById('sizePick').addEventListener('change', (e) => {
    state.size = e.target.value;
    render();
    say(`Post size: ${POST_SIZES[state.size].label}.`);
  });

  document.getElementById('exportPng').addEventListener('click', exportPng);
}

function exportPng() {
  const size = POST_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  drawCoverArt(off.getContext('2d'), size.width, size.height, state);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vice-panels-${state.size}-${size.width}x${size.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    say(`Exported a ${size.width} × ${size.height} PNG.`);
  }, 'image/png');
}

/* ---- screenshot scenes ---- */

function sizeKeyFor(dims) {
  for (const [key, size] of Object.entries(POST_SIZES)) {
    if (`${size.width}x${size.height}` === dims) return key;
  }
  return 'square';
}

async function runShotScene(params) {
  const scene = params.get('shot');
  const photoName = params.get('photo') === 'boulevard' ? 'boulevard' : 'pier';
  const otherName = photoName === 'pier' ? 'boulevard' : 'pier';
  if (params.get('caption')) state.title = params.get('caption').toUpperCase();
  if (params.get('layout') && PANEL_LAYOUTS[params.get('layout')]) state.layout = params.get('layout');

  document.body.classList.add('shot');

  if (scene === 'cover') {
    document.body.classList.add('shot-cover');
    state.size = sizeKeyFor(params.get('size') || '1080x1080');
    if (params.get('grade')) state.grade = params.get('grade');
    state.caption = 'A VICE PANELS COVER';
    const [main, other] = await Promise.all([
      loadImageFromUrl(SAMPLES[photoName]),
      loadImageFromUrl(SAMPLES[otherName]),
    ]);
    state.panels[0].image = main;
    state.panels[1].image = other;
    state.panels[2].image = main;
    state.panels[2].zoom = 1.4;
    state.panels[2].panX = 0.3;
    state.panels[2].panY = 0.35;
  } else {
    document.body.classList.add('shot-editor');
    const [main, other] = await Promise.all([
      loadImageFromUrl(SAMPLES[photoName]),
      loadImageFromUrl(SAMPLES[otherName]),
    ]);
    state.panels[0].image = main;
    state.panels[1].image = other;
    state.caption = 'SHOT ON THE BOULEVARD, GRADED AT SUNSET';
    selectPanel(0);
  }

  render();
  requestAnimationFrame(() => {
    window.__shotReady = true;
    document.body.dataset.shotReady = 'true';
  });
}

/* ---- go ---- */

const params = new URLSearchParams(location.search);
bindControls();
bindFraming();
selectPanel(0);
if (params.get('shot')) {
  runShotScene(params);
} else {
  render();
}
