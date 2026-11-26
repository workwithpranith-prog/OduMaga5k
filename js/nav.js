'use strict';
// ================= one Back button for every screen =================
// Always in the same place (top-left). What it does depends on what's showing:
//   route picker -> where you came from · leaderboard -> where you came from · finish -> home
//   during a run -> "Tap again to quit" (a second tap within 2.5 s quits to the route picker)
// Hidden on the home screen, the loading screen and the photo viewer (which has its own close button).
const backBtn = $('backBtn');
let backArmed = 0; // time until which a second tap quits the run
const showing = id => !$(id).hidden;
function backTarget() {
  if (!$('loader').hidden || !$('viewer').hidden) return null;
  if (showing('boardScreen')) return 'board';
  if (showing('routeScreen')) return 'route';
  if (showing('finishScreen')) return 'finish';
  if (state === 'run' || state === 'count') return 'run';
  return null;
}
function quitRun() {
  markQuit();
  state = 'idle';
  music.stop();
  $('hud').hidden = $('paceBox').hidden = $('countdown').hidden = true;
  toastEl.classList.remove('show');
  openRoutes('startScreen');
}
backBtn.addEventListener('click', () => {
  const t = backTarget();
  if (t === 'board') closeBoard();
  else if (t === 'route') {
    $('routeScreen').hidden = true;
    $(routeFrom || 'startScreen').hidden = false;
  } else if (t === 'finish') {
    $('finishScreen').hidden = true;
    $('startScreen').hidden = false;
  } else if (t === 'run') {
    if (performance.now() < backArmed) {
      backArmed = 0;
      quitRun();
    } else backArmed = performance.now() + 2500;
  }
});
// called every frame from the game loop: show/hide the button and its "tap again" state
function navTick() {
  const t = backTarget(),
    armed = t === 'run' && performance.now() < backArmed;
  backBtn.hidden = !t;
  backBtn.classList.toggle('armed', armed);
  const label = armed ? 'Tap again to quit' : t === 'run' ? '← Quit' : '← Back';
  if (backBtn.textContent !== label) backBtn.textContent = label;
}
