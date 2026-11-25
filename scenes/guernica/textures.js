import * as T from 'three';

// Deterministic PRNG for reproducible painterly & newsprint textures.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function wrapTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true } = {}) {
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = T.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Matte oil-on-canvas painterly texture in Picasso's 1937 monochrome palette
// (Ripolin house paint + chalky whites + bone ivory + charcoal + slate blue-grey).
function createPaintedCanvas(baseHex, accentHex, seed, { grain = 0.08, strokes = 420, charcoal = 0.09 } = {}) {
  const W = 512, H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const rand = mulberry32(seed);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, W, H);

  // Subtle canvas weave
  ctx.strokeStyle = 'rgba(0,0,0,0.035)';
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(W, i);
    ctx.stroke();
  }

  // Broad dry-brush painterly strokes
  for (let i = 0; i < strokes; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 24 + rand() * 110;
    const wid = 4 + rand() * 24;
    const ang = (rand() - 0.5) * 1.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.04 + rand() * grain;
    ctx.fillStyle = rand() > 0.35 ? accentHex : baseHex;
    ctx.fillRect(-len * 0.5, -wid * 0.5, len, wid);
    ctx.restore();
  }

  // Scratches and charcoal dry-rubs
  ctx.lineCap = 'round';
  for (let i = 0; i < 120; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const len = 10 + rand() * 55;
    const ang = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.5 ? `rgba(20,21,20,${charcoal * rand()})` : `rgba(248,245,235,${charcoal * 0.8 * rand()})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  return c;
}

// Iconic Guernica horse texture: dense vertical columns of tiny black newsprint dashes.
function createNewsprintCanvas() {
  const W = 512, H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const rand = mulberry32(19370426);

  ctx.fillStyle = '#c8c6be';
  ctx.fillRect(0, 0, W, H);

  // Subtle uneven paper wash
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(244,241,232,0.12)' : 'rgba(80,82,78,0.1)';
    ctx.fillRect(rand() * W, rand() * H, 20 + rand() * 80, 15 + rand() * 60);
  }

  // Columns of hand-painted typographic ticks (Picasso's newspaper print motif)
  const cols = 16;
  const colW = W / cols;
  ctx.strokeStyle = '#1b1d1c';
  ctx.lineCap = 'round';

  for (let col = 0; col < cols; col++) {
    const cx = col * colW + 4;
    // Column guide hairlines
    ctx.strokeStyle = 'rgba(28,30,29,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(col * colW, 0);
    ctx.lineTo(col * colW, H);
    ctx.stroke();

    ctx.strokeStyle = '#181a19';
    for (let y = 6; y < H - 4; y += 9 + rand() * 3) {
      const dashes = 2 + Math.floor(rand() * 3);
      for (let d = 0; d < dashes; d++) {
        const dx = cx + d * ((colW - 10) / dashes) + (rand() - 0.5) * 2.5;
        const dy = y + (rand() - 0.5) * 2.4;
        const len = 3.2 + rand() * 4.5;
        const tilt = (rand() - 0.5) * 0.45;
        ctx.lineWidth = 1.15 + rand() * 0.85;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx + Math.sin(tilt) * len, dy + Math.cos(tilt) * len);
        ctx.stroke();
      }
    }
  }

  return c;
}

// Tiled floor texture matching the perspective floor grid at the bottom of Guernica.
function createFloorTileCanvas() {
  const W = 512, H = 512;
  const [c, ctx] = makeCanvas(W, H);
  const rand = mulberry32(193701);

  ctx.fillStyle = '#252726';
  ctx.fillRect(0, 0, W, H);

  const cells = 4;
  const step = W / cells;
  for (let gx = 0; gx < cells; gx++) {
    for (let gy = 0; gy < cells; gy++) {
      const shade = 34 + Math.floor(rand() * 18);
      ctx.fillStyle = `rgb(${shade},${shade + 1},${shade})`;
      ctx.fillRect(gx * step + 3, gy * step + 3, step - 6, step - 6);

      // Painted distress inside tile
      for (let k = 0; k < 18; k++) {
        ctx.fillStyle = rand() > 0.5 ? 'rgba(215,213,205,0.035)' : 'rgba(8,9,9,0.09)';
        ctx.fillRect(
          gx * step + 4 + rand() * (step - 16),
          gy * step + 4 + rand() * (step - 16),
          6 + rand() * 24,
          4 + rand() * 14
        );
      }
    }
  }

  // Chalky dark grout lines (slightly irregular hand-drawn feel)
  ctx.strokeStyle = 'rgba(130,132,126,0.28)';
  ctx.lineWidth = 2.2;
  for (let i = 0; i <= cells; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p + (rand() - 0.5) * 3, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(W, p + (rand() - 0.5) * 3);
    ctx.stroke();
  }

  // Subtle ash cracks
  ctx.strokeStyle = 'rgba(12,13,13,0.45)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 14; i++) {
    let x = rand() * W, y = rand() * H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rand() - 0.5) * 35;
      y += (rand() - 0.5) * 35;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return c;
}

// Roof tile scallops seen above the central-right architectural wedge.
function createRoofTilesCanvas() {
  const W = 512, H = 256;
  const [c, ctx] = makeCanvas(W, H);
  const rand = mulberry32(193702);

  ctx.fillStyle = '#5c5f5d';
  ctx.fillRect(0, 0, W, H);

  const cols = 14, rows = 4;
  const cw = W / cols, rh = H / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cw + (r % 2 ? cw * 0.25 : 0);
      const y = r * rh;
      const v = 74 + Math.floor(rand() * 26);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 1})`;
      ctx.beginPath();
      ctx.rect(x + 2, y + 2, cw - 4, rh - 10);
      ctx.arc(x + cw * 0.5, y + rh - 10, (cw - 4) * 0.5, 0, Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#232524';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
  }

  return c;
}

// Fine bump map for raw linen canvas relief across all sculptures.
function createCanvasBump() {
  const W = 256, H = 256;
  const [c, ctx] = makeCanvas(W, H);
  const rand = mulberry32(193799);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const weave = ((x + y) % 4 === 0 ? 18 : -14) + (rand() - 0.5) * 26;
      const v = Math.max(0, Math.min(255, 128 + weave));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return c;
}

export function createPalette() {
  const textures = [];
  const materials = [];
  const regTex = t => { textures.push(t); return t; };
  const regMat = m => { materials.push(m); return m; };

  const bump = regTex(wrapTexture(createCanvasBump(), { repeatX: 3, repeatY: 3, srgb: false }));

  const makePaintedMat = (base, accent, seed, opts = {}) => {
    const tex = regTex(wrapTexture(createPaintedCanvas(base, accent, seed, opts), {
      repeatX: opts.repeat || 1,
      repeatY: opts.repeat || 1,
    }));
    return regMat(new T.MeshStandardMaterial({
      map: tex,
      bumpMap: bump,
      bumpScale: opts.bumpScale ?? 0.012,
      roughness: opts.roughness ?? 0.88,
      metalness: opts.metalness ?? 0.03,
      side: opts.doubleSided ? T.DoubleSide : T.FrontSide,
      emissive: opts.emissive ? new T.Color(opts.emissive) : new T.Color(0x000000),
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    }));
  };

  const newsTex = regTex(wrapTexture(createNewsprintCanvas(), { repeatX: 1.4, repeatY: 1.4 }));
  const floorTex = regTex(wrapTexture(createFloorTileCanvas(), { repeatX: 6, repeatY: 5 }));
  const roofTex = regTex(wrapTexture(createRoofTilesCanvas(), { repeatX: 1, repeatY: 1 }));

  const mats = {
    // Primary Guernica tonal hierarchy (from brightest chalk white to deepest coal black)
    chalk: makePaintedMat('#eceae2', '#d7d4c9', 11, { roughness: 0.84, grain: 0.09 }),
    ivory: makePaintedMat('#dedcd2', '#c3c1b7', 12, { roughness: 0.86, grain: 0.1 }),
    ashLight: makePaintedMat('#b7b8b2', '#979994', 13, { roughness: 0.88, grain: 0.11 }),
    ashMid: makePaintedMat('#7c7f7c', '#5e615f', 14, { roughness: 0.9, grain: 0.11 }),
    slate: makePaintedMat('#4f5352', '#3a3e3e', 15, { roughness: 0.92, grain: 0.1 }),
    charcoal: makePaintedMat('#282a29', '#1b1d1d', 16, { roughness: 0.93, grain: 0.09 }),
    pitch: makePaintedMat('#141616', '#0c0d0d', 17, { roughness: 0.95, grain: 0.06 }),
    ink: regMat(new T.MeshStandardMaterial({
      color: '#101111',
      roughness: 0.94,
      metalness: 0.04,
    })),

    // Special painterly surfaces
    newsprint: regMat(new T.MeshStandardMaterial({
      map: newsTex,
      bumpMap: bump,
      bumpScale: 0.015,
      roughness: 0.88,
      metalness: 0.02,
    })),
    floor: regMat(new T.MeshStandardMaterial({
      map: floorTex,
      bumpMap: bump,
      bumpScale: 0.018,
      roughness: 0.9,
      metalness: 0.04,
    })),
    roof: regMat(new T.MeshStandardMaterial({
      map: roofTex,
      bumpMap: bump,
      bumpScale: 0.02,
      roughness: 0.92,
      metalness: 0.02,
    })),

    // Luminous & flame accents (kept strictly within the monochrome/ivory-ember world)
    sunHalo: makePaintedMat('#f5f2e6', '#e4e0cf', 21, {
      roughness: 0.65,
      emissive: '#f5eed8',
      emissiveIntensity: 0.42,
    }),
    bulbGlass: regMat(new T.MeshStandardMaterial({
      color: '#fffdf2',
      emissive: '#fff4d4',
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.9,
    })),
    filament: regMat(new T.MeshBasicMaterial({ color: '#fffbe6' })),
    lampFlame: regMat(new T.MeshStandardMaterial({
      color: '#fff6de',
      emissive: '#ffdf9e',
      emissiveIntensity: 1.9,
      roughness: 0.3,
    })),
    fireLight: makePaintedMat('#ebe7dc', '#c7c3b8', 25, {
      roughness: 0.72,
      emissive: '#d8cbb4',
      emissiveIntensity: 0.25,
    }),
    fireDark: makePaintedMat('#3a3b39', '#202120', 26, {
      roughness: 0.88,
      emissive: '#4d4135',
      emissiveIntensity: 0.12,
    }),
    windowGlow: regMat(new T.MeshStandardMaterial({
      color: '#e6e3d8',
      emissive: '#dcd6c5',
      emissiveIntensity: 0.55,
      roughness: 0.7,
    })),
    flowerPetal: makePaintedMat('#f4f2ea', '#dcd9ce', 31, {
      roughness: 0.75,
      emissive: '#f0ece0',
      emissiveIntensity: 0.14,
      doubleSided: true,
    }),
    lightWedge: makePaintedMat('#e5e3da', '#ceccc2', 32, {
      roughness: 0.82,
      emissive: '#e4dfd0',
      emissiveIntensity: 0.07,
    }),
  };

  return {
    mats,
    dispose() {
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
    },
  };
}
