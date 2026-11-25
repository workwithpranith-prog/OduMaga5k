'use strict';
const $ = id => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ================= constants =================
const DM = 4; // display metres per world unit, on every route
const LANE = 2.6;
// set per route by loadCourse()
let C = null; // the current course
let RACE = 5000; // race distance in metres
let LOOP = 1250; // world units for the whole drawn loop
let FRAC = 1; // share of the drawn loop the race uses (less than 1 for the NICE out-and-back)
let CLOCK = 15; // race clock runs CLOCK x real time so paces read like real running
let SPD = 1; // world speed multiplier that keeps pace = taps, whatever CLOCK is
let HAS_ELEV = false;
let START_U = 0; // where on the drawn loop the race starts and finishes

// ================= helpers =================
const fmtTime = sec => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
const fmtPace = sec =>
  !isFinite(sec) || sec <= 0 || sec > 1800
    ? '–:––'
    : `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const toastEl = $('toast');
let toastT = 0;
function toast(msg, dur = 1.5) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastT = dur;
}
const ROUTES = ['cubbon', 'ulsoor', 'nice'];
const ROUTE_INFO = {
  cubbon: { name: 'Cubbon Park', km: 5 },
  ulsoor: { name: 'Ulsoor Lake', km: 3 },
  nice: { name: 'NICE Road', km: 10 }
};
