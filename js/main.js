'use strict';
// leaderboard dashboard open/close
let boardFrom = null;
function openBoard(from) {
  boardFrom = from;
  $(from).hidden = true;
  $('boardScreen').hidden = false;
  if (mode === 'supa') refreshLB();
  renderBoards();
  $('backBtn').focus();
}
function closeBoard() {
  $('boardScreen').hidden = true;
  if (boardFrom) $(boardFrom).hidden = false;
}
$('openBoard1').addEventListener('click', () => openBoard('startScreen'));
$('boardRun').addEventListener('click', () => {
  $('boardScreen').hidden = true;
  pickRoute(boardRoute);
});
$('startBtn').addEventListener('click', () => {
  if (cleanName($('runnerName').value) && !$('runnerBox').hidden) setName($('runnerName').value);
  openRoutes('startScreen');
});
$('againBtn').addEventListener('click', startRace);
$('changeRoute').addEventListener('click', () => openRoutes('finishScreen'));

function loop() {
  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - lastNow);
  lastNow = now;
  elapsed += dt;
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) toastEl.classList.remove('show');
  }
  if (state === 'count') {
    countT -= dt;
    const n = Math.ceil(countT - 0.2);
    if (n !== lastBeep) {
      lastBeep = n;
      sfx.beep(n <= 0);
    }
    $('countdown').textContent = n > 0 ? String(n) : 'GO!';
    if (countT <= 0) {
      state = 'run';
      $('countdown').hidden = true;
      toast('Tap, tap, tap!', 1.2);
    }
  }
  if (state === 'run' || state === 'done' || state === 'count') update(dt, now);
  if (state === 'done' && now >= doneT && !finishShown) showFinish();
  if (R) place(dt);
  tickFlash(dt);
  navTick();
  if (!reduced) {
    TEX.water.offset.x = elapsed * 0.03;
    TEX.water.offset.y = elapsed * 0.012;
  }
  hudT -= dt;
  if (hudT <= 0 && state !== 'loading') {
    hud();
    hudT = 0.08;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// ---------- start-up: wait for the pixel fonts (signs are drawn with them), then build the first route ----------
async function startGame() {
  requestAnimationFrame(loop);
  await loadCourse(CH ? CH.r : 'cubbon');
  state = 'idle';
  $('startBtn').disabled = false;
  $('startBtn').textContent = CH && CH.t ? 'Take the challenge' : 'Pick a route';
  $('startBtn').classList.add('flash');
}
(async () => {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 40px "Pixelify Sans"'),
        document.fonts.load('400 40px "Bungee"'),
        document.fonts.load('700 40px "Atkinson Hyperlegible"')
      ]),
      new Promise(r => setTimeout(r, 2500))
    ]);
  } catch (e) {}
  if (!window.THREE) {
    loaderHide();
    const b = document.getElementById('startBtn');
    b.textContent = '3D engine failed to load. Reload the page.';
    return;
  }
  startGame();
})();
