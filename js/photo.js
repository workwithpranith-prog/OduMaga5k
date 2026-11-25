'use strict';
// ================= finish-line photo (routes with finishPhoto: true) =================
// As you cross the line, a second camera at the photographer's spot (PHOTOG, set by the route) zooms in on you
// and renders off-screen, in Instagram-story shape. The flash fires, and the photo turns up on the finish screen
// with an orange "ODU MAGA by @yourrunningbro" banner and your time stamped on it.
const PHOTO_W = 1080,
  PHOTO_H = 1920;
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
    photoCam = new THREE.PerspectiveCamera(15, PHOTO_W / PHOTO_H, 4, 400); // a long lens from the riser; near plane well out so close layers (bib on tee) don't flicker
  }
  const f = frame(uOf(R.s), {}),
    gy = hS(R.s),
    rx = f.x + f.rx * R.lat,
    rz = f.z + f.rz * R.lat;
  photoCam.position.set(PHOTOG.x, PHOTOG.y, PHOTOG.z);
  photoCam.lookAt(rx, gy + 1.3, rz); // centred on the runner
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

// the story-sized photo card: orange credit banner on top, time and pace stamped at the bottom
function photoCard(run) {
  const c = document.createElement('canvas'),
    W = PHOTO_W,
    H = PHOTO_H;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d'),
    info = COURSES[run.route];
  g.drawImage(finishPhoto.canvas, 0, 0);
  // banner, like the arch: orange, with a dark border and a slight tilt
  g.save();
  g.translate(W / 2, 250);
  g.rotate(-0.035);
  g.fillStyle = '#f0742a';
  g.fillRect(-470, -120, 940, 240);
  g.strokeStyle = '#16140f';
  g.lineWidth = 10;
  g.strokeRect(-470, -120, 940, 240);
  g.fillStyle = '#16140f';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = '400 118px Bungee, "Arial Black", sans-serif';
  g.fillText('ODU MAGA', 0, 22);
  g.font = '700 56px "Pixelify Sans", "Courier New", monospace';
  g.fillText('by @yourrunningbro', 0, 92);
  g.restore();
  // results strip
  const grad = g.createLinearGradient(0, H - 560, 0, H);
  grad.addColorStop(0, 'rgba(22,20,15,0)');
  grad.addColorStop(0.4, 'rgba(22,20,15,.85)');
  grad.addColorStop(1, 'rgba(22,20,15,.96)');
  g.fillStyle = grad;
  g.fillRect(0, H - 560, W, 560);
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.font = '700 40px "JetBrains Mono", monospace';
  g.fillText(run.bib ? `● FINISH · BIB ${run.bib}` : '● FINISH', 70, H - 330);
  g.font = '800 230px "JetBrains Mono", monospace';
  g.fillText(fmtTime(run.time), 56, H - 130);
  g.fillStyle = '#f2c230';
  g.font = '700 46px "Atkinson Hyperlegible", sans-serif';
  g.fillText(`${info.name} ${info.km}K · ${fmtPace(run.pace)} /km`, 70, H - 60);
  return c;
}

// finish screen: show this run's photo, or hide the slot on routes without a photographer
function showFinishPhoto(run) {
  const has = !!C.finishPhoto && !!finishPhoto && finishPhoto.run === runNo;
  $('photoWrap').hidden = !has;
  run.photo = has ? photoCard(run) : null;
  if (has) $('photoImg').src = run.photo.toDataURL('image/jpeg', 0.9);
}
