'use strict';
// ---------- runner name: asked once on the intro screen, kept on this phone ----------
const cleanName = v =>
  String(v || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
function getName() {
  try {
    return cleanName(localStorage.getItem('nammarun.name'));
  } catch (e) {
    return '';
  }
}
function setName(v) {
  const n = cleanName(v);
  try {
    if (n) localStorage.setItem('nammarun.name', n);
  } catch (e) {}
  paintRunner();
  if (C && C.bib) applyKit(); // the bib shows the new name
  return n;
}
function paintRunner() {
  const n = getName();
  $('runnerBox').hidden = !!n;
  $('runnerSet').hidden = !n;
  $('runnerShow').textContent = n;
}
$('runnerSave').addEventListener('click', () => setName($('runnerName').value));
$('runnerName').addEventListener('keydown', e => {
  if (e.key === 'Enter') setName($('runnerName').value);
});
$('runnerChange').addEventListener('click', () => {
  $('runnerName').value = getName();
  $('runnerBox').hidden = false;
  $('runnerSet').hidden = true;
  $('runnerName').focus();
  $('runnerName').select();
});
paintRunner();

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
// builds a route in stages, handing back how far along it is, so the loading screen can move between stages
function* courseSteps(id) {
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
  PHOTO_SPOTS = []; // the route re-adds its photographers if it has any
  yield 0.12;
  FOOT.length = 0;
  srnd = mulberry32(560001);
  BASEY = null;
  const p = C.path();
  setPath(p.raw, p.raceRaw);
  if (C.prep) C.prep();
  yield 0.3;
  scene.background.set(C.sky);
  scene.fog.color.set(C.sky);
  scene.fog.near = C.fog[0];
  scene.fog.far = C.fog[1];
  camera.far = Math.max(420, C.fog[1] + 80);
  camera.updateProjectionMatrix();
  buildGround();
  yield 0.5;
  C.build();
  yield 0.85;
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
  yield 1;
}
// build a route behind the lacing screen; resolves once the screen has faded out
const paintFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
// quiet: build without the loading screen (the first route, behind the intro screen)
async function loadCourse(id, quiet = false) {
  if (!quiet) loaderShow(`Lacing up for ${(COURSES[id] || COURSES.cubbon).name}`);
  await paintFrame();
  for (const t of courseSteps(id)) {
    if (!quiet) loaderProgress(t);
    await paintFrame();
  }
  if (!quiet) await loaderDone();
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
  if (!C || C.id !== id) loadCourse(id).then(startRace);
  else startRace();
}

// ---------- flow ----------
function startRace() {
  if (C.randomKit) newKit(); // fresh tee colour and bib number for every run
  runPhotos = [];
  PHOTO_SPOTS.forEach(p => (p.taken = false));
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
  const c = R.counts;
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const hits = C.hazards.map(([k, a, b]) => pl(c[k] || 0, a, b)).join(', ');
  const fuel = C.aid
    ? `${c.aid} of ${C.aid.length} aid stations`
    : `${pl(c.water, 'water bottle', 'water bottles')} · ${pl(c.gel, 'gel', 'gels')}`;
  $('fTally').textContent =
    `${fuel}${ELEV ? ` · climbed ${Math.round(R.climb)} m` : ''}${c.steps ? ` · ${pl(c.steps, 'flight of steps', 'flights of steps')}` : ''} · stumbles: ${hits}`;
  lastRun = {
    route: C.id,
    time: Math.round(t),
    pace: Math.round(pace),
    climb: Math.round(R.climb || 0),
    bib: C.bib ? kit.bib : null,
    name: getName()
  };
  showFinishPhotos(lastRun);
  myId = null;
  myRank = null;
  myRoute = C.id;
  boardRoute = C.id;
  // the name from the start screen is used straight away; only a runner who skipped it gets the name form
  const can = canSave(C.id),
    known = getName();
  $('nameForm').hidden = !(can && !known);
  $('saveStatus').textContent =
    mode && !can ? 'Leaderboards for this route open soon. Screenshot your finish and tag me instead!' : '';
  if (mode === 'supa') refreshLB(C.id);
  $('submitBtn').disabled = false;
  $('nameInput').value = known;
  drawTreat2D($('dosaCanvas'), C.id);
  renderBoards();
  $('finishScreen').hidden = false;
  if (AU.on) music.start();
  if (can && known) postTime(known, true); // posted with the name from the start screen
}
let submitting = false,
  savedRun = -1;
// posting a time: the one-tap button and the name form both come here
// auto: posted on its own with the start-screen name, so failures retry by themselves (there's no button to tap)
async function postTime(raw, auto = false, attempt = 1) {
  if (!mode || submitting || savedRun === runNo) return;
  submitting = true;
  const name = cleanName(raw);
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
    setName(name);
    $('saveStatus').textContent = rank ? `Saved as ${name} · #${rank} on the ${C.name} board.` : `Saved as ${name}.`;
    $('nameForm').hidden = true;
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
      const run = runNo;
      if (auto && attempt < 4 && !(err && err.status === 400)) {
        $('saveStatus').textContent = 'Could not save just now. Trying again…';
        setTimeout(() => runNo === run && postTime(name, true, attempt + 1), 3000 * attempt);
        return;
      }
      $('saveStatus').textContent = auto
        ? "Couldn't save your time. Check your connection."
        : err && err.status === 400
          ? "That time couldn't be saved. Check the name and try again."
          : 'Could not save just now. Check your connection and tap Submit again.';
    }
  }
}
$('nameForm').addEventListener('submit', e => {
  e.preventDefault();
  postTime($('nameInput').value);
});
