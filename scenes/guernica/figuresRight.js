import * as T from 'three';
import { cubistSlab, inkStroke, sculptedLimb, cubistEye, cubistHand, disposeTree } from './cubism.js';

// Builds the right wing of Guernica in 3D cubist sculpture:
// 1. The Lamp-Bearer (emerging cleanly below her swept arm, holding the oil lamp unobstructed to the right of the bulb)
// 2. The Fleeing / Kneeling Woman (organic curved back striding toward the light with monumental knee & feet)
// 3. The Burning Woman (expressive upturned screaming profile & raised hands among cubist flames)

export function buildRightFigures(scene, mats, obstacles) {
  const root = new T.Group();
  root.name = 'guernica-right-figures';

  // =========================================================================
  // 1. THE LAMP-BEARER (X ∈ [-0.25, +2.38], Y ∈ [2.25, 3.68], Z ≈ -1.1 .. -0.45)
  // =========================================================================
  const lampBearer = new T.Group();
  lampBearer.position.set(1.74, 2.74, -1.12);

  // Monumental pale elongated profile head emerging cleanly below her swept arm
  const lbHead = new T.Group();
  lbHead.rotation.y = -0.14;

  const faceSlab = cubistSlab([
    [-0.42, 0.34],
    [0.12, 0.42, 0.54, 0.48],
    [0.52, 0.14, 0.32, -0.32],
    [0.12, -0.58, -0.18, -0.56],
    [-0.22, -0.38],
    [-0.38, -0.26],
    [-0.32, -0.08],
    [-0.5, -0.02],
    [-0.4, 0.14],
  ], {
    depth: 0.26,
    bevel: 0.026,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  lbHead.add(faceSlab);

  // Flowing striated dark hair sweeping back into the dark window
  const lbHair = cubistSlab([
    [-0.14, 0.32],
    [0.36, 0.56, 0.78, 0.68],
    [0.64, 0.34, 0.18, 0.26],
  ], {
    depth: 0.2,
    bevel: 0.018,
    mat: mats.charcoal,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  lbHair.position.set(0.02, 0.04, -0.02);
  for (let i = 0; i < 6; i++) {
    lbHair.add(inkStroke([
      [-0.04 + i * 0.08, 0.32 + i * 0.035, 0.12],
      [0.34 + i * 0.06, 0.46 + i * 0.03, 0.12],
      [0.68, 0.4 + i * 0.04, 0.12]
    ], mats.ashLight, 0.006));
  }
  lbHead.add(lbHair);

  // Sorrowsome eyes in simultaneous perspective — completely unobstructed below the arm
  const lbEye1 = cubistEye(mats, { width: 0.15, height: 0.075, pupilOffset: [-0.02, -0.005] });
  lbEye1.position.set(-0.24, 0.11, 0.16);
  const lbEye2 = cubistEye(mats, { width: 0.16, height: 0.08, pupilOffset: [-0.02, -0.005] });
  lbEye2.position.set(-0.02, 0.08, 0.16);
  lbHead.add(lbEye1, lbEye2);

  // Expressive arched brows & parted lips
  lbHead.add(inkStroke([[-0.34, 0.2, 0.17], [-0.17, 0.23, 0.17]], mats.ink, 0.007));
  lbHead.add(inkStroke([[-0.1, 0.18, 0.17], [0.06, 0.16, 0.17]], mats.ink, 0.007));

  lampBearer.add(lbHead);

  // Long sweeping floating arm high above her brow reaching across to hold the oil lamp
  const armReach = cubistSlab([
    [0.08, 0.48],
    [-0.68, 0.56, -1.48, 0.46],
    [-1.92, 0.34],
    [-1.92, 0.15],
    [-1.42, 0.24, -0.62, 0.3],
    [0.02, 0.26],
  ], {
    depth: 0.16,
    bevel: 0.02,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  armReach.position.set(-0.02, 0.04, 0.36);
  armReach.rotation.y = 0.2;
  lampBearer.add(armReach);

  // Sweeping grey shadow mantle floating above her arm (characteristic planar echo in Guernica)
  const armShadow = cubistSlab([
    [0.52, 0.76],
    [-0.48, 0.66, -1.42, 0.5],
    [-0.56, 0.44, 0.24, 0.48],
  ], {
    depth: 0.11,
    bevel: 0.014,
    mat: mats.ashMid,
    outlineMat: mats.ink,
    outlineRadius: 0.0075,
  });
  armShadow.position.set(0.02, 0.06, 0.22);
  armShadow.rotation.y = 0.16;
  lampBearer.add(armShadow);

  // Hand & Oil Lamp (Quinqué) positioned at world approx (-0.22, 3.08, -0.52) — clearly separated from bulb!
  const lampGroup = new T.Group();
  lampGroup.position.set(-1.94, 0.3, 0.58);

  const gripFist = cubistSlab([
    [-0.11, -0.13], [0.13, -0.13], [0.15, 0.11], [-0.09, 0.13]
  ], { depth: 0.15, bevel: 0.018, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.0075 });
  lampGroup.add(gripFist);
  for (let i = 0; i < 4; i++) {
    gripFist.add(inkStroke([[-0.08, -0.08 + i * 0.055, 0.095], [0.1, -0.08 + i * 0.055, 0.095]], mats.ink, 0.006));
  }

  // Sculpted 3D Lathe Oil Lamp body
  const lampProfile = [
    new T.Vector2(0.0, -0.22),
    new T.Vector2(0.11, -0.2),
    new T.Vector2(0.058, -0.11),
    new T.Vector2(0.052, 0.12),
    new T.Vector2(0.145, 0.19),
    new T.Vector2(0.115, 0.27),
    new T.Vector2(0.06, 0.29),
  ];
  const lampBody = new T.Mesh(new T.LatheGeometry(lampProfile, 14), mats.chalk);
  lampBody.castShadow = true;
  lampGroup.add(lampBody);

  // Living sculpted oil flame rising above the quinqué
  const lampFlame = new T.Group();
  lampFlame.position.set(0, 0.45, 0);

  const outerFlame = cubistSlab([
    [0, -0.16],
    [0.13, -0.02, 0.09, 0.18],
    [0, 0.36],
    [-0.09, 0.18, -0.13, -0.02],
  ], { depth: 0.075, bevel: 0.014, mat: mats.lampFlame, outlineMat: mats.ink, outlineRadius: 0.0065, castShadow: false });
  lampFlame.add(outerFlame);

  const crossFlame = outerFlame.clone();
  crossFlame.rotation.y = Math.PI * 0.5;
  lampFlame.add(crossFlame);

  lampGroup.add(lampFlame);
  lampBearer.add(lampGroup);
  root.add(lampBearer);

  // =========================================================================
  // 2. THE FLEEING / KNEELING WOMAN (X ∈ [+0.75, +4.1], Y ∈ [0.12, 2.28], Z ≈ +0.18)
  // =========================================================================
  const fleeing = new T.Group();
  fleeing.position.set(2.12, 0, 0.18);
  fleeing.rotation.y = -0.1;

  // Gracefully curved leaning back & torso surging diagonally toward the light
  const fTorso = cubistSlab([
    [-0.86, 1.56],
    [-0.45, 1.76, -0.05, 1.55],
    [0.42, 1.28, 0.78, 0.76],
    [0.48, 0.48],
    [0.02, 0.88, -0.35, 1.12],
    [-0.72, 1.32],
  ], {
    depth: 0.26,
    bevel: 0.026,
    mat: mats.ivory,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  fleeing.add(fTorso);

  // Overlapping cubist faceted drapery planes behind her torso
  const fSkirt = cubistSlab([
    [0.04, 1.38], [0.74, 1.14], [0.84, 0.38], [-0.26, 0.44]
  ], {
    depth: 0.2,
    bevel: 0.02,
    mat: mats.ashMid,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  fSkirt.position.set(0.08, 0, -0.08);
  fleeing.add(fSkirt);

  // Rounded geometric breasts beneath leaning chest
  const fb1 = new T.Mesh(new T.SphereGeometry(0.105, 12, 10), mats.chalk);
  fb1.position.set(-0.4, 1.34, 0.15);
  const fb2 = new T.Mesh(new T.SphereGeometry(0.095, 12, 10), mats.chalk);
  fb2.position.set(-0.21, 1.22, 0.16);
  fleeing.add(fb1, fb2);

  // Upward-gazing slender head fixed on the oil lamp and sun-eye
  const fHead = new T.Group();
  fHead.position.set(-0.92, 1.94, 0.06);
  fHead.rotation.z = -0.34;

  const fSkull = cubistSlab([
    [-0.32, 0.1],
    [-0.14, 0.32, 0.28, 0.2],
    [0.34, 0.02, 0.28, -0.16],
    [0.0, -0.26, -0.28, -0.08],
  ], {
    depth: 0.22,
    bevel: 0.022,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.008,
  });
  fHead.add(fSkull);

  const fHair = cubistSlab([
    [0.12, 0.22], [0.64, 0.16], [0.44, -0.14], [0.14, -0.04]
  ], { depth: 0.15, bevel: 0.015, mat: mats.ashLight, outlineMat: mats.ink, outlineRadius: 0.0075 });
  fHead.add(fHair);

  const fEye1 = cubistEye(mats, { width: 0.13, height: 0.065, pupilOffset: [-0.02, 0.01] });
  fEye1.position.set(-0.12, 0.1, 0.14);
  const fEye2 = cubistEye(mats, { width: 0.12, height: 0.06, pupilOffset: [-0.02, 0.01] });
  fEye2.position.set(0.03, 0.05, 0.14);
  fHead.add(fEye1, fEye2);

  fleeing.add(fHead);

  // Trailing extended arm & open hand reaching diagonally down-right
  fleeing.add(sculptedLimb([-0.24, 1.48, 0.14], [0.62, 0.88, 0.24], 0.088, 0.065, mats.chalk));
  const fHand = cubistHand(mats, { scale: 0.72, mat: mats.chalk });
  fHand.position.set(0.76, 0.78, 0.26);
  fHand.rotation.z = -2.25;
  fleeing.add(fHand);

  // Heavy forward kneeling leg & monumental enlarged cubist foot
  fleeing.add(sculptedLimb([0.24, 0.88, 0.04], [-0.14, 0.42, 0.12], 0.17, 0.125, mats.ashLight));
  const frontFoot = cubistSlab([
    [-0.44, 0.02], [0.06, 0.02], [0.08, 0.26], [-0.24, 0.34], [-0.46, 0.18]
  ], { depth: 0.2, bevel: 0.02, mat: mats.ashLight, outlineMat: mats.ink, outlineRadius: 0.0085 });
  frontFoot.position.set(-0.18, 0.08, 0.16);
  fleeing.add(frontFoot);

  // Massive trailing leg dragging across the right foreground + colossal five-toed foot
  const trailingThigh = cubistSlab([
    [0.5, 0.9], [1.54, 0.54], [1.48, 0.22], [0.42, 0.48]
  ], { depth: 0.22, bevel: 0.022, mat: mats.ashLight, outlineMat: mats.ink, outlineRadius: 0.0085 });
  fleeing.add(trailingThigh);

  const giantFoot = cubistHand(mats, { scale: 1.0, mat: mats.ivory, depth: 0.11 });
  giantFoot.position.set(1.76, 0.4, 0.08);
  giantFoot.rotation.z = -1.38;
  fleeing.add(giantFoot);

  root.add(fleeing);
  obstacles.push({ x: 2.15, z: 0.25, radius: 0.82 });

  // =========================================================================
  // 3. THE BURNING WOMAN (Far right: X = +3.52, Y ∈ [1.8, 3.55], Z = -1.02)
  // =========================================================================
  const burning = new T.Group();
  burning.position.set(3.52, 1.92, -1.02);
  burning.rotation.y = -0.22;

  const bTorso = cubistSlab([
    [-0.26, -0.05], [0.3, -0.05], [0.22, 0.62], [-0.2, 0.58]
  ], { depth: 0.2, bevel: 0.02, mat: mats.ashLight, outlineMat: mats.ink, outlineRadius: 0.0085 });
  burning.add(bTorso);

  // Iconic Picasso upturned screaming profile of the burning woman
  const bHead = new T.Group();
  bHead.position.set(0.05, 0.86, 0.08);
  bHead.rotation.z = 0.18;

  const bSkull = cubistSlab([
    [-0.22, -0.2],
    [0.14, -0.32, 0.34, -0.06],
    [0.4, 0.14, 0.2, 0.34],
    [0.06, 0.2],   // open mouth notch gazing upward
    [0.02, 0.44],  // upturned nose/chin silhouette
    [-0.18, 0.48, -0.26, 0.22],
    [-0.26, 0.0, -0.22, -0.2],
  ], {
    depth: 0.22,
    bevel: 0.022,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: 0.0085,
  });
  bHead.add(bSkull);

  const bEye1 = cubistEye(mats, { width: 0.125, height: 0.07, pupilOffset: [0, 0.01] });
  bEye1.position.set(0.06, 0.01, 0.145);
  const bEye2 = cubistEye(mats, { width: 0.115, height: 0.065, pupilOffset: [0, 0.01] });
  bEye2.position.set(0.2, -0.08, 0.145);
  bHead.add(bEye1, bEye2);

  // Streaming hair blown sideways by fire drafts
  const bHair = cubistSlab([
    [-0.16, -0.16], [0.46, -0.38], [0.38, -0.52], [-0.12, -0.28]
  ], { depth: 0.11, bevel: 0.012, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.007 });
  bHead.add(bHair);
  burning.add(bHead);

  // Both arms raised high in stark terror & supplication
  const leftArmUp = sculptedLimb([-0.22, 0.28, 0.04], [-0.5, 1.12, 0.14], 0.1, 0.078, mats.ivory);
  const rightArmUp = sculptedLimb([0.22, 0.28, 0.04], [0.56, 1.06, 0.12], 0.1, 0.078, mats.ivory);
  burning.add(leftArmUp, rightArmUp);

  const bHandL = cubistHand(mats, { scale: 0.82, mat: mats.chalk });
  bHandL.position.set(-0.54, 1.24, 0.16);
  bHandL.rotation.z = 0.32;
  const bHandR = cubistHand(mats, { scale: 0.82, mat: mats.chalk });
  bHandR.position.set(0.62, 1.16, 0.14);
  bHandR.rotation.z = -0.42;
  burning.add(bHandL, bHandR);

  // Jagged cubist flames engulfing her lower body
  const fireShards = [];
  const fireDefs = [
    { pts: [[-0.66, -0.25], [-0.46, 0.34], [-0.22, -0.18]], z: 0.18, mat: mats.fireLight },
    { pts: [[-0.3, -0.22], [-0.04, 0.24], [0.22, -0.22]], z: 0.26, mat: mats.fireDark },
    { pts: [[0.14, -0.24], [0.44, 0.42], [0.68, -0.22]], z: 0.16, mat: mats.fireLight },
    { pts: [[0.42, -0.15], [0.76, 0.28], [0.84, -0.28]], z: 0.04, mat: mats.ashLight },
  ];
  fireDefs.forEach(d => {
    const f = cubistSlab(d.pts, {
      depth: 0.11,
      bevel: 0.014,
      mat: d.mat,
      outlineMat: mats.ink,
      outlineRadius: 0.008,
      castShadow: false,
    });
    f.position.z = d.z;
    burning.add(f);
    fireShards.push(f);
  });

  root.add(burning);
  scene.add(root);

  return {
    root,
    lampFlame,
    fireShards,
    update(t) {
      const pulse = 1 + Math.sin(t * 7.4) * 0.06 + Math.sin(t * 13.1) * 0.03;
      lampFlame.scale.set(1 + Math.sin(t * 5.2) * 0.03, pulse, 1);
      lampFlame.rotation.z = Math.sin(t * 3.8) * 0.045;

      fireShards.forEach((f, idx) => {
        f.scale.y = 1 + Math.sin(t * 5.1 + idx * 1.7) * 0.07;
        f.rotation.z = Math.cos(t * 3.4 + idx * 1.2) * 0.03;
      });
    },
    dispose() {
      disposeTree(root);
      scene.remove(root);
    },
  };
}
