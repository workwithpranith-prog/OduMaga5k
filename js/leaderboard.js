'use strict';
// ================= leaderboard =================
// Hosted version: fill these two in with the Supabase project URL and its public (anon/publishable) key.
const SUPA_URL = 'https://oqtgoxtpxbhdtcbsftov.supabase.co';
const SUPA_KEY = 'sb_publishable_EYlUoDUcshueEEHT7DB4UQ_nWzDQQxv';
let mode = null,
  myId = null,
  myRank = null,
  myRoute = null,
  lastSubmitted = null;
// one board per route; the `route` column is optional so the page still works on the old table (Cubbon only)
let routeCol = false,
  routeProbe = Promise.resolve();
const LBS = {};
const lbOf = r => LBS[r] || (LBS[r] = { rows: [], total: 0, recent: [], updated: 0, loaded: false, closed: false });
let boardRoute = 'cubbon';
function rowEl(rank, r, me) {
  const el = document.createElement('div');
  el.className = 'r' + (me ? ' me' : '');
  const a = document.createElement('span');
  a.className = 'rk';
  a.textContent = '#' + rank;
  const n = document.createElement('span');
  n.className = 'n';
  n.textContent = r.name;
  const t = document.createElement('span');
  t.className = 't';
  t.textContent = fmtTime(r.time);
  const p = document.createElement('span');
  p.className = 'p';
  p.textContent = fmtPace(r.pace) + '/km';
  el.append(a, n, t, p);
  return el;
}
function ago(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!isFinite(d)) return '';
  if (d < 90) return 'just now';
  if (d < 3600) return Math.round(d / 60) + ' min ago';
  if (d < 86400) return Math.round(d / 3600) + ' h ago';
  return Math.round(d / 86400) + ' d ago';
}
function emptyEl(t) {
  const e = document.createElement('div');
  e.className = 'empty';
  e.textContent = t;
  return e;
}
function paintTabs() {
  document
    .querySelectorAll('.tabs button')
    .forEach(b => b.setAttribute('aria-pressed', String(b.dataset.route === boardRoute)));
}
function renderBoards() {
  const on = !!mode;
  $('topWrap').hidden = !on;
  $('openBoard1').hidden = $('openBoard2').hidden = !on;
  if (!on) return;
  paintTabs();
  const L = lbOf(boardRoute),
    rows = L.rows,
    info = ROUTE_INFO[boardRoute],
    mine = myRoute === boardRoute;
  $('dTitle').textContent = `${info.name} · ${info.km}K`;
  for (const [id, max] of [
    ['topBoard', 5],
    ['dTop', 20]
  ]) {
    const el = $(id);
    el.replaceChildren();
    if (L.closed) {
      el.append(emptyEl("This route's leaderboard opens soon."));
      continue;
    }
    if (!L.loaded) {
      el.append(emptyEl('Loading times…'));
      continue;
    }
    if (!rows.length) {
      el.append(emptyEl('No times yet. Be the first.'));
      continue;
    }
    rows.slice(0, max).forEach((r, i) => el.append(rowEl(i + 1, r, mine && r.id === myId)));
    if (mine && myId && myRank && lastSubmitted && !rows.slice(0, max).some(r => r.id === myId))
      el.append(rowEl(myRank, lastSubmitted, true));
  }
  // dashboard numbers
  const names = new Set(rows.map(r => r.name.trim().toLowerCase()));
  $('dRunners').textContent = rows.length ? String(names.size) : '0';
  $('dRuns').textContent = String(L.total || rows.length);
  if (rows.length) {
    $('dBest').textContent = fmtTime(rows[0].time);
    $('dBestName').textContent = rows[0].name;
    const avg = rows.reduce((s, r) => s + r.time, 0) / rows.length;
    $('dAvg').textContent = fmtTime(avg);
    $('dAvgPace').textContent = fmtPace(avg / info.km) + '/km';
  } else {
    $('dBest').textContent = $('dAvg').textContent = '–';
    $('dBestName').textContent = $('dAvgPace').textContent = '';
  }
  const rc = $('dRecent');
  rc.replaceChildren();
  $('dRecentWrap').hidden = !L.recent.length;
  for (const r of L.recent) {
    const el = document.createElement('div');
    el.className = 'r recent' + (mine && r.id === myId ? ' me' : '');
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = r.name;
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = fmtTime(r.time);
    const w = document.createElement('span');
    w.className = 'p';
    w.textContent = ago(r.at);
    el.append(n, t, w);
    rc.append(el);
  }
  $('dUpd').textContent = L.updated
    ? `Updated ${new Date(L.updated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Refreshes every 30 seconds.`
    : '';
}
function setBoardRoute(r) {
  if (!ROUTES.includes(r)) return;
  boardRoute = r;
  renderBoards();
  refreshLB(r);
}
document.querySelectorAll('.tabs').forEach(t =>
  t.addEventListener('click', e => {
    const b = e.target.closest('button[data-route]');
    if (b) setBoardRoute(b.dataset.route);
  })
);
// --- Supabase REST ---
function sb(path, opts = {}) {
  const h = {
    apikey: SUPA_KEY,
    ...(SUPA_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + SUPA_KEY } : {}),
    ...(opts.headers || {})
  };
  return fetch(SUPA_URL.replace(/\/+$/, '') + '/rest/v1/' + path, { ...opts, headers: h }).then(r => {
    if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return r;
  });
}
const normSB = x => ({
  id: String(x.id),
  name: String(x.name || '').slice(0, 20) || 'Runner',
  time: Number(x.time_s),
  pace: Number(x.pace_s),
  at: x.created_at
});
const countOf = r => {
  const cr = r.headers.get('content-range') || '';
  const n = parseInt(cr.split('/')[1], 10);
  return isFinite(n) ? n : null;
};
const rf = route => (routeCol ? `&route=eq.${route}` : '');
async function refreshLB(route = boardRoute) {
  if (mode !== 'supa') return;
  await routeProbe;
  const L = lbOf(route);
  if (!routeCol && route !== 'cubbon') {
    L.closed = true;
    L.loaded = true;
    renderBoards();
    return;
  }
  try {
    const [top, rec] = await Promise.all([
      sb(`scores?select=id,name,time_s,pace_s${rf(route)}&order=time_s.asc,id.asc&limit=1000`, {
        headers: { Prefer: 'count=exact' }
      }),
      sb(`scores?select=id,name,time_s,pace_s,created_at${rf(route)}&order=created_at.desc&limit=8`)
    ]);
    L.rows = (await top.json()).map(normSB).filter(r => isFinite(r.time));
    L.total = countOf(top) ?? L.rows.length;
    L.recent = (await rec.json()).map(normSB);
    L.updated = Date.now();
    L.loaded = true;
    L.closed = false;
    renderBoards();
  } catch (e) {}
}
async function submitSB(name, time, pace, route) {
  const body = { name, time_s: time, pace_s: pace };
  if (routeCol) body.route = route;
  const r = await sb('scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  const row = normSB((await r.json())[0]);
  let rank = null;
  try {
    const c = await sb(`scores?select=id&time_s=lt.${time}${rf(route)}`, {
      headers: { Prefer: 'count=exact', Range: '0-0' }
    });
    const n = countOf(c);
    if (n != null) rank = n + 1;
  } catch (_) {}
  if (rank == null) rank = lbOf(route).rows.filter(x => x.time < time).length + 1;
  return { row, rank };
}
const canSave = route => mode === 'supa' && (routeCol || route === 'cubbon');
// --- anonymous run stats (no names): open, start, each km, finish, quit, submit ---
const SESSION = (() => {
  try {
    const a = new Uint8Array(9);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return (String(Math.random()).slice(2) + '00000000').slice(0, 16);
  }
})();
let runNo = 0,
  quitSent = false;
function track(event, extra = {}) {
  if (mode !== 'supa') return;
  let body = { session: SESSION, run_no: runNo, event };
  if (event !== 'open' && R) {
    const c = R.counts || {};
    body = {
      ...body,
      dist_m: Math.round(Math.min(RACE, Math.max(0, R.s || 0))),
      clock_s: Math.round(Math.min(36000, R.clock || 0)),
      water: Math.min(20, c.water || 0),
      gels: Math.min(20, c.gel || 0),
      autos: c.auto || 0,
      cows: c.cow || 0,
      dogs: c.dog || 0,
      taps: Math.min(200000, R.tapCount || 0),
      min_energy: Math.round(Math.max(0, Math.min(100, R.minE ?? 100)))
    };
    if (routeCol && C) body.route = C.id;
  }
  body = { ...body, ...extra };
  try {
    fetch(SUPA_URL.replace(/\/+$/, '') + '/rest/v1/run_events', {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPA_KEY,
        ...(SUPA_KEY.startsWith('eyJ') ? { Authorization: 'Bearer ' + SUPA_KEY } : {}),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(body)
    }).catch(() => {});
  } catch (e) {}
}
function markQuit() {
  if ((state === 'run' || state === 'count') && !quitSent && runNo > 0) {
    quitSent = true;
    track('quit', { km: Math.max(0, R.kmToast - 1) });
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') markQuit();
});
addEventListener('pagehide', markQuit);
// --- pick the backend ---
(async () => {
  if (SUPA_URL && SUPA_KEY) {
    mode = 'supa';
    routeProbe = sb('scores?select=route&limit=1').then(
      () => {
        routeCol = true;
      },
      () => {}
    );
    setTimeout(() => track('open'), 0);
    renderBoards();
    refreshLB();
    setInterval(() => {
      if (!document.hidden && state !== 'run' && state !== 'count') refreshLB();
    }, 30000);
    return;
  }
  renderBoards(); // no Supabase keys: play without leaderboards
})();
