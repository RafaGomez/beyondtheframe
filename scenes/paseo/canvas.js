import * as T from 'three';
import { WIND } from './shared.js';

// The painting itself, cut into brushstroke-sized flakes that the poniente peels off the canvas.
// Drawn after the painterly pass so the visitor first sees Sorolla's own colours, untouched.
export function buildCanvas(world, overlay, texture, aspect) {
  const cols = 64, rows = 110, count = cols * rows;
  const quad = new T.PlaneGeometry(1, 1), geo = new T.InstancedBufferGeometry();
  geo.index = quad.index; geo.setAttribute('position', quad.attributes.position);
  const cell = new Float32Array(count * 2), rand = new Float32Array(count * 4);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i; cell[k * 2] = (i + .5) / cols; cell[k * 2 + 1] = (j + .5) / rows;
    for (let r = 0; r < 4; r++) rand[k * 4 + r] = Math.random();
  }
  geo.setAttribute('aCell', new T.InstancedBufferAttribute(cell, 2));
  geo.setAttribute('aRand', new T.InstancedBufferAttribute(rand, 4));
  geo.instanceCount = count;
  const uniforms = {
    tMap: { value: texture }, uProgress: { value: 0 }, uFade: { value: 1 }, uCells: { value: new T.Vector2(cols, rows) },
    uOrigin: { value: new T.Vector3() }, uRight: { value: new T.Vector3() }, uUp: { value: new T.Vector3() }, uFwd: { value: new T.Vector3() },
    uSize: { value: new T.Vector2() }, uWind: { value: WIND },
  };
  const flakes = new T.Mesh(geo, new T.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: /* glsl */`
      attribute vec2 aCell;attribute vec4 aRand;
      uniform float uProgress;uniform vec3 uOrigin,uRight,uUp,uFwd,uWind;uniform vec2 uSize,uCells;
      varying vec2 vUv,vLocal;varying float vLife;varying vec4 vRand;
      void main(){
        float order=clamp(((1.-aCell.x)*.55+aCell.y*.45)*.8+aRand.x*.2,0.,1.);
        float lp=clamp((uProgress-order*.62)/.38,0.,1.),e=lp*lp;
        vec2 corner=position.xy;
        vUv=aCell+corner/uCells*1.04;vLocal=corner*2.;vLife=lp;vRand=aRand;
        vec2 lc=corner/uCells*uSize*1.04*(1.-.35*e);
        lc.x*=mix(1.,cos(e*(2.+aRand.z*6.)),smoothstep(0.,.3,lp));
        float ang=e*(aRand.y-.5)*9.;
        lc=mat2(cos(ang),sin(ang),-sin(ang),cos(ang))*lc;
        vec3 p=uOrigin+uRight*((aCell.x-.5)*uSize.x+lc.x)+uUp*((aCell.y-.5)*uSize.y+lc.y);
        p-=uFwd*sin(min(lp*2.,1.)*1.5708)*(.04+.08*aRand.w);
        p+=uWind*e*(2.5+3.5*aRand.w)+vec3(0.,1.,0.)*e*(.4+1.2*aRand.z);
        p+=(uRight*sin(lp*6.+aRand.y*6.)+uUp*cos(lp*5.+aRand.x*6.))*.1*lp;
        gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tMap;uniform float uFade;
      varying vec2 vUv,vLocal;varying float vLife;varying vec4 vRand;
      void main(){
        vec3 c=texture2D(tMap,vUv).rgb;
        float k=smoothstep(0.,.25,vLife);
        float r=length(vLocal*vec2(1.,1.25))+.25*(sin(vLocal.x*5.+vRand.y*6.)*.5+sin(vLocal.y*7.+vRand.z*6.)*.5);
        float a=mix(1.,1.-smoothstep(.75,1.05,r),k)*(1.-smoothstep(.65,1.,vLife))*uFade;
        if(a<.01)discard;
        gl_FragColor=vec4(c,a);
      }`,
  }));
  flakes.frustumCulled = false;
  overlay.add(flakes);

  // Gilded moulding around the canvas, and a black curtain that opens onto the world beyond it.
  const frame = new T.Group(), border = .05;
  const outer = new T.Shape(), hole = new T.Path();
  outer.moveTo(-.5 - border, -.5 - border); outer.lineTo(.5 + border, -.5 - border); outer.lineTo(.5 + border, .5 + border); outer.lineTo(-.5 - border, .5 + border);
  hole.moveTo(-.5, -.5); hole.lineTo(-.5, .5); hole.lineTo(.5, .5); hole.lineTo(.5, -.5);
  outer.holes.push(hole);
  const frameGeo = new T.ExtrudeGeometry(outer, { depth: .02, bevelEnabled: true, bevelThickness: .025, bevelSize: .022, bevelSegments: 3 });
  // A painted gold matcap keeps the moulding lit even though the sun is behind it.
  const sphere = document.createElement('canvas'); sphere.width = sphere.height = 128;
  const g2 = sphere.getContext('2d'), shade = g2.createRadialGradient(46, 40, 4, 64, 64, 66);
  [[0, '#fff3c4'], [.18, '#e8c06a'], [.5, '#b0802f'], [.8, '#6b4716'], [1, '#2e1d08']].forEach(([o, c]) => shade.addColorStop(o, c));
  g2.fillStyle = shade; g2.fillRect(0, 0, 128, 128);
  const matcap = new T.CanvasTexture(sphere); matcap.colorSpace = T.SRGBColorSpace;
  const gold = new T.MeshMatcapMaterial({ matcap, transparent: true });
  frame.add(new T.Mesh(frameGeo, gold));
  world.add(frame);
  const curtain = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, fog: false }));
  curtain.renderOrder = 50;
  world.add(curtain);

  return {
    // Anchor the canvas a little in front of the camera pose Sorolla painted from.
    anchor(position, quaternion, alpha, distance = .5) {
      const h = 2 * distance * Math.tan(alpha), w = h * aspect;
      uniforms.uRight.value.set(1, 0, 0).applyQuaternion(quaternion);
      uniforms.uUp.value.set(0, 1, 0).applyQuaternion(quaternion);
      uniforms.uFwd.value.set(0, 0, -1).applyQuaternion(quaternion);
      uniforms.uOrigin.value.copy(position).addScaledVector(uniforms.uFwd.value, distance);
      uniforms.uSize.value.set(w, h);
      frame.position.copy(uniforms.uOrigin.value).addScaledVector(uniforms.uFwd.value, .012);
      frame.quaternion.copy(quaternion); frame.scale.set(w, h, Math.min(w, h));
      curtain.position.copy(position).addScaledVector(uniforms.uFwd.value, distance + .03);
      curtain.quaternion.copy(quaternion); curtain.scale.set(h * 12, h * 12, 1);
    },
    set({ progress, fade = 1, frame: frameOpacity, curtain: curtainOpacity }) {
      uniforms.uProgress.value = progress; uniforms.uFade.value = fade;
      flakes.visible = fade > 0 && progress < 1;
      gold.opacity = frameOpacity; frame.visible = frameOpacity > .002;
      curtain.material.opacity = curtainOpacity; curtain.visible = curtainOpacity > .002;
    },
    dispose() {
      quad.dispose(); geo.dispose(); flakes.material.dispose(); frameGeo.dispose(); gold.dispose(); matcap.dispose();
      curtain.geometry.dispose(); curtain.material.dispose();
    },
  };
}
