import * as T from 'three';
import { PALETTE, createRNG, varyColor } from './palette.js';
import { createCurvedStrokeGeometry, BrushBatch } from './brush.js';

export function buildCypress(world, obstacles = []) {
  const rng = createRNG(188910);
  const cypressGroup = new T.Group();
  cypressGroup.name = 'cypress-brush-group';

  // Obstacle for player movement collision on the terrace
  obstacles.push({
    x: -2.6,
    z: 2.3,
    radius: 1.45
  });

  // Stroke geometry for cypress flame strokes: curved ribbon with organic taper
  const flameGeo = createCurvedStrokeGeometry({
    length: 1.35,
    width: 0.32,
    curvature: 0.28,
    segmentsX: 7,
    segmentsY: 3,
    arch: 0.045
  });

  // Batch for 2,400 vertical twisting flame brushstrokes with rich painterly response
  const maxStrokes = 2600;
  const batch = new BrushBatch(flameGeo, maxStrokes, {
    roughness: 0.72,
    metalness: 0.04,
    alphaTest: 0.12,
    emissive: true
  });

  // Flame tongue generator helper
  function addSpireStrokes({
    baseX,
    baseZ,
    minY,
    maxY,
    baseRadius,
    flameFrequency = 1.3,
    twistSpeed = 0.8,
    layerCount = 18,
    strokesPerLayer = 16
  }) {
    const totalHeight = maxY - minY;

    for (let layer = 0; layer < layerCount; layer++) {
      const progress = layer / (layerCount - 1); // 0 (base) to 1 (tip)
      const y = minY + progress * totalHeight;

      // Sinuous flame curvature of the center trunk line
      const cx = baseX + 0.38 * Math.sin(y * 0.65) - 0.14 * Math.cos(y * 1.35);
      const cz = baseZ + 0.22 * Math.cos(y * 0.72) + 0.10 * Math.sin(y * 1.2);

      // Radius tapers towards top, sharp needle tip at the summit
      const r = baseRadius * Math.pow(Math.max(0.02, 1.0 - progress * 0.94), 0.65);

      const count = Math.max(4, Math.round(strokesPerLayer * (1.0 - progress * 0.45)));
      for (let s = 0; s < count; s++) {
        const angle = (s / count) * Math.PI * 2 + y * twistSpeed + (rng() - 0.5) * 0.35;

        // Van Gogh's rhythmic flame tongue ridges: 4-5 fluted tongues around the trunk
        const flameMod = 1.0 + 0.32 * Math.cos(4.0 * angle + y * flameFrequency) + 0.18 * Math.sin(7.0 * angle - y * 0.9);
        const distRatio = 0.45 + 0.55 * Math.pow(rng(), 0.65); // radial depth distribution
        const currentR = r * flameMod * distRatio;

        const posX = cx + Math.cos(angle) * currentR;
        const posZ = cz + Math.sin(angle) * currentR;
        const posY = y + (rng() - 0.5) * 0.45;

        // Tangent direction along flame curve: mostly pointing up, with inward/outward flame curl
        const curlInward = (1.0 - progress) * 0.25 - distRatio * 0.15;
        const dir = new T.Vector3(
          -Math.sin(angle) * 0.35 - Math.cos(angle) * curlInward + 0.12 * Math.cos(y),
          1.0 + (rng() - 0.5) * 0.25,
          Math.cos(angle) * 0.35 - Math.sin(angle) * curlInward + 0.08 * Math.sin(y)
        ).normalize();

        const normal = new T.Vector3(Math.cos(angle), 0.15, Math.sin(angle)).normalize();

        // Stroke scale: larger at base, finer and sharper towards flame tips
        const scaleLen = (1.15 - progress * 0.4) * (0.85 + rng() * 0.35);
        const scaleW = (1.1 - progress * 0.5) * (0.85 + rng() * 0.3);
        const scaleH = 1.0;

        // Color selection based on depth, height and angle (moonlight hits right/outer flank)
        let strokeColor;
        const isOuter = distRatio > 0.82;
        const catchesMoon = angle > -0.5 && angle < 2.2; // Facing towards moon / right sky

        if (isOuter && catchesMoon && rng() < 0.7) {
          strokeColor = rng() < 0.5 ? PALETTE.cypressMoonlit : PALETTE.cypressHighlight;
        } else if (isOuter && rng() < 0.55) {
          strokeColor = rng() < 0.5 ? PALETTE.cypressOlive : PALETTE.cypressHighlight;
        } else if (distRatio > 0.45) {
          strokeColor = rng() < 0.5 ? PALETTE.cypressForest : PALETTE.cypressOlive;
        } else if (rng() < 0.35) {
          strokeColor = PALETTE.cypressBronze;
        } else if (rng() < 0.6) {
          strokeColor = PALETTE.cypressDeepGreen;
        } else {
          strokeColor = PALETTE.cypressDarkSpruce;
        }

        const varied = varyColor(strokeColor, 0.015, 0.06, 0.05, rng);
        batch.addDirectedStroke(new T.Vector3(posX, posY, posZ), dir, normal, [scaleLen, scaleW, scaleH], varied);
      }
    }
  }

  // 1. Primary Giant Spire (tall towering column reaching Y = 9.25)
  addSpireStrokes({
    baseX: -2.6,
    baseZ: 2.3,
    minY: -1.4,
    maxY: 9.3,
    baseRadius: 1.35,
    flameFrequency: 1.3,
    twistSpeed: 0.65,
    layerCount: 38,
    strokesPerLayer: 26
  });

  // 2. Secondary Shoulder Spire (right flank, reaching Y = 4.4)
  addSpireStrokes({
    baseX: -1.85,
    baseZ: 2.5,
    minY: -1.2,
    maxY: 4.4,
    baseRadius: 0.95,
    flameFrequency: 1.6,
    twistSpeed: 0.85,
    layerCount: 20,
    strokesPerLayer: 18
  });

  // 3. Left Flank Flare (swelling outward at Y = 0.5 to 2.8)
  addSpireStrokes({
    baseX: -3.2,
    baseZ: 2.4,
    minY: -1.0,
    maxY: 2.8,
    baseRadius: 0.85,
    flameFrequency: 1.8,
    twistSpeed: -0.75,
    layerCount: 14,
    strokesPerLayer: 16
  });

  // 4. Base Skirt & Roots (anchoring the tree firmly into the foreground terrace)
  addSpireStrokes({
    baseX: -2.5,
    baseZ: 2.3,
    minY: -1.5,
    maxY: 0.6,
    baseRadius: 1.65,
    flameFrequency: 1.2,
    twistSpeed: 0.3,
    layerCount: 8,
    strokesPerLayer: 24
  });

  batch.finalize();
  cypressGroup.add(batch.mesh);
  world.add(cypressGroup);

  return {
    cypressGroup,
    dispose() {
      batch.dispose();
      cypressGroup.removeFromParent();
    }
  };
}
