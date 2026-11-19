import * as T from 'three';

export class VoxelWorld {
  constructor(voxelSize = 0.14) {
    this.voxelSize = voxelSize;
    // Map key "gx,gy,gz" -> { x, y, z, color }
    this.solidGrid = new Map();
    this.luminousGrid = new Map();
    this.vortexGrid = new Map();
  }

  // Snap position to voxel grid coordinate
  toGrid(v) {
    return Math.round(v / this.voxelSize);
  }

  setVoxel(x, y, z, color, type = 'solid') {
    const s = this.voxelSize;
    const gx = this.toGrid(x);
    const gy = this.toGrid(y);
    const gz = this.toGrid(z);
    const key = `${gx},${gy},${gz}`;
    const target = type === 'vortex' ? this.vortexGrid : (type === 'luminous' ? this.luminousGrid : this.solidGrid);
    target.set(key, { x: gx * s, y: gy * s, z: gz * s, color });
  }

  // Set multiple voxels from grid coordinates directly
  setGridVoxel(gx, gy, gz, color, type = 'solid') {
    const s = this.voxelSize;
    const key = `${gx},${gy},${gz}`;
    const target = type === 'vortex' ? this.vortexGrid : (type === 'luminous' ? this.luminousGrid : this.solidGrid);
    target.set(key, { x: gx * s, y: gy * s, z: gz * s, color });
  }

  // Add an axis-aligned box of voxels
  addBox(minX, minY, minZ, maxX, maxY, maxZ, color, type = 'solid', hollow = false) {
    const startX = this.toGrid(minX);
    const endX = this.toGrid(maxX);
    const startY = this.toGrid(minY);
    const endY = this.toGrid(maxY);
    const startZ = this.toGrid(minZ);
    const endZ = this.toGrid(maxZ);

    for (let gx = startX; gx <= endX; gx++) {
      for (let gy = startY; gy <= endY; gy++) {
        for (let gz = startZ; gz <= endZ; gz++) {
          if (!hollow || gx === startX || gx === endX || gy === startY || gy === endY || gz === startZ || gz === endZ) {
            this.setGridVoxel(gx, gy, gz, color, type);
          }
        }
      }
    }
  }

  // Add an ellipsoid / sphere of voxels
  addEllipsoid(cx, cy, cz, rx, ry, rz, color, type = 'solid', hollow = false) {
    const s = this.voxelSize;
    const gcx = this.toGrid(cx), gcy = this.toGrid(cy), gcz = this.toGrid(cz);
    const grx = Math.max(1, Math.round(rx / s));
    const gry = Math.max(1, Math.round(ry / s));
    const grz = Math.max(1, Math.round(rz / s));

    for (let dx = -grx; dx <= grx; dx++) {
      const nx = dx / grx;
      for (let dy = -gry; dy <= gry; dy++) {
        const ny = dy / gry;
        for (let dz = -grz; dz <= grz; dz++) {
          const nz = dz / grz;
          const distSq = nx * nx + ny * ny + nz * nz;
          if (distSq <= 1.0) {
            if (!hollow || distSq >= 0.65) {
              this.setGridVoxel(gcx + dx, gcy + dy, gcz + dz, color, type);
            }
          }
        }
      }
    }
  }

  // Add a cylinder of voxels (oriented along Y)
  addCylinder(cx, minY, maxY, cz, radius, color, type = 'solid', hollow = false) {
    const s = this.voxelSize;
    const gcx = this.toGrid(cx), gcz = this.toGrid(cz);
    const gMinY = this.toGrid(minY), gMaxY = this.toGrid(maxY);
    const gr = Math.max(1, Math.round(radius / s));

    for (let gy = gMinY; gy <= gMaxY; gy++) {
      for (let dx = -gr; dx <= gr; dx++) {
        for (let dz = -gr; dz <= gr; dz++) {
          const distSq = (dx * dx + dz * dz) / (gr * gr);
          if (distSq <= 1.0) {
            if (!hollow || distSq >= 0.7 || gy === gMinY || gy === gMaxY) {
              this.setGridVoxel(gcx + dx, gy, gcz + dz, color, type);
            }
          }
        }
      }
    }
  }

  // Add a line / stroke of voxels
  addStroke(p1, p2, radius, color, type = 'solid') {
    const s = this.voxelSize;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
    const steps = Math.max(1, Math.ceil(dist / (s * 0.75)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const z = p1.z + (p2.z - p1.z) * t;
      if (radius <= s * 0.6) {
        this.setVoxel(x, y, z, color, type);
      } else {
        this.addEllipsoid(x, y, z, radius, radius, radius, color, type, false);
      }
    }
  }

  // Build InstancedMeshes and add them to parent
  build(parent) {
    // Crisp voxel box: 94% of pitch gives clear seams and authentic voxel geometry
    const boxSize = this.voxelSize * 0.94;
    const geometry = new T.BoxGeometry(boxSize, boxSize, boxSize);

    // 1. Solid world mesh (shadow receiving & casting)
    const solidMat = new T.MeshStandardMaterial({
      roughness: 0.82,
      metalness: 0.05
    });
    const solidMesh = this._createInstancedMesh(this.solidGrid, geometry, solidMat, true, true);
    if (solidMesh) parent.add(solidMesh);

    // 2. Luminous mesh (stars, moon, lit windows: brilliant self-illumination)
    const luminousMat = new T.MeshBasicMaterial();
    const luminousMesh = this._createInstancedMesh(this.luminousGrid, geometry, luminousMat, false, false);
    if (luminousMesh) parent.add(luminousMesh);

    // 3. Swirling vortex mesh (grouped for dynamic living brushstrokes)
    const vortexGroup = new T.Group();
    vortexGroup.name = 'vortexGroup';
    const vortexMat = new T.MeshBasicMaterial();
    const vortexMesh = this._createInstancedMesh(this.vortexGrid, geometry, vortexMat, false, false);
    if (vortexMesh) {
      vortexGroup.add(vortexMesh);
      parent.add(vortexGroup);
    }

    return {
      solidMesh,
      luminousMesh,
      vortexMesh,
      vortexGroup,
      totalCount: this.solidGrid.size + this.luminousGrid.size + this.vortexGrid.size,
      dispose: () => {
        geometry.dispose();
        solidMat.dispose();
        luminousMat.dispose();
        vortexMat.dispose();
        if (solidMesh) solidMesh.dispose();
        if (luminousMesh) luminousMesh.dispose();
        if (vortexMesh) vortexMesh.dispose();
      }
    };
  }

  _createInstancedMesh(grid, geometry, material, castShadow, receiveShadow) {
    const count = grid.size;
    if (count === 0) return null;

    const mesh = new T.InstancedMesh(geometry, material, count);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;

    const matrix = new T.Matrix4();
    const color = new T.Color();
    let idx = 0;

    for (const item of grid.values()) {
      matrix.setPosition(item.x, item.y, item.z);
      mesh.setMatrixAt(idx, matrix);
      color.set(item.color);
      mesh.setColorAt(idx, color);
      idx++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }
}
