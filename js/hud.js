'use strict';
// ---------- HUD ----------
let hudT = 0;
const elevCv = $('hElev'),
  elevG = elevCv.getContext('2d');
let elevBg = null;
function drawElevBg() {
  if (!ELEV) {
    elevBg = null;
    return;
  }
  const W = elevCv.width,
    H = elevCv.height,
    c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let mn = 1e9,
    mx = -1e9;
  const pts = [];
  for (let i = 0; i <= W; i++) {
    const e = elevM((i / W) * RACE);
    pts.push(e);
    mn = Math.min(mn, e);
    mx = Math.max(mx, e);
  }
  const yOf = e => H - 3 - ((e - mn) / Math.max(8, mx - mn)) * (H - 8);
  g.fillStyle = 'rgba(242,194,48,.35)';
  g.beginPath();
  g.moveTo(0, H);
  pts.forEach((e, i) => g.lineTo(i, yOf(e)));
  g.lineTo(W, H);
  g.fill();
  g.strokeStyle = '#f2c230';
  g.lineWidth = 2;
  g.beginPath();
  pts.forEach((e, i) => (i ? g.lineTo(i, yOf(e)) : g.moveTo(i, yOf(e))));
  g.stroke();
  elevBg = { c, yOf };
}
// ---------- mini-map: the route from the GPS track, the lake, and a dot for you ----------
const mmCv = $('mmCanvas'),
  mmG = mmCv.getContext('2d');
let mmBg = null;
function drawMiniBg() {
  $('miniMap').hidden = !C.minimap;
  if (!C.minimap) {
    mmBg = null;
    return;
  }
  const W = mmCv.width,
    H = mmCv.height,
    P = 14,
    c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9;
  for (let i = 0; i < N; i += 4) {
    x0 = Math.min(x0, PX[i]);
    x1 = Math.max(x1, PX[i]);
    z0 = Math.min(z0, PZ[i]);
    z1 = Math.max(z1, PZ[i]);
  }
  const sc = Math.min((W - 2 * P) / (x1 - x0 || 1), (H - 2 * P) / (z1 - z0 || 1)),
    ox = (W - (x1 - x0) * sc) / 2,
    oy = (H - (z1 - z0) * sc) / 2,
    X = x => ox + (x - x0) * sc,
    Y = z => oy + (z - z0) * sc;
  if (C.id === 'ulsoor' && LAKE.xs.length) {
    g.fillStyle = '#4f8fae';
    g.beginPath();
    LAKE.xs.forEach((x, i) => (i ? g.lineTo(X(x), Y(LAKE.zs[i])) : g.moveTo(X(x), Y(LAKE.zs[i]))));
    g.closePath();
    g.fill();
  }
  g.lineJoin = g.lineCap = 'round';
  for (const [col, lw] of [
    ['#16140f', 9],
    ['#f2c230', 4]
  ]) {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.beginPath();
    for (let i = 0; i <= N; i += 4) {
      const k = i % N;
      i ? g.lineTo(X(PX[k]), Y(PZ[k])) : g.moveTo(X(PX[k]), Y(PZ[k]));
    }
    g.closePath();
    g.stroke();
  }
  const f = frame(uOf(0), {}),
    fx = X(f.x),
    fy = Y(f.z);
  g.fillStyle = '#f7f2e6';
  g.fillRect(fx - 6, fy - 6, 12, 12);
  g.fillStyle = '#16140f';
  g.fillRect(fx - 6, fy - 6, 6, 6);
  g.fillRect(fx, fy, 6, 6);
  g.fillStyle = '#f7f2e6';
  g.font = '700 18px "Atkinson Hyperlegible", sans-serif';
  g.textAlign = 'center';
  g.fillText('N', W - 12, 18);
  g.fillRect(W - 13, 22, 2, 8);
  mmBg = { c, X, Y };
}
function drawMini() {
  if (!mmBg) return;
  const W = mmCv.width,
    H = mmCv.height;
  mmG.clearRect(0, 0, W, H);
  mmG.drawImage(mmBg.c, 0, 0);
  const f = frame(uOf(R.s), {}),
    x = mmBg.X(f.x),
    y = mmBg.Y(f.z),
    pulse = reduced ? 0 : Math.sin(elapsed * 6) * 1.5;
  mmG.fillStyle = 'rgba(239,59,45,.35)';
  mmG.beginPath();
  mmG.arc(x, y, 11 + pulse, 0, 6.283);
  mmG.fill();
  mmG.fillStyle = '#ef3b2d';
  mmG.beginPath();
  mmG.arc(x, y, 7, 0, 6.283);
  mmG.fill();
  mmG.strokeStyle = '#ffffff';
  mmG.lineWidth = 3;
  mmG.stroke();
}
function hud() {
  drawMini();
  $('hTime').textContent = fmtTime(R.clock);
  $('hKm').textContent = (Math.min(RACE, R.s) / 1000).toFixed(2);
  const e = $('hEnergy');
  e.style.width = R.energy.toFixed(1) + '%';
  e.classList.toggle('low', R.energy < 25);
  $('hBoost').hidden = !(R.boost > 0);
  $('hPace').textContent = R.v > 3 ? fmtPace((1000 / (R.v * SPD)) * CLOCK) : '–:––';
  $('tapHint').style.visibility = R.v < 25 && state === 'run' ? 'visible' : 'hidden';
  if (elevBg) {
    const W = elevCv.width,
      H = elevCv.height;
    elevG.clearRect(0, 0, W, H);
    elevG.drawImage(elevBg.c, 0, 0);
    const px = Math.min(W, (R.s / RACE) * W),
      py = elevBg.yOf(elevM(R.s));
    elevG.fillStyle = '#ef3b2d';
    elevG.fillRect(px - 4, py - 4, 8, 8);
    elevG.strokeStyle = '#fff';
    elevG.lineWidth = 2;
    elevG.strokeRect(px - 4, py - 4, 8, 8);
    const gp = Math.round(R.grade * 1000) / 10;
    $('hGrade').textContent = (gp > 0.4 ? '▲ ' : gp < -0.4 ? '▼ ' : '') + Math.abs(gp).toFixed(1) + '%';
    $('hGrade').className = gp > 0.4 ? 'up' : gp < -0.4 ? 'down' : '';
  }
}
