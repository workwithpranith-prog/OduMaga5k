'use strict';
// ---------- audio: original chiptune loop + sound effects (Web Audio) ----------
const AU = { ctx: null, on: true, playing: false, timer: null, step: 0, next: 0 };
try {
  AU.on = localStorage.getItem('nammarun.sound') !== 'off';
} catch (e) {}
function audioInit() {
  if (!AU.ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    AU.ctx = new C();
    AU.master = AU.ctx.createGain();
    AU.master.gain.value = AU.on ? 0.9 : 0;
    AU.master.connect(AU.ctx.destination);
    AU.mus = AU.ctx.createGain();
    AU.mus.gain.value = 0.14;
    AU.mus.connect(AU.master);
    AU.fx = AU.ctx.createGain();
    AU.fx.gain.value = 0.34;
    AU.fx.connect(AU.master);
    const len = AU.ctx.sampleRate * 0.5;
    AU.noise = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate);
    const d = AU.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
}
const hz = n => {
  const m = /^([A-G])(#?)(\d)$/.exec(n);
  const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (12 * (+m[3] + 1) + b - 69) / 12);
};
function tone(type, f, t, dur, vol, dest, to) {
  const o = AU.ctx.createOscillator(),
    g = AU.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.setValueAtTime(vol, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g);
  g.connect(dest || AU.fx);
  o.start(t);
  o.stop(t + dur + 0.03);
}
function hiss(t, dur, vol, freq, type, dest) {
  const s = AU.ctx.createBufferSource();
  s.buffer = AU.noise;
  const f = AU.ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = AU.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest || AU.fx);
  s.start(t);
  s.stop(t + dur + 0.03);
}
// three original 16-bar themes, one per route (8 eighth-notes per bar; '.' = rest, '-' = hold; roots: one letter per bar, two = half bar each)
// Cubbon Park: bright city march in C major
const MEL = [
  'E5 G5 C6 G5 E5 G5 A5 G5',
  'D5 G5 B5 G5 D5 G5 B5 D6',
  'C6 B5 A5 E5 A5 B5 C6 E6',
  'D6 C6 A5 F5 A5 C6 D6 C6',
  'E6 - D6 C6 G5 - E5 G5',
  'B5 - A5 G5 D5 - G5 B5',
  'A5 C6 F6 C6 B5 D6 G6 D6',
  'E6 - - C6 G5 - C6 .',
  'A5 - E5 A5 C6 - B5 A5',
  'F5 - C5 F5 A5 - G5 F5',
  'G5 - E5 G5 C6 - D6 E6',
  'D6 - B5 G5 D6 - E6 D6',
  'C6 - A5 C6 E6 - D6 C6',
  'A5 - F5 A5 C6 - D6 C6',
  'B5 D6 B5 G5 B5 D6 G6 F6',
  'D6 - - B5 G5 - . .'
];
const ROOTS = ['C', 'G', 'A', 'F', 'C', 'G', 'FG', 'C', 'A', 'F', 'C', 'G', 'A', 'F', 'G', 'G'];
// Ulsoor Lake: happy, sunny 8-bit lakeside tune in D major, with a sparkly 16th-note arpeggio channel
const MEL_U = [
  'D5 F#5 A5 D6 A5 F#5 A5 B5',
  'C#6 - A5 E5 C#5 E5 A5 C#6',
  'D6 - B5 F#5 D6 C#6 B5 A5',
  'B5 G5 D5 G5 B5 - A5 G5',
  'F#5 A5 D6 F#6 E6 D6 C#6 D6',
  'E6 - C#6 A5 E6 F#6 E6 C#6',
  'D6 B5 G5 B5 D6 E6 D6 B5',
  'A5 - C#6 - E6 - . .',
  'B5 D6 F#6 D6 B5 D6 F#6 B6',
  'A6 - G6 D6 B5 D6 G6 F#6',
  'F#6 E6 D6 A5 F#5 A5 D6 E6',
  'C#6 - E6 C#6 A5 C#6 E6 A6',
  'G6 F#6 E6 D6 B5 D6 E6 F#6',
  'E6 D6 C#6 A5 C#6 E6 A6 G6',
  'F#6 - E6 D6 E6 - C#6 E6',
  'D6 - A5 F#5 D5 - . .'
];
const ROOTS_U = ['D', 'A', 'B', 'G', 'D', 'A', 'G', 'A', 'B', 'G', 'D', 'A', 'G', 'A', 'GA', 'D'];
const CHORDS_U = { D: ['D5', 'F#5', 'A5'], A: ['A4', 'C#5', 'E5'], B: ['B4', 'D5', 'F#5'], G: ['G4', 'B4', 'D5'] };
// NICE Road: driving A-minor highway run
const MEL_N = [
  'A5 E5 A5 C6 B5 A5 E5 A5',
  'C6 A5 F5 A5 C6 D6 C6 A5',
  'G5 E5 C5 E5 G5 C6 E6 C6',
  'D6 B5 G5 B5 D6 - B5 G5',
  'A5 - C6 E6 D6 C6 B5 A5',
  'F5 - A5 C6 B5 A5 G5 F5',
  'G5 - B5 D6 C6 B5 A5 G5',
  'G#5 - B5 E6 D6 - B5 G#5',
  'E6 - D6 C6 A5 - C6 E6',
  'F6 - E6 C6 A5 - C6 F6',
  'E6 - D6 C6 G5 - C6 E6',
  'D6 - C6 B5 G5 - B5 D6',
  'F5 A5 D6 A5 F5 A5 D6 F6',
  'E6 C6 A5 C6 E6 C6 A5 E5',
  'D6 B5 G5 B5 E6 B5 G#5 B5',
  'A5 - - E5 A4 - . .'
];
const ROOTS_N = ['A', 'F', 'C', 'G', 'A', 'F', 'G', 'E', 'A', 'F', 'C', 'G', 'D', 'A', 'GE', 'EA'];
function mkTrack(mel, roots, bpm, o) {
  const lead = [],
    bass = [];
  mel.forEach((bar, bi) => {
    bar.split(' ').forEach(tk => {
      if (tk === '-') {
        for (let k = lead.length - 1; k >= 0; k--)
          if (lead[k]) {
            lead[k].len++;
            break;
          }
        lead.push(null);
      } else lead.push(tk === '.' ? null : { f: hz(tk), len: 1 });
    });
    const r = roots[bi];
    for (let k = 0; k < 8; k++) {
      const root = r.length > 1 ? r[k < 4 ? 0 : 1] : r;
      bass.push(hz(root + (k % 2 ? '3' : '2')));
    }
  });
  const arp = [];
  if (o.chords)
    roots.forEach(r => {
      for (let k = 0; k < 8; k++) {
        const c = o.chords[r.length > 1 ? r[k < 4 ? 0 : 1] : r];
        arp.push([hz(c[(2 * k) % 3]), hz(c[(2 * k + 1) % 3])]);
      }
    });
  return { lead, bass, arp, step: 60 / bpm / 2, ...o };
}
const TRACKS = {
  cubbon: mkTrack(MEL, ROOTS, 148, { kit: 'city' }),
  ulsoor: mkTrack(MEL_U, ROOTS_U, 133, { kit: 'bounce', chords: CHORDS_U }),
  nice: mkTrack(MEL_N, ROOTS_N, 164, { kit: 'drive' })
};
let TR = TRACKS.cubbon;
function playStep(T, i, t, d) {
  const e = T.lead[i],
    S = T.step,
    b = i % 8;
  if (T.kit === 'bounce') {
    if (e) tone('square', e.f, t, e.len * S * 0.8, 0.13, d);
    const a = T.arp[i];
    tone('square', a[0] * 2, t, S * 0.3, 0.04, d);
    tone('square', a[1] * 2, t + S / 2, S * 0.3, 0.032, d);
    tone('triangle', T.bass[i], t, S * 0.6, 0.4, d);
    if (b === 0 || b === 4) tone('sine', 165, t, 0.11, 0.5, d, 45);
    if (b === 2 || b === 6) hiss(t, 0.1, 0.18, 2200, 'bandpass', d);
    if (i % 2) hiss(t, 0.03, 0.06, 8000, 'highpass', d);
    if (b === 3 || b === 7) tone('sine', 1320, t, 0.05, 0.07, d);
    return;
  }
  if (T.kit === 'drive') {
    if (e) tone('sawtooth', e.f, t, e.len * S * 0.85, 0.075, d);
    tone('square', T.bass[i], t, S * 0.7, 0.14, d);
    if (b === 0 || b === 3 || b === 4) tone('sine', 170, t, 0.12, 0.6, d, 42);
    if (b === 2 || b === 6) hiss(t, 0.13, 0.26, 1600, 'bandpass', d);
    hiss(t, 0.03, 0.09, 8000, 'highpass', d);
    if (i % 2) hiss(t + S / 2, 0.02, 0.05, 9000, 'highpass', d);
    return;
  }
  if (e) tone('square', e.f, t, e.len * S * 0.9, 0.15, d);
  tone('triangle', T.bass[i], t, S * 0.85, 0.42, d);
  if (b === 0 || b === 4) tone('sine', 160, t, 0.12, 0.55, d, 45);
  if (b === 2 || b === 6) hiss(t, 0.11, 0.22, 1800, 'bandpass', d);
  if (i % 2) hiss(t, 0.035, 0.07, 7000, 'highpass', d);
}
// one track at a time: every start gets its own bus, and stop fades that bus out so notes already queued can't overlap the next track
const music = {
  bus: null,
  start() {
    if (!AU.ctx || AU.playing) return;
    AU.playing = true;
    clearInterval(AU.timer);
    const bus = AU.ctx.createGain();
    bus.connect(AU.mus);
    music.bus = bus;
    const T = TR;
    AU.step = 0;
    AU.next = AU.ctx.currentTime + 0.06;
    AU.timer = setInterval(() => {
      const tn = AU.ctx.currentTime;
      if (AU.next < tn - 0.05) AU.next = tn + 0.05; // fell behind (busy frame, throttled tab): skip ahead, don't burst
      while (AU.next < tn + 0.15) {
        playStep(T, AU.step, AU.next, bus);
        AU.next += T.step;
        AU.step = (AU.step + 1) % T.lead.length;
      }
    }, 25);
  },
  stop() {
    AU.playing = false;
    clearInterval(AU.timer);
    AU.timer = null;
    const b = music.bus;
    music.bus = null;
    if (b && AU.ctx) {
      const t = AU.ctx.currentTime;
      try {
        b.gain.cancelScheduledValues(t);
        b.gain.setValueAtTime(1, t);
        b.gain.linearRampToValueAtTime(0, t + 0.05);
      } catch (e) {}
      setTimeout(() => {
        try {
          b.disconnect();
        } catch (e) {}
      }, 400);
    }
  },
  use(id) {
    const t = TRACKS[id] || TRACKS.cubbon;
    if (t === TR) return;
    TR = t;
    if (AU.playing) {
      this.stop();
      this.start();
    }
  }
};

const now = () => AU.ctx.currentTime;
const ok = () => AU.ctx && AU.on;
const sfx = {
  swipe(d) {
    if (!ok()) return;
    tone('square', d > 0 ? 520 : 780, now(), 0.07, 0.2, null, d > 0 ? 820 : 480);
  },
  water() {
    if (!ok()) return;
    tone('square', 988, now(), 0.06, 0.2);
    tone('square', 1319, now() + 0.06, 0.1, 0.2);
  },
  gel() {
    if (!ok()) return;
    ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((n, i) => tone('square', hz(n), now() + i * 0.045, 0.07, 0.18));
  },
  hit() {
    if (!ok()) return;
    hiss(now(), 0.22, 0.4, 900, 'lowpass');
    tone('square', 320, now(), 0.26, 0.2, null, 70);
  },
  km() {
    if (!ok()) return;
    tone('triangle', hz('G6'), now(), 0.14, 0.32);
    tone('triangle', hz('C7'), now() + 0.1, 0.28, 0.28);
  },
  beep(hi) {
    if (!ok()) return;
    tone('square', hi ? 880 : 440, now(), hi ? 0.35 : 0.14, 0.22);
  },
  fanfare() {
    if (!ok()) return;
    const t = now() + 0.05,
      q = 0.11;
    [
      ['C5', 0],
      ['E5', 1],
      ['G5', 2],
      ['C6', 3]
    ].forEach(([n, k]) => tone('square', hz(n), t + k * q, q * 0.9, 0.2));
    tone('square', hz('C6'), t + 4 * q, q * 3, 0.2);
    tone('square', hz('A5'), t + 7 * q, q * 0.9, 0.2);
    tone('square', hz('B5'), t + 8 * q, q * 0.9, 0.2);
    tone('square', hz('C6'), t + 9 * q, q * 6, 0.22);
    tone('square', hz('E6'), t + 9 * q, q * 6, 0.12);
    tone('square', hz('G6'), t + 9 * q, q * 6, 0.08);
    [
      ['C3', 0, 4],
      ['F3', 4, 3],
      ['G3', 7, 2],
      ['C3', 9, 6]
    ].forEach(([n, k, l]) => tone('triangle', hz(n), t + k * q, q * l * 0.95, 0.4));
  }
};
const soundBtn = $('soundBtn');
function paintSound() {
  const live = AU.ctx && AU.ctx.state === 'running';
  soundBtn.textContent = !AU.on ? '♪ Sound off' : live ? '♪ Sound on' : '♪ Tap for music';
  soundBtn.setAttribute('aria-pressed', String(AU.on));
}
paintSound();
soundBtn.addEventListener('click', () => {
  AU.on = !AU.on;
  try {
    localStorage.setItem('nammarun.sound', AU.on ? 'on' : 'off');
  } catch (e) {}
  if (AU.on) audioInit();
  if (AU.master) AU.master.gain.value = AU.on ? 0.9 : 0;
  if (AU.on && state !== 'done') music.start();
  if (!AU.on) music.stop();
  paintSound();
  if (AU.ctx)
    AU.ctx
      .resume()
      .then(paintSound)
      .catch(() => {});
});
// intro music: browsers unlock sound only on a completed tap/click or a key press (finger-up, not finger-down),
// so listen for those until the audio is actually running, then start the theme
const UNLOCK_EVENTS = ['pointerup', 'touchend', 'click', 'keydown'];
function unlockAudio() {
  if (!AU.on) return;
  audioInit();
  if (!AU.ctx) return;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) {}
  const go = () => {
    if (AU.ctx.state !== 'running') return;
    if (state !== 'done' && !AU.playing) music.start();
    UNLOCK_EVENTS.forEach(ev => removeEventListener(ev, unlockAudio, true));
    paintSound();
  };
  if (AU.ctx.state === 'running') go();
  else
    AU.ctx
      .resume()
      .then(go)
      .catch(() => {});
}
UNLOCK_EVENTS.forEach(ev => addEventListener(ev, unlockAudio, true));
try {
  if (AU.on) {
    audioInit();
    if (AU.ctx && AU.ctx.state === 'running') {
      music.start();
      paintSound();
    }
  }
} catch (e) {}
