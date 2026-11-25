import * as T from 'three';
import { cubistSlab, inkStroke, sculptedLimb, cubistEye, cubistHand, disposeTree } from './cubism.js';

// Builds the left wing of Guernica in 3D cubist sculpture:
// 1. The Bull (massive dark arched torso, rippling smoke-tail visible on far left, sculpted frontal white head)
// 2. The Grieving Mother with Dead Child (Pietà) under the bull, sweeping organic curves
// 3. The Dove on the back-left ledge with the white fissure clearly framed between bull and horse

export function buildLeftFigures(scene, mats, obstacles) {
  const root = new T.Group();
  root.name = 'guernica-left-figures';

  // =========================================================================
  // 1. THE BULL (X ≈ -3.28, Y ∈ [0.68, 3.65], Z ≈ -1.42 .. -0.88)
  // =========================================================================
  const bull = new T.Group();
  bull.position.set(-3.28, 0, -1.42);

  // Massive charcoal torso with sweeping organic back curve
  const bullBody = cubistSlab([
    [-0.86, 1.32],
    [-0.96, 1.85, -0.88, 2.38],
    [-0.78, 2.75, -0.35, 2.76],
    [0.24, 2.74],
    [0.68, 2.48, 0.78, 2.02],
    [0.78, 1.02],
    [0.44, 0.92],
    [0.22, 1.48],
    [-0.34, 1.54],
    [-0.68, 1.02],
  ], {
    depth: 0.56,
    bevel: 0.045,
    mat: mats.pitch,
    outlineMat: mats.slate,
    outlineRadius: 0.011,
  });
  bull.add(bullBody);

  // Pale sculpted shoulder curving behind the grieving mother
  const shoulder = cubistSlab([
    [0.14, 2.94],
    [0.52, 3.24, 0.78, 2.92],
    [0.92, 2.52, 0.84, 1.72],
    [0.58, 2.02],
    [0.26, 2.44],
  ], {
    depth: 0.34,
    bevel: 0.03,
    mat: mats.ashLight,
    outlineMat: mats.ink,
    outlineRadius: 0.009,
  });
  shoulder.position.set(0.05, 0, 0.14);
  bull.add(shoulder);

  // Four sturdy legs & cloven chalk hooves
  const legDefs = [
    { top: [-0.74, 1.45, -0.15], bot: [-0.88, 0.42, -0.12], rA: 0.14, rB: 0.09 },
    { top: [-0.45, 1.45, 0.15], bot: [-0.48, 0.44, 0.16], rA: 0.13, rB: 0.085 },
    { top: [0.46, 1.52, 0.16], bot: [0.42, 0.56, 0.2], rA: 0.17, rB: 0.11 },
    { top: [0.68, 1.48, -0.16], bot: [0.72, 0.62, -0.15], rA: 0.15, rB: 0.1 },
  ];
  legDefs.forEach(l => {
    bull.add(sculptedLimb(l.top, l.bot, l.rA, l.rB, mats.pitch, { radialSegments: 8 }));
    const hoof = cubistSlab([
      [-0.12, -0.02], [0.14, -0.02], [0.09, 0.14], [-0.08, 0.14]
    ], { depth: 0.16, bevel: 0.014, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.007 });
    hoof.position.set(l.bot[0], l.bot[1] - 0.08, l.bot[2] + 0.02);
    bull.add(hoof);
  });

  // Expressive rippling smoke-tail rising into the upper-left corner
  const bullTail = new T.Group();
  bullTail.position.set(-0.78, 2.52, 0.08);

  const tailRibbon = cubistSlab([
    [0.02, 0],
    [-0.18, 0.22, -0.06, 0.52],
    [0.08, 0.78, -0.22, 1.04],
    [-0.18, 1.18, 0.06, 1.12],
    [0.24, 0.94, 0.28, 0.62],
    [0.26, 0.34, 0.14, 0.04],
  ], {
    depth: 0.12,
    bevel: 0.02,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  tailRibbon.rotation.y = 0.22;
  bullTail.add(tailRibbon);

  bullTail.add(inkStroke([[0.04, 0.1, 0.08], [-0.02, 0.48, 0.08], [0.02, 0.92, 0.08]], mats.ink, 0.006));
  bullTail.add(inkStroke([[0.1, 0.22, 0.08], [0.16, 0.62, 0.08], [-0.08, 1.02, 0.08]], mats.ink, 0.0055));
  bull.add(bullTail);

  // Monumental Cubist Bull Head turned frontally with sculpted organic contours
  const bullHead = new T.Group();
  bullHead.position.set(0.28, 2.98, 0.46);
  bullHead.rotation.y = 0.14;

  const skull = cubistSlab([
    [-0.36, 0.34],
    [0.0, 0.45, 0.34, 0.38],
    [0.48, 0.2, 0.42, -0.14],
    [0.34, -0.34, 0.06, -0.34],
    [-0.26, -0.34, -0.38, -0.12],
    [-0.44, 0.12, -0.36, 0.34],
  ], {
    depth: 0.32,
    bevel: 0.032,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.009,
  });
  bullHead.add(skull);

  const snout = cubistSlab([
    [-0.26, 0.06],
    [-0.04, 0.1, 0.14, 0.05],
    [0.18, -0.14, 0.14, -0.3],
    [-0.06, -0.35, -0.25, -0.28],
    [-0.3, -0.12, -0.26, 0.06],
  ], {
    depth: 0.22,
    bevel: 0.022,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  snout.position.set(-0.08, -0.11, 0.2);
  bullHead.add(snout);

  // Sculpted nostrils & parted bull mouth
  bullHead.add(inkStroke([[-0.22, -0.09, 0.34], [-0.14, -0.15, 0.34], [-0.2, -0.19, 0.34]], mats.ink, 0.0085, { closed: true }));
  bullHead.add(inkStroke([[-0.03, -0.1, 0.34], [0.04, -0.15, 0.34], [-0.02, -0.19, 0.34]], mats.ink, 0.0085, { closed: true }));
  const mouth = cubistSlab([
    [-0.22, -0.24], [0.06, -0.24], [0.04, -0.33], [-0.2, -0.33]
  ], { depth: 0.055, bevel: 0.007, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.007 });
  mouth.position.set(-0.06, -0.07, 0.32);
  bullHead.add(mouth);

  // Two calm, watchful asymmetrical eyes
  const leftEye = cubistEye(mats, { width: 0.21, height: 0.1, pupilOffset: [-0.01, 0] });
  leftEye.position.set(-0.14, 0.17, 0.2);
  const rightEye = cubistEye(mats, { width: 0.23, height: 0.105, pupilOffset: [0.01, 0.005] });
  rightEye.position.set(0.17, 0.12, 0.2);
  rightEye.rotation.z = -0.07;
  bullHead.add(leftEye, rightEye);

  // Pointed triangular ears
  const earL = cubistSlab([[0, 0], [-0.17, 0.32], [0.09, 0.22]], {
    depth: 0.085, bevel: 0.012, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.008
  });
  earL.position.set(-0.34, 0.24, -0.02);
  const earR = cubistSlab([[0, 0], [0.15, 0.4], [0.22, 0.04]], {
    depth: 0.095, bevel: 0.012, mat: mats.pitch, outlineMat: mats.chalk, outlineRadius: 0.009
  });
  earR.position.set(0.24, 0.25, 0.02);
  bullHead.add(earL, earR);

  // Iconic sweeping 3D crescent horns
  const makeHorn = (side) => {
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(side * 0.22, 0.34, 0.04),
      new T.Vector3(side * 0.46, 0.44, 0.14),
      new T.Vector3(side * 0.54, 0.72, 0.22),
      new T.Vector3(side * 0.42, 0.92, 0.26),
    ]);
    const pts = curve.getPoints(16);
    const g = new T.Group();
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = i / (pts.length - 1);
      const t1 = (i + 1) / (pts.length - 1);
      g.add(sculptedLimb(pts[i], pts[i + 1], 0.07 * (1 - t0 * 0.78), 0.07 * (1 - t1 * 0.78), mats.chalk, { radialSegments: 8 }));
    }
    return g;
  };
  bullHead.add(makeHorn(-1), makeHorn(1));
  bull.add(bullHead);
  root.add(bull);
  obstacles.push({ x: -3.28, z: -1.4, radius: 0.95 });

  // =========================================================================
  // 2. THE MOTHER WITH DEAD CHILD — PIETÀ (X ≈ -3.52, Y ∈ [0.65, 2.72], Z ≈ -0.46)
  // =========================================================================
  const mother = new T.Group();
  mother.position.set(-3.52, 0, -0.46);
  mother.rotation.y = 0.12;

  // Sweeping sinuous grieving torso curving upward like a cry
  const motherBody = cubistSlab([
    [-0.4, 0.72],
    [-0.54, 1.15, -0.44, 1.56],
    [-0.32, 1.92, -0.02, 2.26],
    [0.14, 2.34, 0.22, 2.16],
    [0.18, 1.78, 0.34, 1.32],
    [0.28, 0.92, 0.2, 0.76],
  ], {
    depth: 0.22,
    bevel: 0.024,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  mother.add(motherBody);

  // Geometric breasts in profile
  const breast1 = new T.Mesh(new T.ConeGeometry(0.095, 0.18, 8), mats.ivory);
  breast1.rotation.z = Math.PI * 0.42;
  breast1.position.set(-0.26, 1.72, 0.12);
  const breast2 = new T.Mesh(new T.ConeGeometry(0.09, 0.17, 8), mats.ivory);
  breast2.rotation.z = Math.PI * 0.56;
  breast2.position.set(-0.2, 1.54, 0.14);
  mother.add(breast1, breast2);

  // Head thrown sharply back in agony, mouth screaming straight at the sky
  const motherHead = new T.Group();
  motherHead.position.set(0.08, 2.38, 0.08);
  motherHead.rotation.z = -0.32;

  const headSlab = cubistSlab([
    [-0.16, -0.18],
    [0.18, -0.22, 0.32, 0.04],
    [0.36, 0.26, 0.12, 0.34],
    [-0.14, 0.34, -0.26, 0.14],
    [-0.24, -0.06, -0.16, -0.18],
  ], {
    depth: 0.19,
    bevel: 0.02,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  motherHead.add(headSlab);

  // Screaming wide-open mouth cavity + sharp dagger-tongue
  const openMouth = cubistSlab([
    [-0.23, 0.12], [0.02, 0.26], [0.04, 0.06], [-0.17, -0.02]
  ], { depth: 0.075, bevel: 0.007, mat: mats.pitch });
  openMouth.position.set(-0.04, 0.04, 0.09);
  motherHead.add(openMouth);

  const daggerTongue = cubistSlab([
    [-0.02, 0.12], [-0.32, 0.22], [-0.05, 0.18]
  ], { depth: 0.036, bevel: 0.004, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.005 });
  daggerTongue.position.set(0.0, 0.02, 0.13);
  motherHead.add(daggerTongue);

  // Teardrop-shaped grieving eyes
  const mEye1 = cubistEye(mats, { width: 0.15, height: 0.08, tear: true, pupilOffset: [0.02, 0.01] });
  mEye1.position.set(0.11, 0.12, 0.12);
  mEye1.rotation.z = 0.5;
  const mEye2 = cubistEye(mats, { width: 0.14, height: 0.075, tear: true, pupilOffset: [0.02, 0] });
  mEye2.position.set(0.21, -0.01, 0.12);
  mEye2.rotation.z = 0.35;
  motherHead.add(mEye1, mEye2);

  // Flowing teardrop-shaped striated hair falling behind her head
  const hair = cubistSlab([
    [0.12, -0.12],
    [0.36, -0.26, 0.4, -0.58],
    [0.24, -0.78, 0.12, -0.74],
    [-0.02, -0.48, 0.12, -0.12],
  ], { depth: 0.11, bevel: 0.014, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.007 });
  hair.position.set(0.04, -0.02, -0.02);
  for (let i = 0; i < 5; i++) {
    hair.add(inkStroke([
      [0.09 + i * 0.055, -0.16, 0.075],
      [0.14 + i * 0.05, -0.46, 0.075],
      [0.16 + i * 0.025, -0.7, 0.075]
    ], mats.ink, 0.0048));
  }
  motherHead.add(hair);
  mother.add(motherHead);

  // Arms cradling the limp dead child
  mother.add(sculptedLimb([-0.22, 1.55, 0.12], [-0.4, 1.16, 0.24], 0.075, 0.06, mats.ivory));
  mother.add(sculptedLimb([0.14, 1.55, 0.12], [0.06, 1.12, 0.26], 0.075, 0.06, mats.ivory));

  // Dead Child draped lifelessly across her lap
  const child = new T.Group();
  child.position.set(-0.24, 1.14, 0.26);

  const childHead = cubistSlab([
    [-0.46, 0.04],
    [-0.42, 0.24, -0.16, 0.22],
    [-0.06, 0.08, -0.12, -0.12],
    [-0.28, -0.24, -0.46, -0.1],
  ], { depth: 0.15, bevel: 0.018, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.0075 });
  child.add(childHead);

  const cEye1 = cubistEye(mats, { width: 0.1, height: 0.045, closed: true });
  cEye1.position.set(-0.33, 0.03, 0.095);
  const cEye2 = cubistEye(mats, { width: 0.1, height: 0.045, closed: true });
  cEye2.position.set(-0.2, -0.02, 0.095);
  child.add(cEye1, cEye2);

  const childTorso = cubistSlab([
    [-0.12, 0.12], [0.34, 0.14], [0.4, -0.16], [-0.1, -0.16]
  ], { depth: 0.13, bevel: 0.014, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.007 });
  child.add(childTorso);

  child.add(sculptedLimb([0.26, -0.06, 0.04], [0.42, -0.4, 0.06], 0.055, 0.042, mats.ivory));
  child.add(sculptedLimb([0.12, -0.08, 0.05], [0.16, -0.44, 0.08], 0.054, 0.04, mats.ivory));
  const motherHand = cubistHand(mats, { scale: 0.62, mat: mats.chalk });
  motherHand.position.set(0.32, -0.14, 0.12);
  motherHand.rotation.z = -1.2;
  child.add(motherHand);

  mother.add(child);
  root.add(mother);
  obstacles.push({ x: -3.52, z: -0.46, radius: 0.62 });

  // =========================================================================
  // 3. THE DOVE (X = -2.02, Y = 2.66, Z = -1.78) — clearly framed between bull & horse
  // =========================================================================
  const dove = new T.Group();
  dove.position.set(-2.02, 2.66, -1.78);

  const doveBody = cubistSlab([
    [-0.36, -0.1],
    [-0.22, 0.14, -0.06, 0.34],
    [0.06, 0.56],
    [0.18, 0.42],
    [0.16, 0.16, 0.44, 0.0],
    [0.36, -0.22, -0.08, -0.28],
  ], {
    depth: 0.14,
    bevel: 0.015,
    mat: mats.charcoal,
    outlineMat: mats.slate,
    outlineRadius: 0.009,
  });
  dove.add(doveBody);

  // Iconic stark white crack / fissure piercing diagonally across the dove's body
  const doveCrack = cubistSlab([
    [-0.36, 0.08], [0.02, -0.02], [0.34, -0.16], [0.28, -0.26], [-0.08, -0.13], [-0.38, -0.01]
  ], {
    depth: 0.055,
    bevel: 0.007,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.006,
  });
  doveCrack.position.set(0, 0, 0.09);
  dove.add(doveCrack);

  // Open beak crying upward
  dove.add(inkStroke([[0.05, 0.54, 0.08], [0.0, 0.7, 0.08]], mats.chalk, 0.008));
  dove.add(inkStroke([[0.15, 0.48, 0.08], [0.22, 0.68, 0.08]], mats.chalk, 0.008));

  dove.add(sculptedLimb([-0.04, -0.24, 0], [-0.08, -0.58, 0], 0.015, 0.013, mats.slate));
  dove.add(sculptedLimb([0.08, -0.24, 0], [0.1, -0.58, 0], 0.015, 0.013, mats.slate));

  root.add(dove);
  scene.add(root);

  return {
    root,
    bullTail,
    update(t) {
      bullTail.rotation.z = Math.sin(t * 1.15) * 0.04;
      bullTail.rotation.y = Math.cos(t * 0.8) * 0.06;
    },
    dispose() {
      disposeTree(root);
      scene.remove(root);
    },
  };
}
