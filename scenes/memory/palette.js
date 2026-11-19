import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const tau = Math.PI * 2;

export function randomSequence(seed = 1931) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function canvasTexture(draw, width = 512, height = width) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Small, deterministic oil marks keep the surfaces painterly at walking distance.
export function pigments() {
  const textures = new Map(), materials = new Map();
  function grain(base, seed) {
    const key = base + seed;
    if (!textures.has(key)) {
      const texture = canvasTexture((ctx, w, h) => {
        const random = randomSequence(seed);
        ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 16000; i++) {
          const x = random() * w, y = random() * h;
          ctx.fillStyle = random() > .5 ? '#fff0c00b' : '#151a1b0b';
          ctx.fillRect(x, y, 1 + random() * 5, .5 + random() * 2);
        }
      });
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      textures.set(key, texture);
    }
    return textures.get(key);
  }
  function paint(color, { texture = false, roughness = .84, metalness = 0 } = {}) {
    const key = [color, texture, roughness, metalness].join('/');
    if (!materials.has(key)) {
      materials.set(key, new T.MeshStandardMaterial({
        color: texture ? '#ffffff' : color,
        map: texture ? grain(color, 37) : null, roughness, metalness
      }));
    }
    return materials.get(key);
  }
  return { paint, dispose() {
    textures.forEach(texture => texture.dispose());
    materials.forEach(material => material.dispose());
  } };
}

export function mesh(parent, geometry, material, position = [0, 0, 0]) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function ellipsoid(parent, material, position, scale) {
  const object = mesh(parent, new T.SphereGeometry(1, 32, 20), material, position);
  object.scale.set(...scale);
  return object;
}

export function surface(positions, uv, indices, colors) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (colors) geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function stroke(parent, material, points, radii, sides = 8) {
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  const steps = Math.max(16, points.length * 8);
  const geometry = new T.TubeGeometry(curve, steps, 1, sides, false);
  const positions = geometry.attributes.position, point = new T.Vector3();
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, center = curve.getPointAt(t);
    const f = curve.getUtoTmapping(t) * (radii.length - 1), k = Math.floor(f);
    const radius = T.MathUtils.lerp(radii[k], radii[Math.min(k + 1, radii.length - 1)], f - k);
    for (let i = 0; i <= sides; i++) {
      const n = j * (sides + 1) + i;
      point.fromBufferAttribute(positions, n).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(n, point.x, point.y, point.z);
    }
  }
  geometry.computeVertexNormals();
  return mesh(parent, geometry, material);
}

export function batch(group) {
  group.updateWorldMatrix(true, true);
  const inverse = group.matrixWorld.clone().invert(), buckets = new Map();
  group.traverse(object => {
    if (!object.isMesh || Array.isArray(object.material)) return;
    const bucket = buckets.get(object.material) || [];
    bucket.push(object); buckets.set(object.material, bucket);
  });
  for (const [material, objects] of buckets) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      object.removeFromParent(); object.geometry.dispose();
      return geometry;
    });
    mesh(group, mergeGeometries(parts), material);
    parts.forEach(part => part.dispose());
  }
}
