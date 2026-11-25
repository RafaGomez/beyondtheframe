// Subtle procedural Web Audio atmosphere for Guernica:
// - Hollow nocturnal room air (low band-passed pink noise)
// - Quiet electric filament hum near the sun-eye lightbulb
// - Distant dry ember crackle toward the burning right building

export function makeSound() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  let ctx;
  try {
    ctx = new Ctx();
  } catch {
    return null;
  }

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // Reusable 3-second pink noise buffer
  const sampleRate = ctx.sampleRate;
  const len = sampleRate * 3;
  const noiseBuffer = ctx.createBuffer(1, len, sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
    b6 = white * 0.115926;
  }

  // 1. Hollow room draft
  const airSrc = ctx.createBufferSource();
  airSrc.buffer = noiseBuffer;
  airSrc.loop = true;
  const airFilter = ctx.createBiquadFilter();
  airFilter.type = 'bandpass';
  airFilter.frequency.value = 145;
  airFilter.Q.value = 1.6;
  const airGain = ctx.createGain();
  airGain.gain.value = 0.22;
  airSrc.connect(airFilter).connect(airGain).connect(master);
  airSrc.start();

  // 2. Electric filament hum (gentle 100 Hz + 200 Hz harmonic)
  const humOsc1 = ctx.createOscillator();
  humOsc1.type = 'sine';
  humOsc1.frequency.value = 100;
  const humOsc2 = ctx.createOscillator();
  humOsc2.type = 'triangle';
  humOsc2.frequency.value = 200;
  const humFilter = ctx.createBiquadFilter();
  humFilter.type = 'lowpass';
  humFilter.frequency.value = 260;
  const humGain = ctx.createGain();
  humGain.gain.value = 0.014;
  humOsc1.connect(humFilter);
  humOsc2.connect(humFilter);
  humFilter.connect(humGain).connect(master);
  humOsc1.start();
  humOsc2.start();

  // 3. Distant ember rumble on the right side
  const fireSrc = ctx.createBufferSource();
  fireSrc.buffer = noiseBuffer;
  fireSrc.loop = true;
  const fireFilter = ctx.createBiquadFilter();
  fireFilter.type = 'bandpass';
  fireFilter.frequency.value = 420;
  fireFilter.Q.value = 0.9;
  const fireGain = ctx.createGain();
  fireGain.gain.value = 0.04;
  const firePan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (firePan) {
    firePan.pan.value = 0.55;
    fireSrc.connect(fireFilter).connect(fireGain).connect(firePan).connect(master);
  } else {
    fireSrc.connect(fireFilter).connect(fireGain).connect(master);
  }
  fireSrc.start();

  let enabled = false;
  let disposed = false;

  return {
    get enabled() {
      return enabled;
    },
    set enabled(val) {
      enabled = Boolean(val);
      if (disposed) return;
      if (enabled && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      master.gain.setTargetAtTime(enabled ? 0.42 : 0, ctx.currentTime, 0.35);
    },
    update(camPos, rightX) {
      if (disposed || !enabled) return;
      const now = ctx.currentTime;
      // Proximity to overhead bulb (-1.05, 3.5, -0.3)
      const dBulb = Math.hypot(camPos.x + 1.05, camPos.z + 0.3);
      const bulbProximity = 1 / (1 + dBulb * 0.45);
      humGain.gain.setTargetAtTime(0.008 + bulbProximity * 0.022, now, 0.15);

      // Proximity and stereo direction to the burning tower (+3.5, -1.2)
      const dx = 3.5 - camPos.x;
      const dz = -1.2 - camPos.z;
      const dFire = Math.hypot(dx, dz);
      const fireProximity = 1 / (1 + dFire * 0.32);
      fireGain.gain.setTargetAtTime(0.025 + fireProximity * 0.14, now, 0.15);
      if (firePan) {
        const pan = Math.max(-0.9, Math.min(0.9, (dx * rightX) / Math.max(1.2, dFire)));
        firePan.pan.setTargetAtTime(pan, now, 0.15);
      }
    },
    dispose() {
      disposed = true;
      try {
        airSrc.stop();
        fireSrc.stop();
        humOsc1.stop();
        humOsc2.stop();
      } catch {
        // ignore
      }
      ctx.close().catch(() => {});
    },
  };
}
