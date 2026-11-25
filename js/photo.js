'use strict';
// ================= finish-line photo (routes with finishPhoto: true) =================
// As you cross the line, a second camera at the photographer's spot (PHOTOG, set by the route) renders the scene
// off-screen: you, the arch and its "by @yourrunningbro" credit. The flash fires, and the photo turns up on the
// finish screen with your time stamped on it.
const PHOTO_W = 1200,
  PHOTO_H = 900;
let photoRT = null,
  photoCam = null,
  finishPhoto = null, // { canvas, run } for the latest run
  flashLight = null,
  flashT = 0;

// seconds between the medal going on and the treat appearing
const treatDelay = () => (C.medal ? 1.3 : 0);

function takeFinishPhoto() {
  if (!PHOTOG) return;
  if (!photoRT) {
    photoRT = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H);
    photoCam = new THREE.PerspectiveCamera(58, PHOTO_W / PHOTO_H, 0.1, 500);
  }
  const f = frame(uOf(R.s), {}),
    gy = hS(R.s),
    rx = f.x + f.rx * R.lat,
    rz = f.z + f.rz * R.lat;
  photoCam.position.set(PHOTOG.x, PHOTOG.y, PHOTOG.z);
  photoCam.lookAt(rx * 0.65 + PHOTOG.ax * 0.35, gy + 3.4, rz * 0.65 + PHOTOG.az * 0.35); // the runner, with the arch's credit above
  renderer.setRenderTarget(photoRT);
  renderer.render(scene, photoCam);
  const px = new Uint8Array(PHOTO_W * PHOTO_H * 4);
  renderer.readRenderTargetPixels(photoRT, 0, 0, PHOTO_W, PHOTO_H, px);
  renderer.setRenderTarget(null);
  const c = document.createElement('canvas');
  c.width = PHOTO_W;
  c.height = PHOTO_H;
  const g = c.getContext('2d'),
    img = g.createImageData(PHOTO_W, PHOTO_H),
    row = PHOTO_W * 4;
  for (let y = 0; y < PHOTO_H; y++) img.data.set(px.subarray((PHOTO_H - 1 - y) * row, (PHOTO_H - y) * row), y * row); // WebGL rows run bottom-up
  g.putImageData(img, 0, 0);
  finishPhoto = { canvas: c, run: runNo };
  cameraFlash();
}

function cameraFlash() {
  sfx.shutter();
  if (!flashLight) {
    flashLight = new THREE.PointLight(0xffffff, 0, 60);
    scene.add(flashLight);
  }
  flashLight.position.set(PHOTOG.x, PHOTOG.y, PHOTOG.z);
  flashT = 0.35;
  if (reduced) return;
  const el = $('flash');
  el.classList.remove('go');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('go');
}
function tickFlash(dt) {
  if (!flashLight) return;
  flashT = Math.max(0, flashT - dt);
  flashLight.intensity = flashT > 0 ? 6 * (flashT / 0.35) : 0;
}

// the photo with a race-photo strip: route, time, pace and the credit
function photoCard(run) {
  const c = document.createElement('canvas'),
    W = PHOTO_W,
    H = PHOTO_H;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.drawImage(finishPhoto.canvas, 0, 0);
  const grad = g.createLinearGradient(0, H - 260, 0, H);
  grad.addColorStop(0, 'rgba(22,20,15,0)');
  grad.addColorStop(0.45, 'rgba(22,20,15,.82)');
  grad.addColorStop(1, 'rgba(22,20,15,.95)');
  g.fillStyle = grad;
  g.fillRect(0, H - 260, W, 260);
  const info = COURSES[run.route];
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  g.fillStyle = '#f2c230';
  g.font = '400 52px Bungee, "Arial Black", sans-serif';
  g.fillText('ODU MAGA', 44, H - 92);
  g.fillStyle = '#f7f2e6';
  g.font = '700 32px "Atkinson Hyperlegible", sans-serif';
  g.fillText(`${info.name} ${info.km}K · by @yourrunningbro`, 46, H - 44);
  g.textAlign = 'right';
  g.fillStyle = '#ffffff';
  g.font = '800 112px "JetBrains Mono", monospace';
  g.fillText(fmtTime(run.time), W - 40, H - 74);
  g.fillStyle = '#bdb5a4';
  g.font = '700 32px "JetBrains Mono", monospace';
  g.fillText(`${fmtPace(run.pace)} /km`, W - 44, H - 30);
  g.fillStyle = 'rgba(22,20,15,.7)';
  g.fillRect(28, 28, 250, 54);
  g.fillStyle = '#ffffff';
  g.textAlign = 'left';
  g.font = '700 28px "JetBrains Mono", monospace';
  g.fillText('● FINISH', 44, 66);
  return c;
}

// finish screen: show this run's photo, or hide the slot on routes without a photographer
function showFinishPhoto(run) {
  const has = !!C.finishPhoto && !!finishPhoto && finishPhoto.run === runNo;
  $('photoWrap').hidden = !has;
  run.photo = has ? photoCard(run) : null;
  if (has) $('photoImg').src = run.photo.toDataURL('image/jpeg', 0.9);
}
