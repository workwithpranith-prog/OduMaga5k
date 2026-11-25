'use strict';
// ---------- loading a route ----------
const PBS = {};
function pbOf(id) {
  if (!(id in PBS)) {
    let v = null;
    try {
      const x = parseFloat(localStorage.getItem(COURSES[id].pbKey));
      if (isFinite(x)) v = x;
    } catch (e) {}
    PBS[id] = v;
  }
  return PBS[id];
}
function loadCourse(id) {
  C = COURSES[id] || COURSES.cubbon;
  id = C.id;
  RACE = C.race;
  START_U = C.startU || 0;
  CLOCK = C.clock || 15;
  SPD = CLOCK / 15;
  EXAG = C.exag || 1;
  ELEV = C.elev ? C.elev() : null;
  HAS_ELEV = !!ELEV;
  ELEV_MIN = ELEV ? Math.min(...ELEV.v) : 0;
  clearWorld();
  FOOT.length = 0;
  srnd = mulberry32(560001);
  BASEY = null;
  const p = C.path();
  setPath(p.raw, p.raceRaw);
  if (C.prep) C.prep();
  scene.background.set(C.sky);
  scene.fog.color.set(C.sky);
  scene.fog.near = C.fog[0];
  scene.fog.far = C.fog[1];
  camera.far = Math.max(420, C.fog[1] + 80);
  camera.updateProjectionMatrix();
  buildGround();
  C.build();
  clouds();
  flushBatches();
  train.forEach(c => (c.visible = id === 'cubbon'));
  for (const k in TROPHIES) {
    const t = TROPHIES[k];
    t.visible = t.userData.plateG.visible = t.userData.cf.visible = false;
  }
  trophy = TROPHIES[id];
  if (C.randomKit) newKit();
  else defaultKit();
  music.use(id);
  $('greatRun').textContent = C.cheer || 'GREAT RUN!';
  $('hTotal').textContent = String(C.km);
  $('elevChip').hidden = !ELEV;
  drawElevBg();
  drawMiniBg();
  newRace();
  camInit = false;
}
// ---------- challenge links: ?r=route&t=seconds&n=name ----------
const QS = new URLSearchParams(location.search);
const CH = (() => {
  const r = QS.get('r'),
    t = parseInt(QS.get('t'), 10);
  if (!ROUTES.includes(r)) return null;
  const n = (QS.get('n') || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  return { r, t: isFinite(t) && t > 0 && t < 36000 ? t : null, n };
})();
if (CH) {
  boardRoute = CH.r;
  if (CH.t) {
    const ch = $('challenge');
    ch.hidden = false;
    $('chText').textContent =
      `${CH.n || 'A friend'} ran ${ROUTE_INFO[CH.r].name} ${ROUTE_INFO[CH.r].km}K in ${fmtTime(CH.t)}. Can you beat it?`;
  }
}

// ---------- route picker ----------
function paintRoutes() {
  const list = $('routeList');
  list.replaceChildren();
  for (const id of ROUTES) {
    const c = COURSES[id],
      b = document.createElement('button');
    b.className = 'route';
    b.type = 'button';
    b.style.setProperty('--rc', c.color);
    const top = document.createElement('div');
    top.className = 'rtop';
    const nm = document.createElement('b');
    nm.textContent = c.name;
    const bd = document.createElement('span');
    bd.className = 'rkm';
    bd.textContent = c.km + 'K';
    top.append(nm, bd);
    const tg = document.createElement('span');
    tg.className = 'rtag';
    tg.textContent = c.tagline;
    const mt = document.createElement('span');
    mt.className = 'rmeta';
    const pb = pbOf(id);
    mt.textContent = `${c.meta} · treat: ${c.treat.title.toLowerCase()}${pb != null ? ' · your PB ' + fmtTime(pb) : ''}`;
    b.append(top, tg, mt);
    if (CH && CH.r === id && CH.t) {
      const cb = document.createElement('span');
      cb.className = 'rch';
      cb.textContent = `Beat ${CH.n || 'your friend'}: ${fmtTime(CH.t)}`;
      b.append(cb);
    }
    b.addEventListener('click', () => pickRoute(id));
    list.append(b);
  }
}
function openRoutes(from) {
  $('startScreen').hidden = true;
  $('finishScreen').hidden = true;
  $('boardScreen').hidden = true;
  routeFrom = from;
  paintRoutes();
  $('routeScreen').hidden = false;
  const first = $('routeList').querySelector('button');
  if (first) first.focus();
}
let routeFrom = 'startScreen';
function pickRoute(id) {
  $('routeScreen').hidden = true;
  if (!C || C.id !== id) {
    $('building').hidden = false;
    $('buildingText').textContent = `Building ${COURSES[id].name}…`;
    setTimeout(() => {
      loadCourse(id);
      $('building').hidden = true;
      startRace();
    }, 30);
  } else startRace();
}
$('routeBack').addEventListener('click', () => {
  $('routeScreen').hidden = true;
  $(routeFrom || 'startScreen').hidden = false;
});

// ---------- flow ----------
function startRace() {
  if (C.randomKit) newKit(); // fresh tee colour and bib number for every run
  holdAt = 1e12;
  $('greatRun').hidden = true;
  audioInit();
  music.stop();
  music.use(C.id);
  if (AU.on) music.start();
  lastBeep = null;
  newRace();
  runNo++;
  quitSent = false;
  track('start', { km: 0 });
  camInit = false;
  for (const id of ['startScreen', 'finishScreen', 'routeScreen', 'boardScreen']) $(id).hidden = true;
  $('hud').hidden = false;
  $('paceBox').hidden = false;
  hud();
  state = 'count';
  countT = 3.2;
  $('countdown').hidden = false;
}
function finishRace() {
  state = 'done';
  finishShown = false;
  track('finish', { km: C.km });
  const t0 = performance.now() / 1000;
  holdAt = t0 + 3.4 + treatDelay();
  if (C.finishPhoto) R.photoPending = true;
  doneT = holdAt + 2.6;
  celebT = 0;
  toast(C.treat.toast, 3);
  $('paceBox').hidden = true;
  music.stop();
  sfx.fanfare();
}
let lastRun = null,
  finishShown = false;
function showFinish() {
  finishShown = true;
  $('hud').hidden = true;
  const t = R.clock,
    pace = t / C.km;
  const old = pbOf(C.id);
  const isPB = old == null || t < old;
  if (isPB) {
    PBS[C.id] = t;
    try {
      localStorage.setItem(C.pbKey, String(t));
    } catch (e) {}
  }
  const beat = CH && CH.t && CH.r === C.id && t < CH.t;
  $('fBadge').textContent = C.km + 'K';
  $('fWhere').textContent = `Finish · ${C.finishAt}`;
  $('fHead').textContent = beat ? `You beat ${CH.n || 'your friend'}!` : isPB ? 'New PB!' : `${C.name} ${C.km}K done`;
  $('fTime').textContent = fmtTime(t);
  $('fPace').textContent = fmtPace(pace);
  $('fPB').textContent = fmtTime(pbOf(C.id));
  $('tTitle').textContent = C.treat.title;
  $('tText').textContent = C.treat.text;
  const c = R.counts;
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const hits = C.hazards.map(([k, a, b]) => pl(c[k] || 0, a, b)).join(', ');
  const fuel = C.aid
    ? `${c.aid} of ${C.aid.length} aid stations`
    : `${pl(c.water, 'water bottle', 'water bottles')} · ${pl(c.gel, 'gel', 'gels')}`;
  $('fTally').textContent =
    `${fuel}${ELEV ? ` · climbed ${Math.round(R.climb)} m` : ''}${c.steps ? ` · ${pl(c.steps, 'flight of steps', 'flights of steps')}` : ''} · stumbles: ${hits}`;
  $('sharePrev').hidden = true;
  lastRun = {
    route: C.id,
    time: Math.round(t),
    pace: Math.round(pace),
    climb: Math.round(R.climb || 0),
    bib: C.bib ? kit.bib : null
  };
  showFinishPhoto(lastRun);
  shareImg = null;
  myId = null;
  myRank = null;
  myRoute = C.id;
  boardRoute = C.id;
  const can = canSave(C.id);
  $('nameForm').hidden = !can;
  $('saveNote').hidden = !can;
  $('saveStatus').textContent = mode && !can ? 'Leaderboards for this route open soon. Share your time instead!' : '';
  if (mode === 'supa') refreshLB(C.id);
  $('submitBtn').disabled = false;
  try {
    const n = localStorage.getItem('nammarun.name');
    if (n) $('nameInput').value = n;
  } catch (e) {}
  drawTreat2D($('dosaCanvas'), C.id);
  renderBoards();
  $('finishScreen').hidden = false;
  if (AU.on) music.start();
}
let submitting = false,
  savedRun = -1;
$('nameForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!mode || submitting || savedRun === runNo) return;
  submitting = true;
  const name = $('nameInput').value.replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!name) {
    submitting = false;
    $('saveStatus').textContent = 'Add a name first.';
    return;
  }
  const time = Math.round(R.clock),
    pace = Math.round(R.clock / C.km),
    route = C.id;
  $('submitBtn').disabled = true;
  $('saveStatus').textContent = 'Saving…';
  const done = (id, rank) => {
    savedRun = runNo;
    submitting = false;
    track('submit');
    myId = id;
    myRank = rank;
    myRoute = route;
    lastSubmitted = { id, name, time, pace };
    try {
      localStorage.setItem('nammarun.name', name);
    } catch (_) {}
    $('saveStatus').textContent = rank ? `Saved. You're #${rank} on the ${C.name} board.` : 'Saved.';
    $('nameForm').hidden = true;
    $('saveNote').hidden = true;
    renderBoards();
  };
  if (mode === 'supa') {
    try {
      const { row, rank } = await submitSB(name, time, pace, route);
      done(row.id, rank);
      refreshLB(route);
    } catch (err) {
      submitting = false;
      $('submitBtn').disabled = false;
      $('saveStatus').textContent =
        err && err.status === 400
          ? "That time couldn't be saved. Check the name and try again."
          : 'Could not save just now. Check your connection and tap Submit again.';
    }
  }
});
