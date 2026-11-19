import * as T from 'three';

const VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

// Kuwahara filter over the HDR render: flat, loaded brushstrokes whose direction drifts across the canvas.
const KUWAHARA = /* glsl */`
uniform sampler2D tScene;uniform vec2 uTexel;uniform float uExposure;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
vec3 tone(vec3 x){x=min(max(x,0.),64.)*uExposure;return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float weight(vec3 v){return 1./(1e-4+pow(max(dot(v,vec3(1.)),0.),1.6));}
void main(){
  float ang=(n2(vUv*vec2(7.,5.))-.5)*2.2+.35;
  mat2 rot=mat2(cos(ang),sin(ang),-sin(ang),cos(ang));
  vec2 ax=rot*vec2(1.3,0.)*uTexel,ay=rot*vec2(0.,.75)*uTexel;
  vec3 m0=vec3(0.),m1=vec3(0.),m2=vec3(0.),m3=vec3(0.),s0=vec3(0.),s1=vec3(0.),s2=vec3(0.),s3=vec3(0.);
  for(int j=0;j<=RADIUS;j++)for(int i=0;i<=RADIUS;i++){
    vec2 a=float(i)*ax,b=float(j)*ay;vec3 c;
    c=tone(texture2D(tScene,vUv-a-b).rgb);m0+=c;s0+=c*c;
    c=tone(texture2D(tScene,vUv+a-b).rgb);m1+=c;s1+=c*c;
    c=tone(texture2D(tScene,vUv-a+b).rgb);m2+=c;s2+=c*c;
    c=tone(texture2D(tScene,vUv+a+b).rgb);m3+=c;s3+=c*c;
  }
  float n=float((RADIUS+1)*(RADIUS+1));
  m0/=n;m1/=n;m2/=n;m3/=n;
  float w0=weight(s0/n-m0*m0),w1=weight(s1/n-m1*m1),w2=weight(s2/n-m2*m2),w3=weight(s3/n-m3*m3);
  gl_FragColor=vec4((m0*w0+m1*w1+m2*w2+m3*w3)/(w0+w1+w2+w3),1.);
}`;

// Sorolla's grade (violet-blue shadows, warm whites, fuller colour), then impasto ridges and primed linen.
const FINISH = /* glsl */`
uniform sampler2D tPaint;uniform vec2 uRes;varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
void main(){
  vec3 c=texture2D(tPaint,vUv).rgb;
  float l=dot(c,vec3(.299,.587,.114));
  c=mix(vec3(l),c,1.16);
  c=mix(c,c*vec3(.86,.9,1.2),(1.-smoothstep(.08,.5,l))*.6);
  c=mix(c,c*vec3(1.06,1.01,.92),smoothstep(.45,1.,l)*.55);
  c=pow(max(c,0.),vec3(1./2.2));
  vec2 px=vUv*uRes/max(1.,uRes.y/900.);
  // Fixed stroke direction with a gentle domain warp (rotating absolute pixel coordinates would swirl).
  vec2 warp=vec2(n2(vUv*vec2(6.,4.)),n2(vUv*vec2(5.,7.)+9.))-.5;
  vec2 q=mat2(.97,.24,-.24,.97)*px+warp*90.;
  vec2 sp=vec2(q.x/26.,q.y/3.);
  float s0=n2(sp),s1=n2(sp+vec2(0.,.45));
  c*=1.+(s1-s0)*.035+(s0-.5)*.03;
  float linen=n2(px*vec2(.9,.25))*n2(px*vec2(.25,.9));
  c*=1.+(linen-.25)*.035+(h(floor(px*.5))-.5)*.015;
  vec2 v=vUv-.5;c*=1.-dot(v,v)*.4;
  gl_FragColor=vec4(c,1.);
}`;

export function makePainter(renderer) {
  const sceneRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4 });
  const paintRT = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
  const kuwahara = new T.ShaderMaterial({
    defines: { RADIUS: 3 }, uniforms: { tScene: { value: sceneRT.texture }, uTexel: { value: new T.Vector2() }, uExposure: { value: 1 } },
    vertexShader: VERTEX, fragmentShader: KUWAHARA, depthTest: false, depthWrite: false,
  });
  const finish = new T.ShaderMaterial({
    uniforms: { tPaint: { value: paintRT.texture }, uRes: { value: new T.Vector2() } },
    vertexShader: VERTEX, fragmentShader: FINISH, depthTest: false, depthWrite: false,
  });
  const quad = new T.Mesh(new T.PlaneGeometry(2, 2), kuwahara), post = new T.Scene(), flat = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  quad.frustumCulled = false; post.add(quad);
  let width = 1, height = 1, scale = 1;
  function resize() {
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    sceneRT.setSize(w, h); paintRT.setSize(w, h);
    kuwahara.uniforms.uTexel.value.set(1 / w, 1 / h);
    finish.uniforms.uRes.value.set(width, height);
  }
  return {
    get scale() { return scale; },
    setSize(w, h) { width = w; height = h; resize(); },
    setQuality(s, radius) {
      scale = s; resize();
      if (kuwahara.defines.RADIUS !== radius) { kuwahara.defines.RADIUS = radius; kuwahara.needsUpdate = true; }
    },
    set exposure(v) { kuwahara.uniforms.uExposure.value = v; },
    render(world, camera) {
      renderer.setRenderTarget(sceneRT); renderer.render(world, camera);
      quad.material = kuwahara; renderer.setRenderTarget(paintRT); renderer.render(post, flat);
      quad.material = finish; renderer.setRenderTarget(null); renderer.render(post, flat);
    },
    dispose() { sceneRT.dispose(); paintRT.dispose(); kuwahara.dispose(); finish.dispose(); quad.geometry.dispose(); },
  };
}
