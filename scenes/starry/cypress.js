import { PALETTE, seededRandom, pickRandom } from './palette.js';

export function buildCypress(voxelWorld, obstacles = []) {
  const rng = seededRandom(188901);
  const s = voxelWorld.voxelSize;

  // Obstacle for player movement collision
  obstacles.push({
    x: -2.6,
    z: 2.3,
    radius: 1.4
  });

  // Color selection matching Van Gogh's thick impasto strokes
  const colors = [
    PALETTE.cypressBlack,
    PALETTE.cypressDark,
    PALETTE.cypressDeepGreen,
    PALETTE.cypressForest,
    PALETTE.cypressOlive,
    PALETTE.cypressUmber
  ];

  function getStrokeColor(angle, y, distRatio) {
    const r = rng();
    if (distRatio > 0.85) {
      // Outer tips catch subtle moonlight highlights
      if (r < 0.4) return PALETTE.cypressHighlight;
      if (r < 0.7) return PALETTE.cypressOlive;
      return PALETTE.cypressForest;
    }
    if (r < 0.35) return PALETTE.cypressDark;
    if (r < 0.65) return PALETTE.cypressDeepGreen;
    if (r < 0.85) return PALETTE.cypressForest;
    if (r < 0.95) return PALETTE.cypressUmber;
    return PALETTE.cypressBlack;
  }

  // 1. Main Spire (tall towering column reaching Y = 9.2)
  const minY = -1.4, maxY = 9.2, totalH = maxY - minY;
  const startGY = voxelWorld.toGrid(minY);
  const endGY = voxelWorld.toGrid(maxY);

  for (let gy = startGY; gy <= endGY; gy++) {
    const y = gy * s;
    const progress = (y - minY) / totalH; // 0 to 1

    // Van Gogh's sinuous flame curvature
    const cx = -2.6 + 0.38 * Math.sin(y * 0.65) - 0.15 * Math.cos(y * 1.3);
    const cz = 2.3 + 0.22 * Math.cos(y * 0.75);

    // Radius tapers from base (1.35m) to tip (0.15m)
    const baseR = 1.35 * Math.pow(Math.max(0, 1 - progress * 0.95), 0.6);
    const gcx = voxelWorld.toGrid(cx);
    const gcz = voxelWorld.toGrid(cz);
    const maxSteps = Math.ceil((baseR * 1.5) / s);

    for (let dx = -maxSteps; dx <= maxSteps; dx++) {
      for (let dz = -maxSteps; dz <= maxSteps; dz++) {
        const xOffset = dx * s, zOffset = dz * s;
        const dist = Math.hypot(xOffset, zOffset);
        if (dist > baseR * 1.45) continue;

        const angle = Math.atan2(zOffset, xOffset);
        // Flame tongue modulation: vertical ridges that twist around the spire
        const flame = 1.0 + 0.28 * Math.cos(4 * angle + y * 1.4) + 0.15 * Math.sin(7 * angle - y * 0.9);
        const effectiveR = baseR * flame;

        if (dist <= effectiveR) {
          // Hollow out deep core to keep voxel count tight while looking 100% dense
          if (dist >= effectiveR * 0.65 || progress > 0.75 || rng() < 0.12) {
            const color = getStrokeColor(angle, y, dist / effectiveR);
            voxelWorld.setGridVoxel(gcx + dx, gy, gcz + dz, color, 'solid');
          }
        }
      }
    }
  }

  // 2. Secondary Shoulder Spire (right flank, reaching Y = 4.3)
  const subMinY = -1.3, subMaxY = 4.3, subH = subMaxY - subMinY;
  const subStartGY = voxelWorld.toGrid(subMinY);
  const subEndGY = voxelWorld.toGrid(subMaxY);

  for (let gy = subStartGY; gy <= subEndGY; gy++) {
    const y = gy * s;
    const progress = (y - subMinY) / subH;
    const cx = -1.6 + 0.2 * Math.sin(y * 0.9);
    const cz = 2.45 + 0.15 * Math.cos(y * 0.8);
    const baseR = 0.95 * Math.pow(Math.max(0, 1 - progress * 0.92), 0.55);

    const gcx = voxelWorld.toGrid(cx);
    const gcz = voxelWorld.toGrid(cz);
    const maxSteps = Math.ceil((baseR * 1.4) / s);

    for (let dx = -maxSteps; dx <= maxSteps; dx++) {
      for (let dz = -maxSteps; dz <= maxSteps; dz++) {
        const xOffset = dx * s, zOffset = dz * s;
        const dist = Math.hypot(xOffset, zOffset);
        if (dist > baseR * 1.4) continue;

        const angle = Math.atan2(zOffset, xOffset);
        const flame = 1.0 + 0.25 * Math.cos(3 * angle + y * 1.6);
        const effectiveR = baseR * flame;

        if (dist <= effectiveR) {
          if (dist >= effectiveR * 0.6 || progress > 0.65 || rng() < 0.15) {
            const color = getStrokeColor(angle, y, dist / effectiveR);
            voxelWorld.setGridVoxel(gcx + dx, gy, gcz + dz, color, 'solid');
          }
        }
      }
    }
  }

  // 3. Flame tendril tips (ascending curling wisps at the very top)
  const tendrilPoints = [
    { x: -2.3, y: 8.8, z: 2.3 },
    { x: -2.2, y: 9.3, z: 2.25 },
    { x: -2.15, y: 9.7, z: 2.2 },
    { x: -2.7, y: 8.4, z: 2.4 },
    { x: -2.85, y: 8.9, z: 2.45 },
    { x: -1.5, y: 4.1, z: 2.5 },
    { x: -1.45, y: 4.5, z: 2.52 }
  ];
  for (const pt of tendrilPoints) {
    voxelWorld.addEllipsoid(pt.x, pt.y, pt.z, 0.2, 0.35, 0.2, PALETTE.cypressForest, 'solid', false);
  }
}
