import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const images = import.meta.glob('./*.webp', { eager: true, import: 'default' });

export async function loadPaint() {
  const loader = new T.TextureLoader();
  const maps = new Map(), materials = new Map();
  const dispose = () => {
    materials.forEach(material => material.dispose());
    maps.forEach(texture => texture.dispose());
  };
  try {
    await Promise.all(Object.entries(images).map(([file, url]) => new Promise((resolve, reject) => {
      const key = file.slice(2, -5);
      const texture = loader.load(url, resolve, undefined, reject);
      texture.colorSpace = T.SRGBColorSpace;
      texture.wrapS = texture.wrapT = T.MirroredRepeatWrapping;
      texture.anisotropy = 4;
      maps.set(key, texture);
    })));
  } catch (error) {
    dispose();
    throw error;
  }
  function paint(color, texture, unlit = false) {
    const key = [color, texture, unlit].join('/');
    if (!materials.has(key)) {
      const Type = unlit ? T.MeshBasicMaterial : T.MeshLambertMaterial;
      materials.set(key, new Type({ color, map: maps.get(texture) ?? null }));
    }
    return materials.get(key);
  }
  return { paint, dispose };
}

export function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

export function ellipsoid(parent, material, center, scale) {
  const object = mesh(parent, new T.SphereGeometry(1, 20, 14), material, ...center);
  object.scale.set(...scale);
  return object;
}

// Each section describes the height, centre and two radii of a sculpted volume.
export function loft(parent, material, sections, pleats = 0) {
  const outline = new T.CatmullRomCurve3(sections.map(([y, x, z]) => new T.Vector3(x,y,z)));
  const profile = new T.CatmullRomCurve3(sections.map(([y,,,rx,rz]) => new T.Vector3(rx,y,rz)));
  const sides = 48, rings = (sections.length-1)*4;
  const positions = [], uv = [], index = [];
  for (let j = 0; j <= rings; j++) {
    const t = j/rings, center = outline.getPoint(t), radius = profile.getPoint(t);
    for (let i = 0; i <= sides; i++) {
      const a = i/sides * Math.PI*2 - Math.PI;
      const fold = 1 + pleats * (Math.sin(9*a+4*t) + .45*Math.cos(13*a-5*t));
      positions.push(center.x+radius.x*Math.sin(a)*fold, center.y, center.z+radius.z*Math.cos(a)*fold);
      uv.push(i/sides*3,t);
      const k = j*(sides+1)+i;
      if (j<rings && i<sides) index.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);
    }
  }
  const geometry = surface(positions, uv, index);
  return mesh(parent, geometry, material);
}

export function surface(positions, uv, index) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

// A tapered stroke can describe a lock of hair, a raised seam or a finger.
export function stroke(parent, material, points, radii, sides = 9) {
  const curve = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
  const steps = (points.length-1)*5;
  const geometry = new T.TubeGeometry(curve, steps, 1, sides, false);
  const positions = geometry.attributes.position, p = new T.Vector3();
  for (let j = 0; j <= steps; j++) {
    const t = j/steps, center = curve.getPointAt(t);
    const f = curve.getUtoTmapping(t)*(radii.length-1), k = Math.floor(f);
    const radius = T.MathUtils.lerp(radii[k], radii[Math.min(k+1,radii.length-1)], f-k);
    for (let i = 0; i <= sides; i++) {
      const n = j*(sides+1)+i;
      p.fromBufferAttribute(positions,n).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(n,p.x,p.y,p.z);
      geometry.attributes.uv.setXY(n,i/sides,1-t);
    }
  }
  geometry.computeVertexNormals();
  return mesh(parent,geometry,material);
}

// Static pieces of the same pigment share a draw call, including the small anatomy details.
export function batch(group) {
  group.updateWorldMatrix(true,true);
  const inverse = group.matrixWorld.clone().invert(), buckets = new Map();
  group.traverse(object => {
    if (!object.isMesh || Array.isArray(object.material)) return;
    const bucket = buckets.get(object.material) ?? [];
    bucket.push(object);
    buckets.set(object.material,bucket);
  });
  for (const [material, objects] of buckets) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      object.removeFromParent();
      object.geometry.dispose();
      return geometry;
    });
    mesh(group,mergeGeometries(parts),material);
    parts.forEach(part => part.dispose());
  }
}
