import * as T from 'three';
import { PALETTE, createRNG, varyColor } from './palette.js';
import { createCurvedStrokeGeometry, createDabGeometry, BrushBatch } from './brush.js';

export function buildLandscape(world, obstacles = []) {
  const rng = createRNG(188930);
  const landscapeGroup = new T.Group();
  landscapeGroup.name = 'landscape-brush-group';

  // 1. FOREGROUND TERRACE & OVERLOOK (The walkable platform)
  // Terrace bounds: X in [-3.5, 3.5], Z in [3.4, 7.8], ground Y ~ 1.35
  const terraceGeo = new T.PlaneGeometry(7.6, 4.8, 24, 18);
  terraceGeo.rotateX(-Math.PI / 2);
  const tPos = terraceGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i);
    // Subtle natural slope and cobblestone wave
    const y = 1.35 + (z - 5.5) * 0.08 - x * 0.04 + Math.sin(x * 3.5 + z * 2.5) * 0.035;
    tPos.setY(i, y);
  }
  terraceGeo.computeVertexNormals();

  // Create painterly terrace floor material
  const terraceMat = new T.MeshStandardMaterial({
    color: new T.Color(PALETTE.terraceStone),
    roughness: 0.88,
    metalness: 0.05
  });
  const terraceMesh = new T.Mesh(terraceGeo, terraceMat);
  terraceMesh.position.set(0, 0, 5.6);
  terraceMesh.receiveShadow = true;
  landscapeGroup.add(terraceMesh);

  // Impasto dabs across the terrace floor (giving visible diagonal brush marks underfoot)
  const floorDabGeo = createDabGeometry(0.55, 0.22, 0.03);
  const floorBatch = new BrushBatch(floorDabGeo, 450, {
    roughness: 0.85,
    metalness: 0.04
  });

  for (let gx = -3.2; gx <= 3.2; gx += 0.38) {
    for (let gz = 3.6; gz <= 7.5; gz += 0.38) {
      const px = gx + (rng() - 0.5) * 0.18;
      const pz = gz + (rng() - 0.5) * 0.18;
      const py = 1.36 + (pz - 5.5) * 0.08 - px * 0.04;

      // Diagonal stroke angle characteristic of Van Gogh's foreground grounds
      const rot = new T.Euler(-Math.PI * 0.5, 0, Math.PI * 0.25 + (rng() - 0.5) * 0.25);
      const col = rng() < 0.4 ? PALETTE.terraceOchre : (rng() < 0.7 ? PALETTE.terracePaving : PALETTE.groundOlive);
      floorBatch.addStroke({
        position: new T.Vector3(px, py, pz),
        rotation: rot,
        scale: [0.9 + rng() * 0.3, 0.85 + rng() * 0.3, 1.0],
        color: col
      });
    }
  }
  floorBatch.finalize();
  landscapeGroup.add(floorBatch.mesh);

  // 2. STONE PARAPET / RETAINING WALL AT TERRACE EDGE (Z = 3.35)
  // Stone blocks built from painterly chunky strokes
  const wallDabGeo = createDabGeometry(0.75, 0.28, 0.12);
  const wallBatch = new BrushBatch(wallDabGeo, 280, {
    roughness: 0.88,
    metalness: 0.02
  });

  const wallZ = 3.4;
  for (let x = -3.6; x <= 3.6; x += 0.55) {
    const baseY = 1.35 - x * 0.04;
    // Lower retaining wall layer
    wallBatch.addStroke({
      position: new T.Vector3(x, baseY + 0.15, wallZ),
      rotation: new T.Euler(0, (rng() - 0.5) * 0.1, 0),
      scale: [1.0, 1.0, 1.0],
      color: PALETTE.terraceStone
    });
    // Upper parapet ledge
    wallBatch.addStroke({
      position: new T.Vector3(x, baseY + 0.45, wallZ),
      rotation: new T.Euler(0, (rng() - 0.5) * 0.1, 0),
      scale: [0.95, 0.9, 1.0],
      color: rng() < 0.5 ? PALETTE.terraceEdge : PALETTE.terracePaving
    });
  }
  wallBatch.finalize();
  landscapeGroup.add(wallBatch.mesh);

  // Wild olive shrubs on terrace flanks
  const shrubGeo = createCurvedStrokeGeometry({ length: 0.8, width: 0.26, curvature: 0.22 });
  const shrubBatch = new BrushBatch(shrubGeo, 300, {
    roughness: 0.82,
    metalness: 0.02
  });

  const shrubSpots = [
    { x: -3.3, z: 4.6, r: 0.65 },
    { x: -3.1, z: 6.4, r: 0.55 },
    { x:  3.2, z: 4.8, r: 0.65 },
    { x:  2.9, z: 6.8, r: 0.55 }
  ];

  for (const s of shrubSpots) {
    obstacles.push({ x: s.x, z: s.z, radius: s.r * 0.85 });
    for (let i = 0; i < 45; i++) {
      const a = rng() * Math.PI * 2;
      const dist = Math.pow(rng(), 0.7) * s.r;
      const px = s.x + Math.cos(a) * dist;
      const pz = s.z + Math.sin(a) * dist;
      const py = 1.45 + (1.0 - dist / s.r) * 0.45 + (rng() - 0.5) * 0.15;

      const dir = new T.Vector3(Math.cos(a) * 0.5, 0.8, Math.sin(a) * 0.5).normalize();
      const col = rng() < 0.4 ? PALETTE.oliveDark : (rng() < 0.75 ? PALETTE.oliveMid : PALETTE.oliveLight);
      shrubBatch.addDirectedStroke(new T.Vector3(px, py, pz), dir, new T.Vector3(0, 1, 0), 0.85 + rng() * 0.35, col);
    }
  }
  shrubBatch.finalize();
  landscapeGroup.add(shrubBatch.mesh);

  // 3. THE ALPILLES MOUNTAINS (Background undulating ridges)
  // Two distinct layered mountain ranges with flowing contour brushstroke ribbons
  const mountainStrokeGeo = createCurvedStrokeGeometry({
    length: 2.2,
    width: 0.48,
    curvature: 0.25,
    segmentsX: 8,
    segmentsY: 3,
    arch: 0.05
  });

  const mountainBatch = new BrushBatch(mountainStrokeGeo, 1100, {
    roughness: 0.75,
    metalness: 0.05
  });

  // Layer 1: Distant Main Ridge (Z ~ -28.0, Y peaking at ~5.5)
  for (let x = -19.0; x <= 22.0; x += 0.75) {
    // Undulating silhouette of the Alpilles crests
    const wave = 4.8 + 1.65 * Math.sin(x * 0.22) + 0.85 * Math.sin(x * 0.55 + 1.2) + 0.4 * Math.cos(x * 1.1);
    const zBase = -28.0 + 1.2 * Math.cos(x * 0.3);

    // Populate strokes cascading down from ridge crest to valley
    for (let step = 0; step < 7; step++) {
      const stepNorm = step / 6.0;
      const y = wave * (1.0 - stepNorm * 0.65) - 0.5;
      const z = zBase + stepNorm * 3.5;
      const slope = (0.36 * Math.cos(x * 0.22) + 0.45 * Math.cos(x * 0.55 + 1.2));

      const tangent = new T.Vector3(1, slope, 0.2).normalize();
      const normal = new T.Vector3(0, 0.4, 0.9).normalize();

      // Ridge crest catches the celestial blue/cyan glow
      let col;
      if (step === 0 && rng() < 0.7) {
        col = rng() < 0.5 ? PALETTE.mountainCrest : PALETTE.mountainRidge;
      } else if (step <= 2) {
        col = PALETTE.mountainCobalt;
      } else if (step <= 4) {
        col = PALETTE.mountainIndigo;
      } else {
        col = PALETTE.mountainDeep;
      }

      mountainBatch.addDirectedStroke(
        new T.Vector3(x + (rng() - 0.5) * 0.3, y + (rng() - 0.5) * 0.25, z + (rng() - 0.5) * 0.4),
        tangent,
        normal,
        [1.1 + rng() * 0.35, 1.0 + rng() * 0.3, 1.0],
        varyColor(col, 0.015, 0.05, 0.05, rng)
      );
    }
  }

  // Layer 2: Midground Rolling Foothills (Z ~ -21.0, Y peaking at ~3.2)
  for (let x = -16.0; x <= 20.0; x += 0.8) {
    const wave2 = 2.8 + 1.1 * Math.sin(x * 0.32 - 0.8) + 0.55 * Math.cos(x * 0.75);
    const zBase2 = -21.5 + 0.8 * Math.sin(x * 0.25);

    for (let step = 0; step < 5; step++) {
      const stepNorm = step / 4.0;
      const y = wave2 * (1.0 - stepNorm * 0.6) - 0.3;
      const z = zBase2 + stepNorm * 3.2;
      const slope = 0.35 * Math.cos(x * 0.32 - 0.8);

      const tangent = new T.Vector3(1, slope, 0.15).normalize();
      const normal = new T.Vector3(0, 0.45, 0.88).normalize();

      const col = step === 0 ? PALETTE.mountainRidge : (step < 3 ? PALETTE.mountainShadow : PALETTE.mountainDeep);
      mountainBatch.addDirectedStroke(
        new T.Vector3(x + (rng() - 0.5) * 0.35, y + (rng() - 0.5) * 0.2, z + (rng() - 0.5) * 0.4),
        tangent,
        normal,
        [1.0 + rng() * 0.3, 0.95 + rng() * 0.25, 1.0],
        varyColor(col, 0.015, 0.05, 0.05, rng)
      );
    }
  }

  mountainBatch.finalize();
  landscapeGroup.add(mountainBatch.mesh);

  // 4. VALLEY FLOOR & OLIVE GROVES (Sloping terrain between terrace and village)
  // Rhythmic swirling olive and ground strokes
  const valleyStrokeGeo = createCurvedStrokeGeometry({ length: 1.2, width: 0.32, curvature: 0.18 });
  const valleyBatch = new BrushBatch(valleyStrokeGeo, 850, {
    roughness: 0.85,
    metalness: 0.03
  });

  for (let x = -14.0; x <= 16.0; x += 0.85) {
    for (let z = -14.0; z <= 2.8; z += 1.1) {
      // Valley slope from terrace (Y ~ 1.2 at Z = 3) down to valley basin (Y ~ 0.2 at Z = -10)
      const t = (z - (-14.0)) / (2.8 - (-14.0)); // 0 to 1
      const y = 0.15 + t * 1.15 + 0.25 * Math.sin(x * 0.4 + z * 0.3);

      const angle = Math.sin(x * 0.3) * 0.4 + (rng() - 0.5) * 0.3;
      const tangent = new T.Vector3(Math.cos(angle), 0.15 * Math.sin(x), Math.sin(angle)).normalize();

      let col;
      if (z > -2.0) {
        col = rng() < 0.45 ? PALETTE.groundOlive : PALETTE.groundOchre;
      } else if (rng() < 0.4) {
        col = PALETTE.oliveDark;
      } else if (rng() < 0.75) {
        col = PALETTE.oliveMid;
      } else {
        col = PALETTE.groundDark;
      }

      valleyBatch.addDirectedStroke(
        new T.Vector3(x + (rng() - 0.5) * 0.4, y, z + (rng() - 0.5) * 0.5),
        tangent,
        new T.Vector3(0, 1, 0),
        [1.0 + rng() * 0.35, 0.9 + rng() * 0.3, 1.0],
        varyColor(col, 0.015, 0.05, 0.05, rng)
      );
    }
  }

  valleyBatch.finalize();
  landscapeGroup.add(valleyBatch.mesh);

  world.add(landscapeGroup);

  return {
    landscapeGroup,
    dispose() {
      terraceGeo.dispose();
      terraceMat.dispose();
      floorBatch.dispose();
      wallBatch.dispose();
      shrubBatch.dispose();
      mountainBatch.dispose();
      valleyBatch.dispose();
      landscapeGroup.removeFromParent();
    }
  };
}
