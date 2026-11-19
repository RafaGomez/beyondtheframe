import * as T from 'three';
import { PALETTE, createRNG, varyColor } from './palette.js';
import { createDabGeometry, createCurvedStrokeGeometry, BrushBatch } from './brush.js';

export function buildVillage(world) {
  const rng = createRNG(188940);
  const villageGroup = new T.Group();
  villageGroup.name = 'village-brush-group';

  // 1. Batches for village structures
  // Wall stone dab geometry
  const wallDabGeo = createDabGeometry(0.65, 0.28, 0.05);
  const wallBatch = new BrushBatch(wallDabGeo, 750, {
    roughness: 0.85,
    metalness: 0.02
  });

  // Roof stroke geometry (angled sloped strokes)
  const roofStrokeGeo = createCurvedStrokeGeometry({ length: 0.85, width: 0.32, curvature: 0.08 });
  const roofBatch = new BrushBatch(roofStrokeGeo, 650, {
    roughness: 0.78,
    metalness: 0.04
  });

  // Radiant glowing window marks (emissive rectangular brushstrokes)
  const windowGeo = createDabGeometry(0.32, 0.22, 0.04);
  const windowBatch = new BrushBatch(windowGeo, 160, {
    roughness: 0.3,
    metalness: 0.1,
    emissive: true
  });

  // Village vegetation / garden dabs
  const gardenGeo = createCurvedStrokeGeometry({ length: 0.7, width: 0.24, curvature: 0.2 });
  const gardenBatch = new BrushBatch(gardenGeo, 350, {
    roughness: 0.82,
    metalness: 0.02
  });

  // Helper to build a painterly village cottage
  function addHouse(cx, cz, baseY, width, depth, height, roofH, {
    wallColor = PALETTE.wallStone,
    roofColor = PALETTE.roofTerracotta,
    windows = true,
    ridgeX = true
  } = {}) {
    // Walls built out of horizontal stone stroke courses
    const halfW = width * 0.5, halfD = depth * 0.5;
    const courses = Math.max(3, Math.round(height / 0.24));

    for (let c = 0; c < courses; c++) {
      const y = baseY + (c + 0.5) * (height / courses);

      // Front & Back wall strokes
      for (let x = -halfW + 0.25; x <= halfW - 0.25; x += 0.5) {
        wallBatch.addStroke({
          position: new T.Vector3(cx + x, y, cz + halfD),
          rotation: [0, 0, (rng() - 0.5) * 0.05],
          scale: [0.95, 1.0, 1.0],
          color: varyColor(wallColor, 0.015, 0.05, 0.05, rng)
        });
        wallBatch.addStroke({
          position: new T.Vector3(cx + x, y, cz - halfD),
          rotation: [0, Math.PI, (rng() - 0.5) * 0.05],
          scale: [0.95, 1.0, 1.0],
          color: varyColor(wallColor, 0.015, 0.05, 0.05, rng)
        });
      }

      // Left & Right wall strokes
      for (let z = -halfD + 0.25; z <= halfD - 0.25; z += 0.5) {
        wallBatch.addStroke({
          position: new T.Vector3(cx - halfW, y, cz + z),
          rotation: [0, Math.PI * 0.5, (rng() - 0.5) * 0.05],
          scale: [0.95, 1.0, 1.0],
          color: varyColor(wallColor, 0.015, 0.05, 0.05, rng)
        });
        wallBatch.addStroke({
          position: new T.Vector3(cx + halfW, y, cz + z),
          rotation: [0, -Math.PI * 0.5, (rng() - 0.5) * 0.05],
          scale: [0.95, 1.0, 1.0],
          color: varyColor(wallColor, 0.015, 0.05, 0.05, rng)
        });
      }
    }

    // Pitched Roof strokes
    const roofBaseY = baseY + height;
    const roofSteps = 5;
    for (let r = 0; r <= roofSteps; r++) {
      const t = r / roofSteps;
      const y = roofBaseY + t * roofH;
      const slope = 1.0 - t;

      if (ridgeX) {
        const d = (halfD + 0.15) * slope;
        for (let x = -halfW - 0.1; x <= halfW + 0.1; x += 0.5) {
          // Left slope & Right slope
          const dir1 = new T.Vector3(1, 0, 0).normalize();
          const norm1 = new T.Vector3(0, halfD, roofH).normalize();
          roofBatch.addDirectedStroke(new T.Vector3(cx + x, y, cz + d), dir1, norm1, [0.9, 0.9, 1.0], roofColor);
          const norm2 = new T.Vector3(0, halfD, -roofH).normalize();
          roofBatch.addDirectedStroke(new T.Vector3(cx + x, y, cz - d), dir1, norm2, [0.9, 0.9, 1.0], roofColor);
        }
      } else {
        const w = (halfW + 0.15) * slope;
        for (let z = -halfD - 0.1; z <= halfD + 0.1; z += 0.5) {
          const dir = new T.Vector3(0, 0, 1).normalize();
          const norm1 = new T.Vector3(halfW, roofH, 0).normalize();
          roofBatch.addDirectedStroke(new T.Vector3(cx + w, y, cz + z), dir, norm1, [0.9, 0.9, 1.0], roofColor);
          const norm2 = new T.Vector3(-halfW, roofH, 0).normalize();
          roofBatch.addDirectedStroke(new T.Vector3(cx - w, y, cz + z), dir, norm2, [0.9, 0.9, 1.0], roofColor);
        }
      }
    }

    // Glowing warm windows
    if (windows) {
      const winY = baseY + height * 0.52;
      const glowCol = rng() < 0.6 ? PALETTE.windowGlowWarm : (rng() < 0.85 ? PALETTE.windowGlowBright : PALETTE.windowGlowAmber);

      windowBatch.addStroke({
        position: new T.Vector3(cx - halfW * 0.45, winY, cz + halfD + 0.04),
        rotation: [0, 0, 0],
        scale: [1.0, 1.0, 1.0],
        color: glowCol
      });

      if (width > 1.4) {
        windowBatch.addStroke({
          position: new T.Vector3(cx + halfW * 0.45, winY, cz + halfD + 0.04),
          rotation: [0, 0, 0],
          scale: [1.0, 1.0, 1.0],
          color: glowCol
        });
      }
    }
  }

  // 2. THE ICONIC CHURCH & GOTHIC SPIRE (Saint-Rémy)
  // Positioned around X: 2.8, Z: -14.5
  const churchX = 2.8, churchZ = -14.5, churchBaseY = 0.65;

  // Church Nave & Transept
  addHouse(churchX, churchZ, churchBaseY, 2.8, 1.8, 1.4, 0.9, {
    wallColor: PALETTE.churchStone,
    roofColor: PALETTE.churchRoof,
    windows: false,
    ridgeX: true
  });

  // Church Tower base (square tower rising up)
  const towerW = 0.95;
  const towerH = 2.2;
  const towerBaseY = churchBaseY;
  for (let c = 0; c < 8; c++) {
    const y = towerBaseY + c * 0.28;
    wallBatch.addStroke({ position: new T.Vector3(churchX + 0.5, y, churchZ + towerW * 0.5), scale: [0.9, 1, 1], color: PALETTE.churchStone });
    wallBatch.addStroke({ position: new T.Vector3(churchX + 0.5, y, churchZ - towerW * 0.5), scale: [0.9, 1, 1], color: PALETTE.churchStone });
  }

  // The soaring needle-sharp gothic spire piercing the sky up to Y = 6.8!
  const spireBaseY = towerBaseY + towerH;
  const spireTopY = 6.8;
  const spireSteps = 18;
  for (let s = 0; s < spireSteps; s++) {
    const t = s / (spireSteps - 1);
    const y = spireBaseY + t * (spireTopY - spireBaseY);
    const r = (towerW * 0.55) * Math.pow(1.0 - t, 0.85);

    // 4 facets for the spire
    for (let f = 0; f < 4; f++) {
      const a = (f / 4) * Math.PI * 2 + Math.PI * 0.25;
      const x = churchX + 0.5 + Math.cos(a) * r;
      const z = churchZ + Math.sin(a) * r;

      const dir = new T.Vector3(0, 1, 0);
      const norm = new T.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize();
      const spireCol = t > 0.7 ? PALETTE.churchSpire : PALETTE.churchRoof;

      roofBatch.addDirectedStroke(new T.Vector3(x, y, z), dir, norm, [(1.0 - t * 0.65) * 0.8, 0.6, 1.0], spireCol);
    }
  }

  // 3. VILLAGE COTTAGES CLUSTER (Arranged in picturesque layers)
  const cottages = [
    // Front row cottages
    { cx:  0.8, cz: -13.2, y: 0.85, w: 1.5, d: 1.2, h: 1.05, rh: 0.75, wall: PALETTE.wallStone, roof: PALETTE.roofTerracotta },
    { cx: -0.9, cz: -13.8, y: 0.75, w: 1.6, d: 1.3, h: 1.1,  rh: 0.8,  wall: PALETTE.wallPlaster, roof: PALETTE.roofRedOchre },
    { cx:  4.6, cz: -13.6, y: 0.8,  w: 1.4, d: 1.2, h: 1.0,  rh: 0.7,  wall: PALETTE.wallSlate, roof: PALETTE.roofSlateBlue },
    { cx:  6.4, cz: -14.2, y: 0.75, w: 1.7, d: 1.4, h: 1.15, rh: 0.85, wall: PALETTE.wallStone, roof: PALETTE.roofTerracotta },
    { cx:  8.5, cz: -14.6, y: 0.7,  w: 1.8, d: 1.3, h: 1.05, rh: 0.75, wall: PALETTE.wallPlaster, roof: PALETTE.roofRedOchre },

    // Middle row cottages
    { cx:  0.2, cz: -15.5, y: 0.6,  w: 1.4, d: 1.1, h: 0.95, rh: 0.65, wall: PALETTE.wallDark, roof: PALETTE.roofDarkSlate },
    { cx: -1.8, cz: -15.2, y: 0.65, w: 1.5, d: 1.2, h: 1.0,  rh: 0.7,  wall: PALETTE.wallSlate, roof: PALETTE.roofTerracotta },
    { cx:  4.8, cz: -15.8, y: 0.55, w: 1.6, d: 1.3, h: 1.0,  rh: 0.7,  wall: PALETTE.wallStone, roof: PALETTE.roofSlateBlue },
    { cx:  7.2, cz: -16.2, y: 0.5,  w: 1.5, d: 1.2, h: 0.95, rh: 0.65, wall: PALETTE.wallPlaster, roof: PALETTE.roofRedOchre },
    { cx: 10.2, cz: -15.8, y: 0.55, w: 1.7, d: 1.4, h: 1.1,  rh: 0.8,  wall: PALETTE.wallDark, roof: PALETTE.roofTerracotta },

    // Back row cottages
    { cx:  1.6, cz: -17.2, y: 0.45, w: 1.3, d: 1.0, h: 0.85, rh: 0.6,  wall: PALETTE.wallStone, roof: PALETTE.roofDarkSlate },
    { cx:  3.6, cz: -17.6, y: 0.4,  w: 1.4, d: 1.1, h: 0.9,  rh: 0.65, wall: PALETTE.wallSlate, roof: PALETTE.roofSlateBlue },
    { cx:  5.9, cz: -17.8, y: 0.4,  w: 1.5, d: 1.2, h: 0.9,  rh: 0.65, wall: PALETTE.wallPlaster, roof: PALETTE.roofTerracotta }
  ];

  cottages.forEach(c => addHouse(c.cx, c.cz, c.y, c.w, c.d, c.h, c.rh, {
    wallColor: c.wall,
    roofColor: c.roof,
    windows: true
  }));

  // 4. Little garden olive trees & shrubs nestled between village houses
  const gardenSpots = [
    { x: -0.1, z: -12.6, r: 0.65 },
    { x:  2.1, z: -13.0, r: 0.55 },
    { x:  3.8, z: -13.2, r: 0.6 },
    { x:  5.6, z: -13.8, r: 0.65 },
    { x:  7.6, z: -14.0, r: 0.55 },
    { x:  9.6, z: -15.0, r: 0.6 }
  ];

  for (const g of gardenSpots) {
    for (let i = 0; i < 28; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.pow(rng(), 0.7) * g.r;
      const x = g.x + Math.cos(a) * d;
      const z = g.z + Math.sin(a) * d;
      const y = 0.85 + (1.0 - d / g.r) * 0.55 + (rng() - 0.5) * 0.15;

      const dir = new T.Vector3(Math.cos(a) * 0.4, 0.85, Math.sin(a) * 0.4).normalize();
      const col = rng() < 0.4 ? PALETTE.oliveDark : (rng() < 0.8 ? PALETTE.oliveMid : PALETTE.oliveLight);
      gardenBatch.addDirectedStroke(new T.Vector3(x, y, z), dir, new T.Vector3(0, 1, 0), 0.75 + rng() * 0.3, col);
    }
  }

  wallBatch.finalize();
  roofBatch.finalize();
  windowBatch.finalize();
  gardenBatch.finalize();

  villageGroup.add(wallBatch.mesh, roofBatch.mesh, windowBatch.mesh, gardenBatch.mesh);
  world.add(villageGroup);

  return {
    villageGroup,
    dispose() {
      wallBatch.dispose();
      roofBatch.dispose();
      windowBatch.dispose();
      gardenBatch.dispose();
      villageGroup.removeFromParent();
    }
  };
}
