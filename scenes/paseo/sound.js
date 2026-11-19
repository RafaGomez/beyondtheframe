// Surf and poniente synthesised with filtered noise; the envelopes follow the same swash and gusts as the picture.
export function makeSound() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return null;
  const ctx = new Context();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const seconds = 4, length = ctx.sampleRate * seconds;

  function noise(brown) {
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate), fade = ctx.sampleRate * .25;
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch); let last = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        d[i] = brown ? (last = (last + .02 * w) / 1.02) * 3.5 : w;
      }
      // Cross-fade the tail into the head so the loop has no seam.
      for (let i = 0; i < fade; i++) { const k = i / fade; d[length - fade + i] = d[length - fade + i] * (1 - k) + d[i] * k; }
    }
    return buffer;
  }
  const brown = noise(true), white = noise(false), sources = [];
  function chain(buffer, ...nodes) {
    const src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    src.playbackRate.value = .9 + Math.random() * .2;
    nodes.reduce((a, b) => a.connect(b), src).connect(master);
    src.start(ctx.currentTime + Math.random() * .05, Math.random() * seconds); sources.push(src);
    return nodes;
  }
  const filter = (type, frequency, Q = .7) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = Q; return f; };
  const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const pan = () => ctx.createStereoPanner ? ctx.createStereoPanner() : gain(1);

  const [crashFilter, crashGain, crashPan] = chain(brown, filter('lowpass', 500), gain(0), pan());
  const [, hissGain, hissPan] = chain(white, filter('bandpass', 2600, .6), gain(0), pan());
  const [, bedGain] = chain(brown, filter('lowpass', 260), gain(.2));
  const [windFilter, windGain] = chain(white, filter('bandpass', 600, .55), gain(0));
  const [whistleFilter, whistleGain] = chain(white, filter('bandpass', 1500, 9), gain(0));

  let enabled = true;
  const at = (param, value, time = .12) => param.setTargetAtTime(value, ctx.currentTime, time);
  return {
    resume() { if (ctx.state === 'suspended') ctx.resume(); },
    set enabled(on) { enabled = on; if (on) this.resume(); },
    get enabled() { return enabled; },
    update({ crash, hiss, near, pan: p, wind, presence }) {
      at(master.gain, enabled ? .9 * presence : 0, .35);
      at(crashGain.gain, crash * near * .9, .09);
      at(crashFilter.frequency, 280 + 1100 * crash);
      at(hissGain.gain, hiss * near * .16, .2);
      at(bedGain.gain, .1 + .14 * near, .5);
      if (crashPan.pan) { at(crashPan.pan, p * .7, .3); at(hissPan.pan, p * .8, .3); }
      at(windGain.gain, .025 + .2 * wind * wind, .25);
      at(windFilter.frequency, 380 + 700 * wind, .3);
      at(whistleGain.gain, Math.max(0, wind - .55) * .05, .4);
      at(whistleFilter.frequency, 1200 + 900 * wind, .5);
    },
    dispose() { sources.forEach(s => { try { s.stop(); } catch { /* already stopped */ } }); ctx.close(); },
  };
}
