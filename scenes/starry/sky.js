import { PALETTE, seededRandom } from './palette.js';

export function buildSky(voxelWorld) {
  const rng = seededRandom(188904);
  const s = voxelWorld.voxelSize;

  // Helper to add a concentric ring of voxels in the XY plane
  function addHaloRing(cx, cy, cz, radius, color, category = 'luminous', thickness = 1, density = 0.9) {
    const circumference = 2 * Math.PI * radius;
    const steps = Math.ceil(circumference / (s * 0.85));
    for (let i = 0; i < steps; i++) {
      if (rng() > density) continue;
      const angle = (i / steps) * Math.PI * 2;
      const rx = radius + (rng() - 0.5) * s * 0.5;
      const ry = radius + (rng() - 0.5) * s * 0.5;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;
      const z = cz + (rng() - 0.5) * s * 0.4;
      voxelWorld.setVoxel(x, y, z, color, category);
      if (thickness > 1) {
        voxelWorld.setVoxel(x + Math.cos(angle) * s * 0.8, y + Math.sin(angle) * s * 0.8, z, color, category);
      }
    }
  }

  // 1. THE GLOWING CRESCENT MOON (Top Right of canvas)
  const moonX = 11.8, moonY = 14.2, moonZ = -26.5;
  const moonRadius = 1.65;
  const innerShiftX = 0.55, innerShiftY = 0.45;
  const innerRadius = 1.35;

  const gMoonMinX = voxelWorld.toGrid(moonX - moonRadius * 1.5);
  const gMoonMaxX = voxelWorld.toGrid(moonX + moonRadius * 1.5);
  const gMoonMinY = voxelWorld.toGrid(moonY - moonRadius * 1.5);
  const gMoonMaxY = voxelWorld.toGrid(moonY + moonRadius * 1.5);
  const gMoonZ = voxelWorld.toGrid(moonZ);

  // Crescent solid voxels
  for (let gx = gMoonMinX; gx <= gMoonMaxX; gx++) {
    const x = gx * s;
    for (let gy = gMoonMinY; gy <= gMoonMaxY; gy++) {
      const y = gy * s;
      const outerDist = Math.hypot(x - moonX, y - moonY);
      const innerDist = Math.hypot(x - (moonX + innerShiftX), y - (moonY + innerShiftY));

      // In outer circle but outside inner cutout = crescent shape!
      if (outerDist <= moonRadius && innerDist >= innerRadius) {
        let color;
        const norm = outerDist / moonRadius;
        if (norm < 0.6) {
          color = PALETTE.moonCore;
        } else if (norm < 0.85) {
          color = PALETTE.moonGold;
        } else {
          color = PALETTE.moonOrange;
        }
        voxelWorld.setGridVoxel(gx, gy, gMoonZ, color, 'luminous');
        voxelWorld.setGridVoxel(gx, gy, gMoonZ + 1, color, 'luminous');
      }
    }
  }

  // Moon's radiant concentric halo rings
  addHaloRing(moonX, moonY, moonZ, 2.1, PALETTE.moonHaloInner, 'luminous', 2, 0.95);
  addHaloRing(moonX, moonY, moonZ, 2.7, PALETTE.moonHaloMid, 'luminous', 2, 0.9);
  addHaloRing(moonX, moonY, moonZ, 3.4, PALETTE.moonHaloOuter, 'luminous', 1, 0.85);
  addHaloRing(moonX, moonY, moonZ, 4.3, PALETTE.skyAzure, 'luminous', 1, 0.75);

  // 2. THE 11 RADIANT STARS
  const stars = [
    // Venus / Morning Star (Massive & radiant, just above the hills)
    { x:  4.6, y:  7.0, z: -23.0, r: 0.55, halos: [0.9, 1.4, 2.0, 2.7], isVenus: true },
    // Stars in celestial upper sky
    { x: -8.6, y: 16.0, z: -26.0, r: 0.35, halos: [0.7, 1.1, 1.6] },
    { x: -5.4, y: 14.6, z: -25.5, r: 0.38, halos: [0.75, 1.2, 1.7] },
    { x: -2.8, y: 11.2, z: -24.0, r: 0.32, halos: [0.65, 1.05] },
    { x:  0.2, y: 16.8, z: -27.0, r: 0.40, halos: [0.8, 1.3, 1.8] },
    { x: -1.6, y: 13.5, z: -24.5, r: 0.34, halos: [0.7, 1.15] },
    { x:  1.5, y:  9.2, z: -23.5, r: 0.36, halos: [0.75, 1.25] },
    { x:  7.0, y: 11.5, z: -25.0, r: 0.38, halos: [0.75, 1.2, 1.75] },
    { x:  9.5, y: 16.4, z: -26.5, r: 0.36, halos: [0.7, 1.15] },
    { x: 13.8, y:  9.8, z: -25.5, r: 0.38, halos: [0.75, 1.25] },
    { x: 15.4, y: 12.8, z: -27.5, r: 0.35, halos: [0.7, 1.15] }
  ];

  for (const st of stars) {
    // Star Core
    voxelWorld.addEllipsoid(st.x, st.y, st.z, st.r, st.r, st.r * 0.7, PALETTE.starCore, 'luminous', false);
    voxelWorld.addEllipsoid(st.x, st.y, st.z, st.r * 1.35, st.r * 1.35, st.r * 0.8, PALETTE.starYellow, 'luminous', true);

    // Halo Rings
    const haloColors = [PALETTE.starGold, PALETTE.moonHaloMid, PALETTE.starHaloCyan, PALETTE.skyPale];
    st.halos.forEach((radius, idx) => {
      const color = haloColors[Math.min(idx, haloColors.length - 1)];
      addHaloRing(st.x, st.y, st.z, radius, color, 'luminous', st.isVenus ? 2 : 1, 0.85);
    });
  }

  // 3. THE GREAT CELESTIAL SWIRL / VORTEX (Grouped for dynamic living motion)
  // Van Gogh's central double-spiral vortex
  const vortexCenterX = 1.4, vortexCenterY = 12.0, vortexCenterZ = -25.0;

  // Primary Archimedean/Logarithmic Spiral arms
  const spiralStreams = [
    { offsetAngle: 0,            color: PALETTE.skyWhite,  radOffset:  0.0,  maxTurns: 3.2, thick: 2 },
    { offsetAngle: 0.25,         color: PALETTE.skyPale,   radOffset:  0.35, maxTurns: 3.4, thick: 2 },
    { offsetAngle: -0.22,        color: PALETTE.skyCyan,   radOffset: -0.3,  maxTurns: 3.1, thick: 2 },
    { offsetAngle: Math.PI,      color: PALETTE.skyAzure,  radOffset:  0.2,  maxTurns: 2.8, thick: 2 },
    { offsetAngle: Math.PI + 0.3,color: PALETTE.skyRoyal,  radOffset:  0.6,  maxTurns: 2.9, thick: 2 },
    { offsetAngle: Math.PI - 0.25,color: PALETTE.skyCobalt,radOffset: -0.4,  maxTurns: 2.7, thick: 2 }
  ];

  for (const stream of spiralStreams) {
    const totalSteps = 280;
    for (let i = 0; i < totalSteps; i++) {
      const t = i / totalSteps;
      const angle = stream.offsetAngle + t * Math.PI * 2 * stream.maxTurns;
      // Spiral radius expansion
      const r = (0.4 + Math.pow(t, 0.85) * 5.8) + stream.radOffset;

      // Small organic wave perturbation
      const wave = 0.25 * Math.sin(angle * 3.5);
      const curR = r + wave;

      const x = vortexCenterX + Math.cos(angle) * curR;
      const y = vortexCenterY + Math.sin(angle) * curR * 0.82; // Elliptical flattening
      const z = vortexCenterZ + Math.sin(t * Math.PI) * 1.5;

      voxelWorld.setVoxel(x, y, z, stream.color, 'vortex');
      if (stream.thick > 1) {
        voxelWorld.setVoxel(x + (rng() - 0.5) * s, y + (rng() - 0.5) * s, z, stream.color, 'vortex');
      }
    }
  }

  // 4. HORIZONTAL SWEEPING WIND RHYTHMS (Across the middle and upper sky)
  // Large S-wave sweeping from left across to right
  for (let x = -20; x <= 18; x += s * 0.9) {
    // S-curve wave height
    const waveY1 = 11.2 + 2.3 * Math.sin(x * 0.16 + 0.4) - 0.7 * Math.cos(x * 0.32);
    const waveY2 = 13.8 + 1.8 * Math.sin(x * 0.14 + 1.2);
    const waveY3 = 16.5 + 1.2 * Math.cos(x * 0.12);

    const waveZ = -25.5 + 1.2 * Math.sin(x * 0.2);

    // Multi-color brushstroke bands
    voxelWorld.setVoxel(x, waveY1, waveZ, PALETTE.skyCyan, 'vortex');
    voxelWorld.setVoxel(x, waveY1 - s * 0.9, waveZ, PALETTE.skyAzure, 'vortex');
    voxelWorld.setVoxel(x, waveY1 + s * 0.9, waveZ, PALETTE.skyPale, 'vortex');

    voxelWorld.setVoxel(x, waveY2, waveZ - 1.0, PALETTE.skyRoyal, 'vortex');
    voxelWorld.setVoxel(x, waveY2 + s * 0.9, waveZ - 1.0, PALETTE.skyCobalt, 'vortex');

    voxelWorld.setVoxel(x, waveY3, waveZ - 2.0, PALETTE.skyCobalt, 'vortex');
    voxelWorld.setVoxel(x, waveY3 - s * 0.9, waveZ - 2.0, PALETTE.skyPrussian, 'vortex');
  }

  // 5. DEEP CELESTIAL SKY BACKGROUND DOME
  // Distant sky curtain at Z = -38 to -44
  const bgZ = -40.0;
  for (let gx = voxelWorld.toGrid(-30); gx <= voxelWorld.toGrid(30); gx += 2) {
    const x = gx * s;
    for (let gy = voxelWorld.toGrid(5.0); gy <= voxelWorld.toGrid(21.0); gy += 2) {
      const y = gy * s;
      const noise = rng();
      let color;
      if (noise < 0.6) {
        color = PALETTE.skyDeep;
      } else if (noise < 0.88) {
        color = PALETTE.skyPrussian;
      } else {
        color = PALETTE.skyCobalt;
      }
      voxelWorld.setGridVoxel(gx, gy, voxelWorld.toGrid(bgZ + (noise - 0.5) * 3), color, 'solid');
    }
  }
}
