'use strict';
// ================= control centre (admin.html) =================
// Asks the database for the dashboard (admin_dashboard in supabase/control_centre.sql) and the latest leaderboard
// entries, with a switch to hide one (admin_scores / admin_hide_score in supabase/security_scores.sql). The database
// checks the password, locks after 10 wrong tries in 15 minutes, and sends back totals only. Filters: route (or all routes) and period. Charts are plain SVG.
const SUPA_URL = 'https://oqtgoxtpxbhdtcbsftov.supabase.co';
const SUPA_KEY = 'sb_publishable_EYlUoDUcshueEEHT7DB4UQ_nWzDQQxv';
const $ = id => document.getElementById(id);
const ROUTE = {
  cubbon: { name: 'Cubbon Park 5K', short: 'Cubbon', km: 5, color: 'var(--cubbon)' },
  ulsoor: { name: 'Ulsoor Lake 3K', short: 'Ulsoor', km: 3, color: 'var(--ulsoor)' },
  nice: { name: 'NICE Road 10K', short: 'NICE', km: 10, color: 'var(--nice)' }
};
const ROUTE_IDS = Object.keys(ROUTE);
const store = {
  get: k => {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
  }
};
const view = (() => {
  try {
    const v = JSON.parse(store.get('odumaga.admin.view') || '{}');
    return { route: ROUTE[v.route] ? v.route : '', days: ['1', '7', '30', ''].includes(v.days) ? v.days : '30' };
  } catch (e) {
    return { route: '', days: '30' };
  }
})();
let pass = store.get('odumaga.admin.pass') || '',
  last = null,
  busy = false;

// ---------- small helpers ----------
const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const num = n => (n == null ? '–' : Number(n).toLocaleString('en-IN'));
const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
const pctTxt = (a, b) => (b ? `${pct(a, b)}%` : '–');
function fmt(s) {
  if (s == null) return '–';
  s = Math.round(s);
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
const IST = { timeZone: 'Asia/Kolkata' };
const dayKey = d => new Date(d).toLocaleDateString('en-CA', IST); // YYYY-MM-DD in India time
const dayLabel = key =>
  new Date(key + 'T12:00:00+05:30').toLocaleDateString('en-IN', { ...IST, day: 'numeric', month: 'short' });
function ago(t) {
  const m = Math.round((Date.now() - new Date(t)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleString('en-IN', {
    ...IST,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}
const tipAttr = lines => `data-tip="${esc(lines.join('\n'))}"`;
function tableHtml(head, rows, numCols = []) {
  const th = head.map((h, i) => `<th${numCols.includes(i) ? ' class="num"' : ''}>${esc(h)}</th>`).join('');
  const tr = rows
    .map(r => `<tr>${r.map((c, i) => `<td${numCols.includes(i) ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}
const asTable = (head, rows, numCols) =>
  `<details class="tbl"><summary>Show as a table</summary>${tableHtml(head, rows, numCols)}</details>`;
function niceMax(v) {
  if (v <= 4) return Math.max(1, Math.ceil(v));
  const p = 10 ** Math.floor(Math.log10(v)),
    f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

// ---------- vertical bar chart (stacked when a column has several segments) ----------
// cols: [{ label, segs: [{ v, color }], tip: [lines] }]
function vbars(el, cols, { h = 190 } = {}) {
  const W = Math.max(280, el.clientWidth || 320),
    padL = 30,
    padB = 22,
    padT = 16,
    plotH = h - padB - padT,
    n = cols.length;
  const tot = cols.map(c => c.segs.reduce((a, s) => a + s.v, 0)),
    max = niceMax(Math.max(1, ...tot));
  const slot = (W - padL) / Math.max(1, n),
    bw = Math.max(3, Math.min(42, slot * 0.68));
  const y = v => padT + plotH - (v / max) * plotH;
  const ticks = max <= 4 || max % 2 ? [0, max] : [0, max / 2, max]; // whole numbers only: these are counts
  let svg = `<svg viewBox="0 0 ${W} ${h}" role="img">`;
  for (const t of ticks)
    svg += `<line class="${t ? 'gridline' : 'axis'}" x1="${padL}" x2="${W}" y1="${y(t)}" y2="${y(t)}"/><text x="${
      padL - 6
    }" y="${y(t) + 4}" text-anchor="end">${num(Math.round(t * 10) / 10)}</text>`;
  const longest = Math.max(1, ...cols.map(c => String(c.label).length)),
    every = Math.ceil(n / Math.max(1, Math.floor((W - padL) / (longest * 7 + 12)))); // x labels that fit
  const peak = tot.indexOf(Math.max(...tot));
  cols.forEach((c, i) => {
    const cx = padL + slot * i + slot / 2,
      x = cx - bw / 2;
    let base = 0;
    const live = c.segs.filter(s => s.v > 0);
    live.forEach((s, k) => {
      const top = k === live.length - 1,
        y0 = y(base),
        y1 = y(base + s.v),
        gap = k ? 2 : 0; // 2px surface gap between stacked segments
      const hh = Math.max(1, y0 - y1 - gap),
        r = top ? Math.min(4, bw / 2, hh) : 0,
        yt = y0 - gap - hh;
      svg += `<path fill="${s.color}" d="M${x},${y0 - gap} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + bw - r} Q${
        x + bw
      },${yt} ${x + bw},${yt + r} V${y0 - gap} Z"/>`;
      base += s.v;
    });
    if (i === peak && tot[i] > 0)
      svg += `<text class="val" x="${cx}" y="${y(tot[i]) - 5}" text-anchor="middle">${num(tot[i])}</text>`;
    if (i % every === 0 && c.label) svg += `<text x="${cx}" y="${h - 6}" text-anchor="middle">${esc(c.label)}</text>`;
    svg += `<rect class="hit" tabindex="0" x="${padL + slot * i}" y="${padT}" width="${slot}" height="${plotH}" ${tipAttr(
      c.tip
    )}/>`;
  });
  el.innerHTML = svg + '</svg>';
}

// horizontal bars: [{ label, n, color, note }]
function hbars(rows, total, color) {
  const max = Math.max(1, ...rows.map(r => r.n));
  return rows
    .map(
      r =>
        `<div class="hbar" ${tipAttr([r.label, `${num(r.n)}${total ? ` · ${pctTxt(r.n, total)}` : ''}`])} tabindex="0">
          <span>${esc(r.label)}</span>
          <div class="track"><div class="fill" style="width:${(100 * r.n) / max}%;background:${r.color || color}"></div></div>
          <span class="n">${num(r.n)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span>
        </div>`
    )
    .join('');
}
// top few, the rest folded into "Other"
function topN(list, k = 5) {
  const s = [...list].sort((a, b) => b.n - a.n);
  if (s.length <= k + 1) return s;
  const rest = s.slice(k).reduce((a, r) => a + r.n, 0);
  return [...s.slice(0, k), { k: 'Other', n: rest }];
}
const nice = k => (k === 'unknown' ? 'Not recorded' : k === 'direct' ? 'No tag' : k);

// ---------- the dashboard ----------
const accent = () => (view.route ? ROUTE[view.route].color : 'var(--all)');
function tiles(d) {
  const k = d.kpi,
    ended = k.finished + k.dnf;
  const t = [
    ['Runs started', num(k.runs), k.players ? `${(k.runs / k.players).toFixed(1)} per player` : ''],
    ['Finished', num(k.finished), `${pctTxt(k.finished, ended)} of runs`],
    ["Didn't finish", num(k.dnf), `${pctTxt(k.dnf, ended)} of runs`],
    ['Players', num(k.players), `${num(k.returning)} came back another day`],
    ['Posted a time', num(k.posted), `${pctTxt(k.posted, k.finished)} of finishes`],
    ['Site visits', num(k.visits), 'all routes'],
    [
      'Playing now',
      `<span class="live" aria-hidden="true"></span>${num(k.playing_now)}`,
      `${num(k.running)} in the last 30 min`
    ],
    ['Average finish', fmt(k.avg_finish_s), view.route ? `best ${fmt(k.best_finish_s)}` : 'pick a route to compare']
  ];
  $('tiles').innerHTML = t
    .map(([a, b, c]) => `<div class="tile"><span class="k">${esc(a)}</span><b>${b}</b><small>${esc(c)}</small></div>`)
    .join('');
}

function daily(d) {
  const days = [];
  const end = dayKey(Date.now());
  let start = view.days ? dayKey(Date.now() - (Number(view.days) - 1) * 864e5) : d.daily.length ? d.daily[0].d : end;
  for (let t = new Date(start + 'T12:00:00+05:30'); dayKey(t) <= end; t = new Date(+t + 864e5)) days.push(dayKey(t));
  const by = {};
  for (const r of d.daily) (by[r.d] = by[r.d] || {})[r.route] = r;
  const ids = view.route ? [view.route] : ROUTE_IDS;
  $('dailySub').textContent = view.route
    ? `${ROUTE[view.route].name}: runs started each day (India time)`
    : 'Runs started each day, by route (India time)';
  $('dailyLegend').innerHTML = ids
    .map(id => `<span><i style="background:${ROUTE[id].color}"></i>${esc(ROUTE[id].short)}</span>`)
    .join('');
  const cols = days.map(key => {
    const row = by[key] || {},
      segs = ids.map(id => ({ v: row[id]?.runs || 0, color: ROUTE[id].color })),
      runs = segs.reduce((a, s) => a + s.v, 0),
      fin = ids.reduce((a, id) => a + (row[id]?.finished || 0), 0);
    const tip = [dayLabel(key), `${runs} run${runs === 1 ? '' : 's'} · ${fin} finished`];
    if (!view.route) for (const id of ids) if (row[id]) tip.push(`${ROUTE[id].short}: ${row[id].runs}`);
    return { label: dayLabel(key), segs, tip };
  });
  vbars($('daily'), cols, { h: 210 });
  $('daily').insertAdjacentHTML(
    'beforeend',
    asTable(
      ['Day', ...ids.map(id => ROUTE[id].short), 'Finished'],
      days
        .filter(k => by[k])
        .map(k => [
          dayLabel(k),
          ...ids.map(id => num(by[k][id]?.runs || 0)),
          num(ids.reduce((a, id) => a + (by[k][id]?.finished || 0), 0))
        ]),
      ids.map((_, i) => i + 1).concat(ids.length + 1)
    )
  );
}

function funnel(d) {
  const f = d.funnel,
    steps = [
      ['Opened the game', f.visits],
      ['Started a run', f.started],
      ['Finished a run', f.finished],
      ['Posted a time', f.posted]
    ];
  $('funnel').innerHTML = hbars(
    steps.map(([label, n], i) => ({ label, n, note: i ? pctTxt(n, steps[i - 1][1]) : '' })),
    0,
    accent()
  );
}

function giveup(d) {
  const maxKm = view.route ? ROUTE[view.route].km - 1 : Math.max(4, ...d.giveup.map(g => g.km));
  const by = Object.fromEntries(d.giveup.map(g => [g.km, g.n]));
  const total = d.giveup.reduce((a, g) => a + g.n, 0);
  if (!total) return ($('giveup').innerHTML = '<div class="empty">Nobody has given up in this period.</div>');
  const cols = [];
  for (let km = 0; km <= maxKm; km++) {
    const n = by[km] || 0;
    cols.push({
      label: `${km}–${km + 1}`,
      segs: [{ v: n, color: accent() }],
      tip: [
        `Gave up between km ${km} and ${km + 1}`,
        `${n} run${n === 1 ? '' : 's'} · ${pctTxt(n, total)} of unfinished`
      ]
    });
  }
  vbars($('giveup'), cols);
  $('giveup').insertAdjacentHTML(
    'beforeend',
    asTable(
      ['Kilometre', 'Unfinished runs'],
      cols.map(c => [c.label, num(c.segs[0].v)]),
      [1]
    )
  );
}

function times(d) {
  const el = $('times');
  if (!view.route) {
    $('timesTitle').textContent = 'Finish times';
    $('timesSub').textContent = '';
    el.innerHTML = '<div class="empty">Pick a route above to see how its finish times spread out.</div>';
    return;
  }
  const s = d.times.filter(t => t.route === view.route).map(t => t.s);
  $('timesTitle').textContent = `Finish times · ${ROUTE[view.route].name}`;
  if (!s.length) {
    $('timesSub').textContent = '';
    el.innerHTML = '<div class="empty">No finishes in this period.</div>';
    return;
  }
  const lo = Math.min(...s),
    hi = Math.max(...s);
  const step = [30, 60, 120, 300, 600, 900].find(b => (hi - lo) / b <= 12) || 1800;
  const b0 = Math.floor(lo / step) * step,
    nb = Math.floor((hi - b0) / step) + 1;
  const bins = Array(nb).fill(0);
  for (const v of s) bins[Math.floor((v - b0) / step)]++;
  $('timesSub').textContent = `${s.length} finishes, grouped in ${step < 60 ? `${step} s` : `${step / 60} min`} steps`;
  const cols = bins.map((n, i) => ({
    label: fmt(b0 + i * step),
    segs: [{ v: n, color: accent() }],
    tip: [`${fmt(b0 + i * step)} to ${fmt(b0 + (i + 1) * step)}`, `${n} finish${n === 1 ? '' : 'es'}`]
  }));
  vbars(el, cols);
  el.insertAdjacentHTML(
    'beforeend',
    asTable(
      ['Time', 'Finishes'],
      cols.map(c => [`from ${c.label}`, num(c.segs[0].v)]),
      [1]
    )
  );
}

function hours(d) {
  const by = Object.fromEntries(d.hours.map(h => [h.h, h.n]));
  const lab = h => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);
  const cols = Array.from({ length: 24 }, (_, h) => ({
    label: lab(h),
    segs: [{ v: by[h] || 0, color: accent() }],
    tip: [`${lab(h)}m to ${lab((h + 1) % 24)}m`, `${by[h] || 0} runs`]
  }));
  vbars($('hours'), cols);
}

function lists(d) {
  const runs = d.kpi.runs;
  $('sources').innerHTML = d.sources.length
    ? hbars(
        topN(d.sources.map(r => ({ k: r.k, n: r.runs }))).map(r => ({
          label: nice(r.k),
          n: r.n,
          note: pctTxt(r.n, runs)
        })),
        runs,
        accent()
      )
    : '<div class="empty">No runs in this period.</div>';
  const players = d.kpi.players;
  const group = (title, list) =>
    `<div class="group"><h3>${esc(title)}</h3>${hbars(
      topN(list).map(r => ({ label: nice(r.k), n: r.n, note: pctTxt(r.n, players) })),
      players,
      accent()
    )}</div>`;
  $('devices').innerHTML = players
    ? group('Device', d.devices) + group('System', d.os) + group('Browser', d.browsers)
    : '<div class="empty">No players in this period.</div>';
  const f = d.difficulty;
  const m = [
    ['Stumbles per run', f.avg_hits ?? '–', f.avg_hits == null ? 'counted from 26 Nov' : 'bumps into things'],
    ['Water bottles', f.avg_water ?? '–', 'picked up per finish'],
    ['Carb gels', f.avg_gels ?? '–', 'picked up per finish'],
    ['Nearly ran dry', f.low_energy_pct == null ? '–' : `${f.low_energy_pct}%`, 'of finishes dipped below 25% energy']
  ];
  $('difficulty').innerHTML = m
    .map(([a, b, c]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b><span>${esc(c)}</span></div>`)
    .join('');
}

function tables(d) {
  const dot = id => `<span class="dot" style="background:${ROUTE[id]?.color || 'var(--dnf)'}"></span>`;
  $('routes').innerHTML = d.routes.length
    ? tableHtml(
        ['Route', 'Runs', 'Finished', 'Finish rate', 'Players', 'Best', 'Average'],
        d.routes.map(r => [
          `${dot(r.route)}${esc(ROUTE[r.route]?.name || r.route)}`,
          num(r.runs),
          num(r.finished),
          pctTxt(r.finished, r.runs),
          num(r.players),
          fmt(r.best_s),
          fmt(r.avg_s)
        ]),
        [1, 2, 3, 4, 5, 6]
      )
    : '<div class="empty">No runs in this period.</div>';
  const res = r =>
    r.status === 'finished'
      ? `<span class="st fin">✓ Finished in ${fmt(r.finish_s)}</span>`
      : r.status === 'running'
        ? `<span class="st run">● Running · ${r.km} km</span>`
        : `<span class="st dnf">✕ Stopped at ${r.km} km</span>`;
  $('latest').innerHTML = d.latest.length
    ? tableHtml(
        ['When', 'Route', 'Result', 'Player', 'Device', 'From'],
        d.latest.map(r => [
          esc(ago(r.at)),
          `${dot(r.route)}${esc(ROUTE[r.route]?.short || r.route)}`,
          res(r),
          `<code>${esc(r.player)}</code>`,
          esc(nice(r.device)),
          esc(nice(r.ref))
        ])
      )
    : '<div class="empty">No runs in this period.</div>';
}

function render(d) {
  last = d;
  tiles(d);
  daily(d);
  funnel(d);
  giveup(d);
  times(d);
  hours(d);
  lists(d);
  tables(d);
  $('upd').textContent =
    `Updated ${new Date(d.generated_at).toLocaleTimeString('en-IN', { ...IST, hour: 'numeric', minute: '2-digit' })}`;
}

// ---------- talking to the database ----------
// every admin call: the database checks the password and answers {error: 'wrong_password' | 'locked'} when it's wrong
async function rpc(fn, args) {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_pass: pass, ...args })
  });
  const body = await r.json().catch(() => null);
  if (!r.ok && !(body && body.code === '28P01')) throw new Error((body && body.message) || r.status);
  const err = body && (body.code === '28P01' ? 'wrong_password' : body.error);
  if (err) throw Object.assign(new Error(err), { locked: true, why: err });
  return body;
}
const lockMsg = e =>
  e.why === 'locked'
    ? 'Too many wrong tries. The control centre is locked for 15 minutes.'
    : 'Wrong password. Try again.';
async function load() {
  if (busy) return;
  busy = true;
  $('refresh').disabled = true;
  try {
    const route = view.route || null;
    const d = await rpc('admin_dashboard', { p_route: route, p_days: view.days ? Number(view.days) : null });
    showDash();
    render(d);
    const sc = await rpc('admin_scores', { p_route: route, p_limit: 50 });
    scoresTable(sc.scores || []);
  } catch (e) {
    if (e.locked) return lock(lockMsg(e));
    if ($('dash').hidden) $('lockMsg').textContent = "Couldn't reach the database. Check your connection.";
    else $('upd').textContent = "Couldn't refresh. Showing the last numbers.";
  } finally {
    busy = false;
    $('refresh').disabled = false;
    $('unlock').disabled = false;
  }
}

// ---------- leaderboard entries: hide a score (a rude name, a fake time) or show it again ----------
function scoresTable(list) {
  $('scores').innerHTML = list.length
    ? tableHtml(
        ['When', 'Route', 'Name', 'Time', 'Checked', ''],
        list.map(x => [
          esc(ago(x.at)),
          `<span class="dot" style="background:${ROUTE[x.route]?.color || 'var(--dnf)'}"></span>${esc(
            ROUTE[x.route]?.short || x.route
          )}`,
          x.hidden ? `<s>${esc(x.name)}</s> <span class="st dnf">hidden</span>` : esc(x.name),
          fmt(x.time_s),
          x.checked ? '✓' : '<span class="sub" title="Posted before runs were checked">older</span>',
          `<button class="ghost hideBtn" type="button" data-id="${Number(x.id)}" data-hide="${x.hidden ? 'false' : 'true'}">${
            x.hidden ? 'Show' : 'Hide'
          }</button>`
        ]),
        [3]
      )
    : '<div class="empty">No times posted yet.</div>';
}
$('scores').addEventListener('click', async e => {
  const b = e.target.closest('button.hideBtn');
  if (!b) return;
  b.disabled = true;
  try {
    await rpc('admin_hide_score', { p_id: Number(b.dataset.id), p_hidden: b.dataset.hide === 'true' });
    const sc = await rpc('admin_scores', { p_route: view.route || null, p_limit: 50 });
    scoresTable(sc.scores || []);
  } catch (err) {
    if (err.locked) return lock(lockMsg(err));
    b.disabled = false;
    $('upd').textContent = "Couldn't change that score. Try again.";
  }
});
function lock(msg = '') {
  pass = '';
  store.set('odumaga.admin.pass', null);
  $('dash').hidden = true;
  $('lock').hidden = false;
  $('lockMsg').textContent = msg;
  $('pass').value = '';
  $('pass').focus();
}
function showDash() {
  $('lock').hidden = true;
  $('dash').hidden = false;
}
function paintFilters() {
  for (const [id, key] of [
    ['fRoute', 'route'],
    ['fDays', 'days']
  ])
    for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === view[key]));
}

$('lock').addEventListener('submit', e => {
  e.preventDefault();
  pass = $('pass').value;
  store.set('odumaga.admin.pass', $('remember').checked ? pass : null);
  $('lockMsg').textContent = 'Checking…';
  $('unlock').disabled = true;
  load();
});
for (const [id, key] of [
  ['fRoute', 'route'],
  ['fDays', 'days']
])
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    view[key] = b.dataset.v;
    store.set('odumaga.admin.view', JSON.stringify(view));
    paintFilters();
    load();
  });
$('refresh').addEventListener('click', load);
$('logout').addEventListener('click', () => lock());
// redraw the charts at the new width when the window is resized
let rz = 0;
addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => last && render(last), 150);
});
// keep it fresh while it's open
setInterval(() => {
  if (pass && !$('dash').hidden && document.visibilityState === 'visible') load();
}, 60000);

// tooltip for anything with data-tip (bars, list rows): first line in bold
const tip = $('tip');
function showTip(el, x, y) {
  const lines = el.getAttribute('data-tip').split('\n');
  tip.replaceChildren();
  lines.forEach((l, i) => {
    const s = document.createElement(i ? 'div' : 'b');
    s.textContent = l;
    tip.append(s);
  });
  tip.hidden = false;
  const w = tip.offsetWidth,
    h = tip.offsetHeight;
  tip.style.left = `${Math.min(innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
  tip.style.top = `${y - h - 12 < 8 ? y + 16 : y - h - 12}px`;
}
document.addEventListener('pointermove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY);
  else tip.hidden = true;
});
document.addEventListener('focusin', e => {
  const el = e.target.closest && e.target.closest('[data-tip]');
  if (!el) return (tip.hidden = true);
  const r = el.getBoundingClientRect();
  showTip(el, r.left + r.width / 2, r.top);
});
document.addEventListener('pointerleave', () => (tip.hidden = true));

paintFilters();
if (pass) {
  $('lockMsg').textContent = 'Opening…';
  load();
} else $('pass').focus();
