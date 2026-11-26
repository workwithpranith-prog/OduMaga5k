'use strict';
// ================= loading screen: hands lacing a shoe, seen from above =================
// A black screen with a brown table, a sneaker and a pair of hands lacing it up. The laces fill in as the route
// builds, then the hands tie a bow and the screen fades out. Drawn small and scaled up for a chunky pixel look.
const LD = {
  el: $('loader'),
  cv: $('loaderCanvas'),
  p: 0, // shown progress, 0..1 (eases towards target)
  target: 0,
  shown: true,
  bowT: 0, // seconds since the lacing finished
  done: null, // resolves loaderDone()
  last: performance.now()
};
LD.g = LD.cv.getContext('2d');
const LD_W = LD.cv.width,
  LD_H = LD.cv.height;
const LD_ROWS = 6, // eyelet pairs
  LD_SEGS = (LD_ROWS - 1) * 2, // criss-cross lace segments
  LD_MIN = 1.1; // seconds a full lacing takes at least, so the animation reads
const LD_TIPS = [
  'Tap fast to run fast. Slow taps, slow pace.',
  'Swipe left or right to change lanes.',
  'Uphill drains energy faster. Downhill is free speed.',
  'On NICE Road, keep left at the aid stations.',
  'Water and gels refill your energy.',
  'Share your finish and dare a friend to beat it.'
];
let ldTip = (Math.random() * LD_TIPS.length) | 0;

// seeded wood grain so the table doesn't shimmer
const ldGrain = (() => {
  const r = mulberry32(42),
    out = [];
  for (let k = 0; k < 70; k++) out.push([10 + r() * (LD_W - 26), 12 + r() * (LD_H - 26), 4 + r() * 12]);
  return out;
})();

const eyelet = (i, side) => ({ x: LD_W / 2 + side * 13, y: 74 + i * 16 }); // toe at the top, collar at the bottom
function ldDraw(t) {
  const g = LD.g,
    W = LD_W,
    H = LD_H,
    cx = W / 2;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  // table: planks with seams and grain
  g.fillStyle = '#7a4a2a';
  g.fillRect(8, 8, W - 16, H - 16);
  for (let y = 8; y < H - 8; y += 24) {
    g.fillStyle = (y / 24) % 2 ? '#734526' : '#7f4e2c';
    g.fillRect(8, y, W - 16, 24);
    g.fillStyle = '#4f2e17';
    g.fillRect(8, y, W - 16, 1);
  }
  g.fillStyle = 'rgba(60,32,14,.55)';
  for (const [x, y, l] of ldGrain) g.fillRect(x | 0, y | 0, l | 0, 1);
  g.strokeStyle = '#3e2413';
  g.lineWidth = 2;
  g.strokeRect(8, 8, W - 16, H - 16);
  // the sneaker: white sole, orange upper, grey tongue, dark collar opening
  const shoe = (inset, col) => {
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(cx, 72, 33 - inset, 46 - inset, 0, 0, 6.283);
    g.fill();
    g.beginPath();
    g.ellipse(cx, 150, 28 - inset, 44 - inset, 0, 0, 6.283);
    g.fill();
    g.fillRect(cx - 29 + inset, 72, 58 - 2 * inset, 78);
  };
  shoe(0, '#e9e4d8');
  shoe(4, '#f0742a');
  g.fillStyle = '#f6a05a';
  g.beginPath();
  g.ellipse(cx, 52, 20, 18, 0, 0, 6.283); // toe cap
  g.fill();
  g.fillStyle = '#d8d1c0';
  g.fillRect(cx - 10, 64, 20, 104); // tongue
  g.fillStyle = '#2a1f18';
  g.beginPath();
  g.ellipse(cx, 176, 17, 12, 0, 0, 6.283); // collar opening
  g.fill();
  g.fillStyle = '#16140f';
  g.fillRect(cx - 20, 108, 3, 30); // a swoosh-free stripe
  g.fillRect(cx + 17, 108, 3, 30);
  for (let i = 0; i < LD_ROWS; i++)
    for (const s of [-1, 1]) {
      const e = eyelet(i, s);
      g.fillStyle = '#c9c4b6';
      g.fillRect(e.x - 3, e.y - 3, 6, 6);
      g.fillStyle = '#16140f';
      g.fillRect(e.x - 1.5, e.y - 1.5, 3, 3);
    }
  // laces: a bar across the first pair, then criss-crosses down to the collar
  g.strokeStyle = '#ffffff';
  g.lineWidth = 3;
  g.lineCap = 'round';
  const a0 = eyelet(0, -1),
    b0 = eyelet(0, 1);
  g.beginPath();
  g.moveTo(a0.x, a0.y);
  g.lineTo(b0.x, b0.y);
  g.stroke();
  const segs = LD.p * LD_SEGS;
  let tip = { x: b0.x, y: b0.y },
    from = { x: a0.x, y: a0.y };
  for (let k = 0; k < LD_SEGS; k++) {
    const row = Math.floor(k / 2),
      s = k % 2 ? 1 : -1; // each row: left-to-right-below, then right-to-left-below
    const A = eyelet(row, s),
      B = eyelet(row + 1, -s);
    const f = Math.max(0, Math.min(1, segs - k));
    if (f <= 0) break;
    const x = A.x + (B.x - A.x) * f,
      y = A.y + (B.y - A.y) * f;
    g.beginPath();
    g.moveTo(A.x, A.y);
    g.lineTo(x, y);
    g.stroke();
    tip = { x, y };
    from = A;
  }
  // when it's laced up: a bow at the collar end
  if (LD.p >= 1) {
    const e = eyelet(LD_ROWS - 1, 0),
      grow = Math.min(1, LD.bowT * 4);
    g.lineWidth = 3;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(e.x + s * 9 * grow, e.y + 2, 8 * grow + 0.1, 5 * grow + 0.1, s * 0.4, 0, 6.283);
      g.stroke();
      g.beginPath();
      g.moveTo(e.x, e.y + 3);
      g.lineTo(e.x + s * 6, e.y + 3 + 16 * grow);
      g.stroke();
    }
  }
  // hands: one holds the lace end at the working tip, the other steadies the shoe; sleeves come in from the bottom
  const bob = reduced ? 0 : Math.sin(t * 9) * 1.5;
  const hand = (x, y, flip, sleeve) => {
    g.fillStyle = sleeve;
    g.fillRect(x - 6, y + 8, 12, H - y);
    g.fillStyle = '#a86f48';
    g.fillRect(x - 8, y - 6, 16, 14); // palm
    for (let k = 0; k < 4; k++) g.fillRect(x - 8 + k * 4, y - 12 + (k === 0 || k === 3 ? 2 : 0), 3, 7); // fingers
    g.fillRect(x + flip * 9, y - 2, 5, 4); // thumb
    g.fillStyle = '#8d5a3b';
    g.fillRect(x - 8, y + 6, 16, 2);
  };
  if (LD.p < 1) {
    hand(tip.x + 10, tip.y + 10 + bob, -1, '#2f6fb3');
    hand(from.x - 22, from.y + 22 - bob, 1, '#2f6fb3');
  } else {
    const e = eyelet(LD_ROWS - 1, 0);
    hand(e.x + 24, e.y + 26 + bob, -1, '#2f6fb3');
    hand(e.x - 24, e.y + 26 - bob, 1, '#2f6fb3');
  }
}
function ldTick(now) {
  if (!LD.shown) return;
  const dt = Math.min(0.05, (now - LD.last) / 1000); // after a long build step, don't leap ahead
  LD.last = now;
  LD.p = Math.min(LD.target, LD.p + dt / LD_MIN);
  if (LD.p >= 1) LD.bowT += dt;
  ldDraw(now / 1000);
  $('loaderPct').textContent = `${Math.round(LD.p * 100)}%`;
  if (LD.done && LD.p >= 1 && LD.bowT > 0.5) {
    const r = LD.done;
    LD.done = null;
    LD.el.classList.add('out');
    setTimeout(() => {
      LD.el.hidden = true;
      LD.shown = false;
      LD.el.classList.remove('out');
      r();
    }, 260);
  }
  requestAnimationFrame(ldTick);
}
function loaderShow(title) {
  $('loaderTitle').textContent = title;
  if (LD.shown) return; // already lacing (the first load): just retitle it
  ldTip = (ldTip + 1) % LD_TIPS.length;
  $('loaderTip').textContent = LD_TIPS[ldTip];
  LD.p = LD.target = LD.bowT = 0;
  LD.el.hidden = false;
  LD.shown = true;
  LD.last = performance.now();
  requestAnimationFrame(ldTick);
}
const loaderProgress = t => (LD.target = Math.max(LD.target, Math.min(1, t)));
// finish the lacing, tie the bow, fade out; resolves when the screen is gone
function loaderDone() {
  LD.target = 1;
  return new Promise(r => (LD.done = r));
}
function loaderHide() {
  LD.el.hidden = true;
  LD.shown = false;
}
// the page opens on the loading screen; start lacing while the fonts and 3D engine arrive
$('loaderTip').textContent = LD_TIPS[ldTip];
LD.target = 0.12;
requestAnimationFrame(ldTick);
