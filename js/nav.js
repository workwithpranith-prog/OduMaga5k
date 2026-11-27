'use strict';
// ================= one Back button for every screen =================
// Always in the same place (top-left). What it does depends on what's showing:
//   route picker -> where you came from · leaderboard -> where you came from · finish -> home
// Hidden on the home screen, the loading screen, the photo viewer (which has its own close button) and during a run,
// so the run's numbers can sit in the top-left corner.
const backBtn = $('backBtn');
const showing = id => !$(id).hidden;
function backTarget() {
  if (!$('loader').hidden || !$('viewer').hidden) return null;
  if (showing('boardScreen')) return 'board';
  if (showing('routeScreen')) return 'route';
  if (showing('finishScreen')) return 'finish';
  return null;
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
  }
});
// called every frame from the game loop: show or hide the button
function navTick() {
  backBtn.hidden = !backTarget();
}
