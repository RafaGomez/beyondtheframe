import * as T from 'three';

let cachedBrushTexture = null;
let cachedBrushNormal = null;
let cachedCanvasTexture = null;

// Generate high-resolution procedural oil brushstroke texture with bristle striations
export function getBrushTexture() {
  if (cachedBrushTexture) return cachedBrushTexture;

  const width = 512, height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Clear with transparent
  ctx.clearRect(0, 0, width, height);

  // Background stroke body with soft tapered edges
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  grad.addColorStop(0.08, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.96)');
  grad.addColorStop(0.82, 'rgba(255,255,255,0.96)');
  grad.addColorStop(0.92, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0.0)');

  ctx.fillStyle = grad;

  // Draw main stroke capsule with tapered tips
  ctx.beginPath();
  const padY = 14;
  ctx.moveTo(35, height / 2);
  ctx.bezierCurveTo(80, padY, width - 80, padY, width - 35, height / 2);
  ctx.bezierCurveTo(width - 80, height - padY, 80, height - padY, 35, height / 2);
  ctx.fill();

  // Draw fine bristle striations (Van Gogh's hog-bristle brush grooves)
  // Longitudinal fine strokes with slight random wave
  let seed = 1889;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  ctx.lineWidth = 1.2;
  const bristleCount = 80;
  for (let i = 0; i < bristleCount; i++) {
    const yNorm = (i / bristleCount) * 2 - 1; // -1 to 1
    const yBase = height / 2 + yNorm * (height * 0.36);
    const alpha = 0.12 + 0.18 * rng();
    const isDark = rng() > 0.45;
    ctx.strokeStyle = isDark ? `rgba(40,40,40,${alpha * 0.7})` : `rgba(255,255,255,${alpha})`;

    ctx.beginPath();
    const startX = 30 + rng() * 40;
    const endX = width - (30 + rng() * 40);
    const midY1 = yBase + (rng() - 0.5) * 6;
    const midY2 = yBase + (rng() - 0.5) * 6;

    ctx.moveTo(startX, yBase);
    ctx.bezierCurveTo(width * 0.33, midY1, width * 0.66, midY2, endX, yBase);
    ctx.stroke();
  }

  // Lateral impasto ridges (paint buildup on outer edges)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(70, padY + 6);
  ctx.quadraticCurveTo(width / 2, padY + 3, width - 70, padY + 6);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(70, height - padY - 6);
  ctx.quadraticCurveTo(width / 2, height - padY - 3, width - 70, height - padY - 6);
  ctx.stroke();

  cachedBrushTexture = new T.CanvasTexture(canvas);
  cachedBrushTexture.colorSpace = T.SRGBColorSpace;
  cachedBrushTexture.anisotropy = 4;
  return cachedBrushTexture;
}

// Procedural normal map from the impasto stroke profile
export function getBrushNormalMap() {
  if (cachedBrushNormal) return cachedBrushNormal;

  const width = 256, height = 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Generate height field: arched cross section with bristle ripples
  const heightField = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const ny = (y / (height - 1)) * 2 - 1; // -1 to 1
    const crossArch = Math.max(0, 1 - ny * ny); // parabolic arch across width

    for (let x = 0; x < width; x++) {
      const nx = (x / (width - 1)) * 2 - 1; // -1 to 1
      const lengthFade = Math.max(0, 1 - Math.pow(Math.abs(nx), 4));

      // Bristle grooves along X
      const bristleNoise = Math.sin(ny * 28.0) * 0.12 + Math.sin(ny * 64.0) * 0.06;
      const h = crossArch * lengthFade * (1.0 + bristleNoise);
      heightField[y * width + x] = Math.max(0, h);
    }
  }

  // Convert height field to normal map via Sobel gradient
  const bumpScale = 3.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 1), x1 = Math.min(width - 1, x + 1);
      const y0 = Math.max(0, y - 1), y1 = Math.min(height - 1, y + 1);

      const dx = (heightField[y * width + x1] - heightField[y * width + x0]) * bumpScale;
      const dy = (heightField[y1 * width + x] - heightField[y0 * width + x]) * bumpScale;
      const dz = 1.0;

      const len = Math.hypot(dx, dy, dz);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = dz / len;

      const idx = (y * width + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  cachedBrushNormal = new T.CanvasTexture(canvas);
  cachedBrushNormal.anisotropy = 4;
  return cachedBrushNormal;
}

// Create a 3D curved impasto brushstroke geometry (tapered ends, arched cross section, curve along length)
export function createCurvedStrokeGeometry({
  length = 1.0,
  width = 0.22,
  curvature = 0.2, // amount of lateral/vertical curve
  segmentsX = 8,
  segmentsY = 3,
  arch = 0.035     // cross-section thickness
} = {}) {
  const positions = [];
  const uvs = [];
  const normals = [];
  const indices = [];

  for (let i = 0; i <= segmentsX; i++) {
    const u = i / segmentsX;
    // Parameter t from -0.5 to 0.5 along length
    const t = u - 0.5;
    const x = t * length;

    // Taper width at start and end of stroke
    const taper = Math.sin(u * Math.PI);
    const currentW = width * Math.pow(taper, 0.4);

    // Arc curvature along length (sagitta)
    const curveOffset = (1.0 - 4.0 * t * t) * curvature * length;

    for (let j = 0; j <= segmentsY; j++) {
      const v = j / segmentsY;
      const vNorm = (v - 0.5) * 2.0; // -1 to 1 across stroke width
      const y = vNorm * (currentW * 0.5);

      // Impasto arch profile (thickest at spine, tapered to zero at edges)
      const crossArch = (1.0 - vNorm * vNorm) * arch * taper;
      const z = curveOffset + crossArch;

      positions.push(x, y, z);
      uvs.push(u, v);

      // Normal will be computed automatically by Three.js
      normals.push(0, 0, 1);
    }
  }

  const stride = segmentsY + 1;
  for (let i = 0; i < segmentsX; i++) {
    for (let j = 0; j < segmentsY; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Short chunky impasto dab geometry (great for foliage, roofs, windows, stone blocks)
export function createDabGeometry(length = 0.5, width = 0.2, thickness = 0.04) {
  return createCurvedStrokeGeometry({
    length,
    width,
    curvature: 0.05,
    segmentsX: 5,
    segmentsY: 2,
    arch: thickness
  });
}

// Arc stroke geometry for star halos, moon halos, and vortex spirals
export function createArcStrokeGeometry({
  radius = 1.0,
  angleSpan = Math.PI * 0.45,
  width = 0.18,
  segments = 8,
  thickness = 0.03
} = {}) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    const angle = (u - 0.5) * angleSpan;
    const taper = Math.sin(u * Math.PI);
    const halfW = (width * 0.5) * Math.pow(taper, 0.45);

    for (let j = 0; j <= 2; j++) {
      const v = j / 2;
      const vNorm = (v - 0.5) * 2; // -1 to 1
      const r = radius + vNorm * halfW;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const z = (1.0 - vNorm * vNorm) * thickness * taper;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  const stride = 3;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < 2; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// A high-performance batch manager for thousands of 3D brushstrokes
export class BrushBatch {
  constructor(geometry, maxCount, {
    materialType = 'standard',
    roughness = 0.65,
    metalness = 0.05,
    transparent = false,
    alphaTest = 0.18,
    side = T.DoubleSide,
    emissive = false
  } = {}) {
    this.geometry = geometry;
    this.maxCount = maxCount;
    this.count = 0;

    const brushTex = getBrushTexture();
    const brushNorm = getBrushNormalMap();

    const matOpts = {
      map: brushTex,
      normalMap: brushNorm,
      normalScale: new T.Vector2(0.8, 0.8),
      roughness,
      metalness,
      side,
      alphaTest,
      transparent,
      depthWrite: true
    };

    if (emissive) {
      this.material = new T.MeshStandardMaterial({
        ...matOpts,
        emissive: new T.Color('#222222'),
        emissiveIntensity: 0.65
      });
    } else {
      this.material = new T.MeshStandardMaterial(matOpts);
    }

    this.mesh = new T.InstancedMesh(geometry, this.material, maxCount);
    this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(maxCount * 3), 3);
    this.mesh.instanceColor.setUsage(T.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this._dummy = new T.Object3D();
    this._color = new T.Color();
  }

  addStroke({
    position,
    rotation, // Euler or Quaternion
    scale = [1, 1, 1],
    color = '#ffffff'
  }) {
    if (this.count >= this.maxCount) return;

    this._dummy.position.set(position.x, position.y, position.z);
    if (rotation instanceof T.Quaternion) {
      this._dummy.quaternion.copy(rotation);
    } else if (rotation instanceof T.Euler) {
      this._dummy.rotation.copy(rotation);
    } else if (Array.isArray(rotation)) {
      this._dummy.rotation.set(...rotation);
    }

    if (Array.isArray(scale)) {
      this._dummy.scale.set(scale[0], scale[1], scale[2]);
    } else if (typeof scale === 'number') {
      this._dummy.scale.set(scale, scale, scale);
    }

    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count, this._dummy.matrix);

    if (color instanceof T.Color) {
      this._color.copy(color);
    } else {
      this._color.set(color);
    }
    this.mesh.setColorAt(this.count, this._color);

    this.count++;
  }

  // Orient stroke along a direction vector with an up vector
  addDirectedStroke(pos, direction, up, scale, color) {
    if (this.count >= this.maxCount) return;

    this._dummy.position.copy(pos);
    const m = new T.Matrix4();
    const forward = direction.clone().normalize();
    const right = new T.Vector3().crossVectors(forward, up).normalize();
    const actualUp = new T.Vector3().crossVectors(right, forward).normalize();

    m.makeBasis(forward, right, actualUp);
    this._dummy.quaternion.setFromRotationMatrix(m);

    if (Array.isArray(scale)) {
      this._dummy.scale.set(scale[0], scale[1], scale[2]);
    } else if (typeof scale === 'number') {
      this._dummy.scale.set(scale, scale, scale);
    }

    this._dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count, this._dummy.matrix);

    if (color instanceof T.Color) {
      this._color.copy(color);
    } else {
      this._color.set(color);
    }
    this.mesh.setColorAt(this.count, this._color);

    this.count++;
  }

  finalize() {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
    this.mesh.computeBoundingSphere();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
