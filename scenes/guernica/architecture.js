import * as T from 'three';
import { cubistSlab, inkStroke, disposeTree } from './cubism.js';

// Builds the fractured indoor/outdoor cubist architectural stage of Guernica:
// - Perspective tiled floor (Y = 0)
// - Slanted dark left ceiling & back charcoal walls
// - Table/ledge under the dove on the back-left
// - Iconic central-right diagonal light wedge / pyramidal architectural wall & scalloped tiled roof
// - Interior building facade with the window for the Lamp-Bearer
// - Burning right-side tower with glowing square window, jagged roof flames, and ajar door

export function buildArchitecture(scene, mats, obstacles) {
  const root = new T.Group();
  root.name = 'guernica-architecture';

  // ---- 1. Perspective Tiled Floor (Y = 0) --------------------------------
  const floorGeo = new T.PlaneGeometry(12.4, 12.6);
  const floor = new T.Mesh(floorGeo, mats.floor);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(0, 0, 1.0);
  floor.receiveShadow = true;
  root.add(floor);

  // Perspective floor chalk perspective-grid lines converging slightly toward center back
  for (let i = -5; i <= 5; i++) {
    const xFront = i * 1.08;
    const xBack = i * 0.82;
    root.add(inkStroke([[xFront, 0.008, 6.2], [xBack, 0.008, -4.1]], mats.slate, 0.01));
  }
  for (let z = -3.8; z <= 5.4; z += 1.02) {
    root.add(inkStroke([[-5.4, 0.008, z], [5.4, 0.008, z]], mats.slate, 0.009));
  }

  // Painted/sculpted cubist cast-shadow geometric triangles on the floor
  const floorShadow1 = cubistSlab([
    [-4.35, -0.35], [-1.35, -0.35], [-2.1, 0.65], [-4.35, 0.5]
  ], { depth: 0.012, bevel: 0.003, mat: mats.pitch, castShadow: false });
  floorShadow1.rotation.x = -Math.PI * 0.5;
  floorShadow1.position.set(0, 0.014, 0.45);
  root.add(floorShadow1);

  const floorShadow2 = cubistSlab([
    [1.6, -0.6], [4.35, -0.9], [4.35, 0.9], [2.4, 0.7]
  ], { depth: 0.012, bevel: 0.003, mat: mats.charcoal, castShadow: false });
  floorShadow2.rotation.x = -Math.PI * 0.5;
  floorShadow2.position.set(0, 0.014, -0.2);
  root.add(floorShadow2);

  // ---- 2. Back & Side Enclosure (Charcoal Room + Exterior Night) ---------
  const backWall = new T.Mesh(new T.PlaneGeometry(12.4, 5.4), mats.charcoal);
  backWall.position.set(0, 2.5, -4.25);
  backWall.receiveShadow = true;
  root.add(backWall);

  // Left interior wall angled inward like Picasso's claustrophobic room corner
  const leftWall = new T.Mesh(new T.PlaneGeometry(10.8, 5.2), mats.charcoal);
  leftWall.rotation.y = Math.PI * 0.5 - 0.08;
  leftWall.position.set(-4.85, 2.5, 0.8);
  leftWall.receiveShadow = true;
  root.add(leftWall);

  // Diagonal upper-left ceiling/corner beam matching the top-left dark wedge in the painting
  const leftCornerBeam = cubistSlab([
    [-4.65, 4.15], [-3.25, 4.15], [-3.85, 3.25], [-4.65, 3.85]
  ], { depth: 2.8, bevel: 0.025, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.011 });
  leftCornerBeam.position.set(0, 0, -2.5);
  root.add(leftCornerBeam);

  // Dark tilted ceiling canopy (leaves visual breathing room while echoing Guernica's oppressive roof)
  const ceiling = new T.Mesh(new T.PlaneGeometry(12.2, 8.2), mats.pitch);
  ceiling.rotation.x = Math.PI * 0.5 + 0.04;
  ceiling.position.set(0, 4.25, -0.25);
  root.add(ceiling);

  // Right outer wall behind the burning tower
  const rightWall = new T.Mesh(new T.PlaneGeometry(10.8, 5.2), mats.pitch);
  rightWall.rotation.y = -Math.PI * 0.5 + 0.07;
  rightWall.position.set(4.85, 2.5, 0.8);
  root.add(rightWall);

  // ---- 3. Back-Left Dark Room Panel & Dove's Table/Ledge -----------------
  const backLeftPanel = cubistSlab([
    [-3.7, 1.35], [-1.35, 1.35], [-1.35, 3.52], [-3.7, 3.52]
  ], { depth: 0.14, bevel: 0.02, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.015 });
  backLeftPanel.position.set(0, 0, -3.35);
  root.add(backLeftPanel);

  // Dark angular table beneath the dove (x around -2.0, y = 2.05)
  const doveTableTop = new T.Mesh(new T.BoxGeometry(1.75, 0.09, 0.85), mats.slate);
  doveTableTop.position.set(-2.05, 2.02, -2.75);
  doveTableTop.castShadow = true;
  doveTableTop.receiveShadow = true;
  root.add(doveTableTop);

  const tableLegL = new T.Mesh(new T.BoxGeometry(0.1, 2.0, 0.1), mats.charcoal);
  tableLegL.position.set(-2.78, 1.0, -2.95);
  const tableLegR = new T.Mesh(new T.BoxGeometry(0.1, 2.0, 0.1), mats.charcoal);
  tableLegR.position.set(-1.32, 1.0, -2.95);
  root.add(tableLegL, tableLegR);

  // ---- 4. Iconic Central-Right Light Wedge & Scalloped Roof --------------
  // The famous bright trapezoidal light shaft / interior gable descending from the lamp-bearer's realm
  const lightWedgeMain = cubistSlab([
    [0.08, 3.68], [1.95, 3.22], [2.42, 0.65], [0.42, 0.65]
  ], { depth: 0.16, bevel: 0.025, mat: mats.lightWedge, outlineMat: mats.ink, outlineRadius: 0.014 });
  lightWedgeMain.position.set(0, 0, -2.55);
  lightWedgeMain.rotation.y = -0.14;
  root.add(lightWedgeMain);

  // Overlapping geometric shadow shard slicing across the bright wedge
  const shadowShard = cubistSlab([
    [0.42, 2.95], [1.62, 2.65], [0.95, 1.55]
  ], { depth: 0.11, bevel: 0.018, mat: mats.ashMid, outlineMat: mats.ink, outlineRadius: 0.012 });
  shadowShard.position.set(0, 0, -2.25);
  shadowShard.rotation.y = -0.1;
  root.add(shadowShard);

  // Secondary pale diagonal plane lower center-right (creates pyramidal cubist depth)
  const lowerWedge = cubistSlab([
    [0.12, 0.55], [1.68, 1.48], [1.35, 0.25], [0.1, 0.25]
  ], { depth: 0.14, bevel: 0.02, mat: mats.ivory, outlineMat: mats.ink, outlineRadius: 0.012 });
  lowerWedge.position.set(0, 0, -1.55);
  lowerWedge.rotation.y = 0.09;
  root.add(lowerWedge);

  // Scalloped tiled roof section above the central-right wall (y = 3.35 .. 3.92)
  const roofGeo = new T.BoxGeometry(1.72, 0.58, 0.35);
  const roofMesh = new T.Mesh(roofGeo, mats.roof);
  roofMesh.position.set(1.05, 3.66, -2.85);
  roofMesh.rotation.z = 0.09;
  roofMesh.rotation.x = 0.22;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  root.add(roofMesh);

  // ---- 5. Mid-Right Interior Building & Lamp-Bearer's Window -------------
  const midBuilding = new T.Group();
  midBuilding.position.set(2.15, 0, -2.35);

  // Lower white/grey architectural pillar block seen behind the fleeing woman
  const lowerBlock = new T.Mesh(new T.BoxGeometry(0.95, 2.15, 0.9), mats.charcoal);
  lowerBlock.position.set(0.05, 1.08, -0.2);
  lowerBlock.castShadow = true;
  lowerBlock.receiveShadow = true;
  midBuilding.add(lowerBlock);

  const brightSideFace = cubistSlab([
    [-0.12, 0.95], [0.45, 1.15], [0.45, 2.08], [-0.12, 2.05]
  ], { depth: 0.08, bevel: 0.015, mat: mats.chalk, outlineMat: mats.ink, outlineRadius: 0.012 });
  brightSideFace.position.set(0.18, 0, 0.28);
  midBuilding.add(brightSideFace);

  // Window frame from which the Lamp-Bearer leans out
  const winFrameTop = new T.Mesh(new T.BoxGeometry(1.22, 0.14, 0.55), mats.slate);
  winFrameTop.position.set(0.02, 3.48, 0.05);
  const winFrameBot = new T.Mesh(new T.BoxGeometry(1.22, 0.14, 0.55), mats.slate);
  winFrameBot.position.set(0.02, 2.38, 0.05);
  const winFrameR = new T.Mesh(new T.BoxGeometry(0.16, 1.24, 0.55), mats.charcoal);
  winFrameR.position.set(0.56, 2.93, 0.05);
  const winBack = new T.Mesh(new T.PlaneGeometry(1.05, 1.05), mats.pitch);
  winBack.position.set(0.02, 2.93, -0.18);
  midBuilding.add(winFrameTop, winFrameBot, winFrameR, winBack);

  root.add(midBuilding);
  obstacles.push({ x: 2.2, z: -2.3, radius: 0.75 });

  // ---- 6. Burning Right Tower, Luminous Square Window & Ajar Door --------
  const rightTower = new T.Group();
  rightTower.position.set(3.55, 0, -2.0);

  // Main charred facade mass
  const towerBody = new T.Mesh(new T.BoxGeometry(1.55, 3.85, 1.05), mats.pitch);
  towerBody.position.set(0, 1.92, -0.25);
  towerBody.castShadow = true;
  towerBody.receiveShadow = true;
  rightTower.add(towerBody);

  // Luminous stark square window near upper right (x ≈ +3.65, y ≈ 3.42)
  const winSquare = new T.Mesh(new T.BoxGeometry(0.46, 0.48, 0.1), mats.windowGlow);
  winSquare.position.set(0.08, 3.42, 0.34);
  rightTower.add(winSquare);
  rightTower.add(inkStroke([
    [-0.15, 3.18, 0.4], [0.31, 3.18, 0.4], [0.31, 3.66, 0.4], [-0.15, 3.66, 0.4]
  ], mats.ink, 0.011, { closed: true }));

  // Jagged cubist flames erupting along the roofline of the right building
  const roofFlames = [
    [[-0.95, 3.72], [-0.55, 4.02], [-0.22, 3.75]],
    [[-0.38, 3.75], [-0.08, 4.06], [0.24, 3.78]],
    [[0.12, 3.78], [0.55, 4.04], [0.72, 3.76]],
  ];
  const flameMeshes = [];
  roofFlames.forEach((tri, idx) => {
    const f = cubistSlab(tri, {
      depth: 0.14,
      bevel: 0.018,
      mat: idx % 2 === 0 ? mats.fireLight : mats.ashLight,
      outlineMat: mats.ink,
      outlineRadius: 0.012,
    });
    f.position.z = 0.25 - idx * 0.08;
    rightTower.add(f);
    flameMeshes.push(f);
  });

  // Dramatic diagonal charred beam/wall collapsing in front of the burning woman
  const collapseWall = cubistSlab([
    [-0.68, 2.02], [0.68, 1.62], [0.85, 0.82], [-0.52, 1.25]
  ], { depth: 0.22, bevel: 0.02, mat: mats.charcoal, outlineMat: mats.ink, outlineRadius: 0.016 });
  collapseWall.position.set(0.02, 0.0, 0.85);
  collapseWall.rotation.y = -0.18;
  rightTower.add(collapseWall);

  // Diagonal hatching lines across the collapsing beam
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const y0 = 1.95 - t * 0.62;
    collapseWall.add(inkStroke([[-0.52, y0, 0.13], [0.62, y0 - 0.32, 0.13]], mats.slate, 0.011));
  }

  // Far-right dark doorway with small round doorknob (echoing the right edge of Guernica)
  const doorGroup = new T.Group();
  doorGroup.position.set(0.84, 0, 1.05);
  doorGroup.rotation.y = -0.52;

  const doorPanel = new T.Mesh(new T.BoxGeometry(0.58, 2.48, 0.08), mats.charcoal);
  doorPanel.position.set(0, 1.24, 0);
  doorPanel.castShadow = true;
  doorGroup.add(doorPanel);

  const doorTrim = inkStroke([
    [-0.29, 0.02, 0.05], [0.29, 0.02, 0.05], [0.29, 2.48, 0.05], [-0.29, 2.48, 0.05]
  ], mats.ashLight, 0.012, { closed: true });
  doorGroup.add(doorTrim);

  const knob = new T.Mesh(new T.SphereGeometry(0.055, 10, 8), mats.ashLight);
  knob.position.set(-0.18, 1.18, 0.07);
  doorGroup.add(knob);

  rightTower.add(doorGroup);
  root.add(rightTower);
  obstacles.push({ x: 3.55, z: -1.9, radius: 1.05 });

  // ---- 7. Subtle Gallery Threshold Frame behind the original viewpoint ----
  // Grounds the visitor inside "Beyond the Frame": looking back reveals the dark doorway/frame they entered through.
  const frameMat = mats.pitch;
  const frameZ = 6.15;
  const topBar = new T.Mesh(new T.BoxGeometry(10.6, 0.35, 0.28), frameMat);
  topBar.position.set(0, 4.3, frameZ);
  const leftPost = new T.Mesh(new T.BoxGeometry(0.35, 4.5, 0.28), frameMat);
  leftPost.position.set(-5.15, 2.2, frameZ);
  const rightPost = new T.Mesh(new T.BoxGeometry(0.35, 4.5, 0.28), frameMat);
  rightPost.position.set(5.15, 2.2, frameZ);
  root.add(topBar, leftPost, rightPost);

  scene.add(root);

  return {
    root,
    flameMeshes,
    update(t) {
      flameMeshes.forEach((f, idx) => {
        f.scale.y = 1 + Math.sin(t * 4.2 + idx * 1.9) * 0.045;
        f.rotation.z = Math.sin(t * 2.9 + idx * 1.3) * 0.03;
      });
    },
    dispose() {
      disposeTree(root);
      scene.remove(root);
    },
  };
}
