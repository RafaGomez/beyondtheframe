import * as T from 'three';
import { GLSL, WIND, SUN, LIGHT, ground, vec3, smoothstep } from './shared.js';

const UP = new T.Vector3(0, 1, 0), π = Math.PI;
const SUNCOL = vec3(LIGHT.sun.clone().multiplyScalar(LIGHT.sunIntensity / π));
const SKYCOL = vec3(LIGHT.sky.clone().multiplyScalar(LIGHT.hemiIntensity / π));
const GROUNDCOL = vec3(LIGHT.ground.clone().multiplyScalar(LIGHT.hemiIntensity / π));

// Wind on fabric: aCloth.x is how free a vertex is (0 sewn, 1 loose hem), aCloth.y how much it follows the stride.
const CLOTH = /* glsl */`
attribute vec2 aCloth;
uniform vec3 uWind;uniform float uTime,uGust,uStep,uSeed;
vec3 clothOffset(vec3 p,vec3 n){
  if(aCloth.x<=0.&&aCloth.y<=0.)return vec3(0.);
  vec3 wl=normalize(transpose(mat3(modelMatrix))*uWind);
  float f=aCloth.x,g=uGust,a=atan(p.x,p.z);
  float w1=sin(dot(p,wl)*5.+p.y*3.-uTime*6.3+uSeed);
  float w2=sin(a*7.+p.y*9.-uTime*9.7+uSeed*2.);
  float w3=sin(a*3.-uTime*4.1+uSeed);
  vec3 d=wl*f*g*(.17+.05*w1+.03*w3);
  d+=n*f*g*(.035*w2-.08*max(0.,-dot(n,wl)));
  d.y+=f*g*(.025*w1+.02);
  d.z+=aCloth.y*.06*sin(uStep);
  d.x+=aCloth.y*.02*sin(uStep*.5+1.);
  return d;
}`;
function clothify(material, uniforms, standard) {
  material.onBeforeCompile = s => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\n' + CLOTH)
      .replace('#include <begin_vertex>', 'vec3 transformed=vec3(position)+clothOffset(position,normalize(normal));');
    if (!standard) return;
    s.vertexShader = s.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal=normalize(normal+clothOffset(position,normalize(normal))*3.);');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunView;uniform float uSheer;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {float back=pow(max(dot(normalize(-vViewPosition),uSunView),0.),3.);
         float rim=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.);
         totalEmissiveRadiance+=diffuseColor.rgb*${SUNCOL}*back*(.16+.6*rim)*uSheer;}`);
  };
  material.customProgramCacheKey = () => 'cloth' + standard;
  return material;
}
function fabric(color, U, seed, sheer = 1, extra = {}) {
  const uniforms = { uWind: { value: WIND }, uTime: U.uTime, uGust: U.uGust, uStep: { value: 0 }, uSeed: { value: seed }, uSunView: U.uSunView, uSheer: { value: sheer } };
  const material = clothify(new T.MeshStandardMaterial({ color, roughness: .82, side: T.DoubleSide, ...extra }), uniforms, true);
  const depth = clothify(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }), uniforms, false);
  return { material, depth, step: uniforms.uStep };
}

// Lathe from a bottom-to-top profile, with a per-vertex hook that may reshape it and returns aCloth.
function lathe(profile, rows, segs, shape) {
  const curve = new T.SplineCurve(profile.map(([r, y]) => new T.Vector2(r, y)));
  const g = new T.LatheGeometry(curve.getSpacedPoints(rows), segs);
  const p = g.attributes.position, cloth = new Float32Array(p.count * 2), v = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const c = shape ? shape(v) : null;
    p.setXYZ(i, v.x, v.y, v.z);
    if (c) { cloth[i * 2] = c[0]; cloth[i * 2 + 1] = c[1]; }
  }
  g.setAttribute('aCloth', new T.BufferAttribute(cloth, 2));
  return g;
}

function solveIK(S, H, a, b, pole) {
  const d = H.clone().sub(S), len = Math.min(d.length(), a + b - 1e-3);
  d.normalize();
  const x = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - x * x));
  const p = pole.clone().addScaledVector(d, -pole.dot(d)).normalize();
  return S.clone().addScaledVector(d, x).addScaledVector(p, h);
}
const bone = (mesh, A, B) => { mesh.position.copy(A).add(B).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(UP, B.clone().sub(A).normalize()); };

// Sheer silk that streams with the wind (the long veil, the gauze sash). Built in world space.
function streamer(U, opts) {
  const uniforms = {
    uA: { value: new T.Vector3() }, uSide: { value: new T.Vector3(1, 0, 0) }, uWind: { value: WIND }, uSun: { value: SUN },
    uTime: U.uTime, uGust: U.uGust, uLen: { value: opts.length }, uW0: { value: opts.w0 }, uW1: { value: opts.w1 },
    uDroop: { value: opts.droop }, uLift: { value: opts.lift }, uSeed: { value: opts.seed }, uOpacity: { value: opts.opacity }, uColor: { value: new T.Color(opts.color) },
  };
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: /* glsl */`
      uniform vec3 uA,uSide,uWind;uniform float uTime,uGust,uLen,uW0,uW1,uDroop,uLift,uSeed;
      varying vec3 vW,vN;varying vec2 vUv;
      vec3 sheet(float s,float x){
        vec3 w=normalize(uWind),side=normalize(cross(vec3(0.,1.,0.),w));
        float g=uGust;
        vec3 c=uA+w*uLen*s*(.6+.4*g);
        c.y+=uLift*sin(min(s,.7)*2.2)*g-uDroop*s*s*(1.35-g);
        c+=side*(sin(s*4.2-uTime*2.2+uSeed)*.25*s+sin(s*9.5-uTime*4.7+uSeed*2.)*.06*s);
        c.y+=sin(s*6.5-uTime*3.9+uSeed)*.14*s*(.4+g);
        float tw=s*1.8+sin(uTime*1.6+s*4.+uSeed)*.9*s;
        vec3 across=normalize(mix(uSide,cos(tw)*vec3(0.,1.,0.)+sin(tw)*side,smoothstep(0.,.3,s)));
        float width=mix(uW0,uW1,smoothstep(0.,1.,s))*(1.+.18*sin(s*7.-uTime*3.3+uSeed));
        vec3 p=c+across*x*width;
        p+=normalize(cross(across,w))*sin(x*5.+s*11.-uTime*6.4+uSeed)*.05*s*(.5+g);
        return p;
      }
      void main(){
        vUv=uv;float s=uv.y,x=uv.x-.5;
        vec3 p=sheet(s,x);
        vN=normalize(cross(sheet(s,x+.01)-p,sheet(s+.01,x)-p));
        vW=p;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor,uSun;uniform float uOpacity,uTime;varying vec3 vW,vN;varying vec2 vUv;
      ${GLSL}
      void main(){
        vec3 V=normalize(cameraPosition-vW),N=normalize(vN);
        if(dot(N,V)<0.)N=-N;
        float wrap=max(0.,(dot(N,uSun)+.35)/1.35),through=pow(max(0.,dot(-V,uSun)),2.5);
        vec3 col=uColor*(mix(${GROUNDCOL},${SKYCOL},N.y*.5+.5)*.95+${SUNCOL}*(wrap*.8+through*1.5));
        float edge=smoothstep(0.,.2,.5-abs(vUv.x-.5))*(1.-smoothstep(.78,1.,vUv.y));
        float weave=.78+.22*vnoise(vUv*vec2(9.,50.)+uTime*.2);
        float a=uOpacity*edge*weave*(.5+.5*(1.-abs(dot(N,V))));
        gl_FragColor=vec4(col,a);
      }`,
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(1, 1, 10, 72), material);
  mesh.frustumCulled = false; mesh.renderOrder = 4;
  return { mesh, uniforms };
}

// A few soft smudges are enough for a face seen the way Sorolla paints it: eyes, brows, nose, mouth, warm cheeks.
function paintFace() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'), x0 = 64;
  g.fillStyle = '#e8bf9e'; g.fillRect(0, 0, 256, 128);
  const blot = (x, y, rx, ry, color, alpha) => {
    const r = g.createRadialGradient(x, y, 0, x, y, 1); r.addColorStop(0, color); r.addColorStop(1, color + '00');
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.scale(rx, ry); g.translate(-x, -y); g.fillStyle = r; g.beginPath(); g.arc(x, y, 1, 0, 7); g.fill(); g.restore();
  };
  for (const s of [-1, 1]) {
    blot(x0 + s * 14, 71, 9, 6, '#e0907c', .45);
    blot(x0 + s * 12.5, 57, 5.5, 2.6, '#3a2420', .85);
    blot(x0 + s * 13, 51.5, 7, 1.6, '#5a3526', .6);
    blot(x0 + s * 12.5, 59.5, 6, 2.2, '#b9846c', .35);
  }
  blot(x0 + 1.5, 66, 2.2, 6, '#b97e66', .35);
  blot(x0, 77, 6.5, 2.4, '#ad5150', .75);
  blot(x0, 83, 7, 3, '#c99579', .3);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function makeWoman(world, U, spec, shared) {
  const root = new T.Group(), body = new T.Group(), head = new T.Group();
  root.add(body); body.add(head); world.add(root);
  head.position.set(0, 1.52, 0);
  const dress = fabric(spec.dress, U, spec.seed);
  const trim = fabric(spec.dress, U, spec.seed + 3, .6);
  const part = (parent, geo, mat, x = 0, y = 0, z = 0, cloth) => {
    const m = new T.Mesh(geo, cloth ? cloth.material : mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    if (cloth) m.customDepthMaterial = cloth.depth;
    parent.add(m); shared.geometries.push(geo); return m;
  };

  // Skirt: fitted at the hips, flaring to a long hem with a short train that lies on the sand.
  const skirt = lathe([[.37, 0], [.345, .06], [.3, .2], [.255, .4], [.225, .6], [.2, .78], [.175, .9], [.14, .98], [.125, 1.02]], 30, 56, v => {
    const r = Math.hypot(v.x, v.z) || 1, back = Math.max(0, -v.z / r), y = v.y, t = smoothstep(.75, 1.02, y);
    v.x *= 1 + .1 * t; v.z *= 1 - .14 * t;
    if (y < .35) { const k = (.35 - y) / .35, s = 1 + spec.train * k * k * back; v.x *= s; v.z *= s; v.y = Math.max(.004, y - .03 * k * back); }
    const free = Math.min(1, Math.max(0, (1 - y) / .95)) ** 1.5;
    return [free, free];
  });
  part(body, skirt, null, 0, 0, 0, dress);
  const bodice = lathe(spec.bodice, 18, 40, v => {
    const r = Math.hypot(v.x, v.z) || 1;
    v.x *= 1.16; v.z *= .8;
    v.z += spec.bust * Math.max(0, v.z / r) * Math.exp(-(((v.y - 1.22) / .07) ** 2));
    return [0, 0];
  });
  part(body, bodice, null, 0, 0, 0, trim);
  part(body, new T.TorusGeometry(.128, .012, 8, 40).rotateX(π / 2).scale(1.1, 1, .86), null, 0, 1.0, 0, trim);

  const skin = shared.skin;
  part(head, new T.CylinderGeometry(.04, .046, .13, 16), spec.collar ? null : skin, 0, -.04, 0, spec.collar ? trim : null);
  part(head, new T.SphereGeometry(.093, 32, 22).scale(.92, 1.12, 1), shared.face, 0, .065, .008);
  const hair = new T.MeshStandardMaterial({ color: spec.hair, roughness: .9 }); shared.materials.push(hair);
  for (const [r, sx, sy, sz, x, y, z] of spec.hairShapes) part(head, new T.SphereGeometry(r, 20, 14).scale(sx, sy, sz), hair, x, y, z);
  head.rotation.set(spec.headPitch, spec.headTurn, 0);

  // Arms (two-bone IK so the hands reach the hat brim, the parasol handle and the straw hat).
  const sleeve = spec.sheerSleeves ? shared.gauze : null;
  function arm(side) {
    const a = .27, b = .25;
    const upper = part(body, new T.CapsuleGeometry(.04, a, 4, 12), sleeve, 0, 0, 0, sleeve ? null : trim);
    const fore = part(body, new T.CapsuleGeometry(.031, b, 4, 12), sleeve || skin);
    const hand = part(body, new T.SphereGeometry(.036, 14, 10).scale(1, 1.35, .7), skin);
    const S = new T.Vector3(side * .168, 1.355, -.005);
    return {
      hand,
      set(H, pole) {
        const E = solveIK(S, H, a, b, pole);
        bone(upper, S, E);
        const dir = H.clone().sub(E).normalize(), W = E.clone().addScaledVector(dir, b);
        bone(fore, E, W);
        hand.position.copy(W).addScaledVector(dir, .045); hand.quaternion.copy(fore.quaternion);
        return hand.position;
      },
    };
  }
  const right = arm(-1), left = arm(1);
  if (spec.puff) for (const s of [-1, 1]) part(body, new T.SphereGeometry(.072, 18, 14).scale(1, 1.15, 1), null, s * .18, 1.33, 0, trim);
  else for (const s of [-1, 1]) part(body, new T.SphereGeometry(.05, 16, 12), null, s * .17, 1.345, 0, trim);

  const shoes = [-1, 1].map(s => part(root, new T.SphereGeometry(1, 14, 10).scale(.042, .028, .095), spec.shoe, s * .07, .02, .1));
  return { root, body, head, dress, trim, right, left, shoes, spec, part };
}

function strawHat(part, parent, shared, brim, ribbon, flowers) {
  const hat = new T.Group(); parent.add(hat);
  const g = lathe([[brim, -.015], [brim * .72, 0], [brim * .45, .01], [.1, .03], [.096, .08], [.065, .105], [0, .11]], 16, 48);
  part(hat, g, shared.straw);
  part(hat, new T.TorusGeometry(.1, .014, 8, 36).rotateX(π / 2), ribbon, 0, .042, 0);
  flowers.forEach(([c, r, x, y, z]) => part(hat, new T.SphereGeometry(r, 12, 10), c, x, y, z));
  return hat;
}

export function buildFigures(world, U, start) {
  const shared = {
    geometries: [], materials: [],
    skin: new T.MeshStandardMaterial({ color: '#e9c2a2', roughness: .62 }),
    face: new T.MeshStandardMaterial({ map: paintFace(), roughness: .62 }),
    gauze: new T.MeshStandardMaterial({ color: '#f1e1d6', roughness: .8 }),
    straw: new T.MeshStandardMaterial({ color: '#e3c58e', roughness: .85, side: T.DoubleSide }),
  };
  const mat = c => { const m = new T.MeshStandardMaterial({ color: c, roughness: .7 }); shared.materials.push(m); return m; };
  shared.materials.push(shared.skin, shared.face, shared.gauze, shared.straw);
  const lilac = mat('#9a7fc2'), violet = mat('#6f5a9e'), rose = mat('#d6aac2'), navy = mat('#25366a'), sage = mat('#86a48d'), teal = mat('#5e8a78'), ivory = mat('#f2ece0'), black = mat('#22212a');

  // Clotilde, by the sea, one hand on her hat, the parasol trailing in the wind.
  const clotilde = makeWoman(world, U, {
    dress: '#f5f1e8', seed: 1.3, train: .45, bust: .03, puff: true, collar: false, hair: '#5a3826', shoe: ivory, headPitch: .14, headTurn: -.25,
    bodice: [[.125, 1.0], [.14, 1.08], [.172, 1.17], [.183, 1.24], [.175, 1.3], [.16, 1.35], [.12, 1.39], [.06, 1.425], [.04, 1.44]],
    hairShapes: [[.1, 1.05, .82, 1.04, 0, .1, -.015]],
  }, shared);
  const cHat = strawHat(clotilde.part, clotilde.head, shared, .27, lilac, [
    [lilac, .03, .07, .07, .07], [violet, .026, .1, .06, .02], [rose, .024, .05, .085, .09], [lilac, .028, -.02, .08, .095], [violet, .022, .09, .08, -.04],
  ]);
  cHat.position.set(0, .14, -.01); cHat.rotation.set(-.2, 0, .1);
  const veilAnchor = new T.Object3D(); veilAnchor.position.set(-.16, .03, -.05); cHat.add(veilAnchor);

  // María, inland of her mother, carrying her straw hat; hair up with a dark ribbon.
  const maria = makeWoman(world, U, {
    dress: '#f7f4ee', seed: 4.1, train: .35, bust: .015, puff: false, collar: true, sheerSleeves: true, hair: '#6d3a24', shoe: black, headPitch: .08, headTurn: .55,
    bodice: [[.122, 1.0], [.135, 1.08], [.16, 1.17], [.17, 1.24], [.165, 1.3], [.152, 1.35], [.11, 1.39], [.055, 1.42], [.04, 1.43]],
    hairShapes: [[.103, 1.06, .8, 1.05, 0, .115, -.014], [.052, 1, 1, 1, 0, .17, -.06], [.03, 1.4, .7, .5, .04, .165, -.1], [.03, 1.4, .7, .5, -.04, .165, -.1]],
  }, shared);
  const hatPivot = new T.Group(); maria.body.add(hatPivot);
  const mHat = strawHat(maria.part, hatPivot, shared, .23, navy, [
    [sage, .03, .06, .07, .07], [teal, .026, .09, .065, .02], [ivory, .02, .03, .08, .09], [sage, .024, -.03, .075, .09],
  ]);
  mHat.position.set(0, -.2, 0); mHat.rotation.z = -π / 2;
  for (const s of [-1, 1]) { const tail = maria.part(mHat, new T.BoxGeometry(.03, .16, .004), navy, .02 * s, .08, .1); tail.rotation.set(.3, 0, .9 + s * .2); }
  const sashAnchor = new T.Object3D(); sashAnchor.position.set(-.13, 1.0, -.06); maria.body.add(sashAnchor);

  // Parasol: lives in world space so it can be swung by the wind regardless of where Clotilde turns.
  const parasol = new T.Group(); world.add(parasol);
  const canopyCloth = fabric('#f6f2ea', U, 2.2);
  const canopyGeo = lathe([[.46, 0], [.43, .075], [.36, .145], [.24, .205], [.11, .238], [0, .245]], 14, 64, v => {
    const a = Math.atan2(v.z, v.x), rib = Math.abs(Math.cos(4 * a)), rim = 1 - v.y / .245;
    const pull = 1 - .07 * (1 - rib) * rim; v.x *= pull; v.z *= pull; v.y += .035 * (1 - rib) * rim;
    return [rim ** 1.3 * .55, 0];
  });
  const canopy = new T.Mesh(canopyGeo, canopyCloth.material);
  canopy.customDepthMaterial = canopyCloth.depth; canopy.castShadow = canopy.receiveShadow = true;
  canopy.position.y = .72; parasol.add(canopy);
  const wood = mat('#8a6a48');
  const shaft = new T.Mesh(new T.CylinderGeometry(.007, .009, .97, 8), wood); shaft.position.y = .48; shaft.castShadow = true; parasol.add(shaft);
  const tip = new T.Mesh(new T.SphereGeometry(.014, 8, 6), wood); tip.position.y = .96; parasol.add(tip);
  shared.geometries.push(canopyGeo, shaft.geometry, tip.geometry);

  const veil = streamer(U, { length: 2.6, w0: .3, w1: .9, droop: .55, lift: .35, seed: .7, opacity: .82, color: '#f8f6f2' });
  const sash = streamer(U, { length: 2.1, w0: .34, w1: 1.1, droop: .9, lift: .12, seed: 2.9, opacity: .72, color: '#f6f0ea' });
  world.add(veil.mesh, sash.mesh);

  // A long stroll along the shore and back, starting exactly where Sorolla painted them.
  const C = start.clotilde, M = start.maria, S = C.clone().add(M).multiplyScalar(.5);
  const heading0 = new T.Vector3(-1, 0, 0), right0 = new T.Vector3(-heading0.z, 0, heading0.x);
  const offsets = [C, M].map(P => { const d = P.clone().sub(S); return { lon: d.dot(heading0), lat: d.dot(right0) }; });
  const path = new T.CatmullRomCurve3([
    [0, 0], [-12, .1], [-26, .25], [-33, .95], [-35.5, 2.6], [-33, 4.35], [-24, 4.95], [-10, 5.15], [5, 5.05], [20, 4.65], [31, 3.75], [34.5, 2.05], [32, .35], [22, -.05], [12, -.05],
  ].map(([x, z]) => new T.Vector3(S.x + x, 0, S.z + z)), true, 'centripetal');
  const length = path.getLength();
  const walkers = [
    { w: clotilde, ...offsets[0], phase: 0 },
    { w: maria, ...offsets[1], phase: 1.7 },
  ];
  let distance = 0;
  const P = new T.Vector3(), Tn = new T.Vector3(), tmp = new T.Vector3(), fwd = new T.Vector3(), q = new T.Quaternion();
  const poles = { brim: new T.Vector3(-1, .15, .25), handle: new T.Vector3(.6, -.1, -.8), hat: new T.Vector3(.2, 0, -1), back: new T.Vector3(0, 0, -1) };

  function place(walker, gustNow) {
    const { w } = walker, d = distance + walker.lon, u = ((d / length) % 1 + 1) % 1;
    path.getPointAt(u, P); path.getTangentAt(u, Tn); Tn.y = 0; Tn.normalize();
    P.x += -Tn.z * walker.lat; P.z += Tn.x * walker.lat;
    const yaw = Math.atan2(Tn.x, Tn.z);
    w.root.position.set(P.x, ground(P.x, P.z), P.z);
    w.root.rotation.y = yaw;
    const step = d / .55 * π + walker.phase;
    const windX = WIND.x * Math.cos(yaw) - WIND.z * Math.sin(yaw);
    w.body.position.y = .011 * (1 - Math.cos(2 * step));
    w.body.rotation.set(.035, .045 * Math.sin(step), windX * .045 * gustNow + .012 * Math.sin(step));
    w.dress.step.value = w.trim.step.value = step;
    w.shoes.forEach((s, i) => { const k = Math.sin(step + i * π); s.position.z = .1 + .07 * k; s.position.y = .02 + .015 * Math.max(0, k); });
    return step;
  }

  return {
    obstacles: () => walkers.map(({ w }) => w.root.position),
    focus: target => target.copy(clotilde.root.position).add(maria.root.position).multiplyScalar(.5),
    reset() { distance = 0; },
    update(t, dt, life, gustNow, walkSpeed) {
      distance += dt * life * walkSpeed;
      const cStep = place(walkers[0], gustNow), mStep = place(walkers[1], gustNow);
      // Clotilde: right hand holding the brim, left hand on the parasol handle.
      clotilde.right.set(tmp.set(-.105, 1.69, .085), poles.brim);
      const handle = clotilde.left.set(tmp.set(.17, 1.0 + .01 * Math.sin(cStep), .26), poles.handle);
      // María: hat swinging at her left hip, right hand gathering the skirt behind.
      const hand = maria.left.set(tmp.set(.24, .92 + .01 * Math.sin(mStep * 2), .06 + .05 * Math.sin(mStep)), poles.hat);
      maria.right.set(tmp.set(-.2, .97, -.1 - .04 * Math.sin(mStep)), poles.back);
      hatPivot.position.copy(hand);
      hatPivot.rotation.set(.15 * Math.sin(mStep) + .05, -.6, -.12 * gustNow);
      clotilde.root.updateMatrixWorld(true); maria.root.updateMatrixWorld(true);

      // Parasol held low, shaft blown downwind.
      parasol.position.copy(clotilde.body.localToWorld(handle.clone()));
      fwd.set(Math.sin(clotilde.root.rotation.y), 0, Math.cos(clotilde.root.rotation.y));
      tmp.copy(WIND).multiplyScalar(.5 + .2 * gustNow).addScaledVector(UP, -.8).addScaledVector(fwd, -.05).normalize();
      parasol.quaternion.setFromUnitVectors(UP, tmp);
      parasol.quaternion.multiply(q.setFromAxisAngle(UP, .3 * Math.sin(t * 1.3)));

      veilAnchor.getWorldPosition(veil.uniforms.uA.value);
      veil.uniforms.uSide.value.set(0, 1, 0).applyQuaternion(cHat.getWorldQuaternion(q)).cross(WIND).normalize();
      sashAnchor.getWorldPosition(sash.uniforms.uA.value);
      sash.uniforms.uSide.value.set(0, 1, 0);
    },
    dispose() {
      shared.geometries.forEach(g => g.dispose()); shared.materials.forEach(m => m.dispose()); shared.face.map.dispose();
      for (const w of [clotilde, maria]) for (const f of [w.dress, w.trim]) { f.material.dispose(); f.depth.dispose(); }
      canopyCloth.material.dispose(); canopyCloth.depth.dispose();
      for (const s of [veil, sash]) { s.mesh.geometry.dispose(); s.mesh.material.dispose(); }
    },
  };
}
