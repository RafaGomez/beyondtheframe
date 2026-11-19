import { PALETTE, seededRandom } from './palette.js';

export function buildLandscape(voxelWorld) {
  const rng = seededRandom(188903);
  const s = voxelWorld.voxelSize;

  // 1. FOREGROUND TERRACE & OVERLOOK (Where the player walks and explores)
  // Walkable terrace around X: [-3.5, 3.5], Z: [3.4, 7.6], Y: ~1.2 - 1.5
  const terrStartGX = voxelWorld.toGrid(-4.5);
  const terrEndGX = voxelWorld.toGrid(4.5);
  const terrStartGZ = voxelWorld.toGrid(3.2);
  const terrEndGZ = voxelWorld.toGrid(8.0);

  for (let gx = terrStartGX; gx <= terrEndGX; gx++) {
    const x = gx * s;
    for (let gz = terrStartGZ; gz <= terrEndGZ; gz++) {
      const z = gz * s;
      // Gentle slope rising towards the back
      const groundY = 1.3 + (z - 5.0) * 0.12 - (x * 0.05);
      const gy = voxelWorld.toGrid(groundY);

      // Color variation reflecting Van Gogh's diagonal impasto ground strokes
      const noise = rng();
      let color;
      if (z < 3.6) {
        color = PALETTE.terraceEdge;
      } else if (noise < 0.45) {
        color = PALETTE.groundOlive;
      } else if (noise < 0.75) {
        color = PALETTE.groundDark;
      } else {
        color = PALETTE.groundOchre;
      }

      // Fill top voxel and 2 supporting voxels beneath for a solid terrace ledge
      voxelWorld.setGridVoxel(gx, gy, gz, color, 'solid');
      voxelWorld.setGridVoxel(gx, gy - 1, gz, PALETTE.terraceStone, 'solid');
      voxelWorld.setGridVoxel(gx, gy - 2, gz, PALETTE.terraceStone, 'solid');
    }
  }

  // Stone retaining wall at the terrace edge overlooking the valley
  const wallZ = 3.3;
  const gWallZ = voxelWorld.toGrid(wallZ);
  for (let gx = terrStartGX; gx <= terrEndGX; gx++) {
    const x = gx * s;
    // Leave an opening / railing view
    const gy = voxelWorld.toGrid(1.3 - x * 0.05);
    voxelWorld.setGridVoxel(gx, gy + 1, gWallZ, PALETTE.terraceEdge, 'solid');
    if (Math.abs(x) > 1.8) {
      voxelWorld.setGridVoxel(gx, gy + 2, gWallZ, PALETTE.terraceStone, 'solid');
    }
  }

  // Small foreground night flora / wild bushes on the terrace corners
  const terraceFlora = [
    { x: -3.4, z: 4.5, r: 0.4 },
    { x: -3.1, z: 6.2, r: 0.35 },
    { x:  3.2, z: 4.8, r: 0.4 },
    { x:  2.8, z: 6.5, r: 0.3 }
  ];
  for (const f of terraceFlora) {
    voxelWorld.addEllipsoid(f.x, 1.6, f.z, f.r, f.r * 0.8, f.r, PALETTE.cypressOlive, 'solid', false);
  }

  // 2. VALLEY FLOOR (Slope descending from terrace down to village)
  // X: [-14, 18], Z: [-25, 3.0]
  const valStartGX = voxelWorld.toGrid(-16);
  const valEndGX = voxelWorld.toGrid(20);
  const valStartGZ = voxelWorld.toGrid(-25);
  const valEndGZ = voxelWorld.toGrid(3.0);

  // Stride of 1 or 2 for deep valley to keep voxel count fast and crisp
  for (let gx = valStartGX; gx <= valEndGX; gx++) {
    const x = gx * s;
    for (let gz = valStartGZ; gz <= valEndGZ; gz++) {
      const z = gz * s;

      // Surface height function
      // Smooth descent from Z = 3 down to Z = -8, then gentle rolling valley
      let height;
      if (z > -7) {
        const t = (z - (-7)) / (3 - (-7)); // 0 to 1
        height = t * 1.1 + 0.15 * Math.sin(x * 0.3);
      } else {
        height = 0.0 + 0.25 * Math.sin(x * 0.25 + z * 0.18) + 0.15 * Math.cos(x * 0.5);
      }

      const gy = voxelWorld.toGrid(height);
      const noise = rng();
      const color = noise < 0.5 ? PALETTE.groundDark : (noise < 0.8 ? PALETTE.groundOlive : PALETTE.groundOchre);
      voxelWorld.setGridVoxel(gx, gy, gz, color, 'solid');
    }
  }

  // 3. ALPILLES MOUNTAINS (The rolling, dramatic indigo ridges on the horizon)
  // Span: X in [-32, 32], Z in [-32, -48]
  const mtnStartGX = voxelWorld.toGrid(-34);
  const mtnEndGX = voxelWorld.toGrid(34);
  const mtnZ = -36.0;
  const gMtnZ = voxelWorld.toGrid(mtnZ);

  for (let gx = mtnStartGX; gx <= mtnEndGX; gx++) {
    const x = gx * s;

    // Mountain height profile matching Van Gogh's canvas:
    // Left: ~3.8m, Center dip: ~2.4m, Far Right: Dramatic peak rising to ~6.0m!
    let peakH = 2.8 + 1.2 * Math.sin(x * 0.11 - 0.4) + 0.6 * Math.cos(x * 0.23);
    if (x > 6) {
      // The famous dark cliff/mountain on the right
      const rightT = Math.min(1.0, (x - 6) / 10);
      peakH += 2.2 * rightT + 0.8 * Math.sin((x - 6) * 0.4);
    }
    if (x < -10) {
      peakH += 0.8 * Math.sin((x + 10) * 0.3);
    }

    const maxGY = voxelWorld.toGrid(peakH);
    const minGY = voxelWorld.toGrid(0.2);

    // Build mountain ridge depth (3 slices of Z)
    for (let dz = -2; dz <= 2; dz++) {
      const curGZ = gMtnZ + dz;
      const slopeFalloff = Math.abs(dz) * 0.4;
      const currentMaxGY = maxGY - voxelWorld.toGrid(slopeFalloff);

      for (let gy = minGY; gy <= currentMaxGY; gy++) {
        // Color gradient from base to crest
        const t = (gy - minGY) / (currentMaxGY - minGY + 1);
        let color;
        if (t > 0.88 && dz === 0) {
          color = PALETTE.mountainCrest; // Crest highlight
        } else if (t > 0.65) {
          color = PALETTE.mountainRidge;
        } else if (t > 0.35) {
          color = PALETTE.mountainCobalt;
        } else if (t > 0.15) {
          color = PALETTE.mountainShadow;
        } else {
          color = PALETTE.mountainDeep;
        }

        // Shell only for thickness
        if (gy >= currentMaxGY - 1 || gy === minGY || Math.abs(dz) === 2 || rng() < 0.1) {
          voxelWorld.setGridVoxel(gx, gy, curGZ, color, 'solid');
        }
      }
    }
  }

  // Second distant mountain layer (further back at Z = -45)
  const distMtnZ = -46.0;
  const gDistMtnZ = voxelWorld.toGrid(distMtnZ);
  for (let gx = mtnStartGX; gx <= mtnEndGX; gx += 2) {
    const x = gx * s;
    const peakH = 3.6 + 1.5 * Math.sin(x * 0.08 + 1.2) + 0.5 * Math.cos(x * 0.18);
    const maxGY = voxelWorld.toGrid(peakH);
    const minGY = voxelWorld.toGrid(1.5);
    for (let gy = minGY; gy <= maxGY; gy += 2) {
      voxelWorld.setGridVoxel(gx, gy, gDistMtnZ, PALETTE.mountainDeep, 'solid');
    }
  }
}
