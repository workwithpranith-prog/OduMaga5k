'use strict';
// ================= Cubbon Park 5K (the original loop) =================
function cubbonRailings() {
  // green railings with teal posts along Cubbon Park and the Vidhana Soudha straight
  for (const [a, b] of [
    [U[7] + 0.012, U[8] - 0.008],
    [U[8] + 0.01, 0.985]
  ]) {
    for (const s of [-1, 1]) wall(a, b, s * 7.45, 0, 1.4, matRail, 1.6, true);
    const f = {};
    for (let x = a * LOOP; x <= b * LOOP; x += 5) {
      frame(x / LOOP, f);
      for (const s of [-1, 1]) box('teal', 0.32, 1.55, 0.32, f.x + f.rx * s * 7.45, 0, f.z + f.rz * s * 7.45);
    }
  }
}
const LM = {};
function landmarks() {
  // Sree Kanteerava Stadium
  const K = placeClear(proj(12.9684, 77.593), 18);
  stadium(K, 15, 10.5, 4.5, true);
  plaque(K, facingRoad(K), 12.2, 5.6, ['SREE KANTEERAVA', 'STADIUM'], 10, 2.4, '#1b1915', '#f2c230');
  // UB City
  const UBc = placeClear(proj(12.9697, 77.598), 11);
  {
    const ry = facingRoad(UBc),
      R = rel(UBc, ry);
    R('concrete', 18, 4, 14, 0, 0, 0);
    R('glass', 7, 40, 7, -4, 4, -2);
    R('gold', 7.6, 1.4, 7.6, -4, 44, -2);
    R('glass', 6, 30, 6, 5, 4, 2.5);
    R('gold', 6.6, 1.2, 6.6, 5, 34, 2.5);
    R('glass', 6, 46, 6, 4.5, 4, -4.5);
    R('gold', 6.6, 1.6, 6.6, 4.5, 50, -4.5);
    R('dark', 1, 3, 1, 4.5, 51.6, -4.5);
    plaque(UBc, ry, 7.1, 2.2, ['UB CITY'], 8, 1.8, '#1b1915', '#e3b23c');
  }
  // Queen Victoria statue
  const Q = placeClear(proj(12.9765, 77.5996), 2.5);
  box('granite', 2.4, 2.4, 2.4, Q.x, 0, Q.z);
  box('dark', 1, 1.8, 0.8, Q.x, 2.4, Q.z);
  box('dark', 0.5, 0.5, 0.5, Q.x, 4.2, Q.z);
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ])
    box('white', 0.35, 4.8, 0.35, Q.x + sx * 2.4, 0, Q.z + sz * 2.4);
  box('white', 5.6, 0.5, 5.6, Q.x, 4.8, Q.z);
  box('white', 3.6, 0.6, 3.6, Q.x, 5.3, Q.z);
  // M. Chinnaswamy Stadium
  const C = placeClear(proj(12.979, 77.6005), 22);
  stadium(C, 19, 15, 7, true);

  // Vidhana Soudha: centred on the Ambedkar Veedhi straight, facing the road
  {
    const uA = U[7] + 0.012,
      uB = U[8] - 0.008,
      um = (uA + uB) / 2,
      f = frame(um, {});
    const V = { x: f.x + f.rx * 30, z: f.z + f.rz * 30 };
    const ry = Math.atan2(-f.rx, -f.rz),
      R = rel(V, ry);
    FOOT.push({ x: V.x, z: V.z, r: 44 });
    LM.vs = um;
    R('vsWall', 74, 12, 16, 0, 0, 0);
    R('granite', 74.8, 1, 16.8, 0, 12, 0);
    for (let k = -36; k <= 36; k += 4) R('granite', 1.2, 0.9, 1.2, k, 13, 7.6);
    // central block, portico with 12 columns, steps
    R('granite', 16, 4, 13, 0, 13, 0);
    for (let k = 0; k < 12; k++) R('granite', 0.9, 10, 0.9, -8.25 + k * 1.5, 0, 11.2);
    R('granite', 20, 2.2, 5, 0, 10, 10.6);
    R('granite', 18, 1.2, 4, 0, 12.2, 10.4);
    R('granite', 24, 0.6, 4, 0, 0, 15.2);
    R('granite', 22, 0.6, 3, 0, 0.6, 14.2);
    R('granite', 20, 0.6, 2, 0, 1.2, 13.4);
    // central dome with flanking domes and the Ashoka capital on top
    R('granite', 10, 3, 10, 0, 17, 0);
    R('granite', 8.5, 2.4, 8.5, 0, 20, 0);
    R('granite', 7.5, 2.4, 7.5, 0, 22.4, 0);
    R('granite', 5.8, 2, 5.8, 0, 24.8, 0);
    R('granite', 3.8, 1.6, 3.8, 0, 26.8, 0);
    R('granite', 2, 1, 2, 0, 28.4, 0);
    R('gold', 1.6, 0.6, 1.6, 0, 29.4, 0);
    R('gold', 1.1, 1.6, 1.1, 0, 30, 0);
    R('gold', 0.5, 0.6, 0.5, 0, 31.6, 0);
    domeStack(R, -7, 17, 5, 1);
    domeStack(R, 7, 17, 5, 1);
    // corner towers with domes
    for (const sx of [-1, 1]) {
      R('granite', 9, 17, 10, sx * 37, 0, 1);
      R('granite', 7, 2, 7, sx * 37, 17, 1);
      domeStack(R, sx * 37, 19, 1, 1.5);
    }
    plaque(V, ry, 13.05, 10.9, ["GOVERNMENT WORK IS GOD'S WORK"], 15, 1.1, '#d9ccaa', '#3a3426', {
      font: '"Atkinson Hyperlegible",sans-serif'
    });
    // topiary garden between the railing and the building
    for (let lx = -34; lx <= 34; lx += 4.5) {
      R('hedge', 1.6, 1.8, 1.6, lx, 0, 20.5);
      if (Math.abs(lx) > 14) R('hedge', 1.2, 1.2, 1.2, lx, 1.8, 20.5);
    }
    // Karnataka High Court (Attara Kacheri) across the road, in red
    const H = { x: f.x - f.rx * 26, z: f.z - f.rz * 26 },
      hy = Math.atan2(f.rx, f.rz),
      HR = rel(H, hy);
    FOOT.push({ x: H.x, z: H.z, r: 22 });
    HR('redwall', 34, 9, 11, 0, 0, 0);
    HR('white', 34.6, 0.6, 11.6, 0, 9, 0);
    HR('redwall', 8, 5, 8, 0, 9.6, 0);
    HR('white', 8.6, 0.5, 8.6, 0, 14.6, 0);
    HR('tile', 6, 1.6, 6, 0, 15.1, 0);
    for (let k = 0; k < 9; k++) HR('white', 0.6, 7, 0.6, -8 + k * 2, 0, 5.9);
    HR('white', 18, 1, 2, 0, 7, 6);
    for (let lx = -16; lx <= 16; lx += 4.5) HR('hedge', 1.6, 1.6, 1.6, lx, 0, 10.5);
    plaque(H, hy, 5.62, 8.1, ['KARNATAKA HIGH COURT'], 9, 1, '#f3ead8', '#8c2a1e');
    gantry(uA + 0.004, ['VIDHANA SOUDHA', 'Ambedkar Veedhi'], '#1f6b3a');
  }
  // State Central Library with its round lawn (inside Cubbon Park)
  {
    const L = placeClear(proj(12.9757, 77.5942), 16);
    const ry = facingRoad(L),
      R = rel(L, ry);
    LM.lib = nearest(L.x, L.z).i / N;
    R('redwall', 14, 13, 11, 0, 0, 0);
    R('white', 14.6, 0.6, 11.6, 0, 13, 0);
    for (let k = 0; k < 5; k++) R('redwall', 12 - k * 2.8, 1.4, 1, 0, 13.6 + k * 1.4, 5.2);
    R('white', 2.6, 1, 1.2, 0, 8.5, 5.6);
    for (const sx of [-1, 1]) {
      R('redwall', 11, 9.5, 9, sx * 12.2, 0, -0.6);
      R('white', 11.4, 0.5, 9.4, sx * 12.2, 9.5, -0.6);
      R('tile', 10.6, 1, 8.6, sx * 12.2, 10, -0.6);
      R('tile', 8, 1, 6, sx * 12.2, 11, -0.6);
      R('redwall', 3, 11, 3, sx * 17, 0, 3.6);
      R('white', 3.4, 0.4, 3.4, sx * 17, 11, 3.6);
      R('gold', 0.5, 1, 0.5, sx * 17, 11.4, 3.6);
    }
    for (let k = 0; k < 6; k++) R('white', 0.6, 4.5, 0.6, -4 + k * 1.6, 0, 6);
    R('white', 10, 0.6, 1.8, 0, 4.5, 6);
    plaque(L, ry, 5.74, 9.6, ['STATE CENTRAL LIBRARY', 'Cubbon Park'], 8, 1.6, '#f3ead8', '#2d3740', {
      sizes: [46, 34]
    });
    // round lawn with yellow cross paths between the library and the road
    const lw = relPt(L, ry, 0, 17.5);
    const lawn = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 0.2, 28),
      new THREE.MeshLambertMaterial({ map: TEX.grass })
    );
    lawn.position.set(lw.x, 0.1, lw.z);
    world.add(lawn);
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(8.6, 8.6, 0.12, 28),
      new THREE.MeshLambertMaterial({ color: '#e8e0cc' })
    );
    ring.position.set(lw.x, 0.06, lw.z);
    world.add(ring);
    const lr = rel({ x: lw.x, z: lw.z }, ry);
    lr('yellowpath', 16, 0.24, 0.7, 0, 0, 0);
    lr('yellowpath', 0.7, 0.24, 16, 0, 0, 0);
    lr('hedge', 2, 0.6, 2, 0, 0.2, 0);
    FOOT.push({ x: lw.x, z: lw.z, r: 9 });
  }
  // a second red building on the way out: Government Museum
  {
    const M = placeClear(proj(12.9722, 77.5895), 9);
    const ry = facingRoad(M),
      R = rel(M, ry);
    R('redwall', 18, 8, 9, 0, 0, 0);
    R('white', 18.6, 0.5, 9.6, 0, 8, 0);
    R('redwall', 6, 3, 6, 0, 8.5, 0);
    R('tile', 5, 1.2, 5, 0, 11.5, 0);
    for (let k = 0; k < 6; k++) R('white', 0.5, 6, 0.5, -4 + k * 1.6, 0, 4.9);
    R('white', 9, 0.8, 1.4, 0, 6, 5);
    plaque(M, ry, 4.62, 7, ['GOVERNMENT MUSEUM'], 7, 0.9, '#f3ead8', '#8c2a1e');
  }
  // Cubbon Park bandstand
  const Bd = placeClear(proj(12.9735, 77.59), 3.5);
  box('white', 5, 0.8, 5, Bd.x, 0, Bd.z);
  for (const [sx, sz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
  ])
    box('white', 0.35, 2.6, 0.35, Bd.x + sx * 2.1, 0.8, Bd.z + sz * 2.1);
  box('tile', 5.6, 0.6, 5.6, Bd.x, 3.4, Bd.z);
  box('tile', 3.6, 0.6, 3.6, Bd.x, 4, Bd.z);
  box('tile', 1.6, 0.6, 1.6, Bd.x, 4.6, Bd.z);
}
function cubbonMetro() {
  const VIA = 9.6;
  {
    const f = {};
    const u0 = U[5] + 0.008,
      u1 = U[6] - 0.006;
    let k = 0;
    for (let s = u0 * LOOP; s <= u1 * LOOP; s += 6, k++) {
      frame(s / LOOP, f);
      const x = f.x + f.rx * VIA,
        z = f.z + f.rz * VIA,
        ry = Math.atan2(f.tx, f.tz);
      const pk = ['pillarA', 'pillarB', 'pillarC'][k % 3];
      box(pk, 1.3, 6, 1.3, x, 0, z, ry);
      box(pk, 2.4, 0.8, 1.6, x, 6, z, ry);
      box('concrete', 4.6, 0.6, 1.8, x, 6.8, z, ry);
    }
    ribbon(u0, u1, VIA - 2.3, VIA + 2.3, 7.4, new THREE.MeshLambertMaterial({ map: TEX.concrete, side: DS }), 3);
    ribbon(u0, u1, VIA - 2.3, VIA + 2.3, 8.0, new THREE.MeshLambertMaterial({ map: TEX.concrete, side: DS }), 3);
    wall(u0, u1, VIA - 2.3, 7.4, 8.4, new THREE.MeshLambertMaterial({ map: TEX.concrete, side: DS }), 2);
    const um = u0 + (u1 - u0) * 0.62;
    frame(um, f);
    const sx = f.x + f.rx * VIA,
      sz = f.z + f.rz * VIA,
      ry = Math.atan2(f.tx, f.tz);
    box('concrete', 8.5, 4.2, 18, sx, 8, sz, ry);
    box('purple', 8.8, 0.9, 18.3, sx, 9.6, sz, ry);
    box('white', 9.6, 0.5, 19, sx, 12.2, sz, ry);
    const p = textPlane(['MG ROAD', 'Namma Metro'], 6.5, 1.9, '#8a4bb0', '#ffffff', { sizes: [48, 30] });
    faceAt(p, sx - f.tx * 9.3, 10.4, sz - f.tz * 9.3, f.tx, f.tz);
    // the mural-painted building on the other side of the boulevard
    const mu = u0 + (u1 - u0) * 0.4;
    frame(mu, f);
    const mx = f.x - f.rx * 16,
      mz = f.z - f.rz * 16;
    box('mural', 14, 16, 12, mx, 0, mz, Math.atan2(f.tx, f.tz) + Math.PI / 2);
    box('white', 14.6, 0.8, 12.6, mx, 16, mz, Math.atan2(f.tx, f.tz) + Math.PI / 2);
    FOOT.push({ x: mx, z: mz, r: 10 });
    gantry(U[5] + 0.014, ['MG ROAD', 'Namma Metro · Purple Line']);
  }
}
function cubbonSigns() {
  gantry(U[1] - 0.006, ['UB CITY', 'Vittal Mallya Road']);
  gantry(U[7] - 0.006, ["QUEEN'S STATUE", 'Vidhana Soudha ahead'], '#2b5d8a');
  gantry(U[8] + 0.012, ['CUBBON PARK', 'Watch out for dogs!']);
  for (let k = 1; k <= 4; k++) roadsideSign(k / 5, 5.9, [`KM ${k}`], 1.8, 1.1, '#f2c230', '#1b1915');
  startArch(0, 'ODU MAGA 5K');
}
function cubbonScenery() {
  {
    const f = {};
    for (let s = 0; s < LOOP; s += 4) {
      const u = s / LOOP,
        zone = C.zoneOf(u);
      frame(u, f);
      const ry = Math.atan2(f.tx, f.tz);
      for (const side of [-1, 1]) {
        if (zone === 'cubbon') {
          if ((s / 4) % 3 === (side > 0 ? 0 : 1)) {
            const x = f.x + f.rx * side * 9.4,
              z = f.z + f.rz * side * 9.4;
            if (clearOf(x, z, 7)) canopyTree(x, z);
          }
          if ((s / 4) % 4 === (side > 0 ? 2 : 0)) {
            const off = side * (15 + srnd() * 16);
            const x = f.x + f.rx * off,
              z = f.z + f.rz * off;
            if (clearOf(x, z, 9)) canopyTree(x, z);
          }
          continue;
        }
        if (zone === 'vs') {
          if ((s / 4) % 5 === 0) {
            const x = f.x + f.rx * side * 9.2,
              z = f.z + f.rz * side * 9.2;
            if (clearOf(x, z, 7.5)) box('hedge', 1.4, 1.6, 1.4, x, 0, z);
          }
          continue;
        }
        if ((s / 4) % 4 === (side > 0 ? 0 : 2) && !(zone === 'mg' && side === 1)) {
          const x = f.x + f.rx * side * 8.4,
            z = f.z + f.rz * side * 8.4;
          if (clearOf(x, z, 7.6)) avenueTree(x, z);
        }
        if ((s / 4) % 2 === 0) {
          const w = 6 + srnd() * 4,
            d = 6 + srnd() * 5,
            h = (zone === 'mg' ? 9 : 5) + srnd() * (zone === 'mg' ? 14 : 11);
          const off = side * ((zone === 'mg' && side === 1 ? 15 : 11.5) + w / 2);
          const x = f.x + f.rx * off,
            z = f.z + f.rz * off;
          if (clearOf(x, z, Math.max(w, d) / 2 + 8)) {
            box('wall' + ((srnd() * WALLS.length) | 0), w, h, d, x, 0, z, ry);
            if (srnd() < 0.45)
              box('dark', 1.4, 1.2, 1.4, x + (srnd() - 0.5) * w * 0.5, h, z + (srnd() - 0.5) * d * 0.5);
          }
        }
      }
    }
  }
}

const CTRL = [
  [12.9697, 77.5925], // 0 Kanteerava Stadium (start/finish) on Kasturba Road
  [12.9707, 77.596], // 1 Kasturba Rd / Vittal Mallya Rd
  [12.9686, 77.5967], // 2 UB City
  [12.9658, 77.5978], // 3 Richmond Circle
  [12.9692, 77.6032], // 4 Residency Road
  [12.9752, 77.6072], // 5 MG Road / Brigade Road
  [12.9761, 77.5994], // 6 Queen's Statue
  [12.98, 77.5978], // 7 Queens Road → Ambedkar Veedhi
  [12.9787, 77.588], // 8 end of the Vidhana Soudha straight → into Cubbon Park
  [12.9757, 77.5885], // 9 Cubbon Park
  [12.9745, 77.5922], // 10 State Central Library
  [12.9715, 77.5905] // 11 Cubbon exit
];
const isCubbon = u => inR(u, U[8] + 0.01, 0.985);
const isVS = u => inR(u, U[7] + 0.012, U[8] - 0.008);
const isMG = u => inR(u, U[5] + 0.008, U[6] - 0.006);
function cubbonObstacles(r) {
  const obstacles = [];
  let cows = 0;
  const lastAuto = [-1e9, -1e9, -1e9];
  let s = 260;
  while (s < RACE - 140) {
    const z = C.zoneOf(uOf(s));
    const gap = z === 'cubbon' ? 150 + r() * 90 : 200 + r() * 120;
    const lanes = [-1, 0, 1].sort(() => r() - 0.5);
    if (z === 'cubbon') {
      obstacles.push({ type: 'dog', s, lane: lanes[0] });
      if (r() < 0.25) obstacles.push({ type: 'dog', s: s + 4 + r() * 8, lane: lanes[1] });
    } else {
      const count = z !== 'vs' && r() < 0.15 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const lane = lanes[k];
        let type = z !== 'vs' && cows < 4 && r() < 0.3 ? 'cow' : 'auto';
        if (type === 'auto' && s - lastAuto[lane + 1] < 130) type = cows < 4 ? 'cow' : null;
        if (!type) continue;
        if (type === 'cow') cows++;
        else lastAuto[lane + 1] = s;
        obstacles.push({ type, s: s + (k ? r() * 6 : 0), lane });
      }
    }
    s += gap;
  }
  return obstacles;
}
