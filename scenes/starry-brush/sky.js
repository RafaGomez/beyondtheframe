import * as T from 'three';
import { PALETTE, createRNG, varyColor } from './palette.js';
import { createCurvedStrokeGeometry, createArcStrokeGeometry, createDabGeometry, BrushBatch } from './brush.js';

export function buildSky(world) {
  const rng = createRNG(188920);
  const skyRoot = new T.Group();
  skyRoot.name = 'sky-brush-root';

  const vortexGroup = new T.Group();
  vortexGroup.name = 'vortex-group';
  skyRoot.add(vortexGroup);

  // 1. SKY DOME BACKDROP WITH PAINTERLY STROKE BANDS
  // Cylindrical/spherical sky shell in the deep background (R = 75)
  const skyRadius = 75;
  const domeSegments = 64;
  const domeRings = 24;
  const domePositions = [];
  const domeUVs = [];
  const domeIndices = [];
  const domeColors = [];

  const colUltramarine = new T.Color(PALETTE.skyUltramarine);
  const colCobalt = new T.Color(PALETTE.skyCobalt);
  const colMist = new T.Color(PALETTE.skyMist);

  for (let r = 0; r <= domeRings; r++) {
    const lat = (-0.08 + (Math.PI * 0.58) * (r / domeRings)); // horizon to zenith
    const y = Math.sin(lat) * skyRadius;
    const radAtY = Math.cos(lat) * skyRadius;
    const heightNorm = r / domeRings;

    for (let s = 0; s <= domeSegments; s++) {
      const lon = (s / domeSegments) * Math.PI * 1.5 - Math.PI * 0.75; // sweeping panorama
      const x = Math.sin(lon) * radAtY;
      const z = -Math.cos(lon) * radAtY;

      // Slight wavy deformation mimicking Van Gogh's horizontal celestial waves
      const wave = Math.sin(lon * 4.0 + heightNorm * 5.0) * 0.8;
      domePositions.push(x, y + wave, z);
      domeUVs.push(s / domeSegments * 6.0, r / domeRings * 2.0);

      // Color gradient: deep ultramarine at zenith, cobalt in mid-sky, glowing mist at horizon
      const c = new T.Color();
      if (heightNorm < 0.22) {
        c.lerpColors(colMist, colCobalt, heightNorm / 0.22);
      } else {
        c.lerpColors(colCobalt, colUltramarine, (heightNorm - 0.22) / 0.78);
      }
      domeColors.push(c.r, c.g, c.b);
    }
  }

  const stride = domeSegments + 1;
  for (let r = 0; r < domeRings; r++) {
    for (let s = 0; s < domeSegments; s++) {
      const a = r * stride + s;
      const b = (r + 1) * stride + s;
      const c = (r + 1) * stride + (s + 1);
      const d = r * stride + (s + 1);
      domeIndices.push(a, b, d);
      domeIndices.push(b, c, d);
    }
  }

  const domeGeo = new T.BufferGeometry();
  domeGeo.setAttribute('position', new T.Float32BufferAttribute(domePositions, 3));
  domeGeo.setAttribute('uv', new T.Float32BufferAttribute(domeUVs, 2));
  domeGeo.setAttribute('color', new T.Float32BufferAttribute(domeColors, 3));
  domeGeo.setIndex(domeIndices);
  domeGeo.computeVertexNormals();

  const domeMat = new T.MeshBasicMaterial({
    vertexColors: true,
    side: T.BackSide,
    fog: false
  });
  const domeMesh = new T.Mesh(domeGeo, domeMat);
  domeMesh.renderOrder = -10;
  skyRoot.add(domeMesh);

  // 2. THE GRAND CELESTIAL CURRENT & SWIRLING VORTEX
  // Modeled with 1,800 curved 3D stroke ribbons flowing along streamlines and spirals!
  const swirlGeo = createCurvedStrokeGeometry({
    length: 1.6,
    width: 0.36,
    curvature: 0.35,
    segmentsX: 8,
    segmentsY: 3,
    arch: 0.04
  });

  const vortexBatch = new BrushBatch(swirlGeo, 2000, {
    roughness: 0.55,
    metalness: 0.05,
    alphaTest: 0.12,
    emissive: true
  });

  // Helper to place flowing strokes along a parametric streamline
  function populateStreamline(curvePoints, count, colorPalette, widthScale = 1.0, zJitter = 0.6) {
    const curve = new T.CatmullRomCurve3(curvePoints);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const pt = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      const normal = new T.Vector3(0, 0, 1);

      // Offset slightly across flow and in Z depth for rich 3D layering
      const right = new T.Vector3().crossVectors(tangent, normal).normalize();
      const offsetAmt = (rng() - 0.5) * 0.75 * widthScale;
      pt.addScaledVector(right, offsetAmt);
      pt.z += (rng() - 0.5) * zJitter;

      const strokeLen = (0.9 + rng() * 0.4) * widthScale;
      const strokeW = (0.85 + rng() * 0.35) * widthScale;

      const baseCol = colorPalette[Math.floor(rng() * colorPalette.length)];
      const col = varyColor(baseCol, 0.015, 0.06, 0.08, rng);

      vortexBatch.addDirectedStroke(pt, tangent, normal, [strokeLen, strokeW, 1.0], col);
    }
  }

  // Streamline 1: Main sweeping upper sky current (arching from left to right)
  const currentColors = [
    PALETTE.skyWhite,
    PALETTE.skyMist,
    PALETTE.skyCyan,
    PALETTE.skyAzure,
    PALETTE.skyRoyal,
    PALETTE.skyPaleGold
  ];

  populateStreamline([
    new T.Vector3(-18.0, 12.5, -26.0),
    new T.Vector3(-12.0, 14.8, -25.5),
    new T.Vector3( -6.0, 16.2, -25.0),
    new T.Vector3(  0.0, 15.5, -24.5),
    new T.Vector3(  6.0, 13.8, -25.0),
    new T.Vector3( 12.0, 15.2, -26.0),
    new T.Vector3( 18.0, 13.5, -27.0)
  ], 120, currentColors, 1.35, 1.2);

  // Streamline 2: Counter-cresting lower wave
  populateStreamline([
    new T.Vector3(-17.0,  9.5, -25.0),
    new T.Vector3(-11.0, 11.2, -24.5),
    new T.Vector3( -5.0, 12.6, -24.0),
    new T.Vector3(  1.0, 11.8, -23.5),
    new T.Vector3(  7.0,  9.8, -24.2),
    new T.Vector3( 13.0, 11.4, -25.5),
    new T.Vector3( 18.0, 10.2, -26.5)
  ], 110, [PALETTE.skyAzure, PALETTE.skyCyan, PALETTE.skyCobalt, PALETTE.skyMist], 1.2, 0.9);

  // Streamline 3: Third wave under the main current
  populateStreamline([
    new T.Vector3(-16.0, 7.8, -24.5),
    new T.Vector3( -9.0, 9.2, -24.0),
    new T.Vector3( -2.0, 9.8, -23.2),
    new T.Vector3(  4.0, 8.5, -23.8),
    new T.Vector3( 10.0, 8.2, -24.8),
    new T.Vector3( 16.0, 7.6, -25.8)
  ], 95, [PALETTE.skyCobalt, PALETTE.skyRoyal, PALETTE.skyCyan], 1.1, 0.8);

  // 3. THE TWO ICONIC CENTRAL SPIRALS (The Double Vortex Eye)
  // Vortex 1: Primary spiral curling inward clockwise at (cx: -0.8, cy: 11.2, cz: -23.8)
  const v1X = -0.8, v1Y = 11.2, v1Z = -23.8;
  const turns = 2.8;
  const spiralSteps1 = 140;
  for (let i = 0; i < spiralSteps1; i++) {
    const t = i / spiralSteps1;
    const angle = t * Math.PI * 2 * turns;
    const r = 0.25 + (1.0 - t) * 4.2; // spiral inward
    const x = v1X + Math.cos(angle) * r;
    const y = v1Y + Math.sin(angle) * r * 0.88;
    const z = v1Z + Math.sin(angle * 0.5) * 0.6 + (rng() - 0.5) * 0.4;

    const tangent = new T.Vector3(
      -Math.sin(angle) - 0.3 * Math.cos(angle),
      Math.cos(angle) - 0.3 * Math.sin(angle),
      0
    ).normalize();

    let strokeColor;
    if (t < 0.25) strokeColor = PALETTE.skyWhite;
    else if (t < 0.5) strokeColor = rng() < 0.3 ? PALETTE.skyPaleGold : PALETTE.skyMist;
    else if (t < 0.75) strokeColor = PALETTE.skyCyan;
    else strokeColor = PALETTE.skyAzure;

    const scale = (0.75 + (1.0 - t) * 0.5) * (0.85 + rng() * 0.3);
    vortexBatch.addDirectedStroke(new T.Vector3(x, y, z), tangent, new T.Vector3(0, 0, 1), scale, strokeColor);
  }

  // Vortex 2: Secondary spiral curling counter-clockwise at (cx: 2.2, cy: 12.6, cz: -24.5)
  const v2X = 2.2, v2Y = 12.6, v2Z = -24.5;
  const spiralSteps2 = 120;
  for (let i = 0; i < spiralSteps2; i++) {
    const t = i / spiralSteps2;
    const angle = -t * Math.PI * 2 * 2.3;
    const r = 0.25 + (1.0 - t) * 3.4;
    const x = v2X + Math.cos(angle) * r;
    const y = v2Y + Math.sin(angle) * r * 0.82;
    const z = v2Z + (rng() - 0.5) * 0.4;

    const tangent = new T.Vector3(
      Math.sin(angle) + 0.25 * Math.cos(angle),
      -Math.cos(angle) + 0.25 * Math.sin(angle),
      0
    ).normalize();

    let strokeColor;
    if (t < 0.3) strokeColor = PALETTE.skyWhite;
    else if (t < 0.6) strokeColor = PALETTE.skyMist;
    else strokeColor = rng() < 0.5 ? PALETTE.skyCyan : PALETTE.skyAzure;

    const scale = (0.7 + (1.0 - t) * 0.45) * (0.85 + rng() * 0.3);
    vortexBatch.addDirectedStroke(new T.Vector3(x, y, z), tangent, new T.Vector3(0, 0, 1), scale, strokeColor);
  }

  // Horizontal pre-dawn glow ribbon above the mountain horizon
  for (let gx = -16.0; gx <= 18.0; gx += 0.55) {
    const yBase = 4.2 + 0.35 * Math.sin(gx * 0.35);
    const zBase = -25.0 + (rng() - 0.5) * 0.8;
    const tangent = new T.Vector3(1, (rng() - 0.5) * 0.15, 0).normalize();
    const col = rng() < 0.45 ? PALETTE.skyMist : (rng() < 0.7 ? PALETTE.skyCyan : PALETTE.skyPaleGold);
    vortexBatch.addDirectedStroke(new T.Vector3(gx, yBase, zBase), tangent, new T.Vector3(0, 0, 1), [1.2, 0.9, 1.0], col);
  }

  vortexBatch.finalize();
  vortexGroup.add(vortexBatch.mesh);

  // 4. THE 11 RADIANT STARS & THE CRESCENT MOON
  // Arc stroke geometry for concentric halos
  const arcGeo = createArcStrokeGeometry({
    radius: 1.0,
    angleSpan: Math.PI * 0.42,
    width: 0.22,
    segments: 7,
    thickness: 0.035
  });

  const starBatch = new BrushBatch(arcGeo, 1600, {
    roughness: 0.48,
    metalness: 0.08,
    alphaTest: 0.1,
    emissive: true
  });

  // Solid radiant core dab geometry for star centers
  const starCoreGeo = createDabGeometry(0.35, 0.24, 0.06);
  const coreBatch = new BrushBatch(starCoreGeo, 250, {
    roughness: 0.4,
    metalness: 0.1,
    alphaTest: 0.08,
    emissive: true
  });

  // Helper to build a radiating star with concentric curved stroke halos
  function addRadiantStar(cx, cy, cz, coreRadius, haloRadii, isVenus = false) {
    // 1. Star core dabs radiating from center
    const dabs = isVenus ? 16 : 8;
    for (let d = 0; d < dabs; d++) {
      const a = (d / dabs) * Math.PI * 2;
      const r = coreRadius * 0.55;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const z = cz + (rng() - 0.5) * 0.15;
      const rot = new T.Euler(0, 0, a);
      const col = d % 2 === 0 ? PALETTE.starCore : PALETTE.starLemon;
      coreBatch.addStroke({
        position: new T.Vector3(x, y, z),
        rotation: rot,
        scale: isVenus ? 1.4 : 1.0,
        color: col
      });
    }

    // 2. Concentric halo rings
    haloRadii.forEach((radius, ringIdx) => {
      const circumference = Math.PI * 2 * radius;
      const strokeLen = radius * 0.42;
      const strokeCount = Math.max(6, Math.ceil(circumference / (strokeLen * 1.05)));

      // Color gradation by ring radius (warm cadmium inside -> lemon -> azure outside)
      let ringColor;
      const ringRatio = ringIdx / (haloRadii.length - 1);
      if (ringRatio < 0.25) ringColor = PALETTE.starLemon;
      else if (ringRatio < 0.6) ringColor = PALETTE.starGold;
      else if (ringRatio < 0.85) ringColor = PALETTE.starHaloAzure;
      else ringColor = PALETTE.skyAzure;

      for (let s = 0; s < strokeCount; s++) {
        const baseAngle = (s / strokeCount) * Math.PI * 2 + (rng() - 0.5) * 0.18;
        const currentR = radius + (rng() - 0.5) * (radius * 0.12);
        const x = cx;
        const y = cy;
        const z = cz + (rng() - 0.5) * 0.25;

        const rot = new T.Euler(0, 0, baseAngle);
        const variedCol = varyColor(ringColor, 0.015, 0.05, 0.06, rng);

        starBatch.addStroke({
          position: new T.Vector3(x, y, z),
          rotation: rot,
          scale: [currentR, currentR, 1.0],
          color: variedCol
        });
      }
    });
  }

  // 11 Stars faithfully placed according to Van Gogh's canvas:
  const stars = [
    // Venus / Morning Star (Massive & radiant, just to the right of the cypress)
    { x: -0.6, y:  7.1, z: -22.5, r: 0.68, halos: [0.85, 1.35, 1.95, 2.65, 3.4], isVenus: true },
    // Upper celestial stars across the sky
    { x: -8.6, y: 16.0, z: -26.0, r: 0.38, halos: [0.75, 1.25, 1.8] },
    { x: -5.4, y: 14.6, z: -25.5, r: 0.40, halos: [0.8,  1.3,  1.9] },
    { x: -3.2, y: 11.2, z: -24.0, r: 0.35, halos: [0.7,  1.15] },
    { x:  0.2, y: 16.8, z: -27.0, r: 0.42, halos: [0.85, 1.4,  2.0] },
    { x: -1.6, y: 13.5, z: -24.5, r: 0.36, halos: [0.75, 1.25] },
    { x:  5.2, y:  8.8, z: -23.5, r: 0.38, halos: [0.78, 1.3] },
    { x:  7.2, y: 11.5, z: -25.0, r: 0.40, halos: [0.8,  1.3,  1.85] },
    { x:  9.5, y: 16.4, z: -26.5, r: 0.38, halos: [0.75, 1.25] },
    { x: 13.8, y:  9.8, z: -25.5, r: 0.40, halos: [0.8,  1.35] },
    { x: 15.4, y: 12.8, z: -27.5, r: 0.36, halos: [0.75, 1.2] }
  ];

  stars.forEach(st => addRadiantStar(st.x, st.y, st.z, st.r, st.halos, st.isVenus));

  // 5. THE INCANDESCENT CRESCENT MOON (Top Right)
  const moonX = 11.8, moonY = 14.2, moonZ = -25.8;
  const moonRadius = 1.75;

  // The crescent sickle: outer convex arc faces right, inner crescent concave face opens to left
  const crescentCount = 42;
  for (let i = 0; i < crescentCount; i++) {
    const t = i / (crescentCount - 1);
    // Angle from -PI*0.42 to +PI*0.42 (convex arc on the right)
    const angle = (t - 0.5) * Math.PI * 0.88;
    const cuspTaper = Math.cos(angle * 1.05); // 1 at center, 0 at cusps

    // Layer 1: Outer glowing crescent rim
    const rOuter = moonRadius + (rng() - 0.5) * 0.15;
    const xO = moonX + Math.cos(angle) * rOuter;
    const yO = moonY + Math.sin(angle) * rOuter;
    coreBatch.addStroke({
      position: new T.Vector3(xO, yO, moonZ + 0.1),
      rotation: new T.Euler(0, 0, angle + Math.PI * 0.5),
      scale: [1.1 * cuspTaper + 0.35, 0.9 * cuspTaper + 0.3, 1.0],
      color: PALETTE.moonLemon
    });

    // Layer 2: Mid-body cadmium gold
    const rMid = moonRadius * 0.85 + (rng() - 0.5) * 0.12;
    const xM = moonX + Math.cos(angle) * rMid - 0.15 * cuspTaper;
    const yM = moonY + Math.sin(angle) * rMid;
    coreBatch.addStroke({
      position: new T.Vector3(xM, yM, moonZ),
      rotation: new T.Euler(0, 0, angle + Math.PI * 0.5),
      scale: [1.0 * cuspTaper + 0.3, 0.85 * cuspTaper + 0.25, 1.0],
      color: PALETTE.moonGold
    });

    // Layer 3: Warm inner belly
    if (cuspTaper > 0.3) {
      const rInner = moonRadius * 0.68;
      const xI = moonX + Math.cos(angle) * rInner - 0.25 * cuspTaper;
      const yI = moonY + Math.sin(angle) * rInner;
      coreBatch.addStroke({
        position: new T.Vector3(xI, yI, moonZ - 0.05),
        rotation: new T.Euler(0, 0, angle + Math.PI * 0.5),
        scale: [0.9 * cuspTaper + 0.2, 0.75 * cuspTaper + 0.2, 1.0],
        color: PALETTE.moonCadmium
      });
    }
  }

  // Moon's luminous concentric aureoles / halo rings
  const moonHalos = [2.2, 2.85, 3.65, 4.5, 5.5];
  moonHalos.forEach((radius, idx) => {
    const strokeCount = Math.ceil(radius * 9);
    const ringCol = idx < 2 ? PALETTE.moonHaloLemon : (idx < 3 ? PALETTE.moonHaloGold : PALETTE.moonHaloCyan);

    for (let s = 0; s < strokeCount; s++) {
      const angle = (s / strokeCount) * Math.PI * 2 + (rng() - 0.5) * 0.15;
      const curR = radius + (rng() - 0.5) * (radius * 0.1);
      const rot = new T.Euler(0, 0, angle);
      starBatch.addStroke({
        position: new T.Vector3(moonX, moonY, moonZ + (rng() - 0.5) * 0.3),
        rotation: rot,
        scale: [curR, curR, 1.0],
        color: ringCol
      });
    }
  });

  starBatch.finalize();
  coreBatch.finalize();
  skyRoot.add(starBatch.mesh, coreBatch.mesh);

  world.add(skyRoot);

  return {
    skyRoot,
    vortexGroup,
    dispose() {
      domeGeo.dispose();
      domeMat.dispose();
      vortexBatch.dispose();
      starBatch.dispose();
      coreBatch.dispose();
      skyRoot.removeFromParent();
    }
  };
}
