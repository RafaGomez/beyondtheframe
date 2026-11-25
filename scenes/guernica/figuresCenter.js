import * as T from 'three';
import { cubistSlab, inkStroke, sculptedLimb, cubistEye, cubistHand, disposeTree } from './cubism.js';

// Builds the dramatic center of Guernica in 3D:
// 1. The Sun-Eye-Lightbulb (jagged 3D sunburst halo + glowing glass bulb & tungsten filament)
// 2. The Wounded Horse (newsprint-textured fractured torso, diamond wound, spear, agonized head with dagger tongue)
// 3. The Fallen Warrior in the foreground (broken statue head, stigmata hand, broken sword & sprouting flower)

export function buildCenterFigures(scene, mats, obstacles) {
  const root = new T.Group();
  root.name = 'guernica-center-figures';

  // =========================================================================
  // 1. THE SUN-EYE-LIGHTBULB (X = -1.24, Y = 3.56, Z = -0.35)
  // =========================================================================
  const sunBulb = new T.Group();
  sunBulb.position.set(-1.24, 3.56, -0.35);
  sunBulb.rotation.x = 0.08;

  // Jagged starburst eye-halo (22 sharp rays around an elongated oval — separated cleanly from oil lamp)
  const rayCount = 22;
  const starPts = [];
  for (let i = 0; i < rayCount * 2; i++) {
    const a = (i / (rayCount * 2)) * Math.PI * 2;
    const isTip = i % 2 === 0;
    const rx = isTip ? 0.78 : 0.56;
    const ry = isTip ? 0.31 : 0.2;
    starPts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }

  const halo = cubistSlab(starPts, {
    depth: 0.09,
    bevel: 0.014,
    mat: mats.sunHalo,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
    castShadow: false,
  });
  sunBulb.add(halo);

  // Inner oval pupil rim
  const innerPts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    innerPts.push([Math.cos(a) * 0.45, Math.sin(a) * 0.16]);
  }
  sunBulb.add(inkStroke(innerPts.map(p => [p[0], p[1], 0.065]), mats.ink, 0.008, { closed: true }));

  // 3D Lathe Lightbulb hanging inside the eye pupil
  const bulbGroup = new T.Group();
  bulbGroup.position.set(0.02, 0.02, 0.13);

  const socket = new T.Mesh(new T.CylinderGeometry(0.052, 0.058, 0.09, 10), mats.charcoal);
  socket.position.y = 0.13;
  bulbGroup.add(socket);

  const lathePts = [
    new T.Vector2(0.0, -0.14),
    new T.Vector2(0.065, -0.125),
    new T.Vector2(0.115, -0.06),
    new T.Vector2(0.118, 0.01),
    new T.Vector2(0.075, 0.075),
    new T.Vector2(0.048, 0.11),
  ];
  const glassBulb = new T.Mesh(new T.LatheGeometry(lathePts, 16), mats.bulbGlass);
  bulbGroup.add(glassBulb);

  // Glowing tungsten coil filament inside
  const filamentCurve = new T.CatmullRomCurve3([
    new T.Vector3(-0.022, 0.09, 0),
    new T.Vector3(-0.045, -0.02, 0.015),
    new T.Vector3(0.0, -0.065, -0.015),
    new T.Vector3(0.045, -0.02, 0.015),
    new T.Vector3(0.022, 0.09, 0),
  ]);
  const filament = new T.Mesh(new T.TubeGeometry(filamentCurve, 24, 0.0085, 6, false), mats.filament);
  bulbGroup.add(filament);

  sunBulb.add(bulbGroup);
  root.add(sunBulb);

  // =========================================================================
  // 2. THE WOUNDED HORSE (X ≈ -0.68, Y ∈ [0.6, 3.12], Z ≈ -0.78)
  // =========================================================================
  const horse = new T.Group();
  horse.position.set(-0.68, 0, -0.78);

  // Rear dark arched flank (back layer Z = -0.22)
  const backFlank = cubistSlab([
    [-1.42, 1.32], [-1.35, 1.98], [-0.88, 2.34],
    [0.12, 2.28], [0.78, 1.85], [0.72, 1.18],
    [-0.25, 1.04], [-1.15, 1.05]
  ], {
    depth: 0.34,
    bevel: 0.032,
    mat: mats.slate,
    outlineMat: mats.ink,
    outlineRadius: 0.009,
  });
  backFlank.position.z = -0.18;
  horse.add(backFlank);

  // Primary Newsprint-textured fractured torso (middle layer Z = +0.08)
  const newsTorso = cubistSlab([
    [-1.18, 1.02], [-1.05, 1.72], [-0.42, 2.15],
    [0.36, 2.02], [0.62, 1.48], [0.18, 0.94], [-0.72, 0.82]
  ], {
    depth: 0.32,
    bevel: 0.03,
    uvScale: 0.55,
    mat: mats.newsprint,
    outlineMat: mats.ink,
    outlineRadius: 0.009,
  });
  newsTorso.position.z = 0.08;
  horse.add(newsTorso);

  // Bright pale cubist haunch/saddle facet overlapping on the right side of the horse
  const paleHaunch = cubistSlab([
    [0.18, 1.32], [0.68, 2.12], [1.22, 1.96], [1.38, 1.38], [0.95, 1.05], [0.34, 1.12]
  ], {
    depth: 0.28,
    bevel: 0.028,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  paleHaunch.position.set(0.14, 0.02, 0.16);
  paleHaunch.rotation.y = -0.14;
  horse.add(paleHaunch);

  // Iconic open diamond-shaped wound gashed into the horse's side
  const woundOuter = cubistSlab([
    [0, 0.42], [0.16, 0.02], [0, -0.36], [-0.15, 0.02]
  ], {
    depth: 0.12,
    bevel: 0.015,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  woundOuter.position.set(-0.34, 1.92, 0.28);
  woundOuter.rotation.z = -0.12;
  horse.add(woundOuter);

  const woundCore = cubistSlab([
    [0, 0.28], [0.075, 0], [0, -0.24], [-0.07, 0]
  ], { depth: 0.06, bevel: 0.006, mat: mats.pitch });
  woundCore.position.set(-0.34, 1.92, 0.35);
  woundCore.rotation.z = -0.12;
  horse.add(woundCore);

  // Diagonal dark lance piercing down through the horse's back
  const spear = sculptedLimb([0.36, 2.86, 0.18], [-0.62, 0.72, 0.34], 0.032, 0.026, mats.pitch, { radialSegments: 6 });
  horse.add(spear);
  // Spearhead tip protruding downward
  const spearTip = new T.Mesh(new T.ConeGeometry(0.065, 0.22, 4), mats.charcoal);
  spearTip.position.set(-0.66, 0.62, 0.35);
  spearTip.rotation.z = 2.7;
  horse.add(spearTip);

  // Arching neck & agonizing head turned left
  const neck = cubistSlab([
    [-0.08, 1.92], [0.46, 2.02], [0.36, 2.88], [0.02, 3.06], [-0.22, 2.85], [-0.02, 2.48]
  ], {
    depth: 0.28,
    bevel: 0.026,
    mat: mats.ashMid,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  neck.position.set(0.08, 0, 0.12);
  horse.add(neck);

  // Agonized Horse Head (turned sharply left toward the bull, Z forward)
  const horseHead = new T.Group();
  horseHead.position.set(-0.18, 2.86, 0.28);
  horseHead.rotation.y = 0.16;

  // Cranium + elongated upper jaw
  const upperHead = cubistSlab([
    [0.32, 0.28], [-0.14, 0.26], [-0.64, 0.34], [-0.76, 0.16],
    [-0.58, -0.04], [-0.12, -0.02], [0.28, -0.06]
  ], {
    depth: 0.24,
    bevel: 0.022,
    mat: mats.ashLight,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  horseHead.add(upperHead);

  // Lower jaw hinged open in a shriek
  const lowerJaw = cubistSlab([
    [0.12, -0.04], [-0.68, -0.18], [-0.64, -0.34], [0.16, -0.22]
  ], {
    depth: 0.2,
    bevel: 0.018,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0075,
  });
  horseHead.add(lowerJaw);

  // Dark mouth interior + sharp rectangular teeth + dagger tongue
  const hMouth = cubistSlab([
    [-0.12, 0.02], [-0.66, 0.1], [-0.62, -0.2], [-0.1, -0.12]
  ], { depth: 0.12, bevel: 0.008, mat: mats.pitch });
  hMouth.position.z = 0.08;
  horseHead.add(hMouth);

  // Upper & lower teeth
  for (let i = 0; i < 4; i++) {
    const tooth = new T.Mesh(new T.BoxGeometry(0.06, 0.075, 0.07), mats.chalk);
    tooth.position.set(-0.58 + i * 0.085, 0.05, 0.14);
    horseHead.add(tooth);
    const bTooth = new T.Mesh(new T.BoxGeometry(0.055, 0.065, 0.07), mats.chalk);
    bTooth.position.set(-0.56 + i * 0.08, -0.16, 0.14);
    horseHead.add(bTooth);
  }

  // Dagger-shaped screaming tongue shooting out left
  const hTongue = cubistSlab([
    [-0.18, -0.04], [-0.76, -0.02], [-0.52, -0.14], [-0.16, -0.12]
  ], { depth: 0.07, bevel: 0.01, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.009 });
  hTongue.position.z = 0.16;
  horseHead.add(hTongue);

  // Flared nostrils on top of muzzle
  horseHead.add(inkStroke([[-0.66, 0.24, 0.15], [-0.56, 0.28, 0.15], [-0.58, 0.18, 0.15]], mats.ink, 0.011, { closed: true }));

  // Wild panicked eyes + pointed ears
  const hEye = cubistEye(mats, { width: 0.16, height: 0.085, pupilOffset: [-0.02, 0.01] });
  hEye.position.set(0.08, 0.14, 0.16);
  horseHead.add(hEye);

  const hEar1 = cubistSlab([[0, 0], [0.06, 0.28], [0.16, 0.04]], {
    depth: 0.07, bevel: 0.01, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.01
  });
  hEar1.position.set(0.14, 0.22, 0.04);
  const hEar2 = cubistSlab([[0, 0], [0.12, 0.25], [0.18, 0]], {
    depth: 0.07, bevel: 0.01, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.01
  });
  hEar2.position.set(0.24, 0.2, -0.05);
  horseHead.add(hEar1, hEar2);

  horse.add(horseHead);

  // Flowing bristling tail on left side of horse
  const horseTail = cubistSlab([
    [-1.12, 1.56], [-1.52, 1.66], [-1.74, 1.32], [-1.62, 0.96], [-1.32, 1.18], [-1.05, 1.24]
  ], {
    depth: 0.14,
    bevel: 0.016,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.011,
  });
  horseTail.position.z = 0.02;
  for (let i = 0; i < 5; i++) {
    horseTail.add(inkStroke([
      [-1.16, 1.52 - i * 0.06, 0.09],
      [-1.46, 1.48 - i * 0.09, 0.09],
      [-1.64 + i * 0.04, 1.22 - i * 0.06, 0.09]
    ], mats.ink, 0.007));
  }
  horse.add(horseTail);

  // Buckling legs & hooves
  // Front-left bent leg (newsprint-textured)
  const frontKnee = cubistSlab([
    [-1.18, 1.02], [-1.62, 0.72], [-1.52, 0.48], [-0.95, 0.78]
  ], { depth: 0.18, bevel: 0.02, uvScale: 0.6, mat: mats.newsprint, outlineMat: mats.ink, outlineRadius: 0.012 });
  frontKnee.position.z = 0.22;
  horse.add(frontKnee);

  // Right splayed hind leg extending toward the right foreground with heavy beveled hoof
  horse.add(sculptedLimb([0.85, 1.45, 0.14], [1.45, 1.32, 0.26], 0.14, 0.11, mats.ivory));
  horse.add(sculptedLimb([1.45, 1.32, 0.26], [1.62, 0.62, 0.34], 0.11, 0.085, mats.chalk));
  const hindHoof = cubistSlab([
    [-0.14, 0], [0.16, 0], [0.1, 0.24], [-0.1, 0.24]
  ], { depth: 0.18, bevel: 0.018, mat: mats.ashLight, outlineMat: mats.ink, outlineRadius: 0.012 });
  hindHoof.position.set(1.64, 0.42, 0.36);
  horse.add(hindHoof);

  // Buckled inner leg underneath
  horse.add(sculptedLimb([-0.45, 1.1, 0.12], [-0.62, 0.52, 0.22], 0.13, 0.09, mats.newsprint));

  root.add(horse);
  obstacles.push({ x: -0.68, z: -0.78, radius: 1.25 });

  // =========================================================================
  // 3. THE FALLEN WARRIOR (Foreground floor: X ∈ [-3.95, +0.9], Y ≈ 0.04..0.85, Z ≈ +0.55)
  // =========================================================================
  const warrior = new T.Group();
  warrior.position.set(-1.42, 0.04, 0.58);

  // Severed classical/cubist statue head lying sideways gazing upward
  const wHead = new T.Group();
  wHead.position.set(-0.85, 0.36, 0.05);
  wHead.rotation.z = 0.24;

  const wSkull = cubistSlab([
    [-0.46, -0.05], [-0.32, 0.36], [0.18, 0.42],
    [0.44, 0.16], [0.36, -0.26], [-0.18, -0.34]
  ], {
    depth: 0.32,
    bevel: 0.032,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  wHead.add(wSkull);

  // Hollow fractured neck pedestal (explicitly depicting a broken statue)
  const hollowNeck = cubistSlab([
    [0.24, -0.24], [0.58, -0.44], [0.64, -0.04], [0.32, 0.12]
  ], { depth: 0.22, bevel: 0.02, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.012 });
  hollowNeck.position.set(0.14, 0.02, -0.02);
  wHead.add(hollowNeck);

  // Displaced cubist eyes & open grieving mouth on the fallen statue head
  const wEye1 = cubistEye(mats, { width: 0.18, height: 0.09, pupilOffset: [0.01, 0.01] });
  wEye1.position.set(-0.22, 0.06, 0.2);
  wEye1.rotation.z = -0.35;
  const wEye2 = cubistEye(mats, { width: 0.18, height: 0.09, pupilOffset: [0.01, -0.01] });
  wEye2.position.set(-0.08, -0.14, 0.2);
  wEye2.rotation.z = -0.2;
  wHead.add(wEye1, wEye2);

  // Sharp angular nose + screaming mouth
  wHead.add(inkStroke([[-0.06, 0.18, 0.2], [0.04, 0.02, 0.24], [-0.12, -0.02, 0.2]], mats.ink, 0.012));
  const wMouth = cubistSlab([
    [0.06, 0.26], [0.28, 0.18], [0.22, -0.02], [0.04, 0.06]
  ], { depth: 0.08, bevel: 0.008, mat: mats.pitch, outlineMat: mats.ink, outlineRadius: 0.01 });
  wMouth.position.set(0.05, 0.04, 0.16);
  wHead.add(wMouth);

  warrior.add(wHead);

  // Outstretched left arm extending far left with open stigmata palm
  const leftArm = cubistSlab([
    [-2.15, 0.12], [-1.22, 0.14], [-1.22, 0.42], [-2.12, 0.36]
  ], {
    depth: 0.2,
    bevel: 0.022,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  leftArm.position.set(0, 0.02, 0.08);
  warrior.add(leftArm);

  const leftHand = cubistHand(mats, { scale: 1.05, mat: mats.chalk, stigmata: true, depth: 0.1 });
  leftHand.position.set(-2.22, 0.28, 0.12);
  leftHand.rotation.z = Math.PI * 0.52;
  warrior.add(leftHand);

  // Right severed arm arching along the floor gripping the broken sword
  const rightArm = cubistSlab([
    [0.18, 0.32], [0.85, 0.12], [1.62, 0.14], [1.66, 0.38], [0.92, 0.42], [0.35, 0.62]
  ], {
    depth: 0.2,
    bevel: 0.022,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  rightArm.position.set(0.15, 0.02, 0.04);
  warrior.add(rightArm);

  // Clenched fist gripping the sword hilt
  const fist = cubistSlab([
    [-0.14, -0.14], [0.16, -0.12], [0.18, 0.14], [-0.12, 0.16]
  ], { depth: 0.2, bevel: 0.025, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.011 });
  fist.position.set(1.88, 0.28, 0.08);
  for (let i = -1; i <= 1; i++) {
    fist.add(inkStroke([[-0.08, i * 0.065, 0.13], [0.1, i * 0.065, 0.13]], mats.ink, 0.008));
  }
  warrior.add(fist);

  // Broken Sword (pommel + guard + jagged snapped blade)
  const sword = new T.Group();
  sword.position.set(1.86, 0.26, 0.12);
  sword.rotation.z = 0.56;

  const pommel = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 0.1, 10), mats.ivory);
  pommel.rotation.x = Math.PI * 0.5;
  pommel.position.set(-0.28, 0, 0);
  const hilt = sculptedLimb([-0.26, 0, 0], [0.08, 0, 0], 0.042, 0.042, mats.ashLight);
  const blade = cubistSlab([
    [0.06, -0.075], [0.68, -0.055], [0.54, 0.01], [0.74, 0.07], [0.06, 0.075]
  ], { depth: 0.045, bevel: 0.008, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.009 });
  sword.add(pommel, hilt, blade);
  warrior.add(sword);

  // Delicate 3D Flower of Hope sprouting right above the warrior's fist & broken sword
  const flower = new T.Group();
  flower.position.set(1.88, 0.42, 0.18);

  const stemCurve = new T.CatmullRomCurve3([
    new T.Vector3(0, -0.1, 0),
    new T.Vector3(-0.04, 0.12, 0.02),
    new T.Vector3(-0.08, 0.34, 0.03),
  ]);
  flower.add(new T.Mesh(new T.TubeGeometry(stemCurve, 14, 0.011, 6, false), mats.ink));

  // Two small leaves on the stem
  const leafPts = [[0, 0], [0.06, 0.04], [0.13, 0.02], [0.06, -0.03]];
  const leafL = cubistSlab(leafPts, { depth: 0.012, bevel: 0.003, mat: mats.flowerPetal, outlineMat: mats.ink, outlineRadius: 0.005 });
  leafL.position.set(-0.04, 0.12, 0.02);
  leafL.rotation.z = 2.4;
  const leafR = cubistSlab(leafPts, { depth: 0.012, bevel: 0.003, mat: mats.flowerPetal, outlineMat: mats.ink, outlineRadius: 0.005 });
  leafR.position.set(-0.03, 0.1, 0.02);
  leafR.rotation.z = 0.4;
  flower.add(leafL, leafR);

  // Five delicate white cubist petals radiating around the blossom center
  const blossom = new T.Group();
  blossom.position.set(-0.08, 0.36, 0.03);
  blossom.rotation.x = -0.22;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const petal = cubistSlab([
      [0, 0], [-0.045, 0.07], [0, 0.15], [0.045, 0.07]
    ], { depth: 0.014, bevel: 0.003, mat: mats.flowerPetal, outlineMat: mats.ink, outlineRadius: 0.0045 });
    petal.rotation.z = a;
    petal.rotation.x = 0.25;
    blossom.add(petal);
  }
  const centerDot = new T.Mesh(new T.SphereGeometry(0.028, 8, 8), mats.ink);
  blossom.add(centerDot);
  flower.add(blossom);

  warrior.add(flower);
  root.add(warrior);
  // Keep foreground warrior head & sword arm as low obstacles so visitor walks around rather than stepping on them
  obstacles.push({ x: -2.5, z: 0.62, radius: 0.55 });
  obstacles.push({ x: 0.15, z: 0.62, radius: 0.5 });

  scene.add(root);

  return {
    root,
    sunBulb,
    bulbGroup,
    flower,
    update(t) {
      // Barely perceptible tension sway in the suspended bulb and gentle tremble in the flower
      sunBulb.rotation.z = Math.sin(t * 0.9) * 0.012;
      flower.rotation.z = Math.sin(t * 1.8) * 0.035;
    },
    dispose() {
      disposeTree(root);
      scene.remove(root);
    },
  };
}
