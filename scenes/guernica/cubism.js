import * as T from 'three';

// Cubist sculptural geometry toolkit:
// Combines Picasso's sweeping organic curves with sharp cubist planar cuts,
// beveled 3D reliefs, fine charcoal ink contours, and expressive sculpted extremities.

export function createShape(points, closed = true) {
  const shape = new T.Shape();
  if (!points.length) return shape;
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.length === 4) {
      shape.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    } else if (p.length === 6) {
      shape.bezierCurveTo(p[0], p[1], p[2], p[3], p[4], p[5]);
    } else {
      shape.lineTo(p[0], p[1]);
    }
  }
  if (closed) shape.closePath();
  return shape;
}

// Extruded beveled cubist slab with planar UV normalization and refined charcoal ink rims.
export function cubistSlab(points, {
  depth = 0.16,
  bevel = 0.022,
  bevelSegments = 3,
  curveSegments = 18,
  uvScale = 0.45,
  mat,
  outlineMat = null,
  outlineRadius = 0.0085,
  castShadow = true,
  receiveShadow = true,
  centerZ = true,
} = {}) {
  const shape = createShape(points, true);
  const geo = new T.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });

  if (centerZ) geo.translate(0, 0, -depth * 0.5);

  const uv = geo.attributes.uv;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) * uvScale, pos.getY(i) * uvScale);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();

  const mesh = new T.Mesh(geo, mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  if (!outlineMat) return mesh;

  const group = new T.Group();
  group.add(mesh);

  // Fine charcoal ink rim along front and back faces
  const contourPts = shape.getSpacedPoints(Math.min(80, Math.max(24, points.length * 5)));
  const frontZ = centerZ ? depth * 0.5 + bevel + 0.003 : depth + bevel + 0.003;
  const backZ = centerZ ? -depth * 0.5 - bevel - 0.003 : -bevel - 0.003;

  const makeRim = z => {
    const curve3 = new T.CatmullRomCurve3(
      contourPts.map(p => new T.Vector3(p.x, p.y, z)),
      true,
      'centripetal',
      0.15
    );
    const tube = new T.TubeGeometry(curve3, Math.min(96, contourPts.length * 2), outlineRadius, 5, true);
    const rim = new T.Mesh(tube, outlineMat);
    rim.castShadow = false;
    return rim;
  };
  group.add(makeRim(frontZ));
  group.add(makeRim(backZ));

  return group;
}

// 3D charcoal ink stroke carved in space.
export function inkStroke(pts, mat, radius = 0.0085, { closed = false, tubularSegments = 24 } = {}) {
  const vecs = pts.map(p => (p instanceof T.Vector3 ? p : new T.Vector3(p[0], p[1], p[2] ?? 0)));
  if (vecs.length < 2) return new T.Group();
  const curve = new T.CatmullRomCurve3(vecs, closed, 'centripetal', 0.25);
  const geo = new T.TubeGeometry(curve, Math.max(8, tubularSegments), radius, 5, closed);
  const mesh = new T.Mesh(geo, mat);
  mesh.castShadow = false;
  return mesh;
}

// Tapered sculpted cubist limb between two 3D points.
export function sculptedLimb(a, b, rA, rB, mat, { radialSegments = 8, castShadow = true } = {}) {
  const va = a instanceof T.Vector3 ? a : new T.Vector3(...a);
  const vb = b instanceof T.Vector3 ? b : new T.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const geo = new T.CylinderGeometry(rB, rA, len, radialSegments, 1);
  const mesh = new T.Mesh(geo, mat);
  mesh.position.copy(va).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

// Iconic Picasso cubist almond / teardrop eye with delicate ink rim.
export function cubistEye(mats, {
  width = 0.2,
  height = 0.095,
  pupilOffset = [0, 0],
  tear = false,
  depth = 0.028,
  closed = false,
} = {}) {
  const g = new T.Group();
  const hw = width * 0.5;
  const hh = height * 0.5;

  const pts = tear
    ? [
        [-hw, 0],
        [0, hh * 1.15, hw * 0.72, hh * 0.4],
        [hw, 0],
        [hw * 0.72, -hh * 0.4, 0, -hh * 1.15],
      ]
    : [
        [-hw, 0],
        [-hw * 0.35, hh * 1.25, hw * 0.35, hh * 1.25],
        [hw, 0],
        [hw * 0.35, -hh * 1.25, -hw * 0.35, -hh * 1.25],
      ];

  const sclera = cubistSlab(pts, {
    depth,
    bevel: 0.006,
    mat: mats.chalk,
    outlineMat: mats.ink,
    outlineRadius: Math.max(0.0055, width * 0.032),
    castShadow: false,
  });
  g.add(sclera);

  if (!closed) {
    const pupil = new T.Mesh(
      new T.CylinderGeometry(height * 0.32, height * 0.35, depth + 0.018, 12),
      mats.ink
    );
    pupil.rotation.x = Math.PI * 0.5;
    pupil.position.set(pupilOffset[0], pupilOffset[1], 0.007);
    g.add(pupil);

    const glint = new T.Mesh(new T.SphereGeometry(height * 0.09, 6, 6), mats.chalk);
    glint.position.set(pupilOffset[0] - height * 0.1, pupilOffset[1] + height * 0.1, depth * 0.5 + 0.016);
    g.add(glint);
  } else {
    g.add(inkStroke([[-hw * 0.82, 0, depth * 0.6], [hw * 0.82, 0, depth * 0.6]], mats.ink, 0.006));
  }

  return g;
}

// Expressive unified Picasso cubist hand/foot sculpted as a single organic silhouette with spread fingers.
export function cubistHand(mats, {
  scale = 1,
  mat = null,
  stigmata = false,
  depth = 0.065,
} = {}) {
  const g = new T.Group();
  const useMat = mat || mats.chalk;

  // Unified silhouette: palm smoothly flowing into 5 expressive splayed fingers
  const handPts = [
    [-0.12, -0.14],
    [0.12, -0.14],
    [0.16, -0.02],
    [0.32, 0.12], [0.34, 0.19], [0.26, 0.21], [0.14, 0.1],   // pinky
    [0.24, 0.34], [0.21, 0.4], [0.13, 0.38], [0.07, 0.15],   // ring
    [0.06, 0.44], [-0.01, 0.46], [-0.05, 0.43], [-0.04, 0.16], // middle
    [-0.16, 0.4], [-0.23, 0.39], [-0.24, 0.33], [-0.12, 0.13], // index
    [-0.31, 0.02], [-0.35, -0.05], [-0.3, -0.12], [-0.14, -0.06], // thumb
  ];

  const mesh = cubistSlab(handPts, {
    depth,
    bevel: 0.014,
    mat: useMat,
    outlineMat: mats.ink,
    outlineRadius: 0.007,
  });
  g.add(mesh);

  // Subtle knuckle / palm crease lines
  const z = depth * 0.5 + 0.016;
  if (stigmata) {
    // Picasso's iconic palm life-lines & stigmata on the fallen warrior's hand
    g.add(inkStroke([[-0.08, -0.06, z], [0.09, 0.06, z]], mats.ink, 0.0065));
    g.add(inkStroke([[-0.07, 0.06, z], [0.08, -0.05, z]], mats.ink, 0.0065));
    g.add(inkStroke([[0.0, -0.09, z], [0.01, 0.1, z]], mats.ink, 0.0055));
  } else {
    g.add(inkStroke([[-0.08, 0.04, z], [0.0, 0.07, z], [0.08, 0.04, z]], mats.ink, 0.005));
  }

  g.scale.setScalar(scale);
  return g;
}

export function disposeTree(root) {
  root.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
  });
}
