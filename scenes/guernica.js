import * as T from 'three';
import { walkingControls, walkPad } from './walk.js';
import { createPalette } from './guernica/textures.js';
import { buildArchitecture } from './guernica/architecture.js';
import { buildLeftFigures } from './guernica/figuresLeft.js';
import { buildCenterFigures } from './guernica/figuresCenter.js';
import { buildRightFigures } from './guernica/figuresRight.js';
import { buildAtmosphere } from './guernica/atmosphere.js';
import { makeSound } from './guernica/sound.js';
import './guernica/scene.css';

// Mural frame reference dimensions in world space (8.8 m × 4.0 m, matching Guernica's 2.20 ratio)
const MURAL_HALF_W = 4.55;
const MURAL_HALF_H = 2.08;
const MURAL_CENTER_Y = 1.98;
const EYE_HEIGHT = 1.85;

export async function open(onExit) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const world = new T.Scene();
  world.background = new T.Color('#111212');
  world.fog = new T.FogExp2('#141515', 0.042);

  const camera = new T.PerspectiveCamera(48, 1, 0.08, 60);
  camera.rotation.order = 'YXZ';

  const host = document.createElement('section');
  host.className = 'scene guernica';
  host.setAttribute('aria-label', 'Guernica');
  host.innerHTML = `
    <header class="guernica-bar">
      <button data-back>← Galería</button>
      <div class="guernica-title">
        <span>Guernica</span>
        <small>Pablo Picasso · 1937</small>
      </div>
      <div class="guernica-actions">
        <button data-light aria-pressed="false" title="Alternar entre luz teatral dramática y luz clara de museo">Luz de estudio</button>
        <button data-sound aria-pressed="false" title="Activar paisaje sonoro ambiental">Sonido</button>
        <button data-view>Encuadre original</button>
      </div>
    </header>
    <div class="guernica-hud">
      ${walkPad}
      <span class="guernica-hint">WASD o flechas para caminar dentro del cuadro · Arrastra para mirar · Esc para salir</span>
    </div>
  `;
  host.prepend(renderer.domElement);

  const events = new AbortController();
  const listen = (target, type, fn) => target.addEventListener(type, fn, { signal: events.signal });
  const obstacles = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false;

  let palette, arch, leftFigs, centerFigs, rightFigs, atmosphere, sound;
  try {
    palette = createPalette();
    arch = buildArchitecture(world, palette.mats, obstacles);
    leftFigs = buildLeftFigures(world, palette.mats, obstacles);
    centerFigs = buildCenterFigures(world, palette.mats, obstacles);
    rightFigs = buildRightFigures(world, palette.mats, obstacles);
    atmosphere = buildAtmosphere(world);
    sound = makeSound();
  } catch (error) {
    [leftFigs, centerFigs, rightFigs, arch, atmosphere, palette, sound].forEach(p => p?.dispose?.());
    renderer.dispose();
    throw error;
  }

  // ---- Original Mural Framing Calibration --------------------------------
  const entryPos = new T.Vector3();
  const entryEuler = new T.Euler(0, 0, 0, 'YXZ');
  let flyState = null;

  function computeEntryPose() {
    const aspect = Math.max(0.45, camera.aspect);
    const vFovRad = T.MathUtils.degToRad(camera.fov);
    const tanV = Math.tan(vFovRad * 0.5);
    const tanH = tanV * aspect;

    // Fit full panoramic mural width & height gracefully into the viewport
    const distW = MURAL_HALF_W / tanH;
    const distH = MURAL_HALF_H / tanV;
    const dist = Math.min(7.8, Math.max(4.75, Math.max(distW, distH) * 1.04));

    entryPos.set(0, MURAL_CENTER_Y, dist);
    entryEuler.set(-0.015, 0, 0, 'YXZ');
  }

  function snapToOriginalView() {
    computeEntryPose();
    flyState = null;
    camera.position.copy(entryPos);
    camera.rotation.copy(entryEuler);
  }

  function flyToOriginalView() {
    computeEntryPose();
    if (reducedMotion) {
      snapToOriginalView();
      return;
    }
    flyState = {
      t: 0,
      dur: 1.05,
      fromPos: camera.position.clone(),
      fromQuat: camera.quaternion.clone(),
      toQuat: new T.Quaternion().setFromEuler(entryEuler),
    };
  }

  // Walkable space inside the cubist mural room (allows crossing inside & around the sculptures)
  function allowed(x, z) {
    if (flyState) flyState = null; // user walking cancels return glide immediately
    const margin = 0.24;
    if (x < -4.45 + margin || x > 4.45 - margin || z < -3.35 + margin || z > 5.85) return false;
    return obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.radius + margin);
  }

  const parent = document.fullscreenElement || document.body;
  parent.append(host);

  const walk = walkingControls(host, camera, allowed, events.signal);

  function resize() {
    const atEntry = !flyState && camera.position.distanceTo(entryPos) < 0.02;
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.85 ? 58 : 48;
    camera.updateProjectionMatrix();
    if (atEntry) snapToOriginalView();
  }
  resize();
  snapToOriginalView();
  listen(window, 'resize', resize);

  // Cancel return glide if user grabs the view
  listen(renderer.domElement, 'pointerdown', () => {
    flyState = null;
  });

  // ---- HUD Controls ------------------------------------------------------
  const backBtn = host.querySelector('[data-back]');
  const viewBtn = host.querySelector('[data-view]');
  const lightBtn = host.querySelector('[data-light]');
  const soundBtn = host.querySelector('[data-sound]');

  let studyMode = false;
  listen(lightBtn, 'click', () => {
    studyMode = !studyMode;
    atmosphere.setStudyMode(studyMode);
    lightBtn.setAttribute('aria-pressed', String(studyMode));
    world.fog.density = studyMode ? 0.018 : 0.042;
  });

  if (!sound) {
    soundBtn.hidden = true;
  } else {
    listen(soundBtn, 'click', () => {
      sound.enabled = !sound.enabled;
      soundBtn.setAttribute('aria-pressed', String(sound.enabled));
    });
  }

  listen(viewBtn, 'click', flyToOriginalView);
  listen(backBtn, 'click', close);
  listen(window, 'keydown', event => {
    if (event.key === 'Escape') close();
  });
  listen(renderer.domElement, 'webglcontextrestored', () => {
    renderer.shadowMap.needsUpdate = true;
  });

  backBtn.focus();

  // ---- Render Loop -------------------------------------------------------
  const rightVec = new T.Vector3();
  const tempEuler = new T.Euler(0, 0, 0, 'YXZ');
  let previous = performance.now();

  renderer.setAnimationLoop(now => {
    const dt = T.MathUtils.clamp((now - previous) / 1000, 0, 0.06);
    previous = now;
    const t = now * 0.001;

    if (flyState) {
      flyState.t += dt;
      const u = Math.min(1, flyState.t / flyState.dur);
      const k = u * u * (3 - 2 * u);
      camera.position.lerpVectors(flyState.fromPos, entryPos, k);
      camera.quaternion.slerpQuaternions(flyState.fromQuat, flyState.toQuat, k);
      if (u >= 1) {
        tempEuler.setFromQuaternion(camera.quaternion, 'YXZ');
        camera.rotation.copy(tempEuler);
        flyState = null;
      }
    } else {
      walk(dt);
      // Gently lower eye height slightly as visitor walks deeper inside the mural
      const insideFactor = T.MathUtils.smoothstep(camera.position.z, 4.2, 1.5);
      const targetY = T.MathUtils.lerp(MURAL_CENTER_Y, EYE_HEIGHT, insideFactor);
      camera.position.y += (targetY - camera.position.y) * Math.min(1, dt * 4);
    }

    if (!reducedMotion) {
      arch.update(t);
      leftFigs.update(t);
      centerFigs.update(t);
      rightFigs.update(t);
    }
    atmosphere.update(t, dt, !reducedMotion);

    if (sound?.enabled) {
      rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
      sound.update(camera.position, rightVec.x);
    }

    renderer.render(world, camera);
  });

  function dispose() {
    events.abort();
    renderer.setAnimationLoop(null);
    leftFigs.dispose();
    centerFigs.dispose();
    rightFigs.dispose();
    arch.dispose();
    atmosphere.dispose();
    palette.dispose();
    sound?.dispose();
    renderer.dispose();
    host.remove();
  }

  function close() {
    if (closed) return;
    closed = true;
    dispose();
    onExit();
    document.querySelector('#enter')?.focus();
  }
}
