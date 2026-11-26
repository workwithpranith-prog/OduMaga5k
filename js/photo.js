'use strict';
// ================= race photos (routes with photoSpots / finishPhoto) =================
// Photographers stand by the course. As you run towards one, a second camera at their spot zooms in and renders
// you off-screen, in Instagram-story shape (1080x1920), with a flash. After the finish, the photographer on the riser
// takes one more: you with your medal. The finish screen shows them as a grid; tap one to swipe through them all.
const PHOTO_W = 1080,
  PHOTO_H = 1920;
let photoRT = null,
  photoCam = null,
  runPhotos = [], // this run's photos: { canvas, label, clock, finish }
  flashLight = null,
  flashT = 0;
let PHOTO_SPOTS = []; // on-course photographers, set by the route: { s, label, x, y, z }

// seconds between the medal going on and the treat appearing
const treatDelay = () => (C.medal ? 1.3 : 0);

// render the scene from (x, y, z) zoomed in on the runner; other runners are left out of the shot
function snap(x, y, z, fov) {
  if (!photoRT) {
    photoRT = new THREE.WebGLRenderTarget(PHOTO_W, PHOTO_H);
    photoCam = new THREE.PerspectiveCamera(15, PHOTO_W / PHOTO_H, 4, 400); // near plane well out: no flicker on the bib
  }
  photoCam.fov = fov;
  photoCam.updateProjectionMatrix();
  const f = frame(uOf(R.s), {}),
    gy = hS(R.s);
  photoCam.position.set(x, y, z);
  photoCam.lookAt(f.x + f.rx * R.lat, gy + (state === 'done' ? 1.6 : 1.3), f.z + f.rz * R.lat);
  const hidden = objs.filter(o => o.type === 'racer' && o.g.visible);
  hidden.forEach(o => (o.g.visible = false));
  renderer.setRenderTarget(photoRT);
  renderer.render(scene, photoCam);
  renderer.setRenderTarget(null);
  hidden.forEach(o => (o.g.visible = true));
  const px = new Uint8Array(PHOTO_W * PHOTO_H * 4);
  renderer.readRenderTargetPixels(photoRT, 0, 0, PHOTO_W, PHOTO_H, px);
  const c = document.createElement('canvas');
  c.width = PHOTO_W;
  c.height = PHOTO_H;
  const g = c.getContext('2d'),
    img = g.createImageData(PHOTO_W, PHOTO_H),
    row = PHOTO_W * 4;
  for (let yy = 0; yy < PHOTO_H; yy++)
    img.data.set(px.subarray((PHOTO_H - 1 - yy) * row, (PHOTO_H - yy) * row), yy * row); // WebGL rows run bottom-up
  g.putImageData(img, 0, 0);
  return c;
}
// an on-course photographer: called from place() on the frame the runner reaches the trigger point
function takeCoursePhoto(spot) {
  runPhotos.push({ canvas: snap(spot.x, spot.y, spot.z, 16), label: spot.label, clock: R.clock, finish: false });
  cameraFlash(spot, true);
  toast(`📸 Smile! Photo at ${spot.label}`, 1.6);
}
// after the line: the riser photographer gets you with the medal on (arms up, before the treat arrives)
function takeMedalPhoto() {
  if (!PHOTOG) return;
  const was = runner.medal.visible;
  runner.medal.visible = !!C.medal;
  runPhotos.push({ canvas: snap(PHOTOG.x, PHOTOG.y, PHOTOG.z, 22), label: 'FINISH', clock: R.clock, finish: true });
  runner.medal.visible = was;
  cameraFlash(PHOTOG, false);
}

function cameraFlash(at, soft) {
  sfx.shutter();
  if (!flashLight) {
    flashLight = new THREE.PointLight(0xffffff, 0, 60);
    scene.add(flashLight);
  }
  flashLight.position.set(at.x, at.y, at.z);
  flashT = 0.35;
  if (reduced) return;
  const el = $('flash');
  el.classList.remove('go', 'soft');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('go');
  if (soft) el.classList.add('soft');
}
function tickFlash(dt) {
  if (!flashLight) return;
  flashT = Math.max(0, flashT - dt);
  flashLight.intensity = flashT > 0 ? 6 * (flashT / 0.35) : 0;
}

// the story-sized photo card: orange credit banner on top; where it was taken, the time and the bib at the bottom
function photoCard(run, photo) {
  const c = document.createElement('canvas'),
    W = PHOTO_W,
    H = PHOTO_H;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d'),
    info = COURSES[run.route];
  g.drawImage(photo.canvas, 0, 0);
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
  const grad = g.createLinearGradient(0, H - 560, 0, H);
  grad.addColorStop(0, 'rgba(22,20,15,0)');
  grad.addColorStop(0.4, 'rgba(22,20,15,.85)');
  grad.addColorStop(1, 'rgba(22,20,15,.96)');
  g.fillStyle = grad;
  g.fillRect(0, H - 560, W, 560);
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.font = '700 40px "JetBrains Mono", monospace';
  g.fillText(
    `● ${photo.label}${run.name ? ` · ${run.name.toUpperCase()}` : ''}${run.bib ? ` · BIB ${run.bib}` : ''}`,
    70,
    H - 330
  );
  g.font = '800 230px "JetBrains Mono", monospace';
  g.fillText(fmtTime(photo.finish ? run.time : photo.clock), 56, H - 130);
  g.fillStyle = '#f2c230';
  g.font = '700 46px "Atkinson Hyperlegible", sans-serif';
  g.fillText(
    photo.finish ? `${info.name} ${info.km}K · ${fmtPace(run.pace)} /km` : `${info.name} ${info.km}K · on the course`,
    70,
    H - 60
  );
  return c;
}

// finish screen: a grid of this run's photos (tap to open the viewer); files are made ahead so sharing is instant
function showFinishPhotos(run) {
  const grid = $('photoGrid');
  grid.replaceChildren();
  run.photos = runPhotos.map(p => {
    const card = photoCard(run, p);
    const item = { label: p.label, url: card.toDataURL('image/jpeg', 0.9), file: null };
    card.toBlob(
      b =>
        b &&
        (item.file = new File([b], `odu-maga-${run.route}-${p.label.toLowerCase().replace(/\s+/g, '')}.jpg`, {
          type: 'image/jpeg'
        })),
      'image/jpeg',
      0.92
    );
    return item;
  });
  grid.hidden = !run.photos.length;
  run.photos.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Open photo: ${p.label}`);
    const im = document.createElement('img');
    im.src = p.url;
    im.alt = '';
    const tag = document.createElement('span');
    tag.textContent = p.label;
    b.append(im, tag);
    b.addEventListener('click', () => openViewer(i));
    grid.append(b);
  });
}

// ---------- full-screen viewer: swipe through the photos ----------
let viewerAt = 0;
function openViewer(i) {
  const strip = $('vStrip');
  strip.replaceChildren(
    ...lastRun.photos.map(p => {
      const im = document.createElement('img');
      im.src = p.url;
      im.alt = `Race photo: ${p.label}`;
      return im;
    })
  );
  $('viewer').hidden = false;
  requestAnimationFrame(() => {
    strip.scrollLeft = i * strip.clientWidth;
    setViewerAt(i);
  });
}
function setViewerAt(i) {
  viewerAt = Math.max(0, Math.min(lastRun.photos.length - 1, i));
  $('vCount').textContent = `${lastRun.photos[viewerAt].label} · ${viewerAt + 1} / ${lastRun.photos.length}`;
}
const closeViewer = () => ($('viewer').hidden = true);
$('vStrip').addEventListener('scroll', () => {
  const s = $('vStrip');
  setViewerAt(Math.round(s.scrollLeft / Math.max(1, s.clientWidth)));
});
$('vClose').addEventListener('click', closeViewer);
addEventListener('keydown', e => {
  if ($('viewer').hidden) return;
  if (e.key === 'Escape') closeViewer();
  const s = $('vStrip');
  if (e.key === 'ArrowRight') s.scrollBy({ left: s.clientWidth, behavior: 'smooth' });
  if (e.key === 'ArrowLeft') s.scrollBy({ left: -s.clientWidth, behavior: 'smooth' });
});
