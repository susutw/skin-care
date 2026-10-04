// 全部用 WebAudio 即時合成，不需要音檔
let ctx = null, master = null, muted = false;

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const setMuted = (m) => { muted = m; };
export const isMuted = () => muted;

function tone({ type = 'sine', f0, f1, dur, vol = 0.3, delay = 0 }) {
  if (muted) return;
  const c = ac(), t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur, vol = 0.2, freq = 1000, q = 1, filter = 'bandpass', delay = 0 }) {
  if (muted) return;
  const c = ac(), t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  // 濕濕黏黏的擠出聲
  squelch(vol = 1) {
    noise({ dur: 0.26, vol: 0.28 * vol, freq: 520, q: 3 });
    noise({ dur: 0.12, vol: 0.18 * vol, freq: 1500, q: 2, delay: 0.05 });
    tone({ f0: 170, f1: 65, dur: 0.2, vol: 0.22 * vol });
  },
  // 膿皰破掉的「噗」
  squirt() {
    noise({ dur: 0.16, vol: 0.4, freq: 1300, q: 1.4 });
    tone({ f0: 380, f1: 95, dur: 0.11, vol: 0.32 });
  },
  ouch() {
    tone({ type: 'square', f0: 420, f1: 180, dur: 0.22, vol: 0.12 });
    tone({ type: 'square', f0: 300, f1: 140, dur: 0.25, vol: 0.1, delay: 0.09 });
  },
  steam() { noise({ dur: 0.9, vol: 0.18, freq: 700, filter: 'lowpass' }); },
  cream() { [660, 880, 1175].forEach((f, i) => tone({ f0: f, dur: 0.2, vol: 0.14, delay: i * 0.07 })); },
  click() { tone({ f0: 880, dur: 0.05, vol: 0.1 }); },
  soft() { tone({ type: 'triangle', f0: 520, f1: 440, dur: 0.12, vol: 0.12 }); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.28, vol: 0.18, delay: i * 0.1 })); },
};

// 按住工具時的持續音，音高隨施力上升
export function holdSound(tool) {
  if (muted) return null;
  const c = ac();
  const o = c.createOscillator(), g = c.createGain();
  const base = { squeeze: 90, steam: 140, refer: 500, gel: 300 }[tool];
  o.type = tool === 'squeeze' ? 'triangle' : 'sine';
  if (tool === 'steam') o.type = 'sawtooth';
  o.frequency.value = base;
  const f = c.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 600;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.05);
  o.connect(f).connect(g).connect(master);
  o.start();
  return {
    set(k) { o.frequency.setTargetAtTime(base * (1 + k * 1.3), c.currentTime, 0.03); },
    stop() {
      g.gain.setTargetAtTime(0, c.currentTime, 0.02);
      o.stop(c.currentTime + 0.1);
    },
  };
}
