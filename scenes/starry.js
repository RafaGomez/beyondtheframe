import * as T from 'three';
import { walkingControls, walkPad } from './walk.js';
import { VoxelWorld } from './starry/voxelWorld.js';
import { buildCypress } from './starry/cypress.js';
import { buildVillage } from './starry/village.js';
import { buildLandscape } from './starry/landscape.js';
import { buildSky } from './starry/sky.js';
import './starry/scene.css';

export async function open(onExit) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const world = new T.Scene();
  world.background = new T.Color('#070e1c');
  world.fog = new T.FogExp2('#0c1830', 0.013);

  const camera = new T.PerspectiveCamera(54, 1, 0.05, 320);
  camera.rotation.order = 'YXZ';

  const host = document.createElement('section');
  host.className = 'scene starry';
  host.setAttribute('aria-label', 'La noche estrellada');
  host.innerHTML = `
    <header class="starry-bar">
      <button data-back>← Galería</button>
      <div class="starry-title">
        <span>La noche estrellada</span>
        <small>Vincent van Gogh · 1889</small>
      </div>
      <div class="starry-actions">
        <button data-wind aria-pressed="true" title="Animación de corrientes celestes">Pinceladas vivas</button>
        <button data-view>Encuadre original</button>
      </div>
    </header>
    <div class="starry-hud">
      ${walkPad}
      <span class="starry-hint">WASD o flechas para caminar · Arrastra para mirar</span>
    </div>
  `;
  host.prepend(renderer.domElement);

  const events = new AbortController();
  const listen = (target, event, fn) => target.addEventListener(event, fn, { signal: events.signal });
  const obstacles = [];
  let closed = false;

  // Build the complete Voxel World
  const voxelWorld = new VoxelWorld(0.14);
  buildLandscape(voxelWorld);
  buildVillage(voxelWorld, obstacles);
  buildCypress(voxelWorld, obstacles);
  buildSky(voxelWorld);
  const voxelMeshes = voxelWorld.build(world);

  // Lighting
  // 1. Moonlight (casting directional shadows from upper right)
  const moonLight = new T.DirectionalLight('#ffe6a3', 2.5);
  moonLight.position.set(12.0, 16.5, -20.0);
  moonLight.target.position.set(0.0, 1.0, -5.0);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, {
    left: -18,
    right: 18,
    top: 16,
    bottom: -16,
    near: 1.0,
    far: 75
  });
  moonLight.shadow.bias = -0.00035;
  moonLight.shadow.normalBias = 0.025;
  world.add(moonLight, moonLight.target);

  // 2. Ambient hemisphere light (deep night sky + earthy ground)
  const ambient = new T.HemisphereLight('#628abb', '#131e33', 1.85);
  world.add(ambient);

  // 3. Moon PointLight (radiant golden aura)
  const moonPoint = new T.PointLight('#ffd56b', 3.2, 70, 1.2);
  moonPoint.position.set(11.8, 14.2, -25.5);
  world.add(moonPoint);

  // 4. Venus / Morning Star PointLight
  const venusPoint = new T.PointLight('#fff2c2', 2.1, 40, 1.3);
  venusPoint.position.set(4.6, 7.0, -22.5);
  world.add(venusPoint);

  // 5. Warm village illumination (simulating lamplight from glowing windows)
  const villagePoint = new T.PointLight('#ff9b26', 1.6, 22, 1.5);
  villagePoint.position.set(3.0, 2.0, -13.5);
  world.add(villagePoint);

  const villagePoint2 = new T.PointLight('#ff9b26', 1.4, 18, 1.5);
  villagePoint2.position.set(7.5, 1.8, -15.5);
  world.add(villagePoint2);

  // Original viewpoint calibration matching Van Gogh's canvas composition
  const entryPosition = new T.Vector3();
  const entryRotation = new T.Quaternion();

  function originalView() {
    const portrait = 1 - T.MathUtils.smoothstep(camera.aspect, 0.65, 1.35);
    camera.position.set(0.0, 2.45, 6.3 + portrait * 3.5);
    camera.lookAt(0.7, 4.3, -16.0);
    entryPosition.copy(camera.position);
    entryRotation.copy(camera.quaternion);
  }

  // Walkable boundary limits on the terrace overlooking Saint-Rémy
  function allowed(x, z) {
    const margin = 0.22;
    // Terrace bounds: X in [-3.2, 3.2], Z in [3.7, 7.4]
    const inTerrace = x > -3.4 + margin && x < 3.4 - margin && z > 3.6 + margin && z < 7.6 - margin;
    if (!inTerrace) return false;
    // Avoid obstacles (cypress tree base, etc.)
    return obstacles.every(o => Math.hypot(x - o.x, z - o.z) > o.radius + margin);
  }

  // Attach scene to DOM
  const parent = document.fullscreenElement || document.body;
  parent.append(host);

  const walk = walkingControls(host, camera, allowed, events.signal);

  let redraw = true;
  function resize() {
    const atEntry = camera.position.equals(entryPosition) && camera.quaternion.equals(entryRotation);
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (atEntry) originalView();
    redraw = true;
  }
  resize();
  originalView();
  listen(window, 'resize', resize);

  // Living brushstrokes state
  let livingStrokes = true;
  const windBtn = host.querySelector('[data-wind]');
  listen(windBtn, 'click', () => {
    livingStrokes = !livingStrokes;
    windBtn.setAttribute('aria-pressed', String(livingStrokes));
    if (!livingStrokes && voxelMeshes.vortexGroup) {
      voxelMeshes.vortexGroup.position.set(0, 0, 0);
      voxelMeshes.vortexGroup.rotation.set(0, 0, 0);
    }
  });

  const backBtn = host.querySelector('[data-back]');
  listen(backBtn, 'click', close);
  listen(host.querySelector('[data-view]'), 'click', originalView);
  listen(window, 'keydown', event => {
    if (event.key === 'Escape') close();
  });
  listen(renderer.domElement, 'webglcontextrestored', () => {
    redraw = true;
    renderer.shadowMap.needsUpdate = true;
  });
  backBtn.focus();

  // Animation loop
  const previousView = new T.Matrix4();
  let previous = performance.now();

  renderer.setAnimationLoop(now => {
    const dt = T.MathUtils.clamp((now - previous) / 1000, 0, 0.06);
    previous = now;
    const timeSec = now * 0.001;

    walk(dt);
    camera.updateMatrix();

    // Subtle living celestial brushstroke animation
    if (livingStrokes && voxelMeshes.vortexGroup) {
      voxelMeshes.vortexGroup.position.y = Math.sin(timeSec * 0.8) * 0.12;
      voxelMeshes.vortexGroup.rotation.z = Math.sin(timeSec * 0.4) * 0.035;
      // Gentle star twinkle
      venusPoint.intensity = 2.1 + 0.35 * Math.sin(timeSec * 3.5);
      moonPoint.intensity = 3.2 + 0.25 * Math.sin(timeSec * 2.1);
      redraw = true;
    }

    if (redraw || !previousView.equals(camera.matrix)) {
      renderer.render(world, camera);
      previousView.copy(camera.matrix);
      redraw = false;
    }
  });

  function dispose() {
    events.abort();
    renderer.setAnimationLoop(null);
    voxelMeshes.dispose();
    moonLight.dispose();
    moonLight.shadow.dispose();
    ambient.dispose();
    moonPoint.dispose();
    venusPoint.dispose();
    villagePoint.dispose();
    villagePoint2.dispose();
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
