'use strict';
// ================= NICE Road 10K =================
// The Oct 2026 race: 5 km out along the expressway, U-turn, 5 km back on the other carriageway. Fully open, rolling hills.
const NOFF = 6.3; // carriageway centre to median centre (world units)
let NICE_TURN = 0.5,
  TURN_C = { x: 0, z: 0 },
  TURN_T = { tx: 0, tz: 1 }; // the road's direction at the 5 km turnaround
function nicePath() {
  ORIGIN = { lat: NICE_GPS[0][0], lng: NICE_GPS[0][1] };
  const P = smoothPts(
      NICE_GPS.map(p => projM(p[0], p[1])),
      8,
      false
    ),
    n = P.length,
    o = NOFF * DM;
  const T = P.map((p, i) => {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(n - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { tx: (b.x - a.x) / l, tz: (b.z - a.z) / l };
  });
  const side = (i, s) => ({ x: P[i].x + -T[i].tz * o * s, z: P[i].z + T[i].tx * o * s }); // s=-1: left of travel (outbound), +1: the other carriageway
  const out = P.map((_, i) => side(i, -1)),
    back = P.map((_, i) => side(i, 1)).reverse();
  const turn = [],
    e = n - 1;
  for (let k = 1; k < 12; k++) {
    const th = (Math.PI * k) / 12,
      c = P[e],
      t = T[e];
    turn.push({
      x: c.x + T[e].tz * o * Math.cos(th) + t.tx * o * Math.sin(th),
      z: c.z - T[e].tx * o * Math.cos(th) + t.tz * o * Math.sin(th)
    });
  }
  // behind the start/finish both carriageways carry on as closed, empty road (barricaded in buildNice),
  // and only join up with a U-turn far out of sight, so the drawn path can still be one loop
  const home = [],
    c0 = P[0],
    t0 = T[0],
    EXT = 1800,
    STEP = 40;
  for (let d = STEP; d <= EXT; d += STEP)
    home.push({ x: c0.x - t0.tz * o - t0.tx * d, z: c0.z + t0.tx * o - t0.tz * d });
  const fc = { x: c0.x - t0.tx * EXT, z: c0.z - t0.tz * EXT };
  for (let k = 1; k < 12; k++) {
    const th = (Math.PI * k) / 12;
    home.push({
      x: fc.x - t0.tz * o * Math.cos(th) - t0.tx * o * Math.sin(th),
      z: fc.z + t0.tx * o * Math.cos(th) - t0.tz * o * Math.sin(th)
    });
  }
  for (let d = EXT; d >= STEP; d -= STEP)
    home.push({ x: c0.x + t0.tz * o - t0.tx * d, z: c0.z - t0.tx * o - t0.tz * d });
  const len = A => {
    let s = 0;
    for (let i = 1; i < A.length; i++) s += Math.hypot(A[i].x - A[i - 1].x, A[i].z - A[i - 1].z);
    return s;
  };
  const race = [...out, ...turn, ...back];
  TURN_C = P[e];
  TURN_T = T[e];
  return { raw: [...race, ...home], raceRaw: len(race) };
}
function pylon(x, z, ry) {
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ])
    box('dark', 0.3, 20, 0.3, x + sx * 1.1, 0, z + sz * 1.1, ry);
  box('dark', 0.9, 6, 0.9, x, 20, z, ry);
  box('dark', 10, 0.3, 0.4, x, 17, z, ry);
  box('dark', 7, 0.3, 0.4, x, 21.5, z, ry);
  box('dark', 0.4, 1.2, 0.4, x, 26, z, ry);
}
function buildNice() {
  const f = {},
    o = NOFF;
  TURN_C = { x: TURN_C.x * SCALE, z: TURN_C.z * SCALE };
  ribbon(0, 1, -5.7, 4.5, 0.04, matAsphalt, 3);
  ribbon(0, 1, -4.45, -4.25, 0.06, matLineY, 1);
  ribbon(0, 1, 4.25, 4.45, 0.06, matLineW, 1);
  laneDashes([[0, 1]]);
  ribbon(0, 1, 4.5, o + 0.02, 0.34, matMedian, 2);
  wall(0, 1, 4.5, 0.03, 0.34, matKerb, 1.2); // planted median
  wall(0, 1, -6.1, 0.25, 0.95, matBarrier, 1.6, true); // crash barrier
  ribbon(0, 1, -5.7, -7.6, 0.02, matSoil, 2);
  wall(0, 1, -7.6, -1.8, 0.02, matSoil, 2); // gravel verge and embankment
  for (let s = 0; s < LOOP; s += 4) {
    const u = s / LOOP;
    frame(u, f);
    BASEY = hU(u);
    box('dark', 0.18, 0.95, 0.18, f.x - f.rx * 6.15, 0, f.z - f.rz * 6.15);
  }
  // median planting and street lights (once, from the outbound side)
  for (let s = 10; s < NICE_TURN * LOOP - 10; s += 3) {
    const u = s / LOOP;
    frame(u, f);
    BASEY = hU(u);
    const k = Math.round(s / 3);
    const x = f.x + f.rx * o,
      z = f.z + f.rz * o;
    if (k % 2 === 0) box(k % 5 === 0 ? 'leafP' : 'hedge', 0.9, 0.7 + ((k * 7) % 3) * 0.15, 0.9, x, 0.34, z);
    if (k % 12 === 0) {
      const ry = Math.atan2(f.tx, f.tz);
      box('concrete', 0.35, 9, 0.35, x, 0.34, z);
      box('concrete', 4, 0.22, 0.22, x, 9.2, z, ry);
      for (const s2 of [-1, 1]) box('lamp', 0.9, 0.3, 0.6, x + f.rx * s2 * 1.9, 9, z + f.rz * s2 * 1.9, ry);
    }
  }
  BASEY = null;
  // start / finish across both carriageways. The front (seen by the finish-line photographer) carries the credit.
  startArch(0, 'ODU MAGA 10K', -6.8, 2 * o + 6.8, {
    front: ['ODU MAGA', 'by @yourrunningbro'],
    back: ['ODU MAGA 10K', 'FINISH'],
    res: 1600,
    bg: '#f0742a' // orange arch on race day
  });
  buildNiceFinish();
  for (let k = 1; k < 10; k++) {
    if (k === 5) continue;
    roadsideSign(uOf(k * 1000), -7, [`KM ${k}`], 1.8, 1.1, '#1f6b3a', '#ffffff');
  }
  gantry(uOf(260), ['NICE ROAD', 'Peripheral Ring Road']);
  gantry(uOf(4550), ['TURNAROUND', '450 m ahead'], '#b5401f');
  gantry(uOf(5600), ['FINISH', '4.4 km · climbs ahead'], '#1f6b3a');
  gantry(uOf(9550), ['FINISH', '450 m'], '#b5401f');
  // toll plaza at 1.7 km, over both carriageways
  {
    const ut = uOf(1700);
    frame(ut, f);
    const h = hU(ut);
    BASEY = h;
    const ry = Math.atan2(f.tx, f.tz),
      at = l => ({ x: f.x + f.rx * l, z: f.z + f.rz * l }),
      c = at(o);
    box('white', 2 * o + 21, 0.9, 9, c.x, 7.2, c.z, ry);
    box('green', 2 * o + 21.4, 0.5, 9.4, c.x, 6.9, c.z, ry);
    for (const l of [-9.8, o, 2 * o + 9.8]) {
      const p = at(l);
      box('concrete', 0.8, 7, 0.8, p.x, 0, p.z);
    }
    for (const l of [-8.2, 2 * o + 8.2]) {
      const p = at(l);
      box('concrete', 2.4, 0.3, 7, p.x, 0, p.z, ry);
      box('cream', 1.8, 2.6, 2.2, p.x, 0.3, p.z, ry);
      box('blue', 1.9, 0.3, 2.3, p.x, 2.9, p.z, ry);
    }
    BASEY = null;
    const p0 = at(0),
      p1 = at(2 * o);
    faceAt(
      textPlane(['TOLL PLAZA', 'Race day · all lanes open'], 10, 1.6, '#1f6b3a', '#ffffff', { sizes: [44, 26] }),
      p0.x - f.tx * 4.7,
      8.4 + h,
      p0.z - f.tz * 4.7,
      f.tx,
      f.tz
    );
    faceAt(
      textPlane(['TOLL PLAZA', 'Race day · all lanes open'], 10, 1.6, '#1f6b3a', '#ffffff', { sizes: [44, 26] }),
      p1.x + f.tx * 4.7,
      8.4 + h,
      p1.z + f.tz * 4.7,
      -f.tx,
      -f.tz
    );
    FOOT.push({ x: c.x, z: c.z, r: 2 * o + 18 });
  }
  // interchange flyover crossing over at 3.5 km, with lorries on it
  {
    const ub = uOf(3500);
    frame(ub, f);
    const h = hU(ub);
    BASEY = h;
    const ry = Math.atan2(f.tx, f.tz),
      at = l => ({ x: f.x + f.rx * l, z: f.z + f.rz * l }),
      c = at(o);
    box('concrete', 170, 1.2, 10, c.x, 8.4, c.z, ry);
    box('white', 170, 0.8, 0.35, c.x + f.tx * 4.9, 9.6, c.z + f.tz * 4.9, ry);
    box('white', 170, 0.8, 0.35, c.x - f.tx * 4.9, 9.6, c.z - f.tz * 4.9, ry);
    for (const l of [-10.5, 2 * o + 10.5, -45, 2 * o + 45, -78, 2 * o + 78])
      for (const dz of [-3, 3]) {
        const p = at(l);
        box('concrete', 1.3, 11.4, 1.3, p.x + f.tx * dz, -3, p.z + f.tz * dz);
      }
    for (const [l, col, dz] of [
      [-28, 'orange', 2.2],
      [o + 14, 'blue', -2.2],
      [2 * o + 40, 'green', 2.2]
    ]) {
      const p = at(l);
      box(col, 8, 3, 2.6, p.x + f.tx * dz, 9.6, p.z + f.tz * dz, ry);
      box('cream', 2.4, 2.6, 2.6, p.x + f.tx * dz - f.rx * 5, 9.6, p.z + f.tz * dz - f.rz * 5, ry);
    }
    BASEY = null;
    FOOT.push({ x: c.x, z: c.z, r: 2 * o + 14 });
  }
  // turnaround: cones round the median nose, a marshal and a sign
  {
    BASEY = hU(NICE_TURN);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      box('orange', 0.5, 0.8, 0.5, TURN_C.x + Math.cos(a) * 2.4, 0, TURN_C.z + Math.sin(a) * 2.4);
    }
    person(TURN_C.x, TURN_C.z, 0, 'orange');
    box('orange', 0.1, 1.6, 0.1, TURN_C.x + 0.5, 1.2, TURN_C.z);
    box('red', 0.8, 0.5, 0.05, TURN_C.x + 0.9, 2.5, TURN_C.z);
    const fu = frame(uOf(4930), {});
    const p = textPlane(['U-TURN', '5 KM'], 3.2, 1.6, '#b5401f', '#ffffff', { both: true });
    p.position.set(TURN_C.x, 4.2 + BASEY, TURN_C.z);
    p.rotation.y = Math.atan2(-fu.tx, -fu.tz);
    BASEY = null;
    FOOT.push({ x: TURN_C.x, z: TURN_C.z, r: 6 });
  }
  buildTurnStub();
  // aid stations: a table on the left-hand shoulder every 2 km (run in the left lane to grab a drink)
  for (const s of C.aid) {
    const { R, c, ry } = site(uOf(s), -4.95, 4);
    R('white', 4.2, 0.9, 1, 0, 0, 0);
    for (let k = 0; k < 9; k++)
      R(k % 3 ? 'blue' : 'orange', 0.22, 0.28, 0.22, -1.8 + k * 0.45, 0.9, 0.2 - (k % 2) * 0.3);
    R('gold', 0.7, 0.4, 0.5, 1.6, 0.9, -0.2);
    for (const lx of [-1.4, 0, 1.4]) {
      R('dark', 0.5, 0.9, 0.3, lx, 0, -0.9);
      R('orange', 0.6, 0.8, 0.36, lx, 0.9, -0.9);
      R('bark', 0.42, 0.42, 0.42, lx, 1.7, -0.9);
      R('orange', 0.16, 0.16, 0.6, lx + 0.3, 1.35, -0.45);
      R('blue', 0.2, 0.26, 0.2, lx + 0.3, 1.4, -0.1);
    }
    R('dark', 0.12, 3.3, 0.12, -2.2, 0, -1.4);
    R('dark', 0.12, 3.3, 0.12, 2.2, 0, -1.4);
    plaque(c, ry, -1.38, 2.8, ['AID STATION', `KM ${s / 1000}`], 4.6, 1, '#1f6b3a', '#ffffff', { sizes: [44, 30] });
    BASEY = null;
    roadsideSign(uOf(s - 70), -7, ['AID STATION', 'Keep left'], 2.4, 1.1, '#1f6b3a', '#ffffff');
  }
  // supporters at the start and the turnaround
  for (const s of [60, 140, 4880, 5120, 9850, 9930]) {
    const fr = frame(uOf(s), {});
    BASEY = hU(uOf(s));
    for (let k = 0; k < 3; k++) {
      const l = -8.6 - k * 0.9;
      person(
        fr.x + fr.rx * l + fr.tx * k * 0.8,
        fr.z + fr.rz * l + fr.tz * k * 0.8,
        Math.atan2(-fr.rx, -fr.rz),
        ['red', 'blue', 'saffron', 'green', 'white'][(k + s) % 5]
      );
    }
  }
  BASEY = null;
  // open country: eucalyptus, granite boulders, crop fields, power lines, far-off apartment towers and hills
  for (let s = 0; s < LOOP; s += 4) {
    const u = s / LOOP;
    frame(u, f);
    const k = (s / 4) | 0,
      ry = Math.atan2(f.tx, f.tz);
    const P = l => ({ x: f.x - f.rx * l, z: f.z - f.rz * l });
    if (k % 3 === 0) {
      const p = P(13 + srnd() * 42);
      if (clearOf(p.x, p.z, 9)) (srnd() < 0.75 ? eucalyptus : canopyTree)(p.x, p.z);
    }
    if (k % 7 === 1) {
      const p = P(20 + srnd() * 70);
      if (clearOf(p.x, p.z, 9)) {
        const w = 2 + srnd() * 4;
        box('rock', w, w * 0.7, w * 1.1, p.x, -0.3, p.z, srnd() * 3);
        box('rock', w * 0.6, w * 0.5, w * 0.7, p.x + w * 0.5, -0.3, p.z + 0.4, srnd() * 3);
      }
    }
    if (k % 9 === 2) {
      const p = P(34 + srnd() * 60);
      if (clearOf(p.x, p.z, 16))
        box(srnd() < 0.5 ? 'crop' : 'field', 14 + srnd() * 12, 0.14, 10 + srnd() * 10, p.x, 0, p.z, ry);
    }
    if (k % 16 === 0 && u < NICE_TURN) {
      const p = P(60);
      if (clearOf(p.x, p.z, 6)) pylon(p.x, p.z, ry);
    }
    if (k % 23 === 5) {
      const p = P(150 + srnd() * 130);
      const w = 12 + srnd() * 10,
        h = 24 + srnd() * 34;
      if (clearOf(p.x, p.z, w)) {
        box('wall' + ((srnd() * WALLS.length) | 0), w, h, w * 0.8, p.x, -1, p.z, srnd());
        box('dark', 3, 2, 3, p.x, h - 1, p.z);
      }
    }
    if (k % 29 === 7) {
      const p = P(300 + srnd() * 140);
      const w = 50 + srnd() * 60;
      box(srnd() < 0.5 ? 'leafD' : 'rock', w, 14 + srnd() * 16, w * 0.7, p.x, -2, p.z, srnd());
      box('leafD', w * 0.6, 8, w * 0.4, p.x, 10, p.z, srnd());
    }
  }
}

// ---------- NICE finish area ----------
// Red carpet over the last stretch, a finish zone with people standing about, a photographer on a riser
// on the median, and barricades closing the road behind it.
let PHOTOG = null; // where the photographer's camera is (read by photo.js)
function buildNiceFinish() {
  const o = NOFF,
    f = {},
    uF = FRAC;
  // red carpet with gold edges over the last 12.5 world units (about 10 m at the runner's scale), then the line on top
  const carpet = new THREE.MeshLambertMaterial({ color: '#b3122a', side: DS });
  const gold = new THREE.MeshLambertMaterial({ color: '#e3b23c', side: DS });
  ribbon(uF - 12.5 / LOOP, uF + 2 / LOOP, -3.9, 3.9, 0.07, carpet, 2);
  for (const s of [-1, 1]) ribbon(uF - 12.5 / LOOP, uF + 2 / LOOP, s * 3.9, s * 4.15, 0.075, gold, 1);
  ribbon(uF - 0.5 / LOOP, uF + 0.5 / LOOP, -4.1, 4.1, 0.085, matLineW, 1);
  ribbon(-0.5 / LOOP, 0.5 / LOOP, -4.1, 4.1, 0.05, matLineW, 1);
  // positions past the finish line, measured along the finishing carriageway (lat 2*o is the outbound carriageway)
  const at = (metresPast, lat) => {
    frame(uOf(RACE + metresPast), f);
    return { x: f.x + f.rx * lat, z: f.z + f.rz * lat, ry: Math.atan2(-f.tx, -f.tz), h: hU(uOf(RACE + metresPast)) };
  };
  const tees = ['red', 'blue', 'saffron', 'green', 'white', 'orange', 'cream'];
  let k = 0;
  // finishers, volunteers and family standing in the open space after the line (kept off the photographer's view)
  for (let m = 8; m < 42; m += 3.2)
    for (const lat of [-6.4, -7.4, 2 * o + 4.9, 2 * o + 5.9]) {
      if ((k++ * 7) % 5 === 0) continue;
      const p = at(m, lat + (k % 3) * 0.3);
      BASEY = p.h;
      person(p.x, p.z, p.ry + (k % 4) * 0.6, tees[k % tees.length]);
    }
  for (const [m, lat] of [
    [26, 2 * o - 1.5],
    [30, 2 * o + 1.2],
    [34, 2 * o - 0.4],
    [38, 2 * o + 2.2]
  ]) {
    const p = at(m, lat);
    BASEY = p.h;
    person(p.x, p.z, p.ry + k++ * 0.9, tees[k % tees.length]);
  }
  // the photographer on a riser 16 units past the line, by the finishing lanes, facing the runners
  {
    const p = at(64, o * 0.45);
    BASEY = p.h;
    box('dark', 1.6, 1.4, 1.6, p.x, 0, p.z);
    box('concrete', 1.8, 0.12, 1.8, p.x, 1.4, p.z);
    box('dark', 0.5, 0.9, 0.3, p.x, 1.52, p.z, p.ry);
    box('blue', 0.6, 0.8, 0.36, p.x, 2.42, p.z, p.ry);
    box('bark', 0.42, 0.42, 0.42, p.x, 3.22, p.z, p.ry);
    const fwd = { x: Math.sin(p.ry), z: Math.cos(p.ry) }; // towards the finish line
    box('dark', 0.36, 0.3, 0.3, p.x + fwd.x * 0.35, 3.24, p.z + fwd.z * 0.35, p.ry);
    box('white', 0.22, 0.16, 0.12, p.x + fwd.x * 0.35, 3.5, p.z + fwd.z * 0.35, p.ry);
    PHOTOG = {
      x: p.x + fwd.x * 0.6,
      y: p.h + 3.4,
      z: p.z + fwd.z * 0.6
    };
    FOOT.push({ x: p.x, z: p.z, r: 3 });
  }
  // barricades across both carriageways: the road carries on behind them, empty
  {
    const p = at(80, 0);
    BASEY = p.h;
    frame(uOf(RACE + 80), f);
    const ry = Math.atan2(f.tx, f.tz);
    for (let lat = -6.2, i = 0; lat <= 2 * o + 6.2; lat += 1.3, i++) {
      const x = f.x + f.rx * lat,
        z = f.z + f.rz * lat;
      box(i % 2 ? 'white' : 'red', 1.25, 0.5, 0.08, x, 0.45, z, ry);
      box(i % 2 ? 'red' : 'white', 1.25, 0.2, 0.08, x, 0.2, z, ry);
      box('dark', 0.08, 1, 0.5, x - f.rx * 0.6, 0, z - f.rz * 0.6, ry);
    }
    const c = { x: f.x + f.rx * o, z: f.z + f.rz * o };
    const sign = textPlane(['ROAD CLOSED', 'Race in progress'], 4, 1.2, '#b5401f', '#ffffff', { both: true });
    sign.position.set(c.x, p.h + 1.6, c.z);
    sign.rotation.y = ry + Math.PI; // face the finishers, so the text reads the right way round
    box('dark', 0.12, 1.6, 0.12, c.x, 0, c.z);
  }
  BASEY = null;
}

// ---------- beyond the 5 km U-turn: the expressway carries on, closed off ----------
// Not part of the race path, so it's built from flat strips: both carriageways, the median, edge barriers,
// then barricades and marshals across it just past the U-turn so everyone turns back.
function flatStrip(at, d0, d1, l0, l1, y, mat, unit) {
  const a = at(d0, l0),
    b = at(d0, l1),
    c = at(d1, l0),
    d = at(d1, l1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, y, a.z, b.x, y, b.z, c.x, y, c.z, d.x, y, d.z], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  const lu = (l1 - l0) / unit,
    du = (d1 - d0) / unit;
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, lu, 0, 0, du, lu, du], 2));
  g.setIndex([0, 2, 1, 1, 2, 3]);
  world.add(new THREE.Mesh(g, mat));
}
function buildTurnStub() {
  const o = NOFF,
    h = hU(NICE_TURN),
    t = TURN_T,
    rx = -t.tz,
    rz = t.tx,
    L = 400,
    W = o + 5.8;
  const at = (d, l) => ({ x: TURN_C.x + t.tx * d + rx * l, z: TURN_C.z + t.tz * d + rz * l });
  const ry = Math.atan2(t.tx, t.tz);
  flatStrip(at, 0, L, -W, W, h + 0.03, matAsphalt, 3);
  flatStrip(at, 14, L, -1.8, 1.8, h + 0.34, matMedian, 2);
  for (const s of [-1, 1]) flatStrip(at, 14, L, s * (o + 4.25), s * (o + 4.45), h + 0.05, matLineY, 1);
  BASEY = h;
  for (let d = 16; d < L; d += 3.5)
    for (const l of [-o - 1.3, -o + 1.3, o - 1.3, o + 1.3]) {
      const p = at(d, l);
      box('white', 0.16, 0.06, 1.4, p.x, 0, p.z, ry);
    }
  for (const s of [-1, 1]) {
    const m = at(L / 2, s * (W + 0.1));
    box('soil', 0.3, 2, L, m.x, -2, m.z, ry); // embankment edge
    for (let d = 2; d < L; d += 4) {
      const p = at(d, s * (W - 0.3));
      box('dark', 0.18, 0.95, 0.18, p.x, 0, p.z);
    }
    const b = at(L / 2, s * (W - 0.3));
    box('concrete', 0.12, 0.35, L, b.x, 0.55, b.z, ry); // crash barrier
  }
  // barricades right after the U-turn, across both carriageways
  const bd = o + 7.5;
  for (let l = -W + 0.6, i = 0; l <= W - 0.6; l += 1.3, i++) {
    const p = at(bd, l);
    box(i % 2 ? 'white' : 'red', 1.25, 0.5, 0.08, p.x, 0.45, p.z, ry);
    box(i % 2 ? 'red' : 'white', 1.25, 0.2, 0.08, p.x, 0.2, p.z, ry);
  }
  for (const l of [-o - 3, o + 3, -o + 2, o - 2]) {
    const p = at(bd + 1.5, l);
    person(p.x, p.z, ry, 'orange');
  }
  BASEY = null;
  for (const s of [-1, 1]) {
    const p = at(bd + 0.3, s * o);
    const sign = textPlane(['ROAD CLOSED', 'Turn around'], 4, 1.2, '#b5401f', '#ffffff', { both: true });
    sign.position.set(p.x, h + 1.7, p.z);
    sign.rotation.y = ry + Math.PI; // face the runners coming into the turn
  }
  for (let d = 0; d <= L; d += 18) {
    const p = at(d, 0);
    FOOT.push({ x: p.x, z: p.z, r: W + 6 });
  }
}
