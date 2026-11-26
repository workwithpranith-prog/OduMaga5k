'use strict';
// ---------- sharing: a challenge link plus a story-sized image ----------
function shareInfo() {
  const L = lastRun,
    c = COURSES[L.route];
  let name = '';
  try {
    name = (lastSubmitted && myRoute === L.route && lastSubmitted.name) || localStorage.getItem('nammarun.name') || '';
  } catch (e) {}
  const q = new URLSearchParams({ r: L.route, t: String(L.time) });
  if (name) q.set('n', name);
  const url = location.origin + location.pathname + '?' + q.toString();
  const text = `I just ran the Odu Maga ${c.name} ${c.km}K in ${fmtTime(L.time)} (${fmtPace(L.pace)}/km). Think you can beat me?`;
  const full = `${text}\n${url}\n\nFollow @yourrunningbro on Instagram: https://www.instagram.com/yourrunningbro`;
  return { url, text, full, c, name };
}
let shareImg = null;
function routeSketch(g, x, y, w, h) {
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9;
  const n = Math.floor(N * FRAC);
  for (let i = 0; i < n; i += 4) {
    x0 = Math.min(x0, PX[i]);
    x1 = Math.max(x1, PX[i]);
    z0 = Math.min(z0, PZ[i]);
    z1 = Math.max(z1, PZ[i]);
  }
  const sc = Math.min(w / (x1 - x0 || 1), h / (z1 - z0 || 1)),
    ox = x + (w - (x1 - x0) * sc) / 2,
    oy = y + (h - (z1 - z0) * sc) / 2;
  g.lineJoin = g.lineCap = 'round';
  for (const [col, lw] of [
    ['#16140f', 22],
    ['#f2c230', 10]
  ]) {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.beginPath();
    for (let i = 0; i <= n; i += 4) {
      const j = Math.min(i, n - 1);
      const px = ox + (PX[j] - x0) * sc,
        py = oy + (PZ[j] - z0) * sc;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  }
  const si = Math.floor(START_U * N) % N;
  g.fillStyle = '#ef3b2d';
  g.beginPath();
  g.arc(ox + (PX[si] - x0) * sc, oy + (PZ[si] - z0) * sc, 16, 0, 6.283);
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 5;
  g.stroke();
}
function makeShareImage() {
  return new Promise(res => {
    const { c } = shareInfo(),
      L = lastRun;
    const W = 1080,
      H = 1920,
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#16140f';
    g.fillRect(0, 0, W, H);
    g.fillStyle = c.color;
    g.fillRect(0, 0, W, 700);
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 0; y < 700; y += 24) g.fillRect(0, y, W, 8);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#f2c230';
    g.font = '400 118px Bungee, "Arial Black", sans-serif';
    g.fillText('ODU MAGA', 70, 220);
    g.fillStyle = '#f7f2e6';
    g.font = '700 64px "Atkinson Hyperlegible", sans-serif';
    g.fillText(`${c.name} · ${c.km}K`, 76, 330);
    g.save();
    g.translate(W - 240, 120);
    g.rotate(-0.07);
    g.fillStyle = '#f7f2e6';
    g.fillRect(-10, -10, 200, 120);
    g.strokeStyle = '#0d0c09';
    g.lineWidth = 8;
    g.strokeRect(-10, -10, 200, 120);
    g.fillStyle = '#16140f';
    g.font = '400 84px Bungee, sans-serif';
    g.textAlign = 'center';
    g.fillText(c.km + 'K', 90, 88);
    g.restore();
    routeSketch(g, 120, 390, W - 240, 290);
    g.textAlign = 'left';
    g.fillStyle = '#bdb5a4';
    g.font = '700 40px "Atkinson Hyperlegible", sans-serif';
    g.fillText('FINISH TIME', 76, 820);
    g.fillStyle = '#ffffff';
    g.font = '800 230px "JetBrains Mono", monospace';
    g.fillText(fmtTime(L.time), 66, 1040);
    const stats = [
      ['PACE', fmtPace(L.pace) + '/km'],
      [c.id === 'cubbon' ? 'ROUTE' : 'CLIMB', c.id === 'cubbon' ? 'Flat city loop' : L.climb + ' m']
    ];
    stats.forEach(([k, v], i) => {
      const x = 76 + i * 480;
      g.fillStyle = '#29251c';
      g.fillRect(x - 6, 1100, 440, 170);
      g.fillStyle = '#f2c230';
      g.fillRect(x - 6, 1100, 10, 170);
      g.fillStyle = '#bdb5a4';
      g.font = '700 34px "Atkinson Hyperlegible", sans-serif';
      g.fillText(k, x + 30, 1160);
      g.fillStyle = '#ffffff';
      g.font = '800 64px "JetBrains Mono", monospace';
      g.fillText(v, x + 30, 1240);
    });
    const tc = document.createElement('canvas');
    tc.width = tc.height = 360;
    drawTreat2D(tc, c.id);
    g.fillStyle = '#29251c';
    g.fillRect(70, 1320, W - 140, 380);
    g.drawImage(tc, 90, 1330, 360, 360);
    g.fillStyle = '#f2c230';
    g.font = '400 50px Bungee, sans-serif';
    const words = c.treat.title.split(' + ');
    g.fillText(words[0] + ' +', 480, 1470);
    g.fillText(words[1] || '', 480, 1535);
    g.fillStyle = '#e8e1d2';
    g.font = '700 34px "Atkinson Hyperlegible", sans-serif';
    g.fillText('earned at the finish', 480, 1600);
    g.fillStyle = '#f2c230';
    g.font = '700 46px "Atkinson Hyperlegible", sans-serif';
    g.fillText('Beat my time · tap the link', 76, 1790);
    g.fillStyle = '#bdb5a4';
    g.font = '700 34px "Atkinson Hyperlegible", sans-serif';
    g.fillText('@yourrunningbro' + (location.host ? ' · ' + location.host : ''), 76, 1850);
    cv.toBlob(b => res(b), 'image/png');
  });
}
async function getShareFile() {
  if (!shareImg) {
    const b = await makeShareImage();
    if (b) shareImg = new File([b], `odu-maga-${lastRun.route}.png`, { type: 'image/png' });
  }
  return shareImg;
}
function flashBtn(id, msg) {
  const b = $(id),
    old = b.dataset.label || (b.dataset.label = b.textContent);
  b.textContent = msg;
  b.classList.add('done');
  setTimeout(() => {
    b.textContent = old;
    b.classList.remove('done');
  }, 1800);
}
function copyText(txt, btn) {
  const ok = () => flashBtn(btn, 'Copied!');
  const fb = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const r = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (r) {
        ok();
        return;
      }
    } catch (e) {}
    flashBtn(btn, 'Long-press to copy');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fb);
  else fb();
}
// Share: straight to the phone's share sheet (no preview). Desktop browsers without one get the message copied.
$('shareBtn').addEventListener('click', () => {
  if (!lastRun) return;
  const { full } = shareInfo();
  if (navigator.share) navigator.share({ title: 'Odu Maga', text: full }).catch(() => {});
  else copyText(full, 'shareBtn');
});

// the main image for this run: the medal photo when there are race photos, otherwise the story card
const mainPhoto = () =>
  lastRun && lastRun.photos && lastRun.photos.length ? lastRun.photos[lastRun.photos.length - 1] : null;
function saveFile(f) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(f);
  a.download = f.name;
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
}
// Instagram story: a website can't open Instagram's story editor directly, so hand the image to the share sheet
// (pick Instagram, then Stories). The file is made ahead of time: waiting for it here would lose the tap and the
// phone would refuse to open the sheet.
function igShare(file, btn) {
  if (!file) {
    flashBtn(btn, 'One sec…');
    return;
  }
  if (navigator.canShare && navigator.canShare({ files: [file] }))
    navigator.share({ files: [file] }).catch(e => {
      if (!e || e.name !== 'AbortError') saveFile(file);
    });
  else {
    saveFile(file);
    flashBtn(btn, 'Saved: add it in Instagram');
  }
}
$('igBtn').addEventListener('click', () => {
  if (!lastRun) return;
  const p = mainPhoto();
  igShare(p ? p.file : shareImg, 'igBtn');
});
$('saveImg').addEventListener('click', async () => {
  if (!lastRun) return;
  try {
    const p = mainPhoto();
    saveFile(p && p.file ? p.file : await getShareFile());
    flashBtn('saveImg', 'Saved!');
  } catch (e) {
    flashBtn('saveImg', 'Try again');
  }
});
// the photo viewer's own buttons act on the photo you're looking at
$('vIg').addEventListener('click', () => lastRun && lastRun.photos && igShare(lastRun.photos[viewerAt].file, 'vIg'));
$('vSave').addEventListener('click', () => {
  const p = lastRun && lastRun.photos && lastRun.photos[viewerAt];
  if (p && p.file) {
    saveFile(p.file);
    flashBtn('vSave', 'Saved!');
  } else flashBtn('vSave', 'One sec…');
});
