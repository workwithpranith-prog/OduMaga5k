'use strict';
// ================= Ulsoor Lake 3K =================
// One lap of the roads around the lake. The lake is always on your left; you run on the footpath and the road.
const ULS_Z = [
  [0, 0.13, 'path'],
  [0.13, 0.41, 'road'],
  [0.41, 0.73, 'path'],
  [0.73, 0.81, 'road'],
  [0.81, 1, 'path']
];
const ulsZone = u => {
  u = ((u % 1) + 1) % 1;
  for (const z of ULS_Z) if (u >= z[0] && u < z[1]) return z[2];
  return 'path';
};
let LAKE = { xs: [], zs: [] },
  WATER_Y = 0;
const ULS_START = 0.905; // start/finish on the straight just past the Gurudwara (share of the lap from the GPS start)
const ULS_BANK = 6.4; // lake edge, from the middle of the running lanes
function ulsoorPrep() {
  const f = {},
    xs = [],
    zs = [];
  let mn = 1e9;
  for (let i = 0; i < N; i += 6) {
    const u = i / N;
    frame(u, f);
    xs.push(f.x + f.rx * IN * ULS_BANK);
    zs.push(f.z + f.rz * IN * ULS_BANK);
    mn = Math.min(mn, hU(u));
  }
  LAKE = { xs, zs };
  WATER_Y = mn - 0.9;
}
function foodStall(u, lat, kind) {
  const { R, c, ry } = site(u, lat, 4);
  if (kind === 'chai') {
    R('cream', 3.2, 2.4, 2.2, 0, 0, 0);
    R('red', 3.8, 0.3, 2.8, 0, 2.4, 0);
    R('wood', 3.2, 0.9, 0.6, 0, 0, 1.3);
    R('white', 0.3, 0.4, 0.3, -0.8, 0.9, 1.3);
    R('white', 0.3, 0.4, 0.3, 0.8, 0.9, 1.3);
    plaque(c, ry, 1.12, 2.0, ['CHAI'], 1.6, 0.5, '#c63b2b', '#ffffff');
  } else {
    R('wood', 2.4, 0.9, 1.4, 0, 0.5, 0);
    R('dark', 0.5, 0.5, 0.2, -0.8, 0, 0.7);
    R('dark', 0.5, 0.5, 0.2, 0.8, 0, 0.7);
    R('bark', 0.12, 2.4, 0.12, 0, 1.4, 0);
    R(kind === 'corn' ? 'gold' : 'saffron', 3, 0.2, 3, 0, 3.8, 0);
    R(kind === 'corn' ? 'gold' : 'white', 1.6, 0.4, 0.8, 0, 1.4, 0);
  }
  const fr = site(u, lat + (lat > 0 ? -2.2 : 2.2));
  fr.R('blue', 0.6, 0.8, 0.36, -0.8, 0.9, 0);
  fr.R('bark', 0.42, 0.42, 0.42, -0.8, 1.7, 0);
  fr.R('dark', 0.5, 0.9, 0.3, -0.8, 0, 0);
  fr.R('saffron', 0.6, 0.8, 0.36, 0.9, 0.9, 0.4);
  fr.R('bark', 0.42, 0.42, 0.42, 0.9, 1.7, 0.4);
  fr.R('dark', 0.5, 0.9, 0.3, 0.9, 0, 0.4);
  BASEY = null;
}
function buildUlsoor() {
  const ls = a => IN * a,
    os = a => -IN * a,
    f = {};
  // running surface: footpath pavers or road, by stretch
  for (const [a, b, k] of ULS_Z)
    ribbon(a, b, -4.1, 4.1, 0.04, k === 'road' ? matAsphalt : matPav, k === 'road' ? 3 : 2);
  laneDashes(ULS_Z.filter(z => z[2] === 'road').map(z => [z[0], z[1]]));
  // lake side: kerb, a thin grass verge, a low see-through railing, then the stone bund and the water
  ribbon(0, 1, ls(4.1), ls(4.65), 0.24, matKerb, 1.2);
  wall(0, 1, ls(4.1), 0.03, 0.24, matKerb, 1.2);
  ribbon(0, 1, ls(4.65), ls(ULS_BANK), 0.2, matGrass, 1.5);
  wall(0, 1, ls(5.6), 0.2, 1.15, matRail, 1.6, true);
  wall(0, 1, ls(ULS_BANK), -4, 0.2, matStone, 2);
  for (let s = 0; s < LOOP; s += 10) {
    const u = s / LOOP;
    frame(u, f);
    BASEY = hU(u);
    box('teal', 0.26, 1.15, 0.26, f.x + f.rx * ls(5.6), 0.15, f.z + f.rz * ls(5.6));
  }
  BASEY = null;
  // pedal boats and coracles out on the water
  for (let u = 0.42; u < 1.12; u += 0.03) {
    frame(u, f);
    const l = ls(16 + srnd() * 40);
    const x = f.x + f.rx * l,
      z = f.z + f.rz * l;
    if (!inPolyXZ(x, z, LAKE.xs, LAKE.zs)) continue;
    BASEY = WATER_Y;
    const ry = srnd() * 6.28,
      col = ['gold', 'blue', 'red', 'white'][(srnd() * 4) | 0];
    box(col, 1.8, 0.6, 2.6, x, 0, z, ry);
    box('white', 1.6, 0.7, 0.2, x, 0.5, z, ry);
    box('bark', 0.4, 0.4, 0.4, x, 0.9, z, ry);
  }
  BASEY = null;
  // the water
  {
    const sh = new THREE.Shape();
    LAKE.xs.forEach((x, i) => (i ? sh.lineTo(x, -LAKE.zs[i]) : sh.moveTo(x, -LAKE.zs[i])));
    const g = new THREE.ShapeGeometry(sh);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 5, uv.getY(i) / 5);
    const wm = new THREE.Mesh(g, matWater);
    wm.rotation.x = -Math.PI / 2;
    wm.position.y = WATER_Y;
    world.add(wm);
  }
  // islands
  {
    let cx = 0,
      cz = 0;
    LAKE.xs.forEach((x, i) => {
      cx += x;
      cz += LAKE.zs[i];
    });
    cx /= LAKE.xs.length;
    cz /= LAKE.zs.length;
    for (const [dx, dz, r] of [
      [-14, -38, 16],
      [22, 24, 12],
      [-6, 66, 9]
    ]) {
      const x = cx + dx,
        z = cz + dz;
      if (!inPolyXZ(x, z, LAKE.xs, LAKE.zs)) continue;
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 2.5, 1.8, 20), matGrass);
      isl.position.set(x, WATER_Y + 0.15, z);
      world.add(isl);
      BASEY = WATER_Y + 1.05;
      for (let k = 0; k < Math.max(2, Math.round(r / 3)); k++) {
        const a = srnd() * 6.28,
          d = srnd() * r * 0.6;
        canopyTree(x + Math.cos(a) * d, z + Math.sin(a) * d);
      }
      box('rock', 3, 1, 2.4, x + r * 0.6, -0.4, z + r * 0.3, 0.5);
      BASEY = null;
    }
  }
  // outer side: in footpath stretches the traffic road runs beside you; in road stretches there is a footpath
  for (const [a, b, k] of ULS_Z) {
    ribbon(a, b, os(4.1), os(4.65), 0.24, matKerb, 1.2);
    wall(a, b, os(4.1), 0.03, 0.24, matKerb, 1.2);
    if (k === 'path') {
      ribbon(a, b, os(4.65), os(12.6), 0.03, matAsphalt, 3);
      ribbon(a, b, os(12.6), os(15), 0.24, matPav, 2);
      wall(a, b, os(12.6), 0.03, 0.24, matKerb, 1.2);
      wall(a, b, os(15), -0.7, 0.24, matEdge, 2);
    } else {
      ribbon(a, b, os(4.65), os(7.4), 0.24, matPav, 2);
      wall(a, b, os(7.4), -0.7, 0.24, matEdge, 2);
    }
  }

  // ---- MEG & Centre (Madras Engineer Group, the army's Sappers) along the east side ----
  const ww = LM_(TEX.whitewash);
  wall(0.14, 0.243, os(12), 0, 2.6, ww, 3);
  wall(0.257, 0.4, os(12), 0, 2.6, ww, 3);
  for (let s = 0.14 * LOOP, k = 0; s < 0.4 * LOOP; s += 1.4, k++) {
    const u = s / LOOP;
    frame(u, f);
    BASEY = hU(u);
    box(
      k % 2 ? 'white' : 'dark',
      0.45,
      0.34,
      1.25,
      f.x + f.rx * os(7.7),
      0,
      f.z + f.rz * os(7.7),
      Math.atan2(f.tx, f.tz)
    );
  }
  BASEY = null;
  {
    const { R, c, ry } = site(0.25, os(12), 12);
    R('army', 2, 6.5, 2, -7.5, 0, 0);
    R('army', 2, 6.5, 2, 7.5, 0, 0);
    R('army', 17, 1.8, 2.2, 0, 6.5, 0);
    R('gold', 0.5, 0.5, 0.3, -7.5, 6.6, 1.2);
    R('gold', 0.5, 0.5, 0.3, 7.5, 6.6, 1.2);
    R('white', 13, 0.16, 0.16, 0, 1, 1.2);
    R('red', 1.2, 0.18, 0.18, -2, 1, 1.2);
    R('red', 1.2, 0.18, 0.18, 2, 1, 1.2);
    R('army', 1.8, 2.6, 1.8, 10.4, 0, 1.8);
    R('red', 2.2, 0.3, 2.2, 10.4, 2.6, 1.8);
    for (const lx of [-24, 0, 24]) {
      R('cream', 17, 4, 9, lx, 0, -17);
      R('tile', 18, 1, 10, lx, 4, -17);
      R('tile', 12, 1, 7, lx, 5, -17);
    }
    R('bark', 0.25, 9, 0.25, -12, 0, -6);
    R('saffron', 2.4, 0.8, 0.08, -10.8, 8, -6);
    R('white', 2.4, 0.8, 0.08, -10.8, 7.2, -6);
    R('green', 2.4, 0.8, 0.08, -10.8, 6.4, -6);
    plaque(c, ry, 1.16, 7.4, ['MADRAS ENGINEER GROUP', '& CENTRE · SAPPERS'], 13, 1.6, '#3d4a24', '#f2e7c2', {
      sizes: [40, 30]
    });
    BASEY = null;
  }
  // WWII tank replica on a plinth
  {
    const { R, c, ry } = site(0.19, os(9.9), 6);
    R('concrete', 8, 1.1, 4.6, 0, 0, 0);
    R('dark', 7, 1, 1.1, 0, 1.1, 1.55);
    R('dark', 7, 1, 1.1, 0, 1.1, -1.55);
    R('army', 6.4, 1.3, 3.1, 0, 1.5, 0);
    R('army', 3, 1.1, 2.4, -0.4, 2.8, 0);
    R('army', 4.2, 0.3, 0.3, 2.6, 3.2, 0);
    R('army', 0.9, 0.5, 0.9, -0.4, 3.9, 0);
    plaque(c, ry, 2.32, 0.6, ['WW II TANK'], 2.6, 0.5, '#3d4a24', '#f2e7c2');
    BASEY = null;
  }
  // Sappers war memorial
  {
    const { R, c, ry } = site(0.33, os(9.9), 5);
    R('granite', 5, 0.4, 5, 0, 0, 0);
    R('granite', 4, 0.4, 4, 0, 0.4, 0);
    R('granite', 2.4, 1.2, 2.4, 0, 0.8, 0);
    R('granite', 1.5, 4, 1.5, 0, 2, 0);
    R('granite', 1.15, 3, 1.15, 0, 6, 0);
    R('granite', 0.75, 1.4, 0.75, 0, 9, 0);
    R('gold', 0.4, 0.6, 0.4, 0, 10.4, 0);
    plaque(c, ry, 1.22, 1.4, ['SAPPERS', 'WAR MEMORIAL'], 2.2, 0.9, '#d9ccaa', '#3a3426', { sizes: [52, 40] });
    BASEY = null;
  }
  // army kayaks out on the water
  for (let u = 0.17; u < 0.36; u += 0.035) {
    frame(u, f);
    const l = ls(18 + srnd() * 22);
    const x = f.x + f.rx * l,
      z = f.z + f.rz * l;
    if (!inPolyXZ(x, z, LAKE.xs, LAKE.zs)) continue;
    BASEY = WATER_Y;
    const ry = Math.atan2(f.tx, f.tz) + (srnd() - 0.5);
    box('army', 0.7, 0.22, 3.4, x, 0, z, ry);
    box('army', 0.5, 0.6, 0.36, x, 0.2, z, ry);
    box('bark', 0.36, 0.36, 0.36, x, 0.8, z, ry);
    box('gold', 0.1, 0.08, 2.6, x, 0.55, z, ry + 1.57);
  }
  BASEY = null;
  // Kempegowda watch tower on its rock at the water's edge
  {
    const { R } = site(0.455, ls(12), 9);
    BASEY = WATER_Y - 0.3;
    R('rock', 9, 2.6, 8, 0, 0, 0);
    R('rock', 6, 1.4, 6, 1, 2.6, -0.6);
    R('granite', 5.6, 0.6, 5.6, 0, 3, 0);
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ])
      R('granite', 0.7, 4.4, 0.7, sx * 2.2, 3.6, sz * 2.2);
    R('granite', 6.4, 0.6, 6.4, 0, 8, 0);
    R('granite', 5, 0.8, 5, 0, 8.6, 0);
    R('granite', 3.6, 0.8, 3.6, 0, 9.4, 0);
    R('granite', 2.2, 0.9, 2.2, 0, 10.2, 0);
    R('gold', 0.5, 1, 0.5, 0, 11.1, 0);
    BASEY = null;
    roadsideSign(0.44, ls(6.6), ['KEMPEGOWDA', 'WATCH TOWER'], 2.6, 1.1, '#5b3a1f', '#f2e7c2');
  }
  // boat club jetty with pedal boats
  {
    const { R } = site(0.525, ls(12.2), 8);
    BASEY = WATER_Y + 0.2;
    R('wood', 3, 0.3, 11.6, 0, 0, 0);
    for (let z = -5; z <= 5; z += 2.5) {
      R('bark', 0.3, 1.2, 0.3, 1.6, -0.9, z);
      R('bark', 0.3, 1.2, 0.3, -1.6, -0.9, z);
    }
    for (const [x, z, col] of [
      [-3.4, -3, 'gold'],
      [3.4, -1, 'blue'],
      [-3.4, 1.5, 'red'],
      [3.6, 3.2, 'gold']
    ]) {
      R(col, 1.8, 0.6, 2.6, x, -0.2, z);
      R('white', 1.6, 0.7, 0.2, x, 0.4, z - 1.1);
    }
    BASEY = null;
    roadsideSign(0.51, ls(6.6), ['BOAT CLUB', 'Ulsoor Lake'], 2.6, 1.1, '#2f6fb3', '#ffffff');
  }
  // Kensington Road side: the public swimming pool
  {
    const { R, c, ry } = site(0.61, os(24), 13);
    R('white', 20, 5, 12, 0, 0, 0);
    R('blue', 20.4, 0.8, 12.4, 0, 5, 0);
    for (let k = -3; k <= 3; k++) R('blue', 1.6, 1.6, 0.1, k * 2.6, 2, 6.02);
    plaque(c, ry, 6.1, 3.9, ['SWIMMING POOL'], 9, 1.2, '#2f6fb3', '#ffffff');
    BASEY = null;
  }
  // Sri Guru Singh Sabha Gurudwara: white marble, gold domes and the Nishan Sahib flag
  {
    const { R, c, ry } = site(0.875, os(28), 19);
    R('marble', 32, 1.2, 24, 0, 0, 0);
    R('marble', 12, 0.4, 3.4, 0, 0, 13.4);
    R('marble', 10, 0.4, 2.4, 0, 0.4, 12.9);
    R('marble', 8, 0.4, 1.4, 0, 0.8, 12.4);
    R('marble', 24, 9, 17, 0, 1.2, -1);
    R('cream', 24.4, 0.5, 17.4, 0, 10.2, -1);
    R('marble', 8, 6.5, 2.4, 0, 1.2, 8.6);
    R('dark', 3, 4.2, 0.3, 0, 1.2, 9.85);
    R('gold', 8.4, 0.5, 2.6, 0, 7.7, 8.6);
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) R('dark', 1.4, 2.4, 0.2, sx * (5.5 + k * 2.4), 3.6, 7.55);
    }
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ]) {
      R('marble', 2.4, 2.6, 2.4, sx * 10, 10.7, -1 + sz * 6.5);
      R('gold', 2, 1, 2, sx * 10, 13.3, -1 + sz * 6.5);
      R('gold', 1.2, 0.8, 1.2, sx * 10, 14.3, -1 + sz * 6.5);
      R('gold', 0.3, 0.8, 0.3, sx * 10, 15.1, -1 + sz * 6.5);
    }
    R('marble', 9, 2.4, 9, 0, 10.7, -1);
    R('gold', 8, 2, 8, 0, 13.1, -1);
    R('gold', 6.4, 1.8, 6.4, 0, 15.1, -1);
    R('gold', 4.4, 1.4, 4.4, 0, 16.9, -1);
    R('gold', 2.4, 1.2, 2.4, 0, 18.3, -1);
    R('gold', 0.5, 2, 0.5, 0, 19.5, -1);
    R('marble', 1.6, 0.8, 1.6, 13.5, 1.2, 10);
    R('saffron', 0.4, 22, 0.4, 13.5, 2, 10);
    R('saffron', 4.2, 2.6, 0.1, 11.2, 20.4, 10);
    R('gold', 0.5, 0.8, 0.5, 13.5, 24, 10);
    plaque(c, ry, 9.92, 8.9, ['SRI GURU SINGH SABHA', 'GURUDWARA'], 8, 1.3, '#f6f3ec', '#1f3f8a', { sizes: [44, 34] });
    BASEY = null;
  }
  // food carts and a chai stall near the Gurudwara
  foodStall(0.815, os(17.5), 'chai');
  foodStall(0.83, os(17.5), 'corn');
  foodStall(0.845, os(17.5), 'puri');
  foodStall(0.06, os(17.5), 'corn');
  // signage
  startArch(uOf(0), 'ODU MAGA 3K');
  gantry(0.137, ['MEG ROAD', 'Army area · autos ahead'], '#3d4a24');
  gantry(0.416, ['ULSOOR LAKE', 'Footpath · mind the steps'], '#2b5d8a');
  gantry(0.55, ['KENSINGTON ROAD', 'Ulsoor Lake'], '#1f6b3a');
  gantry(0.79, ['GURUDWARA AHEAD', 'Watch for food carts'], '#7a3b1f');
  for (let k = 1; k < 3; k++) roadsideSign(uOf(k * 1000), ls(6.6), [`KM ${k}`], 1.8, 1.1, '#f2c230', '#1b1915');
  // scenery
  for (let s = 0; s < LOOP; s += 4) {
    const u = s / LOOP,
      z = ulsZone(u),
      k = (s / 4) | 0;
    frame(u, f);
    const ry = Math.atan2(f.tx, f.tz);
    if (k % 14 === 0) {
      const x = f.x + f.rx * ls(5.1),
        zz = f.z + f.rz * ls(5.1);
      if (!FOOT.some(q => Math.hypot(q.x - x, q.z - zz) < q.r + 3)) palm(x, zz);
    }
    if (inR(u, 0.14, 0.4)) {
      if (k % 5 === 0) {
        const x = f.x + f.rx * os(15),
          zz = f.z + f.rz * os(15);
        if (clearOf(x, zz, 6)) canopyTree(x, zz);
      }
      continue;
    }
    if (k % 3 === (z === 'road' ? 0 : 1)) {
      const off = z === 'road' ? 8.6 : 16.2;
      const x = f.x + f.rx * os(off),
        zz = f.z + f.rz * os(off);
      if (clearOf(x, zz, z === 'road' ? 7.6 : 7)) (z === 'road' ? avenueTree : canopyTree)(x, zz);
    }
    if (k % 2 === 0) {
      const w = 6 + srnd() * 5,
        d = 6 + srnd() * 5,
        h = 4 + srnd() * 12;
      const off = (z === 'road' ? 9.5 : 17.5) + d / 2;
      const x = f.x + f.rx * os(off),
        zz = f.z + f.rz * os(off);
      if (clearOf(x, zz, Math.max(w, d) / 2 + 7)) {
        box('wall' + ((srnd() * WALLS.length) | 0), w, h, d, x, 0, zz, ry);
        if (srnd() < 0.4) box('dark', 1.4, 1.2, 1.4, x, h, zz);
      }
    }
  }
}
