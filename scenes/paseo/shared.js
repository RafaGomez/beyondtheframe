import * as T from 'three';

// Valencia, verano de 1909. El mar queda al este (−Z) y sopla el poniente, de tierra hacia el mar.
export const WIND = new T.Vector3(.17, 0, -.985).normalize();
export const SUN = new T.Vector3(.114, .743, -.656).normalize();
export const SWELL = { period: 7.6, length: 15 };

const clamp01 = x => Math.min(1, Math.max(0, x));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;

// The same terrain is evaluated in JS (walking, placing things) and in GLSL (water depth, wet sand).
export function ground(x, z) {
  return Math.max(z * mix(.06, .042, smoothstep(-3, 3, z)), -3.2) + 1.1 * smoothstep(9, 22, z)
    + smoothstep(12, 24, z) * (.45 * Math.sin(.19 * x + .8 * Math.sin(.07 * z)) * Math.sin(.23 * z + .4) + .25 * Math.sin(.41 * x + 1.3) * Math.cos(.31 * z))
    + .05 * Math.sin(.13 * x + .2 * z) * smoothstep(2, 6, z);
}
// Integer values of the phase are the fronts of the breakers; at the shoreline it drives the swash.
export const surfPhase = (x, z, t) => t / SWELL.period - (z + 3 * Math.sin(x * .02)) / SWELL.length - x * .004;
export const setAmp = n => .8 + .2 * Math.sin(n * 2.39) + .12 * Math.sin(n * 5.71);
export function swash(x, t) {
  const c = surfPhase(x, 0, t), u = c - Math.floor(c);
  return -.06 + .16 * setAmp(Math.floor(c)) * smoothstep(0, .18, u) * (1 - smoothstep(.16, .96, u));
}
export const gust = t => .64 + .17 * Math.sin(t * .47) + .13 * Math.sin(t * 1.13 + 1.7) * Math.sin(t * .23) + .06 * Math.sin(t * 2.9 + .4);

const f = n => Number(n).toFixed(5);
export const vec3 = v => `vec3(${f(v.x ?? v.r)},${f(v.y ?? v.g)},${f(v.z ?? v.b)})`;
// sRGB hex → linear colour literal for shaders.
export const rgb = hex => vec3(new T.Color(hex));

export const GLSL = /* glsl */`
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return s;}
float strokes(vec2 p,float ang,vec2 sc){vec2 d=vec2(cos(ang),sin(ang));return vnoise(vec2(dot(p,d)*sc.x,dot(p,vec2(-d.y,d.x))*sc.y));}
float ground(vec2 p){float x=p.x,z=p.y;
  return max(z*mix(.06,.042,smoothstep(-3.,3.,z)),-3.2)+1.1*smoothstep(9.,22.,z)
    +smoothstep(12.,24.,z)*(.45*sin(.19*x+.8*sin(.07*z))*sin(.23*z+.4)+.25*sin(.41*x+1.3)*cos(.31*z))
    +.05*sin(.13*x+.2*z)*smoothstep(2.,6.,z);}
float surfPhase(vec2 p,float t){return t/${f(SWELL.period)}-(p.y+3.*sin(p.x*.02))/${f(SWELL.length)}-p.x*.004;}
float setAmp(float n){return .8+.2*sin(n*2.39)+.12*sin(n*5.71);}
float swash(float x,float t){float c=surfPhase(vec2(x,0.),t),u=fract(c);return -.06+.16*setAmp(floor(c))*smoothstep(0.,.18,u)*(1.-smoothstep(.16,.96,u));}
`;

// Lighting shared by the hand-written shaders so they sit in the same exposure as the standard materials.
export const LIGHT = {
  sun: new T.Color('#fff0d6'), sunIntensity: 3.4,
  sky: new T.Color('#93b4f0'), ground: new T.Color('#d6a66c'), hemiIntensity: 1.45,
  haze: new T.Color('#e1e8ef'), zenith: new T.Color('#5b8ad4'),
  fog: [320, 3600],
};
