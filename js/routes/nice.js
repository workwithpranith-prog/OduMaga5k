'use strict';
// ================= NICE Road 10K =================
// The Oct 2026 race: 5 km out along the expressway, U-turn, 5 km back on the other carriageway. Fully open, rolling hills.
const NOFF = 6.3; // carriageway centre to median centre (world units)
let NICE_TURN = 0.5,
  TURN_C = { x: 0, z: 0 };
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
  const home = [];
  for (let k = 1; k < 12; k++) {
    const th = (Math.PI * k) / 12,
      c = P[0],
      t = T[0];
    home.push({
      x: c.x - T[0].tz * o * Math.cos(th) - t.tx * o * Math.sin(th),
      z: c.z + T[0].tx * o * Math.cos(th) - t.tz * o * Math.sin(th)
    });
  }
  const len = A => {
    let s = 0;
    for (let i = 1; i < A.length; i++) s += Math.hypot(A[i].x - A[i - 1].x, A[i].z - A[i - 1].z);
    return s;
  };
  const race = [...out, ...turn, ...back];
  TURN_C = P[e];
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
  // start / finish across both carriageways
  startArch(0, 'ODU MAGA 10K', -6.8, 2 * o + 6.8);
  ribbon(FRAC - 1 / LOOP, FRAC + 1 / LOOP, -4.1, 4.1, 0.05, matLineW, 1);
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
  // water stations: a table, cups and volunteers at each aid point
  for (const s of C.pickups.water) {
    const { R } = site(uOf(s), -8.4, 3);
    R('white', 1, 0.9, 3.4, 0, 0, 0);
    for (let k = -1; k <= 1; k++) R('blue', 0.2, 0.25, 0.2, 0, 0.9, k * 1.1);
    R('dark', 0.5, 0.9, 0.3, 0, 0, -1.2);
    R('orange', 0.6, 0.8, 0.36, 0, 0.9, -1.2);
    R('bark', 0.42, 0.42, 0.42, 0, 1.7, -1.2);
    BASEY = null;
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
