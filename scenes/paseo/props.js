import * as T from 'three';
import { ground } from './shared.js';

const π = Math.PI;

export function buildProps(world, { painting, easel }) {
  const geometries = [], materials = [];
  const mat = (color, extra) => { const m = new T.MeshStandardMaterial({ color, roughness: .75, ...extra }); materials.push(m); return m; };
  const add = (parent, geo, material, x = 0, y = 0, z = 0, shadow = true) => {
    const m = new T.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadow;
    geometries.push(geo); parent.add(m); return m;
  };

  // ---- Sorolla's easel with the canvas, where the visitor first stood ----
  const stand = new T.Group();
  stand.position.set(easel.x, ground(easel.x, easel.z), easel.z);
  stand.rotation.y = easel.yaw;
  world.add(stand);
  const wood = mat('#8d6a46'), linen = mat('#e5dac6', { roughness: .95 });
  const canvasMat = new T.MeshStandardMaterial({ map: painting, emissiveMap: painting, emissive: '#7a756c', roughness: .7 }); materials.push(canvasMat);
  const W = 1.0, H = W * 993 / 980, lean = .16, base = .62;
  for (const [x, z, tilt, roll] of [[-.42, .1, -.12, -.12], [.42, .1, -.12, .12], [0, -.62, .3, 0]]) {
    const leg = add(stand, new T.CylinderGeometry(.018, .022, 2.05, 8), wood, x, 1.0, z);
    leg.rotation.set(tilt, 0, roll);
  }
  const board = new T.Group(); board.position.set(0, base, .05); board.rotation.x = -lean; stand.add(board);
  add(board, new T.BoxGeometry(W, H, .022), [linen, linen, linen, linen, canvasMat, linen], 0, H / 2, 0);
  add(board, new T.BoxGeometry(1.08, .035, .07), wood, 0, -.02, .02);
  add(board, new T.BoxGeometry(.06, .03, .05), wood, 0, H + .02, 0);
  // Paint box and palette at the foot of the easel.
  const box = add(stand, new T.BoxGeometry(.42, .1, .3), wood, .55, .05, .35);
  box.rotation.y = .4;
  const palette = add(stand, new T.CylinderGeometry(.17, .17, .008, 28).scale(1.25, 1, 1), mat('#a07a50'), .55, .105, .35);
  palette.rotation.y = .4;
  ['#f4efe4', '#3b55a0', '#e0b04c', '#b6563a', '#7b6aa8', '#7fa0a0'].forEach((c, i) => {
    const a = i / 6 * π * 1.4 + .3;
    add(stand, new T.SphereGeometry(.022, 10, 8).scale(1, .35, 1), mat(c, { roughness: .4 }), .55 + Math.cos(a + .4) * .14, .112, .35 + Math.sin(a + .4) * .11, false);
  });

  // ---- Gulls riding the wind over the shore -----------------------------
  const white = mat('#f6f5f1', { roughness: .6, side: T.DoubleSide }), grey = mat('#9aa1ac', { side: T.DoubleSide });
  const wingShape = new T.Shape();
  wingShape.moveTo(0, -.06); wingShape.lineTo(.18, -.1); wingShape.quadraticCurveTo(.38, -.13, .5, -.2); wingShape.lineTo(.36, -.02); wingShape.quadraticCurveTo(.15, .06, 0, .07);
  const wingGeo = new T.ShapeGeometry(wingShape).rotateX(π / 2); geometries.push(wingGeo);
  const tipShape = new T.Shape(); tipShape.moveTo(.36, -.13); tipShape.lineTo(.5, -.2); tipShape.lineTo(.4, -.06);
  const tipGeo = new T.ShapeGeometry(tipShape).rotateX(π / 2).translate(0, .002, 0); geometries.push(tipGeo);
  const bodyGeo = new T.SphereGeometry(1, 12, 8).scale(.055, .05, .2); geometries.push(bodyGeo);
  const gulls = Array.from({ length: 8 }, (_, i) => {
    const g = new T.Group(), wings = [];
    g.add(new T.Mesh(bodyGeo, white));
    for (const s of [-1, 1]) {
      const pivot = new T.Group(); pivot.scale.x = s; g.add(pivot);
      pivot.add(new T.Mesh(wingGeo, white), new T.Mesh(tipGeo, grey)); wings.push(pivot);
    }
    g.scale.setScalar(1.6);
    world.add(g);
    return { g, wings, cx: -30 + (i * 23) % 70, cz: -26 + (i * 7) % 24, r: 9 + (i * 5) % 14, h: 7 + (i * 3.7) % 14, w: (.13 + (i % 3) * .05) * (i % 2 ? 1 : -1), p: i * 1.9 };
  });

  // ---- Lateen-sail fishing boats on the horizon ---------------------------
  const hullMat = mat('#2f4157'), bandMat = mat('#d9cdb4'), sailMat = mat('#f1e7d2', { side: T.DoubleSide, roughness: .9 });
  const hullGeo = new T.BoxGeometry(7, .9, 2.1, 12, 2, 2);
  { const p = hullGeo.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getX(i) / 3.5, k = 1 - .85 * t * t; p.setZ(i, p.getZ(i) * k); p.setY(i, p.getY(i) + .25 * t * t * Math.sign(p.getY(i) + .45)); } hullGeo.computeVertexNormals(); }
  geometries.push(hullGeo);
  const sailShape = new T.Shape(); sailShape.moveTo(-3, .9); sailShape.lineTo(3.4, 1.2); sailShape.lineTo(-1.2, 8.2); sailShape.closePath();
  const sailGeo = new T.ShapeGeometry(sailShape); geometries.push(sailGeo);
  const boats = [[-190, -230, 0], [70, -380, 1], [250, -300, 2], [-60, -620, 3], [420, -540, 4]].map(([x, z, k]) => {
    const b = new T.Group();
    add(b, hullGeo, hullMat, 0, 0, 0, false);
    add(b, new T.BoxGeometry(6.6, .16, 2.0), bandMat, 0, .38, 0, false);
    add(b, new T.CylinderGeometry(.07, .09, 6.5, 6), bandMat, .9, 3.4, 0, false);
    const sail = add(b, sailGeo, sailMat, 0, 0, .1, false); sail.rotation.y = .25;
    b.rotation.y = .3 + k * .5;
    world.add(b);
    return { b, x, z, k };
  });

  const v = new T.Vector3();
  return {
    update(t) {
      for (const { g, wings, cx, cz, r, h, w, p } of gulls) {
        const a = t * w + p;
        g.position.set(cx + Math.cos(a) * r, h + Math.sin(t * .4 + p) * 1.2, cz + Math.sin(a) * r);
        v.set(-Math.sin(a) * w, 0, Math.cos(a) * w).normalize();
        g.rotation.set(0, Math.atan2(v.x, v.z), -Math.sign(w) * .38);
        const flapping = Math.sin(t * .23 + p) > .15;
        const beat = flapping ? Math.sin(t * 7.5 + p) * .55 : .12 + Math.sin(t * 1.3 + p) * .05;
        wings.forEach((s, i) => { s.rotation.z = i ? beat : -beat; });
      }
      for (const { b, x, z, k } of boats) {
        const drift = ((x + t * (.55 + k * .1) + 700) % 1400) - 700;
        b.position.set(drift, Math.sin(t * .8 + k) * .22 - .15, z);
        b.rotation.z = Math.sin(t * .7 + k * 2) * .06; b.rotation.x = Math.sin(t * .9 + k) * .04;
      }
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
