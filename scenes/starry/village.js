import { PALETTE, seededRandom, pickRandom } from './palette.js';

export function buildVillage(voxelWorld, obstacles = []) {
  const rng = seededRandom(188902);
  const s = voxelWorld.voxelSize;

  // Helper to add a pitched roof on top of a building box
  function addPitchedRoof(cx, cz, baseMinY, width, depth, roofH, roofColor, ridgeAlongX = true) {
    const s = voxelWorld.voxelSize;
    const halfW = width / 2;
    const halfD = depth / 2;
    const startGY = voxelWorld.toGrid(baseMinY);
    const endGY = voxelWorld.toGrid(baseMinY + roofH);

    for (let gy = startGY; gy <= endGY; gy++) {
      const y = gy * s;
      const t = (y - baseMinY) / roofH; // 0 at eaves, 1 at ridge
      const slope = 1.0 - t;

      if (ridgeAlongX) {
        const curD = (halfD + 0.15) * slope;
        const minZ = cz - curD, maxZ = cz + curD;
        const minX = cx - halfW - 0.15, maxX = cx + halfW + 0.15;
        voxelWorld.addBox(minX, y, minZ, maxX, y + s, maxZ, roofColor, 'solid', false);
      } else {
        const curW = (halfW + 0.15) * slope;
        const minX = cx - curW, maxX = cx + curW;
        const minZ = cz - halfD - 0.15, maxZ = cz + halfD + 0.15;
        voxelWorld.addBox(minX, y, minZ, maxX, y + s, maxZ, roofColor, 'solid', false);
      }
    }
  }

  // Helper to build a village cottage with glowing windows
  function addHouse(cx, cz, baseY, width, depth, wallH, roofH, opts = {}) {
    const {
      wallColor = PALETTE.wallStone,
      roofColor = PALETTE.roofTerracotta,
      ridgeAlongX = true,
      hasWindows = true,
      chimney = true
    } = opts;

    const minX = cx - width / 2, maxX = cx + width / 2;
    const minZ = cz - depth / 2, maxZ = cz + depth / 2;
    const minY = baseY, maxY = baseY + wallH;

    // Walls (hollow)
    voxelWorld.addBox(minX, minY, minZ, maxX, maxY, maxZ, wallColor, 'solid', true);

    // Pitched Roof
    addPitchedRoof(cx, cz, maxY, width, depth, roofH, roofColor, ridgeAlongX);

    // Glowing warm windows (luminous voxels)
    if (hasWindows) {
      const winY = minY + wallH * 0.45;
      const glow = rng() > 0.3 ? PALETTE.windowGlowWarm : PALETTE.windowGlowAmber;

      // Front / back facing windows
      voxelWorld.setVoxel(cx - width * 0.25, winY, maxZ + s * 0.5, glow, 'luminous');
      voxelWorld.setVoxel(cx - width * 0.25, winY + s, maxZ + s * 0.5, PALETTE.windowGlowBright, 'luminous');
      if (width > 2.5) {
        voxelWorld.setVoxel(cx + width * 0.25, winY, maxZ + s * 0.5, glow, 'luminous');
        voxelWorld.setVoxel(cx + width * 0.25, winY + s, maxZ + s * 0.5, PALETTE.windowGlowBright, 'luminous');
      }

      // Side windows
      if (depth > 2.0 && rng() > 0.4) {
        voxelWorld.setVoxel(maxX + s * 0.5, winY, cz, glow, 'luminous');
      }
    }

    // Chimney with subtle smoke
    if (chimney && rng() > 0.3) {
      const chimX = cx + (ridgeAlongX ? width * 0.25 : 0);
      const chimZ = cz + (ridgeAlongX ? 0 : depth * 0.25);
      const chimBaseY = maxY + roofH * 0.5;
      voxelWorld.addBox(chimX - 0.15, chimBaseY, chimZ - 0.15, chimX + 0.15, chimBaseY + 0.7, chimZ + 0.15, PALETTE.chimneyBrick, 'solid', false);
      // Delicate smoke voxel
      voxelWorld.setVoxel(chimX, chimBaseY + 0.85, chimZ, PALETTE.smokeVoxel, 'solid');
      voxelWorld.setVoxel(chimX + 0.08, chimBaseY + 1.05, chimZ + 0.05, PALETTE.smokeVoxel, 'solid');
    }

    // Walking obstacle
    obstacles.push({
      x: cx,
      z: cz,
      radius: Math.hypot(width, depth) / 2
    });
  }

  // 1. THE CHURCH OF SAINT-RÉMY (The iconic spire of the painting)
  const churchX = 2.2, churchZ = -14.2, churchBaseY = 0.0;

  // Church Nave (Main Hall)
  const naveW = 3.4, naveD = 5.6, naveWallH = 2.6, naveRoofH = 1.8;
  voxelWorld.addBox(churchX - naveW / 2, churchBaseY, churchZ - naveD / 2, churchX + naveW / 2, churchBaseY + naveWallH, churchZ + naveD / 2, PALETTE.churchStone, 'solid', true);
  addPitchedRoof(churchX, churchZ, churchBaseY + naveWallH, naveW, naveD, naveRoofH, PALETTE.churchSpire, false);

  // Arched stained-glass church window (front portal)
  const portalZ = churchZ + naveD / 2 + s * 0.5;
  voxelWorld.addBox(churchX - 0.25, churchBaseY + 0.6, portalZ, churchX + 0.25, churchBaseY + 1.8, portalZ, PALETTE.windowGlowWarm, 'luminous', false);
  voxelWorld.setVoxel(churchX, churchBaseY + 2.0, portalZ, PALETTE.windowGlowBright, 'luminous');

  // Side arched nave windows
  for (let d = -1.6; d <= 1.6; d += 1.6) {
    voxelWorld.setVoxel(churchX + naveW / 2 + s * 0.5, churchBaseY + 1.2, churchZ + d, PALETTE.windowGlowWarm, 'luminous');
    voxelWorld.setVoxel(churchX + naveW / 2 + s * 0.5, churchBaseY + 1.2 + s, churchZ + d, PALETTE.windowGlowBright, 'luminous');
    voxelWorld.setVoxel(churchX - naveW / 2 - s * 0.5, churchBaseY + 1.2, churchZ + d, PALETTE.windowGlowWarm, 'luminous');
    voxelWorld.setVoxel(churchX - naveW / 2 - s * 0.5, churchBaseY + 1.2 + s, churchZ + d, PALETTE.windowGlowBright, 'luminous');
  }

  // Church Bell Tower
  const towerW = 2.0, towerD = 2.0, towerH = 4.8;
  const towerZ = churchZ + naveD / 2 - towerD / 2;
  voxelWorld.addBox(churchX - towerW / 2, churchBaseY, towerZ - towerD / 2, churchX + towerW / 2, churchBaseY + towerH, towerZ + towerD / 2, PALETTE.churchStone, 'solid', true);

  // Belfry louvers / openings
  voxelWorld.setVoxel(churchX, churchBaseY + 3.8, towerZ + towerD / 2 + s * 0.5, PALETTE.churchSpire, 'solid');
  voxelWorld.setVoxel(churchX, churchBaseY + 3.8, towerZ - towerD / 2 - s * 0.5, PALETTE.churchSpire, 'solid');

  // TALL CHURCH SPIRE (Pierces the horizon up to Y = 7.8!)
  const spireBaseY = churchBaseY + towerH;
  const spireTopY = 7.8;
  const spireH = spireTopY - spireBaseY;
  const spireGYStart = voxelWorld.toGrid(spireBaseY);
  const spireGYEnd = voxelWorld.toGrid(spireTopY);

  for (let gy = spireGYStart; gy <= spireGYEnd; gy++) {
    const y = gy * s;
    const progress = (y - spireBaseY) / spireH; // 0 at base, 1 at tip
    const halfBase = (towerW / 2 + 0.1) * (1.0 - Math.pow(progress, 0.85));

    const minX = churchX - halfBase, maxX = churchX + halfBase;
    const minZ = towerZ - halfBase, maxZ = towerZ + halfBase;
    voxelWorld.addBox(minX, y, minZ, maxX, y + s, maxZ, PALETTE.churchSpire, 'solid', false);
  }

  // Golden cross at the very top of the spire
  voxelWorld.setVoxel(churchX, spireTopY + s, towerZ, PALETTE.moonGold, 'luminous');
  voxelWorld.setVoxel(churchX, spireTopY + s * 2, towerZ, PALETTE.moonGold, 'luminous');
  voxelWorld.setVoxel(churchX - s, spireTopY + s * 1.5, towerZ, PALETTE.moonGold, 'luminous');
  voxelWorld.setVoxel(churchX + s, spireTopY + s * 1.5, towerZ, PALETTE.moonGold, 'luminous');

  obstacles.push({ x: churchX, z: churchZ, radius: 3.2 });

  // 2. VILLAGE COTTAGES AND HOUSES
  const cottages = [
    { x: -0.6, z: -10.5, w: 2.8, d: 2.2, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallStone, rc: PALETTE.roofTerracotta },
    { x:  0.8, z: -12.2, w: 3.2, d: 2.4, h: 2.2, rh: 1.3, rx: false, wc: PALETTE.wallPlaster, rc: PALETTE.roofRed },
    { x:  4.4, z: -12.4, w: 3.0, d: 2.2, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallSlate, rc: PALETTE.roofSlate },
    { x:  3.6, z: -16.2, w: 3.4, d: 2.6, h: 2.2, rh: 1.4, rx: false, wc: PALETTE.wallStone, rc: PALETTE.roofTerracotta },
    { x:  5.8, z: -14.6, w: 2.6, d: 2.0, h: 1.9, rh: 1.1, rx: true,  wc: PALETTE.wallPlaster, rc: PALETTE.roofRed },
    { x:  7.4, z: -16.5, w: 3.2, d: 2.5, h: 2.1, rh: 1.3, rx: true,  wc: PALETTE.wallStone, rc: PALETTE.roofTerracotta },
    { x:  1.2, z: -17.0, w: 2.8, d: 2.2, h: 2.0, rh: 1.2, rx: false, wc: PALETTE.wallSlate, rc: PALETTE.roofSlate },
    { x: -1.8, z: -13.5, w: 3.0, d: 2.3, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallPlaster, rc: PALETTE.roofRed },
    { x:  8.4, z: -18.6, w: 3.5, d: 2.8, h: 2.3, rh: 1.4, rx: false, wc: PALETTE.wallStone, rc: PALETTE.roofTerracotta },
    { x:  6.2, z: -11.0, w: 2.5, d: 2.0, h: 1.8, rh: 1.1, rx: true,  wc: PALETTE.wallSlate, rc: PALETTE.roofSlate },
    { x:  9.8, z: -15.8, w: 3.0, d: 2.2, h: 2.0, rh: 1.2, rx: false, wc: PALETTE.wallStone, rc: PALETTE.roofTerracotta },
    { x: -1.2, z: -17.2, w: 2.8, d: 2.2, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallPlaster, rc: PALETTE.roofRed },
    { x:  4.8, z: -19.0, w: 3.2, d: 2.4, h: 2.1, rh: 1.3, rx: false, wc: PALETTE.wallStone, rc: PALETTE.roofSlate },
    { x:  2.8, z: -10.4, w: 2.4, d: 1.8, h: 1.8, rh: 1.0, rx: true,  wc: PALETTE.wallSlate, rc: PALETTE.roofTerracotta },
    { x: -2.8, z: -12.0, w: 2.6, d: 2.0, h: 1.9, rh: 1.1, rx: false, wc: PALETTE.wallStone, rc: PALETTE.roofRed },
    { x: 11.2, z: -17.2, w: 3.0, d: 2.2, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallPlaster, rc: PALETTE.roofTerracotta },
    { x:  7.6, z: -13.4, w: 2.6, d: 2.0, h: 1.9, rh: 1.1, rx: false, wc: PALETTE.wallSlate, rc: PALETTE.roofSlate },
    { x:  0.0, z: -14.6, w: 3.0, d: 2.2, h: 2.0, rh: 1.2, rx: true,  wc: PALETTE.wallStone, rc: PALETTE.roofRed },
    { x: 12.4, z: -19.2, w: 3.2, d: 2.5, h: 2.1, rh: 1.3, rx: false, wc: PALETTE.wallPlaster, rc: PALETTE.roofTerracotta }
  ];

  for (const c of cottages) {
    const groundY = 0.05 + 0.1 * Math.sin(c.x * 0.4 + c.z * 0.3);
    addHouse(c.x, c.z, groundY, c.w, c.d, c.h, c.rh, {
      wallColor: c.wc,
      roofColor: c.rc,
      ridgeAlongX: c.rx,
      hasWindows: true,
      chimney: true
    });
  }

  // 3. OLIVE GROVES (Rounded clumps of foliage with Van Gogh brushstroke tones)
  const oliveTrees = [
    { x: -1.2, z: -9.0, r: 1.2 },
    { x:  0.2, z: -8.8, r: 1.4 },
    { x:  3.8, z: -9.5, r: 1.3 },
    { x:  5.2, z: -9.2, r: 1.1 },
    { x: -3.2, z: -14.2, r: 1.5 },
    { x:  8.8, z: -13.0, r: 1.4 },
    { x: 10.5, z: -14.0, r: 1.3 },
    { x:  2.0, z: -20.2, r: 1.6 },
    { x:  6.5, z: -21.0, r: 1.5 },
    { x: -0.5, z: -19.5, r: 1.4 },
    { x: 13.0, z: -16.5, r: 1.5 },
    { x: 14.2, z: -18.5, r: 1.6 }
  ];

  for (const tree of oliveTrees) {
    const gy = 0.2;
    // Trunk
    voxelWorld.addCylinder(tree.x, gy, gy + 1.2, tree.z, 0.22, PALETTE.cypressUmber, 'solid', false);
    // Olive canopy
    voxelWorld.addEllipsoid(tree.x, gy + 1.8, tree.z, tree.r, tree.r * 0.85, tree.r, PALETTE.oliveMid, 'solid', true);
    // Clustered highlights
    voxelWorld.addEllipsoid(tree.x + 0.2, gy + 2.1, tree.z - 0.2, tree.r * 0.6, tree.r * 0.5, tree.r * 0.6, PALETTE.oliveLight, 'solid', true);
  }

  // 4. LOW STONE WALLS (demarcating village terraces and gardens)
  voxelWorld.addBox(-2.5, 0.0, -10.0, 6.0, 0.45, -9.8, PALETTE.terraceStone, 'solid', false);
  voxelWorld.addBox(6.0, 0.0, -10.0, 6.2, 0.45, -13.0, PALETTE.terraceStone, 'solid', false);
  voxelWorld.addBox(7.0, 0.0, -15.0, 12.0, 0.45, -14.8, PALETTE.terraceStone, 'solid', false);
}
