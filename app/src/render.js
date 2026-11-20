// Vice Panels — the cover renderer.
//
// Everything the cover is made of lives here and is drawn with plain canvas
// calls: the multi-panel layout, one photo per panel framed by zoom and pan,
// a colour grade washed over the photography, drawn decor (a sun disc, palm
// silhouettes, a skyline) and the bold caption lettering. The module is pure
// drawing — it holds no state and touches no DOM beyond the canvas context it
// is handed — so the editor, the export path and the screenshot scenes all
// render through the one function, drawCoverArt.

export const POST_SIZES = {
  square: { width: 1080, height: 1080, label: 'Square 1080 × 1080' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 1080 × 1350' },
  wide: { width: 1920, height: 1080, label: 'Wide 1920 × 1080' },
};

// Panel rectangles as fractions of the cover. The GTA poster look is an
// asymmetric collage, so no two layouts divide the page the same way twice.
export const PANEL_LAYOUTS = {
  quad: {
    label: 'Quad — hero left, two stacked right',
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.58, y: 0, w: 0.42, h: 0.52 },
      { x: 0.58, y: 0.52, w: 0.42, h: 0.48 },
    ],
  },
  trio: {
    label: 'Trio — three vertical strips',
    panels: [
      { x: 0, y: 0, w: 0.34, h: 1 },
      { x: 0.34, y: 0, w: 0.33, h: 1 },
      { x: 0.67, y: 0, w: 0.33, h: 1 },
    ],
  },
  duo: {
    label: 'Duo — wide top, two below',
    panels: [
      { x: 0, y: 0, w: 1, h: 0.55 },
      { x: 0, y: 0.55, w: 0.5, h: 0.45 },
      { x: 0.5, y: 0.55, w: 0.5, h: 0.45 },
    ],
  },
  hero: {
    label: 'Hero — one full-bleed panel',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
};

// A grade is a camera filter for the photography, a wash of colour laid over
// it, the sky an empty panel is painted with, and the two colours the title
// lettering blends between.
export const COLOUR_GRADES = {
  vice: {
    label: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.12) brightness(1.03)',
    washTop: 'rgba(255, 94, 138, 0.20)',
    washBottom: 'rgba(64, 22, 110, 0.30)',
    sky: ['#2b1055', '#7597de', '#ff7e5f', '#feb47b'],
    title: ['#fff3b0', '#ff5e8a'],
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) contrast(1.22) brightness(0.98) hue-rotate(-10deg)',
    washTop: 'rgba(47, 212, 196, 0.16)',
    washBottom: 'rgba(255, 79, 216, 0.22)',
    sky: ['#050914', '#0d2b52', '#7b2ff7', '#ff4fd8'],
    title: ['#d8fff8', '#ff4fd8'],
  },
  golden: {
    label: 'Golden Hour',
    filter: 'sepia(0.32) saturate(1.42) contrast(1.06) brightness(1.09)',
    washTop: 'rgba(255, 179, 71, 0.18)',
    washBottom: 'rgba(120, 53, 15, 0.26)',
    sky: ['#3a1c71', '#d76d77', '#ffaf7b', '#ffe29f'],
    title: ['#fff6c9', '#ff9a3d'],
  },
  chrome: {
    label: 'Midnight Chrome',
    filter: 'saturate(0.62) contrast(1.28) brightness(0.94)',
    washTop: 'rgba(127, 178, 255, 0.14)',
    washBottom: 'rgba(4, 10, 30, 0.38)',
    sky: ['#020617', '#0f2a4a', '#33547d', '#7fb2ff'],
    title: ['#f2f8ff', '#7fb2ff'],
  },
  grit: {
    label: 'Newsprint Grit',
    filter: 'grayscale(0.9) contrast(1.32) brightness(1.04)',
    washTop: 'rgba(255, 255, 255, 0.05)',
    washBottom: 'rgba(0, 0, 0, 0.30)',
    sky: ['#1c1c1c', '#4d4d4d', '#8a8a8a', '#d9d9d9'],
    title: ['#ffffff', '#c9c9c9'],
  },
};

const GUTTER_FRACTION = 0.011;
const FRAME_COLOUR = '#07070c';

// A tiny deterministic random source: the decor must land identically on
// every render, so nothing here ever calls Math.random.
function seededRandom(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// The sky an empty panel wears: the grade's colours run top to bottom, a low
// sun glows over a dark sea band. It keeps a cover handsome before the reader
// has added a single photo of their own.
function paintBackdrop(ctx, rect, grade, panelIndex) {
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.45, grade.sky[1]);
  sky.addColorStop(0.78, grade.sky[2]);
  sky.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const sunX = rect.x + rect.w * (0.3 + 0.2 * panelIndex);
  const sunY = rect.y + rect.h * 0.72;
  const sunR = Math.min(rect.w, rect.h) * 0.26;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.1);
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 190, 120, 0.55)');
  glow.addColorStop(1, 'rgba(255, 160, 110, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.fillStyle = 'rgba(10, 8, 24, 0.88)';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.8, rect.w, rect.h * 0.2);
}

// Draw one panel: the backdrop, then the reader's photo framed by its zoom
// and pan, then the grade's wash over both.
function paintPanel(ctx, rect, panel, grade, panelIndex) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();

  paintBackdrop(ctx, rect, grade, panelIndex);

  const img = panel.image;
  if (img && img.width > 0 && img.height > 0) {
    const zoom = Math.max(1, panel.zoom || 1);
    const scale = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
    const drawnW = img.width * scale;
    const drawnH = img.height * scale;
    const dx = rect.x + (rect.w - drawnW) * (panel.panX ?? 0.5);
    const dy = rect.y + (rect.h - drawnH) * (panel.panY ?? 0.5);
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, drawnW, drawnH);
    ctx.filter = 'none';
  }

  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  ctx.restore();

  // A hairline of light on the panel's top edge sells the printed-poster feel.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.fillRect(rect.x, rect.y, rect.w, 2);
}

// A palm in silhouette: a leaning trunk and a crown of drooping fronds, drawn
// with strokes so it reads at any size.
function paintPalm(ctx, baseX, baseY, height, flip) {
  const lean = height * 0.16 * flip;
  const crownX = baseX + lean;
  const crownY = baseY - height;
  ctx.strokeStyle = '#08080f';
  ctx.lineCap = 'round';

  ctx.lineWidth = height * 0.045;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * 0.3, baseY - height * 0.6, crownX, crownY);
  ctx.stroke();

  ctx.lineWidth = height * 0.026;
  const fronds = [-2.6, -2.1, -1.55, -1.0, -0.45, 0.05, 0.5];
  for (const angle of fronds) {
    const reach = height * (0.42 + 0.1 * Math.cos(angle));
    const endX = crownX + Math.cos(angle) * reach * flip;
    const endY = crownY + Math.sin(angle) * reach * 0.55 + height * 0.17;
    const midX = crownX + Math.cos(angle) * reach * 0.5 * flip;
    const midY = crownY + Math.sin(angle) * reach * 0.3 - height * 0.06;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }

  ctx.fillStyle = '#08080f';
  for (const off of [-0.03, 0.035]) {
    ctx.beginPath();
    ctx.arc(crownX + height * off, crownY + height * 0.03, height * 0.032, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A city skyline in silhouette along the cover's foot, its windows lit by the
// seeded pattern so every render agrees.
function paintSkyline(ctx, width, height) {
  const rand = seededRandom(20261120);
  const baseY = height;
  const bandTop = height * 0.8;
  ctx.fillStyle = '#07070d';
  let x = -width * 0.02;
  const windows = [];
  while (x < width * 1.02) {
    const bw = width * (0.03 + rand() * 0.05);
    const bh = height * (0.05 + rand() * 0.15);
    ctx.fillRect(x, baseY - bh, bw, bh);
    if (rand() > 0.55) ctx.fillRect(x + bw * 0.3, baseY - bh - height * 0.018, bw * 0.4, height * 0.018);
    for (let wy = baseY - bh + height * 0.012; wy < baseY - height * 0.012; wy += height * 0.02) {
      for (let wx = x + bw * 0.16; wx < x + bw * 0.84; wx += width * 0.009) {
        if (rand() > 0.62) windows.push([wx, wy]);
      }
    }
    x += bw + width * 0.004;
  }
  ctx.fillStyle = 'rgba(255, 214, 140, 0.9)';
  const winW = Math.max(2, width * 0.0035);
  const winH = Math.max(2, height * 0.006);
  for (const [wx, wy] of windows) ctx.fillRect(wx, wy, winW, winH);
  void bandTop;
}

// The big sun disc of the sunset posters, drawn over the panels and under the
// lettering: a hard disc with a soft halo. It sits on a panel seam where the
// layout has one, so it brands the collage instead of covering a face.
function paintSunDisc(ctx, width, height, seamX, sunY) {
  const cx = width * seamX;
  const cy = height * sunY;
  const r = Math.min(width, height) * 0.145;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.3);
  halo.addColorStop(0, 'rgba(255, 190, 110, 0.5)');
  halo.addColorStop(1, 'rgba(255, 150, 100, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - r * 2.3, cy - r * 2.3, r * 4.6, r * 4.6);

  const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, '#ffe9a8');
  disc.addColorStop(0.6, '#ffb347');
  disc.addColorStop(1, '#ff5e8a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// Fit a line of lettering to a target width by shrinking its font size.
function fitFontSize(ctx, text, weight, maxWidth, startPx, family) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px *= 0.94;
  }
  return px;
}

const TITLE_FAMILY = '"Arial Narrow", "Liberation Sans Narrow", Impact, "Franklin Gothic Medium", sans-serif';
const CAPTION_FAMILY = '"Helvetica Neue", Arial, sans-serif';

// The lettering: a letterspaced caption over a huge condensed title with a
// gradient face and a hard black outline, slightly skewed like a poster.
function paintLettering(ctx, width, height, art, grade) {
  const title = (art.title || '').trim();
  const caption = (art.caption || '').trim();
  if (!title && !caption) return;

  const atTop = art.letterAt === 'top';
  const centreX = width / 2;

  // A soft dark band behind the words keeps them readable on any photo.
  const bandH = height * 0.3;
  const band = ctx.createLinearGradient(0, atTop ? 0 : height - bandH, 0, atTop ? bandH : height);
  if (atTop) {
    band.addColorStop(0, 'rgba(4, 4, 12, 0.62)');
    band.addColorStop(1, 'rgba(4, 4, 12, 0)');
  } else {
    band.addColorStop(0, 'rgba(4, 4, 12, 0)');
    band.addColorStop(1, 'rgba(4, 4, 12, 0.62)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, atTop ? 0 : height - bandH, width, bandH);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const titlePx = title
    ? fitFontSize(ctx, title.toUpperCase(), 900, width * 0.9, height * 0.155, TITLE_FAMILY)
    : 0;
  const captionPx = Math.max(13, height * 0.026);

  const titleBaseline = atTop ? height * 0.05 + titlePx : height * 0.945;
  const captionBaseline = atTop ? titleBaseline + captionPx * 1.7 : titleBaseline - titlePx - captionPx * 0.9;

  if (caption) {
    ctx.font = `700 ${captionPx}px ${CAPTION_FAMILY}`;
    try { ctx.letterSpacing = `${Math.round(captionPx * 0.32)}px`; } catch { /* older engines */ }
    ctx.lineWidth = captionPx * 0.14;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = '#ffffff';
    ctx.strokeText(caption.toUpperCase(), centreX, captionBaseline);
    ctx.fillText(caption.toUpperCase(), centreX, captionBaseline);
    try { ctx.letterSpacing = '0px'; } catch { /* older engines */ }
  }

  if (title) {
    ctx.translate(centreX, titleBaseline);
    ctx.transform(1, 0, -0.07, 1, 0, 0);
    ctx.scale(0.86, 1);
    ctx.font = `900 ${titlePx}px ${TITLE_FAMILY}`;
    const face = ctx.createLinearGradient(0, -titlePx, 0, titlePx * 0.25);
    face.addColorStop(0, grade.title[0]);
    face.addColorStop(1, grade.title[1]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = titlePx * 0.12;
    ctx.shadowOffsetY = titlePx * 0.05;
    ctx.lineWidth = titlePx * 0.075;
    ctx.strokeStyle = '#0a0a10';
    ctx.lineJoin = 'round';
    ctx.strokeText(title.toUpperCase(), 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = face;
    ctx.fillText(title.toUpperCase(), 0, 0);

    // The accent rule under the title, in the grade's hot colour.
    const ruleW = Math.min(width * 0.62, ctx.measureText(title.toUpperCase()).width * 0.86);
    ctx.fillStyle = grade.title[1];
    ctx.fillRect(-ruleW / 2, titlePx * 0.16, ruleW, Math.max(3, titlePx * 0.055));
  }

  ctx.restore();
}

// Draw the whole cover into a 2d context at the given pixel size. `art` is
// the editor's plain state: layout and grade are keys of the tables above,
// panels carry an image (or null) with zoom and pan, decor is 'palms',
// 'skyline' or 'clean', letterAt is 'top' or 'bottom'.
export function drawCoverArt(ctx, width, height, art) {
  const layout = PANEL_LAYOUTS[art.layout] ?? PANEL_LAYOUTS.quad;
  const grade = COLOUR_GRADES[art.grade] ?? COLOUR_GRADES.vice;
  const gutter = Math.max(8, Math.round(Math.min(width, height) * GUTTER_FRACTION));

  ctx.fillStyle = FRAME_COLOUR;
  ctx.fillRect(0, 0, width, height);

  layout.panels.forEach((frac, i) => {
    const rect = {
      x: Math.round(frac.x * width) + gutter / 2,
      y: Math.round(frac.y * height) + gutter / 2,
      w: Math.round(frac.w * width) - gutter,
      h: Math.round(frac.h * height) - gutter,
    };
    const panel = art.panels[i] ?? { image: null, zoom: 1, panX: 0.5, panY: 0.5 };
    paintPanel(ctx, rect, panel, grade, i);
  });

  if (art.decor === 'palms') {
    const seamX = art.layout === 'quad' ? 0.58 : art.layout === 'trio' ? 0.34 : 0.5;
    // Portrait covers carry their faces in the top strips, so the sun rides
    // lower there, over torsos and sea; landscape and square keep it high.
    const sunY = height > width ? 0.55 : 0.29;
    paintSunDisc(ctx, width, height, seamX, sunY);
    paintPalm(ctx, width * 0.045, height * 1.005, height * 0.3, 1);
    paintPalm(ctx, width * 0.965, height * 1.005, height * 0.24, -1);
  } else if (art.decor === 'skyline') {
    paintSkyline(ctx, width, height);
  }

  // A gentle vignette settles the collage before the words go on.
  const vig = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.74,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  paintLettering(ctx, width, height, art, grade);

  // The frame: a black keyline and one hot pinstripe inside it.
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = Math.max(6, gutter * 0.8);
  ctx.strokeRect(0, 0, width, height);
  ctx.strokeStyle = grade.title[1];
  ctx.lineWidth = Math.max(2, gutter * 0.22);
  ctx.strokeRect(gutter * 0.55, gutter * 0.55, width - gutter * 1.1, height - gutter * 1.1);
}
