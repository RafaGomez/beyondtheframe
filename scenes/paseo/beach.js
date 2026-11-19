import * as T from 'three';
import { GLSL, WIND, SUN, LIGHT, ground, rgb, vec3 } from './shared.js';

// Coordinates that are fine near the walkable shore and grow geometrically towards the horizon.
function ticks(from, to, a, b, step, grow) {
  const n = Math.round((b - a) / step), out = [];
  for (let i = 0; i <= n; i++) out.push(a + i * step);
  for (let x = a, s = step; x > from;) { s *= grow; x = Math.max(from, x - s); out.unshift(x); }
  for (let x = a + n * step, s = step; x < to;) { s *= grow; x = Math.min(to, x + s); out.push(x); }
  return out;
}
function grid(xs, zs, height) {
  const nx = xs.length, pos = new Float32Array(nx * zs.length * 3), idx = new Uint32Array((nx - 1) * (zs.length - 1) * 6);
  let k = 0;
  for (const z of zs) for (const x of xs) { pos[k++] = x; pos[k++] = height ? height(x, z) : 0; pos[k++] = z; }
  k = 0;
  for (let j = 0; j < zs.length - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setIndex(new T.BufferAttribute(idx, 1));
  return g;
}

const π = Math.PI;
const SUNCOL = vec3(LIGHT.sun.clone().multiplyScalar(LIGHT.sunIntensity / π));
const HEMI = vec3(LIGHT.sky.clone().multiplyScalar(LIGHT.hemiIntensity / π));
const SKY_GLSL = /* glsl */`
vec3 skyAt(vec3 d,vec3 sun){
  float h=max(d.y,0.);
  vec3 c=mix(${vec3(LIGHT.haze)},${vec3(LIGHT.zenith)},pow(smoothstep(0.,.38,h),.55));
  c+=${rgb('#f6e2c4')}*.35*(1.-smoothstep(0.,.05,h));
  float s=max(dot(d,sun),0.);
  return c+${rgb('#fff0d0')}*(pow(s,6.)*.28+pow(s,48.)*.55);
}`;

export function buildBeach(world, U) {
  const disposables = [];
  const keep = (...items) => { disposables.push(...items); return items[0]; };
  world.fog = new T.Fog(LIGHT.haze, ...LIGHT.fog);

  // ---- Sky ---------------------------------------------------------------
  const sky = new T.Mesh(keep(new T.SphereGeometry(4000, 48, 24)), keep(new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN }, uTime: U.uTime },
    vertexShader: `varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun;uniform float uTime;varying vec3 vDir;
      ${GLSL}${SKY_GLSL}
      void main(){
        vec3 d=normalize(vDir);
        vec3 c=skyAt(d,uSun);
        float s=max(dot(d,uSun),0.);
        c+=${rgb('#fff6e4')}*smoothstep(.99955,.99975,s)*14.;
        float h=d.y;
        if(h>0.){
          vec2 q=d.xz/(h+.08)*1.6+vec2(uTime*.003,0.);
          float n=fbm(q*.8)*.65+fbm(q*2.3+4.)*.35;
          float band=smoothstep(.0,.05,h)*(1.-smoothstep(.12,.42,h));
          float cl=smoothstep(.6,.84,n)*band;
          vec3 cloud=mix(${rgb('#bdb8cc')},${rgb('#fbf6ec')},smoothstep(.55,.95,n)+.4*pow(s,4.));
          c=mix(c,cloud*1.05,cl*.75);
        }
        float a=atan(d.x,d.z);
        c*=1.+.05*(strokes(vec2(a*60.,h*90.),.12,vec2(.35,2.4))-.5);
        gl_FragColor=vec4(c,1.);
      }`,
  })));
  sky.renderOrder = -10; sky.frustumCulled = false;
  world.add(sky);

  // Distant sierras along the coast and inland, already hazed by the air.
  {
    const n = 720, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * 2 * π, dx = Math.sin(a), dz = Math.cos(a);
      const land = Math.max(0, Math.min(1, (dz + .32) / .38));
      const ridge = 30 + 38 * Math.sin(a * 7 + 1) * Math.sin(a * 3) + 22 * Math.sin(a * 23 + .4) + 9 * Math.sin(a * 61);
      const r = 3000;
      pos.push(dx * r, -30, dz * r, dx * r, land * land * Math.max(8, ridge + 45), dz * r);
      if (i < n) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const g = keep(new T.BufferGeometry());
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const ridges = new T.Mesh(g, keep(new T.MeshBasicMaterial({ color: new T.Color('#b4b0c2'), fog: false, side: T.DoubleSide })));
    ridges.renderOrder = -9; ridges.frustumCulled = false;
    world.add(ridges);
  }

  // ---- Light -------------------------------------------------------------
  const hemi = new T.HemisphereLight(LIGHT.sky, LIGHT.ground, LIGHT.hemiIntensity);
  const sun = new T.DirectionalLight(LIGHT.sun, LIGHT.sunIntensity);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 90 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  world.add(hemi, sun, sun.target);

  // ---- Sand --------------------------------------------------------------
  const sandGeo = keep(grid(ticks(-1600, 1600, -70, 70, .8, 1.06), ticks(-45, 1500, -12, 40, .5, 1.07), ground));
  sandGeo.computeVertexNormals();
  const sandMat = keep(new T.MeshStandardMaterial({ roughness: .96, metalness: 0 }));
  sandMat.onBeforeCompile = s => {
    s.uniforms.uTime = U.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;varying vec3 vW;
        ${GLSL}
        float wetness(vec2 q){
          float c=surfPhase(vec2(q.x,0.),uTime),u=fract(c),n=floor(c);
          float last=u<.2?n-1.:n,since=u<.2?u+.8:u-.2;
          float reach=(-.06+.16*setAmp(last))/.042+.6*(vnoise(q*vec2(.3,1.))-.5);
          float fresh=(1.-smoothstep(reach-.7,reach+.12,q.y))*(1.-.4*since);
          float base=1.-smoothstep(-.4,1.8,q.y+.9*(vnoise(q*.15)-.5));
          return clamp(max(fresh,base*.85),0.,1.);
        }
        vec3 sandColor(vec3 p,float wet,float dist){
          vec2 q=p.xz;
          float big=fbm(q*.045),n=fbm(q*.35+3.1),k=.2+.8*(1.-smoothstep(8.,45.,dist));
          float ang=.15+.5*(vnoise(q*.04)-.5);
          float s1=strokes(q,ang,vec2(1.1,6.5)),s2=strokes(q+17.,ang+.25,vec2(1.5,10.)),s3=strokes(q-9.,ang-.2,vec2(.7,4.5));
          vec3 c=mix(${rgb('#9a8064')},${rgb('#bb9c76')},smoothstep(.2,.85,big*.7+n*.5));
          c=mix(c,${rgb('#c49467')},smoothstep(.58,.88,s1)*.5*k);
          c=mix(c,${rgb('#8a8093')},smoothstep(.64,.92,s2)*.45*k);
          c=mix(c,${rgb('#cdb895')},smoothstep(.62,.92,s3)*.4*k);
          vec3 w=mix(${rgb('#6c6b62')},${rgb('#8f9488')},smoothstep(.25,.8,strokes(q,.05,vec2(.22,3.))));
          w=mix(w,${rgb('#7a7392')},smoothstep(.55,.9,s2)*.6);
          c=mix(c,w,wet);
          float veg=smoothstep(24.,38.,p.z)*smoothstep(.42,.68,fbm(q*.07+7.));
          c=mix(c,mix(${rgb('#8c8a50')},${rgb('#a9a061')},n),veg*.85);
          c=mix(c,${rgb('#4f5c3a')}*(.75+.5*n),smoothstep(110.,170.,p.z+40.*fbm(q*.012)));
          return c;
        }`)
      .replace('#include <map_fragment>', 'float wet=wetness(vW.xz);diffuseColor.rgb=sandColor(vW,wet,length(vViewPosition));')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.34,wet*wet);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {vec2 wd=normalize(vec2(${WIND.x.toFixed(4)},${WIND.z.toFixed(4)}));
         float ph=dot(vW.xz,wd)*40.+5.*vnoise(vW.xz*.9)+2.*vnoise(vW.xz*3.1);
         float fade=(1.-wet)*(1.-smoothstep(2.,8.,length(vViewPosition)))*(.4+.6*vnoise(vW.xz*.6));
         vec2 g=wd*cos(ph)*.08*fade;
         normal=normalize(normal-(viewMatrix*vec4(g.x,0.,g.y,0.)).xyz);}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {float fr=pow(1.-max(dot(normal,normalize(vViewPosition)),0.),4.);
         totalEmissiveRadiance+=${HEMI}*wet*(.12+.6*fr);}`);
  };
  const sand = new T.Mesh(sandGeo, sandMat);
  sand.receiveShadow = true;
  world.add(sand);

  // ---- Sea ---------------------------------------------------------------
  const seaGeo = keep(grid(ticks(-2600, 2600, -60, 60, 1, 1.05), ticks(-3000, 8, -40, 8, .6, 1.05)));
  const seaMat = keep(new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: U.uTime, uSun: { value: SUN } },
    vertexShader: /* glsl */`
      uniform float uTime;varying vec3 vW;varying vec3 vN;
      ${GLSL}
      float waveShape(float u){return u<.85?pow(1.-u/.85,2.2):pow((u-.85)/.15,1.6);}
      float surface(vec2 p){
        float d0=-ground(p),ph=surfPhase(p,uTime);
        float a=.2*smoothstep(.05,1.4,d0)*(1.+.6*exp(-pow((d0-.55)/.3,2.)))*setAmp(floor(ph));
        float h=a*(waveShape(fract(ph))-.3);
        h+=smoothstep(.1,1.2,d0)*(.045*sin(dot(p,vec2(.31,.95))*.9-uTime*1.7)+.03*sin(dot(p,vec2(-.6,.8))*1.4-uTime*2.1)+.02*sin(dot(p,vec2(.93,.37))*2.3-uTime*2.9));
        return h+swash(p.x,uTime)*(1.-smoothstep(.3,1.5,d0));
      }
      void main(){
        vec2 p=position.xz;float h=surface(p),e=.3;
        vN=normalize(vec3(h-surface(p+vec2(e,0.)),e,h-surface(p+vec2(0.,e))));
        vW=vec3(p.x,h,p.y);
        gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime;uniform vec3 uSun;varying vec3 vW;varying vec3 vN;
      ${GLSL}${SKY_GLSL}
      void main(){
        vec2 q=vW.xz;
        float g=ground(q),depth=vW.y-g,d0=-g;
        vec3 toCam=cameraPosition-vW;float dist=length(toCam);vec3 V=toCam/dist;
        vec2 rq=q*vec2(.9,1.6)-vec2(${WIND.x.toFixed(4)},${WIND.z.toFixed(4)})*uTime*.8;
        float e=.06,r0=fbm(rq),rx=fbm(rq+vec2(e,0.)),rz=fbm(rq+vec2(0.,e));
        float dl=.1+.4*(1.-smoothstep(20.,260.,dist));
        vec3 N=normalize(vN+vec3(r0-rx,0.,r0-rz)/e*dl*.25);
        vec3 R=reflect(-V,N);R.y=abs(R.y);
        float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);
        float st=strokes(q,.06+.3*(vnoise(q*.012)-.5),vec2(.16,2.)),st2=strokes(q+31.,-.05,vec2(.3,4.5));
        vec3 deep=mix(${rgb('#1f3f86')},${rgb('#2f56a6')},smoothstep(.25,.75,st));
        vec3 body=mix(${rgb('#5f9c97')},deep,smoothstep(.1,1.6,d0+.6*(st2-.5)));
        body=mix(body,${rgb('#4c4995')},smoothstep(.6,.92,st2)*.45);
        body=mix(body,${rgb('#6f93cf')},smoothstep(.68,.95,st)*.4*smoothstep(1.,6.,d0));
        float ndl=max(dot(N,uSun),0.);
        vec3 col=body*(${HEMI}*(1.5+.6*N.y)+${SUNCOL}*ndl*.6);
        vec3 refl=mix(skyAt(R,uSun),${vec3(LIGHT.zenith)}*1.1,.45);
        col=mix(col,refl,min(fr,.55));
        float sp=max(dot(R,uSun),0.);
        float glint=step(.8,hash12(floor(q*vec2(9.,13.))+floor(uTime*7.)*7.));
        col+=${SUNCOL}*(pow(sp,900.)*45.+pow(sp,70.)*glint*7.*smoothstep(.3,1.5,d0));
        float ph=surfPhase(q,uTime),u=fract(ph);
        float zone=smoothstep(.03,.12,d0)*(1.-smoothstep(.9,1.5,d0));
        float lace=fbm(q*vec2(.45,1.1)+vec2(0.,-uTime*.3));
        float bore=pow(1.-u,16.)*1.3+smoothstep(.975,1.,u)*.5;
        float foam=zone*(bore*smoothstep(.3,.62,lace+.2)+smoothstep(.62,.84,lace)*pow(1.-u,3.)*.6);
        float edge=1.-smoothstep(0.,.03+.05*vnoise(q*vec2(1.5,4.)),depth);
        foam=clamp(max(foam,edge*.85),0.,1.);
        vec3 fc=mix(${rgb('#aebcd6')},${rgb('#f6f3ec')},.4+.6*ndl);
        col=mix(col,fc*(${HEMI}*1.1+${SUNCOL}*.75),foam);
        float alpha=max(smoothstep(0.,.22,depth),foam*smoothstep(0.,.015,depth));
        col=mix(col,${vec3(LIGHT.haze)},smoothstep(${LIGHT.fog[0].toFixed(1)},${LIGHT.fog[1].toFixed(1)},dist));
        gl_FragColor=vec4(col,alpha);
      }`,
  }));
  const sea = new T.Mesh(seaGeo, seaMat);
  sea.frustumCulled = false; sea.renderOrder = 1;
  world.add(sea);

  // ---- Dune grass that bends with the poniente ----------------------------
  const blade = keep(new T.BufferGeometry());
  {
    const p = [], idx = [], rows = 4;
    for (let i = 0; i <= rows; i++) { const y = i / rows, w = .018 * (1 - y * .92); p.push(-w, y, 0, w, y, 0); }
    for (let i = 0; i < rows; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    blade.setAttribute('position', new T.Float32BufferAttribute(p, 3)); blade.setIndex(idx); blade.computeVertexNormals();
  }
  const grassMat = keep(new T.MeshStandardMaterial({ roughness: .9, side: T.DoubleSide }));
  grassMat.onBeforeCompile = s => {
    Object.assign(s.uniforms, { uTime: U.uTime, uGust: U.uGust });
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime,uGust;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {vec3 wl=normalize(transpose(mat3(instanceMatrix))*vec3(${WIND.x.toFixed(4)},0.,${WIND.z.toFixed(4)}));
         float h=position.y*position.y,ph=instanceMatrix[3].x*.6+instanceMatrix[3].z*.4;
         float sway=uGust*(.55+.25*sin(uTime*3.1+ph)+.12*sin(uTime*7.3+ph*2.));
         transformed+=wl*h*sway*.9;transformed.y-=h*sway*.25;}`);
  };
  const clumps = 260, perClump = 16, grass = new T.InstancedMesh(blade, grassMat, clumps * perClump);
  {
    const m = new T.Matrix4(), q = new T.Quaternion(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color();
    const tint = ['#9c9a5c', '#b4aa6c', '#7f8c4e', '#c3b27a'].map(h => new T.Color(h));
    let k = 0, seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < clumps; i++) {
      const cx = (rand() - .5) * 150, cz = 17 + rand() ** 1.4 * 55;
      for (let j = 0; j < perClump; j++) {
        const x = cx + (rand() - .5) * .9, z = cz + (rand() - .5) * .9;
        p.set(x, ground(x, z) - .02, z);
        q.setFromEuler(new T.Euler((rand() - .5) * .5, rand() * π, (rand() - .5) * .5));
        const h = .35 + rand() * .55; s.set(1, h, 1);
        grass.setMatrixAt(k, m.compose(p, q, s));
        grass.setColorAt(k++, c.copy(tint[(rand() * 4) | 0]));
      }
    }
  }
  grass.receiveShadow = true; grass.frustumCulled = false;
  world.add(grass);

  // ---- Sand lifted by the gusts ------------------------------------------
  const grains = 2200, seeds = new Float32Array(grains * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const grainGeo = keep(new T.BufferGeometry());
  grainGeo.setAttribute('position', new T.BufferAttribute(new Float32Array(grains * 3), 3));
  grainGeo.setAttribute('aSeed', new T.BufferAttribute(seeds, 4));
  const grainMat = keep(new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTravel: { value: 0 }, uTime: U.uTime, uGust: U.uGust, uCenter: { value: new T.Vector2() }, uSize: { value: 6 } },
    vertexShader: /* glsl */`
      attribute vec4 aSeed;uniform float uTravel,uTime,uGust,uSize;uniform vec2 uCenter;varying float vA;varying vec2 vDir;
      ${GLSL}
      void main(){
        vec2 wd=vec2(${WIND.x.toFixed(4)},${WIND.z.toFixed(4)});
        vec2 rel=(aSeed.xy-.5)*36.+wd*uTravel*(.6+aSeed.w*.9)-uCenter;
        rel=mod(rel+18.,36.)-18.;vec2 p=uCenter+rel;
        float hop=abs(sin(uTime*(3.+aSeed.w*4.)+aSeed.x*40.))*.1*aSeed.z+aSeed.z*aSeed.z*.45;
        vec4 mv=viewMatrix*vec4(p.x,ground(p)+.015+hop*uGust,p.y,1.);
        gl_Position=projectionMatrix*mv;
        vec4 ahead=projectionMatrix*(mv+viewMatrix*vec4(wd.x,0.,wd.y,0.)*.3);
        vec2 s=ahead.xy/ahead.w-gl_Position.xy/gl_Position.w;s*=vec2(projectionMatrix[1][1]/projectionMatrix[0][0],-1.);vDir=length(s)>1e-6?normalize(s):vec2(1.,0.);
        gl_PointSize=min(64.,uSize*(.7+aSeed.z)/max(.2,-mv.z));
        vA=smoothstep(1.8,4.,p.y)*(1.-smoothstep(9.,18.,length(rel)))*smoothstep(.25,.75,uGust)*(.45+.5*aSeed.w);
      }`,
    fragmentShader: `varying float vA;varying vec2 vDir;void main(){
      vec2 q=gl_PointCoord-.5;q=vec2(dot(q,vDir),dot(q,vec2(-vDir.y,vDir.x)));
      float d=length(q*vec2(1.,7.));
      gl_FragColor=vec4(${rgb('#f3dfb4')}*1.5,vA*(1.-smoothstep(.2,.5,d)));}`,
  }));
  const blowing = new T.Points(grainGeo, grainMat);
  blowing.frustumCulled = false; blowing.renderOrder = 3;
  world.add(blowing);

  const focus = new T.Vector3(), texel = 26 / 2048;
  return {
    sun,
    update(camera, dt, windSpeed, pixelScale) {
      sky.position.copy(camera.position);
      grainMat.uniforms.uTravel.value += dt * windSpeed;
      grainMat.uniforms.uCenter.value.set(camera.position.x, camera.position.z);
      grainMat.uniforms.uSize.value = 40 * pixelScale;
      // Keep the shadow frustum around what the visitor is looking at.
      camera.getWorldDirection(focus);
      focus.y = 0; focus.normalize().multiplyScalar(6).add(camera.position);
      focus.x = Math.round(focus.x / texel) * texel; focus.z = Math.round(focus.z / texel) * texel;
      focus.y = ground(focus.x, focus.z);
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(SUN, 45);
    },
    dispose() { disposables.forEach(d => d.dispose()); sun.shadow.dispose?.(); grass.dispose(); },
  };
}
