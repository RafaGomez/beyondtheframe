import * as T from 'three';
import { walkingControls, walkPad } from './walk.js';
import { buildCypress } from './starry-brush/cypress.js';
import { buildSky } from './starry-brush/sky.js';
import { buildLandscape } from './starry-brush/landscape.js';
import { buildVillage } from './starry-brush/village.js';
import './starry-brush/scene.css';

export async function open(onExit) {
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const world = new T.Scene();
  world.background = new T.Color('#071020');
  world.fog = new T.FogExp2('#0c1830', 0.012);

  const camera = new T.PerspectiveCamera(54, 1, 0.05, 320);
  camera.rotation.order = 'YXZ';

  const host = document.createElement('section');
  host.className = 'scene starry-brush';
  host.setAttribute('aria-label', 'La noche estrellada (Brochazos)');
  host.innerHTML = `
    <header class="starry-bar">
      <button data-back>← Galería</button>
      <div class="starry-title">
        <span>La noche estrellada</span>
        <small>Vincent van Gogh · 1889 · Estilo brochazos</small>
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

  // Build the complete 3D Brushstroke World
  const landscape = buildLandscape(world, obstacles);
  const village = buildVillage(world);
  const cypress = buildCypress(world, obstacles);
  const sky = buildSky(world);

  // Lighting
  // 1. Moonlight directional light casting soft shadows
  const moonLight = new T.DirectionalLight('#ffe8a8', 2.6);
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

  // 2. Front fill light illuminating the cypress, terrace and village
  const fillLight = new T.DirectionalLight('#8aa8d8', 1.85);
  fillLight.position.set(-2.0, 6.0, 12.0);
  fillLight.target.position.set(0.0, 2.0, -5.0);
  world.add(fillLight, fillLight.target);

  // 3. Ground / terrace bounce light
  const groundLight = new T.DirectionalLight('#60583b', 1.1);
  groundLight.position.set(0.0, -5.0, 4.0);
  groundLight.target.position.set(0.0, 2.0, 4.0);
  world.add(groundLight, groundLight.target);

  // 4. Ambient hemisphere light (celestial azure sky + deep earthy ground)
  const ambient = new T.HemisphereLight('#88b2e8', '#25384d', 2.3);
  world.add(ambient);

  // 5. Moon PointLight (radiant golden aura)
  const moonPoint = new T.PointLight('#ffd56b', 3.4, 75, 1.2);
  moonPoint.position.set(11.8, 14.2, -25.5);
  world.add(moonPoint);

  // 6. Venus / Morning Star PointLight
  const venusPoint = new T.PointLight('#fff4c8', 2.5, 45, 1.3);
  venusPoint.position.set(-0.6, 7.1, -22.5);
  world.add(venusPoint);

  // 7. Village lamplight illumination (warm glow from glowing windows)
  const villagePoint1 = new T.PointLight('#ff9b26', 1.7, 24, 1.5);
  villagePoint1.position.set(2.8, 2.2, -13.5);
  world.add(villagePoint1);

  const villagePoint2 = new T.PointLight('#ff9b26', 1.5, 20, 1.5);
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
    // Terrace bounds: X in [-3.4, 3.4], Z in [3.6, 7.6]
    const inTerrace = x > -3.4 + margin && x < 3.4 - margin && z > 3.6 + margin && z < 7.6 - margin;
    if (!inTerrace) return false;
    // Avoid obstacles (cypress tree base, wild bushes)
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

  // Living celestial brushstrokes state
  let livingStrokes = true;
  const windBtn = host.querySelector('[data-wind]');
  listen(windBtn, 'click', () => {
    livingStrokes = !livingStrokes;
    windBtn.setAttribute('aria-pressed', String(livingStrokes));
    if (!livingStrokes && sky.vortexGroup) {
      sky.vortexGroup.position.set(0, 0, 0);
      sky.vortexGroup.rotation.set(0, 0, 0);
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
    if (livingStrokes && sky.vortexGroup) {
      sky.vortexGroup.position.y = Math.sin(timeSec * 0.75) * 0.14;
      sky.vortexGroup.rotation.z = Math.sin(timeSec * 0.38) * 0.032;

      // Gentle star & moon pulsation
      venusPoint.intensity = 2.3 + 0.35 * Math.sin(timeSec * 3.2);
      moonPoint.intensity = 3.4 + 0.28 * Math.sin(timeSec * 1.9);

      // Subtle sway in cypress tree tips
      if (cypress.cypressGroup) {
        cypress.cypressGroup.rotation.z = Math.sin(timeSec * 0.9) * 0.008;
      }

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
    landscape.dispose();
    village.dispose();
    cypress.dispose();
    sky.dispose();
    moonLight.dispose();
    moonLight.shadow.dispose();
    fillLight.dispose();
    groundLight.dispose();
    ambient.dispose();
    moonPoint.dispose();
    venusPoint.dispose();
    villagePoint1.dispose();
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
