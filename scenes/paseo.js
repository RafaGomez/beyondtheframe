import * as T from 'three';
import { buildBeach } from './paseo/beach.js';
import { buildFigures } from './paseo/figures.js';
import { buildProps } from './paseo/props.js';
import { buildCanvas } from './paseo/canvas.js';
import { makePainter } from './paseo/painter.js';
import { makeSound } from './paseo/sound.js';
import { SUN, ground, gust, surfPhase, setAmp, swash, smoothstep, mix } from './paseo/shared.js';
import './paseo/shore.css';

const IMAGE = './assets/paseo.webp', ASPECT = 980 / 993;
// Where Sorolla stood: a little raised, looking down the shore with the sea on his left.
const ALPHA = 21 * Math.PI / 180;
const PAINTER = { x: -1.82, z: 5.07, height: 2.06, yaw: -55 * Math.PI / 180, pitch: -30 * Math.PI / 180 };
const FEET = { clotilde: [265, 760], maria: [620, 775] };
const EYE = 1.65, STROLL = .62;
// Seconds into the visit: the world opens around the frame, the poniente takes the paint, the camera steps down.
const TIMELINE = { curtain: [.5, 2.1], blow: [2.4, 6.6], life: [2.9, 4.8], crane: [5, 11.5], frame: [5.2, 7.4] };

const clamp01 = x => Math.min(1, Math.max(0, x));
const ease = x => x * x * x * (x * (x * 6 - 15) + 10);

export async function open(onExit) {
  const renderer = new T.WebGLRenderer({ powerPreference: 'high-performance' });
  let painting;
  try { painting = await new T.TextureLoader().loadAsync(IMAGE); } catch (error) { renderer.dispose(); throw error; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const lit = painting.clone(); lit.colorSpace = T.SRGBColorSpace; lit.anisotropy = 8; lit.needsUpdate = true;

  const world = new T.Scene(), overlay = new T.Scene();
  const camera = new T.PerspectiveCamera(50, 1, .1, 5000);
  camera.rotation.order = 'YXZ';
  const U = { uTime: { value: 0 }, uGust: { value: .8 }, uSunView: { value: new T.Vector3() } };

  // The painter's pose, and the sand under the painted feet of Clotilde and María.
  const P0 = new T.Vector3(PAINTER.x, ground(PAINTER.x, PAINTER.z) + PAINTER.height, PAINTER.z);
  const Q0 = new T.Quaternion().setFromEuler(new T.Euler(PAINTER.pitch, PAINTER.yaw, 0, 'YXZ'));
  const onSand = ([px, py]) => {
    const d = new T.Vector3((px / 980 - .5) * 2 * Math.tan(ALPHA) * ASPECT, (.5 - py / 993) * 2 * Math.tan(ALPHA), -1).applyQuaternion(Q0).normalize();
    let lo = 0, hi = 40;
    for (let i = 0; i < 48; i++) { const t = (lo + hi) / 2, p = P0.clone().addScaledVector(d, t); if (p.y > ground(p.x, p.z)) lo = t; else hi = t; }
    return P0.clone().addScaledVector(d, lo);
  };
  const fwd0 = new T.Vector3(0, 0, -1).applyQuaternion(Q0).setY(0).normalize(), right0 = new T.Vector3(1, 0, 0).applyQuaternion(Q0).setY(0).normalize();
  const start = { clotilde: onSand(FEET.clotilde), maria: onSand(FEET.maria) };
  // The crane ends a few metres ahead of them on the shore, so they come walking towards the visitor.
  const END = start.clotilde.clone().add(start.maria).multiplyScalar(.5).add(new T.Vector3(-9.5, 0, 3.2));
  END.y = ground(END.x, END.z) + EYE;
  const easel = P0.clone().addScaledVector(right0, 1.15).addScaledVector(fwd0, -.4);
  const facing = P0.clone().addScaledVector(fwd0, -.8);

  let beach, figures, props, canvas, painter;
  try {
    beach = buildBeach(world, U);
    figures = buildFigures(world, U, start);
    props = buildProps(world, { painting: lit, easel: { x: easel.x, z: easel.z, yaw: Math.atan2(facing.x - easel.x, facing.z - easel.z) } });
    canvas = buildCanvas(world, overlay, painting, ASPECT);
    canvas.anchor(P0, Q0, ALPHA);
    painter = makePainter(renderer);
  } catch (error) {
    [beach, figures, props, canvas, painter].forEach(part => part?.dispose());
    painting.dispose(); lit.dispose(); renderer.dispose();
    throw error;
  }
  const sound = makeSound();
  sound?.resume();

  const host = document.createElement('section');
  host.className = 'scene shore';
  host.dataset.mode = 'intro';
  host.setAttribute('aria-label', 'Paseo a orillas del mar');
  host.innerHTML = `<header class="shore-bar"><button data-back>← Galería</button><span>Paseo a orillas del mar<small>JOAQUÍN SOROLLA · 1909</small></span>`
    + `<button data-sound aria-pressed="true">Sonido</button><button data-wind aria-pressed="true">Poniente fuerte</button><button data-frame disabled>Volver al cuadro</button></header>`
    + `<div class="shore-hud"><div class="walk-pad" aria-label="Caminar"><button data-key="KeyW" aria-label="Avanzar">↑</button><button data-key="KeyA" aria-label="Paso a la izquierda">←</button><button data-key="KeyS" aria-label="Retroceder">↓</button><button data-key="KeyD" aria-label="Paso a la derecha">→</button></div>`
    + `<span class="walk-hint">WASD o flechas para pasear · Mayús para correr · Arrastra para mirar</span></div><p class="shore-skip" aria-hidden="true">PULSA UNA TECLA O ARRASTRA PARA ADELANTAR</p>`;
  host.prepend(renderer.domElement);
  (document.fullscreenElement || document.body).append(host);
  const el = renderer.domElement, $ = s => host.querySelector(s);
  const events = new AbortController(), listen = (target, type, fn, options) => target.addEventListener(type, fn, { signal: events.signal, ...options });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- State -------------------------------------------------------------
  let mode = 'intro', clock = 0, warp = reduced ? 2.5 : 1, back = 0, reset = false;
  let simT = 0, life = 0, wind = 1, windTarget = 1, yaw = PAINTER.yaw, pitch = PAINTER.pitch, bob = 0, introFov = 46, walkFov = 58;
  const keys = new Set(), from = { pos: new T.Vector3(), quat: new T.Quaternion(), fov: 58 };
  const target = new T.Vector3(), look = new T.Matrix4(), lookQ = new T.Quaternion(), euler = new T.Euler(0, 0, 0, 'YXZ'), side = new T.Vector3();
  const setMode = m => { mode = m; host.dataset.mode = m === 'free' ? 'free' : 'intro'; $('[data-frame]').disabled = m !== 'free'; };

  function hurry() {
    sound?.resume();
    if (mode !== 'intro') return;
    clock = Math.max(clock, TIMELINE.blow[0]); warp = 4;
  }
  function freeze() { euler.setFromQuaternion(camera.quaternion, 'YXZ'); yaw = euler.y; pitch = euler.x; warp = reduced ? 2.5 : 1; setMode('free'); }

  function choreograph() {
    const p = k => smoothstep(TIMELINE[k][0], TIMELINE[k][1], clock);
    const progress = clamp01((clock - TIMELINE.blow[0]) / (TIMELINE.blow[1] - TIMELINE.blow[0]));
    life = p('life');
    canvas.set({ progress, frame: 1 - p('frame'), curtain: 1 - p('curtain') });
    const k = ease(clamp01((clock - TIMELINE.crane[0]) / (TIMELINE.crane[1] - TIMELINE.crane[0])));
    camera.position.lerpVectors(P0, END, k);
    camera.position.y += Math.sin(Math.PI * k) * .25;
    figures.focus(target); target.y = ground(target.x, target.z) + 1.1;
    lookQ.setFromRotationMatrix(look.lookAt(camera.position, target, T.Object3D.DEFAULT_UP));
    camera.quaternion.slerpQuaternions(Q0, lookQ, k);
    camera.fov = mix(introFov, walkFov, k);
    if (clock >= TIMELINE.crane[1]) freeze();
    return 1 - progress;
  }
  function returning(dt) {
    back += dt;
    const k = ease(clamp01(back / 2.4));
    camera.position.lerpVectors(from.pos, P0, k);
    camera.position.y += Math.sin(Math.PI * k) * .4;
    camera.quaternion.slerpQuaternions(from.quat, Q0, k);
    camera.fov = mix(from.fov, introFov, k);
    life = 1 - smoothstep(.6, 2.2, back);
    const progress = 1 - clamp01((back - 1.2) / 3.2);
    canvas.set({ progress, frame: smoothstep(2.6, 3.6, back), curtain: 0 });
    if (back > 4.5 && !reset) { figures.reset(); reset = true; }
    if (back > 5.6) { setMode('intro'); clock = TIMELINE.blow[0]; }
    return 1 - progress;
  }
  function startReturn() {
    if (mode !== 'free') return;
    from.pos.copy(camera.position); from.quat.copy(camera.quaternion); from.fov = camera.fov;
    back = 0; reset = false; keys.clear(); setMode('return');
  }

  const active = (a, b) => Number(keys.has(a) || keys.has(b));
  function allowed(x, z) {
    if (Math.abs(x) > 90 || z < -3.2 || z > 45) return false;
    if (Math.hypot(x - easel.x, z - easel.z) < .75) return false;
    return !figures.obstacles().some(p => Math.hypot(x - p.x, z - p.z) < .6);
  }
  function walk(dt) {
    life = 1;
    const strafe = active('KeyD', 'ArrowRight') - active('KeyA', 'ArrowLeft'), forward = active('KeyW', 'ArrowUp') - active('KeyS', 'ArrowDown');
    const pos = camera.position, wet = ground(pos.x, pos.z) < swash(pos.x, simT) - .02;
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.2 : 2) * (wet ? .55 : 1);
    const moving = strafe || forward, step = speed * dt / Math.max(1, Math.hypot(strafe, forward));
    const x = pos.x + (Math.cos(yaw) * strafe - Math.sin(yaw) * forward) * step, z = pos.z - (Math.sin(yaw) * strafe + Math.cos(yaw) * forward) * step;
    if (allowed(x, pos.z)) pos.x = x;
    if (allowed(pos.x, z)) pos.z = z;
    if (moving && !reduced) bob += dt * speed * 3.4;
    const height = ground(pos.x, pos.z) + EYE + (reduced ? 0 : Math.sin(bob) * .025);
    pos.y += (height - pos.y) * Math.min(1, dt * 8);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    camera.fov += (walkFov - camera.fov) * Math.min(1, dt * 3);
    return 0;
  }

  // ---- Input -------------------------------------------------------------
  let drag = null;
  listen(el, 'pointerdown', e => { hurry(); if (drag) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); });
  listen(el, 'pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    if (mode === 'free') { yaw -= (e.clientX - drag.x) * .004; pitch = T.MathUtils.clamp(pitch - (e.clientY - drag.y) * .004, -1.35, 1.35); }
    drag.x = e.clientX; drag.y = e.clientY;
  });
  listen(el, 'lostpointercapture', () => { drag = null; });
  const codes = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight']);
  listen(window, 'keydown', e => {
    if (e.key === 'Escape') { close(); return; }
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
    hurry();
    if (codes.has(e.code) && mode === 'free') { if (!e.code.startsWith('Shift')) e.preventDefault(); keys.add(e.code); }
  });
  listen(window, 'keyup', e => keys.delete(e.code));
  listen(window, 'blur', () => keys.clear());
  for (const button of host.querySelectorAll('[data-key]')) {
    listen(button, 'pointerdown', e => { e.preventDefault(); hurry(); if (mode !== 'free') return; button.setPointerCapture(e.pointerId); keys.add(button.dataset.key); });
    listen(button, 'lostpointercapture', () => keys.delete(button.dataset.key));
  }
  const soundButton = $('[data-sound]'), windButton = $('[data-wind]');
  if (!sound) soundButton.hidden = true;
  listen(soundButton, 'click', () => { sound.enabled = !sound.enabled; soundButton.setAttribute('aria-pressed', String(sound.enabled)); });
  listen(windButton, 'click', () => {
    const strong = windTarget < 1; windTarget = strong ? 1 : .38;
    windButton.setAttribute('aria-pressed', String(strong)); windButton.textContent = strong ? 'Poniente fuerte' : 'Brisa suave';
  });
  listen($('[data-frame]'), 'click', startReturn);
  const backButton = $('[data-back]');
  listen(backButton, 'click', close);

  // ---- Frame loop --------------------------------------------------------
  const levels = [[1, 3], [.8, 3], [.67, 2], [.5, 2]];
  let quality = 0, frames = 0, spent = 0, last = performance.now();
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    painter.setSize(size.x, size.y);
    camera.aspect = w / h;
    const tanA = Math.tan(ALPHA);
    introFov = 2 * Math.atan(Math.max(tanA, tanA * ASPECT / camera.aspect) * 1.17) * 180 / Math.PI;
    walkFov = camera.aspect < .8 ? 70 : 58;
  }
  resize();
  listen(window, 'resize', resize);
  painter.setQuality(...levels[0]);
  painter.exposure = 1.0;

  renderer.setAnimationLoop(now => {
    const real = Math.min(.1, Math.max(0, (now - last) / 1000)), dt = Math.min(.05, real);
    last = now;
    let cover;
    if (mode === 'intro') { clock += real * warp; cover = choreograph(); }
    else if (mode === 'return') cover = returning(real);
    else cover = walk(dt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    simT += dt * life;
    wind += (windTarget - wind) * Math.min(1, dt * 1.5);
    U.uTime.value = simT;
    U.uGust.value = gust(simT) * wind;
    U.uSunView.value.copy(SUN).transformDirection(camera.matrixWorldInverse);
    figures.update(simT, dt, life, U.uGust.value, STROLL);
    props.update(simT);
    beach.update(camera, dt * life, (2.5 + 4 * U.uGust.value) * wind, painter.scale * renderer.getPixelRatio() * host.clientHeight / 900);

    if (sound) {
      const c = surfPhase(camera.position.x, 0, simT), u = c - Math.floor(c);
      side.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const blow = mode === 'free' ? 0 : Math.sin(Math.PI * clamp01(1 - cover)) * (1 - cover);
      sound.update({
        crash: setAmp(Math.floor(c)) * smoothstep(0, .05, u) * (1 - smoothstep(.05, .45, u)),
        hiss: smoothstep(.25, .45, u) * (1 - smoothstep(.7, .97, u)),
        near: 1 / (1 + Math.max(0, camera.position.z - 1) / 9),
        pan: -side.z, wind: Math.min(1.4, U.uGust.value + blow * .9), presence: .15 + .85 * (1 - cover),
      });
    }

    painter.render(world, camera);
    renderer.autoClear = false;
    renderer.render(overlay, camera);
    renderer.autoClear = true;

    // Step the painterly pass down on slower GPUs.
    if (++frames > 45) { spent += real; if (frames > 105) { if (spent / 60 > 1 / 38 && quality < levels.length - 1) painter.setQuality(...levels[++quality]); frames = 45; spent = 0; } }
  });
  backButton.focus();

  function close() {
    events.abort();
    renderer.setAnimationLoop(null);
    [beach, figures, props, canvas, painter].forEach(part => part.dispose());
    sound?.dispose();
    painting.dispose(); lit.dispose(); renderer.dispose();
    host.remove();
    onExit();
    document.querySelector('#enter')?.focus();
  }
}
