import * as T from 'three';
import { batch, canvasTexture, ellipsoid, mesh, randomSequence, stroke, surface, tau } from './palette.js';

function dialTexture() {
  return canvasTexture((ctx, w, h) => {
    const random = randomSequence(12), cx = w / 2, cy = h / 2, r = w * .46;
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, '#429fa4'); wash.addColorStop(.55, '#80b6b0'); wash.addColorStop(1, '#bcc6ad');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 11000; i++) {
      ctx.fillStyle = random() > .5 ? '#e4e5bb0c' : '#183e440d';
      ctx.fillRect(random() * w, random() * h, 1 + random() * 5, random() * 2 + 1);
    }
    ctx.strokeStyle = '#1e443c'; ctx.lineWidth = 1.3;
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * tau - Math.PI / 2, inner = i % 5 ? .94 : .90;
      ctx.beginPath();ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * r * inner, cy + Math.sin(a) * r * inner);ctx.stroke();
    }
    ctx.fillStyle = '#213b35'; ctx.font = 'italic 42px Georgia, serif';
    ctx.textAlign = 'center';ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const a = i / 12 * tau - Math.PI / 2;
      ctx.save();ctx.translate(cx + Math.cos(a) * r * .77, cy + Math.sin(a) * r * .77);
      ctx.rotate(.08 * Math.sin(i * 2));ctx.fillText(String(i), 0, 2);ctx.restore();
    }
    function hand(angle, length, width) {
      ctx.save();ctx.translate(cx, cy);ctx.rotate(angle);
      ctx.fillStyle = '#243930';ctx.beginPath();ctx.moveTo(-width, 22);
      ctx.lineTo(-width * .65, -length * .75);ctx.lineTo(0, -length);
      ctx.lineTo(width * .65, -length * .75);ctx.lineTo(width, 22);ctx.fill();ctx.restore();
    }
    hand(-Math.PI / 2, r * .67, 5);hand(Math.PI * .92, r * .75, 3);
    ctx.fillStyle = '#a79155';ctx.beginPath();ctx.arc(cx, cy, 9, 0, tau);ctx.fill();
    ctx.strokeStyle = '#203c34';ctx.lineWidth = 3;ctx.stroke();
    ctx.fillStyle = '#3d635a';ctx.font = '10px Georgia';ctx.fillText('SWISS', cx, cy + r * .43);
  });
}

// The whole enamel face, numerals and case share the same deformed surface.
// u and v are the original circular dial; its normal follows each fold.
export function softWatch(parent, paint, position, shape, gold = false, yaw = 0, size = 1) {
  const watch = new T.Group();parent.add(watch);watch.position.set(...position);
  watch.rotation.y = yaw;watch.scale.setScalar(size);
  const path = new T.CatmullRomCurve3(shape.map(p => new T.Vector3(...p)));
  function point(u, v, offset = 0) {
    const center = path.getPoint(T.MathUtils.clamp((v + 1) / 2, 0, 1));
    const tangent = path.getTangent(T.MathUtils.clamp((v + 1) / 2, 0, 1));
    const normal = new T.Vector3(0, -tangent.z, tangent.y).normalize();
    return new T.Vector3(u * (.78 + .09 * Math.sin(v * 3)), center.y + .045 * u * u, center.z)
      .addScaledVector(normal, offset);
  }
  const segments = 112, rings = 32, positions = [], uv = [], indices = [];
  for (let j = 0; j <= rings; j++) {
    const radius = j / rings;
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * tau, u = radius * Math.cos(a), v = radius * Math.sin(a);
      positions.push(...point(u, v).toArray());uv.push(.5 + u * .5, .5 + v * .5);
      const n = j * (segments + 1) + i;
      if (j < rings && i < segments) indices.push(n, n + 1, n + segments + 1, n + 1, n + segments + 2, n + segments + 1);
    }
  }
  const texture = dialTexture();
  const enamel = new T.MeshStandardMaterial({map:texture, roughness:.56, side:T.DoubleSide});
  mesh(watch, surface(positions, uv, indices), enamel);
  const casing = paint(gold ? '#ab8829' : '#657b76', {roughness:.37, metalness:.52});
  const highlight = paint(gold ? '#d2b650' : '#9bafa5', {roughness:.34, metalness:.48});
  // A closed back makes the pocket watch a solid object when viewed from behind.
  const backPositions = [];
  for (let j = 0; j <= rings; j++) {
    for (let i = 0; i <= segments; i++) {
      const a = i / segments * tau, radius = j / rings;
      backPositions.push(...point(radius * Math.cos(a), radius * Math.sin(a), -.075).toArray());
    }
  }
  casing.side = T.DoubleSide;
  mesh(watch, surface(backPositions, uv, indices), casing);
  for (const [radius, thickness, material, offset] of [[1,.055,casing,-.025],[.94,.022,highlight,.013]]) {
    const outline = Array.from({length:129}, (_, i) => {
      const a = i / 128 * tau;
      return point(radius * Math.cos(a), radius * Math.sin(a), offset);
    });
    mesh(watch, new T.TubeGeometry(new T.CatmullRomCurve3(outline, true), 160, thickness, 8, true), material);
  }
  const crownPoint = point(-1.07, .08, -.035);
  const crown = ellipsoid(watch, casing, crownPoint.toArray(), [.12,.105,.10]);
  crown.rotation.z = -.3;
  for (let i = 0; i < 8; i++) {
    const ring = mesh(watch, new T.TorusGeometry(.093,.009,5,18), highlight,
      [crownPoint.x - .055 + i * .016, crownPoint.y, crownPoint.z]);
    ring.rotation.y = Math.PI / 2;
  }
  batch(watch);
  return watch;
}

export function antWatch(parent, paint, position) {
  const watch = new T.Group();parent.add(watch);watch.position.set(...position);watch.rotation.y = -.3;
  const copper = paint('#ad501d', {metalness:.45, roughness:.5}), rim = paint('#d38d32', {metalness:.48});
  const face = mesh(watch, new T.CylinderGeometry(.63,.65,.10,64), copper, [0,.07,0]);
  face.scale.z = .86;
  const edge = mesh(watch, new T.TorusGeometry(.60,.037,8,64), rim, [0,.13,0]);
  edge.rotation.x = Math.PI/2;edge.scale.y = .86;
  ellipsoid(watch, rim, [.70,.09,0], [.12,.08,.09]);
  const ant = new T.Group(), black = paint('#242219'), random = randomSequence(49);
  for (let i = 0; i < 35; i++) {
    const angle = random()*tau, radius = .49*Math.sqrt(random());
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius*.84, yaw = random()*tau;
    const body = new T.Group();ant.add(body);body.position.set(x,.145,z);body.rotation.y=yaw;
    ellipsoid(body, black, [0,.012,-.025], [.021,.016,.033]);
    ellipsoid(body, black, [0,.015,.015], [.014,.014,.018]);
    ellipsoid(body, black, [0,.016,.045], [.017,.016,.017]);
    for (const side of [-1,1]) {
      for (let j=0;j<3;j++) {
        const f=j-1;
        stroke(body,black,[[0,.016,.012],[side*.034,.025,f*.018],[side*.051,.002,f*.039]],[.003,.003,.001],4);
      }
    }
  }
  watch.add(ant);batch(watch);
}

export function fly(parent, paint, position) {
  const insect = new T.Group();parent.add(insect);insect.position.set(...position);
  const dark = paint('#242e22'), wing = paint('#acb8a0', {roughness:.45});
  ellipsoid(insect,dark,[0,.025,0],[.035,.029,.063]);
  ellipsoid(insect,dark,[0,.026,.069],[.030,.026,.029]);
  for(const side of [-1,1]) {
    const object=ellipsoid(insect,wing,[side*.045,.042,-.025],[.038,.006,.078]);
    object.rotation.y=side*-.36;
    for(let i=0;i<3;i++) stroke(insect,dark,[[0,.02,.025-i*.03],[side*.06,.04,.04-i*.03],[side*.08,0,.04-i*.05]],[.005,.004,.002],4);
  }
  batch(insect);
}
