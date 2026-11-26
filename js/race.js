'use strict';
// ================= race objects =================
let objs = [];
const MAKERS = {
  auto: makeAuto,
  cow: makeCow,
  dog: makeDog,
  cart: makeCart,
  walkers: makeWalkers,
  steps: makeSteps,
  racer: makeRacer
};
const MOVES = { auto: 10, walkers: 3, racer: 24 }; // metres per real second they move up the road (o.speed overrides)
const HIT = { auto: 6, cow: 3.6, dog: 3, cart: 4, walkers: 3, racer: 3 };
const HIT_MSG = {
  auto: 'Auto cut in! Stumbled',
  cow: 'Cow on the road! Stumbled',
  dog: 'Street dog tripped you up!',
  cart: 'Ran into a food cart!',
  walkers: 'Bumped into the walkers!',
  racer: 'Bumped into another runner!'
};
function buildCourse(seed) {
  for (const o of objs) scene.remove(o.g);
  objs = [];
  const r = mulberry32(seed);
  const obstacles = C.obstacles(r);
  const blocked = (s, lane, w) => obstacles.some(o => (o.lane === lane || o.type === 'steps') && Math.abs(o.s - s) < w);
  const pick = (type, list) => {
    for (const base of list) {
      const s = base + r() * 80;
      const lanes = [-1, 0, 1].sort(() => r() - 0.5);
      const lane = lanes.find(l => !blocked(s, l, 40));
      if (lane === undefined) continue;
      objs.push({ type, s, lane, g: type === 'water' ? makeWater() : makeGel(), pick: true });
    }
  };
  for (const o of obstacles) {
    o.g = MAKERS[o.type]();
    o.face =
      o.type === 'cow'
        ? ((r() < 0.5 ? 1 : -1) * Math.PI) / 2
        : o.type === 'dog'
          ? Math.PI + (r() - 0.5) * 0.8
          : o.type === 'cart'
            ? ((r() < 0.5 ? 1 : -1) * Math.PI) / 2
            : 0;
    objs.push(o);
  }
  if (C.aid)
    C.aid.forEach((s, i) => objs.push({ type: 'aidfx', s, lane: 0, lat: -4.8, aid: i, g: makeAidFx(), decor: true }));
  pick('water', C.pickups.water);
  pick('gel', C.pickups.gel);
  for (const o of objs) {
    o.g.visible = false;
    o.done = false;
    o.gone = false;
    o.fly = 0;
  }
}

// ================= game state =================
let lastBeep = null,
  holdAt = 1e12;
let state = 'loading',
  R = null,
  elapsed = 0,
  lastNow = performance.now() / 1000,
  countT = 0,
  doneT = 0,
  celebT = 0;
function newRace() {
  R = {
    s: 0,
    lat: 0,
    lane: 0,
    v: 0,
    energy: 100,
    boost: 0,
    stumble: 0,
    invuln: 0,
    taps: [],
    lastTap: -9,
    clock: 0,
    phase: 0,
    lowWarned: false,
    kmToast: 1,
    zone: null,
    tapCount: 0,
    minE: 100,
    bump: 0,
    onSteps: false,
    grade: 0,
    climb: 0,
    hillT: 0,
    seen: {},
    aidDone: {},
    aidWarn: {},
    photoPending: false,
    counts: { water: 0, gel: 0, aid: 0, auto: 0, cow: 0, dog: 0 }
  };
  buildCourse((Math.random() * 1e9) | 0);
  trophy.visible = false;
  celebT = 0;
}

// ---------- input ----------
function tap() {
  if (state !== 'run') return;
  const now = performance.now() / 1000;
  R.taps.push(now);
  R.lastTap = now;
  R.tapCount++;
}
function laneShift(d) {
  if (state !== 'run' && state !== 'count') return;
  const nl = Math.max(-1, Math.min(1, R.lane + d));
  if (nl !== R.lane) sfx.swipe(d);
  R.lane = nl;
}
let gest = null;
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  gest = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
  tap();
});
canvas.addEventListener('pointermove', e => {
  if (!gest || e.pointerId !== gest.id || gest.swiped) return;
  const dx = e.clientX - gest.x;
  if (Math.abs(dx) > 32) {
    laneShift(dx > 0 ? 1 : -1);
    gest.swiped = true;
  }
});
const endG = e => {
  if (gest && e.pointerId === gest.id) gest = null;
};
canvas.addEventListener('pointerup', endG);
canvas.addEventListener('pointercancel', endG);
addEventListener('keydown', e => {
  const k = e.key;
  if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') {
    if (!e.repeat) tap();
    e.preventDefault();
  } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
    if (!e.repeat) laneShift(-1);
    e.preventDefault();
  } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
    if (!e.repeat) laneShift(1);
    e.preventDefault();
  }
});

// ---------- update ----------
const fr = {},
  fo = {};
function update(dt, now) {
  while (R.taps.length && now - R.taps[0] > 1.2) R.taps.shift();
  const cadence = R.taps.length / 1.2;
  const eF = R.energy >= 35 ? 1 : 0.5 + (0.5 * R.energy) / 35;
  // hills: the real Strava grade slows you going up and gives a little back coming down
  const g = gradeAt(R.s);
  R.grade = g;
  const gm = g > 0 ? Math.max(0.7, 1 - 3.4 * g) : Math.min(1.12, 1 - 2 * g);
  let cap = 80 * eF * (R.boost > 0 ? 1.2 : 1) * gm;
  if (R.stumble > 0) cap = Math.min(cap, 16);
  if (R.onSteps) cap = Math.min(cap, 52);
  let target = Math.min(cap, (cadence * 10.5 + (R.boost > 0 ? 6 : 0)) * gm);
  if (now - R.lastTap > 0.7) target = 0;
  const rate = target > R.v ? 42 : 30;
  R.v += Math.max(-rate * dt, Math.min(rate * dt, target - R.v));
  if (state === 'done') R.v = Math.max(0, R.v - 45 * dt);
  const hill = g > 0 ? 1 + 9 * g : Math.max(0.8, 1 + 4 * g);
  if (R.boost > 0) R.boost -= dt;
  else if (R.v > 1) R.energy -= (0.3 + (R.v / 60) ** 2) * dt * hill * (C.heat || 1);
  else R.energy += 2 * dt;
  R.energy = Math.max(0, Math.min(100, R.energy));
  if (state === 'run') R.minE = Math.min(R.minE, R.energy);
  if (R.energy < 25 && !R.lowWarned && state === 'run') {
    R.lowWarned = true;
    toast('Energy low. Grab water or a gel', 2);
  }
  if (R.energy > 40) R.lowWarned = false;
  if (R.stumble > 0) R.stumble -= dt;
  if (R.invuln > 0) R.invuln -= dt;
  const s0 = R.s;
  R.s += R.v * dt * SPD;
  if (state === 'done' && FRAC < 1) R.s = Math.min(R.s, RACE + (C.runOut || 0)); // coast into the finish area, no further
  if (ELEV && state === 'run') R.climb += Math.max(0, elevM(R.s) - elevM(s0));
  if (state === 'run') {
    R.clock += dt * CLOCK;
    const u = uOf(R.s),
      zn = C.zoneOf(u);
    if (zn !== R.zone) {
      if (R.zone !== null && C.zoneMsg[zn]) toast(C.zoneMsg[zn], 1.8);
      R.zone = zn;
    }
    if (C.sights)
      C.sights.forEach(([su, msg], i) => {
        if (!R.seen[i] && (((su - u) % 1) + 1) % 1 < 0.04) {
          R.seen[i] = 1;
          toast(msg, 2.6);
        }
      });
    R.hillT -= dt;
    if (ELEV && R.hillT <= 0 && toastT <= 0) {
      if (g > 0.022) {
        toast('Uphill! Energy drains faster', 1.6);
        R.hillT = 14;
      } else if (g < -0.022) {
        toast('Downhill. Free speed!', 1.4);
        R.hillT = 14;
      }
    }
    // aid stations (NICE): a table on the left every 2 km; be in the left lane as you pass it to grab a drink
    if (C.aid)
      C.aid.forEach((as, i) => {
        const d = R.s - as;
        if (!R.aidWarn[i] && d > -260 && d < -120) {
          R.aidWarn[i] = 1;
          toast(`Aid station ahead on your left · KM ${as / 1000}`, 2);
        }
        if (!R.aidDone[i] && Math.abs(d) < 12 && R.lane === -1) {
          R.aidDone[i] = 1;
          R.energy = Math.min(100, R.energy + 35);
          R.boost = Math.max(R.boost, 2);
          R.counts.aid++;
          R.counts.water++;
          toast('Aid station: water + electrolytes · +35 energy');
          sfx.water();
        }
        if (!R.aidDone[i] && d >= 12) {
          R.aidDone[i] = 2;
          toast('Missed the aid station! Keep left next time', 1.8);
        }
      });
    if (R.s >= R.kmToast * 1000 && R.kmToast < C.km) {
      toast(`${R.kmToast} km done · ${fmtTime(R.clock)}`, 1.4);
      sfx.km();
      track('km', { km: R.kmToast });
      R.kmToast++;
    }
    if (R.s >= RACE) {
      R.s = RACE;
      finishRace();
    }
  }
  R.lat += (R.lane * LANE - R.lat) * Math.min(1, dt * 12);
  R.bump = 0;
  R.onSteps = false;
  for (const o of objs) {
    if (o.gone) continue;
    let ds = o.s - R.s;
    const mv = o.speed || MOVES[o.type];
    if (mv && !o.done && ds > -20 && ds < 320 && state === 'run') {
      o.s += mv * dt * SPD;
      ds = o.s - R.s;
    }
    if (ds < -25 || ds > 620 || o.s > RACE + 20) {
      o.g.visible = false;
      continue;
    }
    o.g.visible = true;
    const ou = uOf(o.s);
    frame(ou, fo);
    let lat = o.lat != null ? o.lat : o.lane * LANE,
      y = hU(ou),
      ry = Math.atan2(fo.tx, fo.tz) + (o.face || 0);
    if (o.done) {
      o.fly += dt;
      if (o.pick) {
        o.g.scale.setScalar(Math.max(0.01, 1 - o.fly * 3));
        if (o.fly > 0.35) {
          o.gone = true;
          o.g.visible = false;
        }
      } else {
        lat += o.flyDir * o.fly * 14;
        y += Math.max(0, o.fly * 7 - o.fly * o.fly * 14);
        ry += o.fly * 5;
        if (o.fly > 1.2) {
          o.gone = true;
          o.g.visible = false;
        }
      }
    }
    if (o.pick) {
      y += 1.05 + (reduced ? 0 : Math.sin(elapsed * 3 + o.s) * 0.15);
      if (o.g.userData.spin) o.g.userData.spin.rotation.y += dt * 2.2;
    }
    if (o.type === 'dog' && o.g.userData.tail) o.g.userData.tail.rotation.z = Math.sin(elapsed * 14) * 0.6;
    if (o.type === 'racer' && !o.done) {
      const ph = elapsed * (5 + (o.speed || 24) * 0.12) + (o.ph || 0), // quicker runners, quicker legs
        U2 = o.g.userData;
      U2.legs[0].rotation.x = Math.sin(ph) * 0.8;
      U2.legs[1].rotation.x = -Math.sin(ph) * 0.8;
      U2.arms[0].rotation.x = -Math.sin(ph) * 0.7;
      U2.arms[1].rotation.x = Math.sin(ph) * 0.7;
    }
    if (o.type === 'walkers' && !o.done)
      o.g.userData.walk.forEach((w, i) => {
        const a = Math.sin(elapsed * 5 + i * 1.3) * 0.5;
        w.arms[0].rotation.x = a;
        w.arms[1].rotation.x = -a;
        w.p.position.y = Math.abs(Math.sin(elapsed * 5 + i * 1.3)) * 0.05;
      });
    o.g.position.set(fo.x + fo.rx * lat, y, fo.z + fo.rz * lat);
    o.g.rotation.y = ry;
    if (o.type === 'aidfx') {
      const A = o.g.userData;
      A.spin.rotation.y += dt * 2.2;
      A.prize.position.y = 2 + (reduced ? 0 : Math.sin(elapsed * 3) * 0.2);
      A.prize.visible = R.aidDone[o.aid] !== 1; // gone once you've grabbed it
      A.sign.scale.setScalar(reduced ? 1 : 1 + 0.07 * Math.sin(elapsed * 2.4));
      continue;
    }
    if (o.type === 'steps') {
      const w = ds / DM;
      const b = bumpAt(w);
      if (b > 0) {
        R.bump = Math.max(R.bump, b);
        R.onSteps = true;
      }
      if (!o.done && ds < STEP_HALF * DM && state === 'run') {
        o.done = true;
        R.counts.steps = (R.counts.steps || 0) + 1;
        toast('Steps! Up and down', 1.1);
      }
      continue;
    }
    if (o.done || state !== 'run') continue;
    const hitLen = o.pick ? 5 : HIT[o.type] || 3,
      wide = o.type === 'cart' ? 1.35 : 1.15;
    if (Math.abs(ds) < hitLen && Math.abs(R.lat - o.lane * LANE) < wide) {
      if (o.pick) {
        o.done = true;
        if (o.type === 'water') {
          R.energy = Math.min(100, R.energy + 20);
          R.counts.water++;
          toast('Water · +20 energy');
          sfx.water();
        } else {
          R.energy = Math.min(100, R.energy + 14);
          R.boost = 4;
          R.counts.gel++;
          toast('Carb gel · +14 energy and a boost!');
          sfx.gel();
        }
      } else if (R.invuln <= 0) {
        o.done = true;
        o.flyDir = Math.sign(o.lane * LANE - R.lat) || 1;
        R.v *= 0.35;
        R.stumble = 0.9;
        R.invuln = 1.2;
        R.energy = Math.max(0, R.energy - 6);
        R.counts[o.type] = (R.counts[o.type] || 0) + 1;
        toast(HIT_MSG[o.type] || 'Stumbled!');
        sfx.hit();
      }
    }
  }
}

// ---------- render ----------
const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3();
let camInit = false;
function place(dt) {
  frame(uOf(R.s), fr);
  const gy = hS(R.s);
  const x = fr.x + fr.rx * R.lat,
    z = fr.z + fr.rz * R.lat;
  runner.g.position.set(x, 0.04 + gy + R.bump, z);
  runner.g.rotation.y = Math.atan2(fr.tx, fr.tz);
  const sp = Math.min(1, R.v / 45);
  R.phase += ((R.v * SPD) / DM) * dt * 1.15;
  const sw = Math.sin(R.phase) * 0.95 * sp;
  if (state === 'done' && R.v < 2) {
    celebT += dt;
    const up = Math.min(1, celebT * 3);
    runner.legs[0].rotation.x = runner.legs[1].rotation.x = 0;
    for (const a of runner.arms) {
      a.rotation.x = -2.9 * up;
    }
    runner.arms[0].rotation.z = -0.25 * up;
    runner.arms[1].rotation.z = 0.25 * up;
    runner.body.position.y = reduced ? 0 : Math.abs(Math.sin(celebT * 6)) * 0.25 * up;
    runner.body.rotation.x = 0;
  } else {
    runner.arms[0].rotation.z = runner.arms[1].rotation.z = 0;
    runner.legs[0].rotation.x = sw;
    runner.legs[1].rotation.x = -sw;
    runner.arms[0].rotation.x = -sw * 0.85;
    runner.arms[1].rotation.x = sw * 0.85;
    runner.body.position.y =
      Math.abs(Math.sin(R.phase)) * 0.09 * sp + (R.v < 1 && !reduced ? Math.sin(elapsed * 3) * 0.015 : 0);
    runner.body.rotation.x =
      R.stumble > 0 ? Math.sin(R.stumble * 18) * 0.3 + 0.2 : Math.min(0.16, R.v / 450) + R.grade * 2.5;
  }
  runner.g.visible = !(R.invuln > 0 && R.stumble <= 0 && Math.floor(elapsed * 14) % 2 === 0);
  runner.medal.visible = !!C.medal && state === 'done' && celebT > 0.15;
  if (R.photoPending) {
    R.photoPending = false;
    takeFinishPhoto(); // the runner is on the line this frame
  }
  // trophy: the route's treat rises above the runner at the finish
  const tnow = performance.now() / 1000,
    TU = trophy.userData;
  const TD = treatDelay(); // with a medal, it goes on first and the treat follows
  trophy.visible = TU.plateG.visible = TU.cf.visible = state === 'done' && celebT > TD;
  let hold = 0;
  if (trophy.visible) {
    const t = Math.min(1, (celebT - TD) * 1.6),
      e = 1 - Math.pow(1 - t, 3),
      sc = 0.15 + 0.85 * e,
      ry = Math.atan2(fr.tx, fr.tz);
    const h = Math.max(0, Math.min(1, (tnow - holdAt) / 0.6));
    hold = h * h * (3 - 2 * h);
    const tx0 = x + fr.tx * 3,
      tz0 = z + fr.tz * 3;
    trophy.position.set(tx0, 1.25 + gy, tz0);
    trophy.rotation.y = ry;
    trophy.scale.setScalar(Math.max(0.001, sc * (1 - hold)));
    const lerp = (p, q) => p + (q - p) * hold,
      arc = hold * (1 - hold) * 1.4;
    TU.plateG.position.set(lerp(tx0, x - fr.rx * 0.62), lerp(1.25, 2.7) + arc + gy, lerp(tz0, z - fr.rz * 0.62));
    TU.plateG.rotation.y = ry;
    TU.plateG.scale.setScalar(sc * (1 - 0.56 * hold));
    const cs = Math.cos(ry),
      sn = Math.sin(ry),
      cx0 = tx0 + (1.35 * cs + 1.2 * sn) * sc,
      cz0 = tz0 + (-1.35 * sn + 1.2 * cs) * sc;
    TU.cf.position.set(lerp(cx0, x + fr.rx * 0.62), lerp(1.25, 2.45) + arc + gy, lerp(cz0, z + fr.rz * 0.62));
    TU.cf.rotation.y = ry;
    TU.cf.scale.setScalar(sc * (1 - 0.1 * hold));
    TU.spin.rotation.y = reduced ? 0 : Math.sin(elapsed * 0.6) * 0.5 * (1 - hold);
    TU.steam.forEach((m, i) => {
      const ph = (elapsed * 0.6 + i / 3) % 1;
      m.position.set(Math.sin(ph * 6 + i) * 0.08, 0.8 + ph * 0.9, 0);
      m.material.opacity = 0.6 * (1 - ph);
    });
  }
  const gr = state === 'done' && tnow >= holdAt && !finishShown;
  $('greatRun').hidden = !gr;
  if (gr) {
    toastEl.classList.remove('show');
    toastT = 0;
  }
  // camera: chase from behind (riding the hills with you); at the finish swing round to face the runner
  let tx, ty, tz, lx, ly, lz;
  const cy = hS(R.s - 7.6 * DM),
    ly0 = hS(R.s + 9 * DM);
  if (state === 'done' && celebT > 0) {
    const a = Math.min(1, celebT * 0.7);
    const bx = x - fr.tx * 7.6,
      bz = z - fr.tz * 7.6,
      fx = x + fr.tx * 8 + fr.rx * 1.6,
      fz = z + fr.tz * 8 + fr.rz * 1.6;
    tx = bx + (fx - bx) * a;
    tz = bz + (fz - bz) * a;
    ty = 4.1 + a * 0.6 + gy;
    lx = x + fr.tx * 2.2 * a * (1 - hold);
    lz = z + fr.tz * 2.2 * a * (1 - hold);
    ly = 1.3 + a * 0.4 + hold * 0.9 + gy;
  } else {
    tx = x - fr.tx * 7.6;
    tz = z - fr.tz * 7.6;
    ty = 4.1 + Math.max(cy, gy - 0.8);
    lx = x + fr.tx * 9;
    lz = z + fr.tz * 9;
    ly = 1.3 + (gy + ly0) / 2;
  }
  if (!camInit) {
    camPos.set(tx, ty, tz);
    camLook.set(lx, ly, lz);
    camInit = true;
  }
  const k = Math.min(1, dt * 7);
  camPos.x += (tx - camPos.x) * k;
  camPos.z += (tz - camPos.z) * k;
  camPos.y += (ty - camPos.y) * k;
  camLook.x += (lx - camLook.x) * k;
  camLook.z += (lz - camLook.z) * k;
  camLook.y += (ly - camLook.y) * k;
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if (C.id === 'cubbon') {
    const u0 = U[5] + 0.01,
      u1 = U[6] - 0.012;
    const tt = (Math.sin(elapsed * 0.32) + 1) / 2;
    train.forEach((c, i) => {
      const u = u0 + (u1 - u0 - 0.02) * tt + (i * 7.7) / LOOP;
      frame(u, fo);
      c.position.set(fo.x + fo.rx * VIA, 8.05, fo.z + fo.rz * VIA);
      c.rotation.y = Math.atan2(fo.tx, fo.tz);
    });
  }
}
