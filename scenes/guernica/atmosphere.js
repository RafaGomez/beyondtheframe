import * as T from 'three';

// Dramatic monochrome lighting, volumetric lightbulb beam, oil-lamp halo, and drifting ash motes.
export function buildAtmosphere(scene) {
  const root = new T.Group();
  root.name = 'guernica-atmosphere';
  const disposables = [];

  // ---- 1. Primary Lights -------------------------------------------------
  // Ambient hemisphere (cool slate sky + charcoal floor bounce) — deep chiaroscuro in dramatic mode
  const hemi = new T.HemisphereLight('#c8cdd4', '#222424', 0.45);
  root.add(hemi);

  // Subtle front museum fill so cubist planes & newsprint ink lines remain crisp without washing out shadows
  const frontFill = new T.DirectionalLight('#ebeae4', 0.48);
  frontFill.position.set(0.4, 3.2, 6.2);
  frontFill.target.position.set(0, 1.8, -1.2);
  root.add(frontFill, frontFill.target);

  // Overhead Sun-Eye Lightbulb SpotLight casting sharp architectural shadows
  const bulbSpot = new T.SpotLight('#fff9ea', 46, 15, Math.PI * 0.44, 0.48, 1.3);
  bulbSpot.position.set(-1.24, 3.42, -0.18);
  bulbSpot.target.position.set(-0.95, 0.2, -0.45);
  bulbSpot.castShadow = true;
  bulbSpot.shadow.mapSize.set(2048, 2048);
  bulbSpot.shadow.bias = -0.0005;
  bulbSpot.shadow.normalBias = 0.025;
  bulbSpot.shadow.camera.near = 0.4;
  bulbSpot.shadow.camera.far = 12;
  root.add(bulbSpot, bulbSpot.target);

  // Local bulb omnidirectional glow
  const bulbPoint = new T.PointLight('#fff6dd', 11.5, 9.0, 1.45);
  bulbPoint.position.set(-1.24, 3.46, -0.14);
  root.add(bulbPoint);

  // Warm ivory-amber oil lamp (Quinqué) light illuminating the horse, lamp-bearer, and central wedge
  const lampLight = new T.PointLight('#ffe8bd', 16.5, 10.5, 1.4);
  lampLight.position.set(-0.2, 3.48, -0.35);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.shadow.bias = -0.0008;
  root.add(lampLight);

  // Right burning building ember glow (muted warm-ash tint keeping the monochrome dignity)
  const fireLight = new T.PointLight('#ebd3b0', 11.5, 8.0, 1.55);
  fireLight.position.set(3.45, 2.35, -0.45);
  root.add(fireLight);

  // Left subtle rim light defining the dark bull silhouette and grieving mother
  const leftRim = new T.PointLight('#dce1e8', 7.5, 8.0, 1.5);
  leftRim.position.set(-3.4, 2.55, 1.15);
  root.add(leftRim);

  // ---- 2. Volumetric Light Shaft descending from the Sun-Eye Lightbulb ---
  const beamGeo = new T.ConeGeometry(2.35, 3.55, 32, 1, true);
  beamGeo.translate(0, -1.775, 0);
  disposables.push(beamGeo);

  const beamMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    uniforms: {
      uColor: { value: new T.Color('#f7f2e2') },
      uOpacity: { value: 0.12 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float vertical = smoothstep(0.0, 0.72, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float edge = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 1.7);
        float shimmer = 0.92 + 0.08 * sin(uTime * 1.4 + vUv.x * 18.84);
        float alpha = vertical * edge * uOpacity * shimmer;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
  disposables.push(beamMat);

  const beamMesh = new T.Mesh(beamGeo, beamMat);
  beamMesh.position.set(-1.24, 3.52, -0.25);
  beamMesh.rotation.z = 0.06;
  root.add(beamMesh);

  // Subtle radial glow sprite behind the oil-lamp flame
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = 128;
  haloCanvas.height = 128;
  const hctx = haloCanvas.getContext('2d');
  const grad = hctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255, 248, 224, 0.85)');
  grad.addColorStop(0.35, 'rgba(255, 232, 185, 0.28)');
  grad.addColorStop(1, 'rgba(255, 220, 170, 0.0)');
  hctx.fillStyle = grad;
  hctx.fillRect(0, 0, 128, 128);
  const haloTex = new T.CanvasTexture(haloCanvas);
  haloTex.colorSpace = T.SRGBColorSpace;
  disposables.push(haloTex);

  const lampHaloMat = new T.SpriteMaterial({
    map: haloTex,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    opacity: 0.68,
  });
  disposables.push(lampHaloMat);
  const lampHalo = new T.Sprite(lampHaloMat);
  lampHalo.position.set(-0.2, 3.5, -0.46);
  lampHalo.scale.set(1.25, 1.25, 1);
  root.add(lampHalo);

  // ---- 3. Drifting Ash & Dust Motes in the Cubist Room -------------------
  const count = 260;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 9.2;
    positions[i * 3 + 1] = Math.random() * 3.9 + 0.08;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 7.8 + 0.5;
    speeds[i] = 0.04 + Math.random() * 0.11;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const ashGeo = new T.BufferGeometry();
  ashGeo.setAttribute('position', new T.BufferAttribute(positions, 3));
  disposables.push(ashGeo);

  const ashMat = new T.PointsMaterial({
    color: '#e8e5dc',
    size: 0.036,
    map: haloTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: T.AdditiveBlending,
    sizeAttenuation: true,
  });
  disposables.push(ashMat);

  const ashPoints = new T.Points(ashGeo, ashMat);
  root.add(ashPoints);

  scene.add(root);

  let modeBlend = 0; // 0 = dramatic theatrical Guernica lighting, 1 = bright museum study lighting
  let targetBlend = 0;

  return {
    root,
    setStudyMode(enabled) {
      targetBlend = enabled ? 1 : 0;
    },
    update(t, dt, animate = true) {
      modeBlend += (targetBlend - modeBlend) * Math.min(1, dt * 4.2);

      // Subtle electrical filament flicker + organic oil-lamp / fire breathing
      const flicker = animate
        ? 1 + Math.sin(t * 23.0) * 0.015 + (Math.sin(t * 5.7) > 0.94 ? -0.08 : 0)
        : 1;
      const lampWave = animate ? 1 + Math.sin(t * 6.2) * 0.08 + Math.sin(t * 11.4) * 0.04 : 1;
      const fireWave = animate ? 1 + Math.sin(t * 4.7) * 0.14 + Math.cos(t * 8.9) * 0.08 : 1;

      hemi.intensity = T.MathUtils.lerp(0.45, 2.0, modeBlend);
      frontFill.intensity = T.MathUtils.lerp(0.48, 1.9, modeBlend);
      bulbSpot.intensity = T.MathUtils.lerp(46, 20, modeBlend) * flicker;
      bulbPoint.intensity = T.MathUtils.lerp(11.5, 5.5, modeBlend) * flicker;
      lampLight.intensity = T.MathUtils.lerp(16.5, 8.5, modeBlend) * lampWave;
      fireLight.intensity = T.MathUtils.lerp(11.5, 5.5, modeBlend) * fireWave;

      beamMat.uniforms.uTime.value = t;
      beamMat.uniforms.uOpacity.value = T.MathUtils.lerp(0.16, 0.03, modeBlend) * flicker;
      lampHaloMat.opacity = T.MathUtils.lerp(0.68, 0.35, modeBlend) * lampWave;
      const hs = 1.2 + (lampWave - 1) * 0.65;
      lampHalo.scale.set(hs, hs, 1);

      if (animate) {
        const pos = ashGeo.attributes.position;
        for (let i = 0; i < count; i++) {
          let x = pos.getX(i);
          let y = pos.getY(i);
          let z = pos.getZ(i);
          const p = phases[i];
          y += speeds[i] * dt;
          x += Math.sin(t * 0.45 + p) * 0.035 * dt;
          z += Math.cos(t * 0.38 + p * 1.3) * 0.025 * dt;
          if (y > 4.05) {
            y = 0.06;
            x = (Math.random() - 0.5) * 9.2;
          }
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
      }
    },
    dispose() {
      disposables.forEach(d => d.dispose());
      hemi.dispose();
      frontFill.dispose();
      bulbSpot.dispose();
      bulbSpot.shadow.dispose();
      bulbPoint.dispose();
      lampLight.dispose();
      lampLight.shadow.dispose();
      fireLight.dispose();
      leftRim.dispose();
      scene.remove(root);
    },
  };
}
