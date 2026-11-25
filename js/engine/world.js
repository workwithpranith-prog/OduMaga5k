'use strict';
// ---------- static batcher (one draw call per material) ----------
// everything static for a route goes into `world`, so switching routes can throw it away and build the next one
const world = new THREE.Group();
scene.add(world);
let BASEY = null; // when set, boxes sit on this height instead of the ground under them (keeps a building's parts level)
const FACES = [
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0]
  ],
  [
    [-1, 0, 0],
    [0, 0, 1],
    [0, 1, 0]
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1]
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1]
  ],
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0]
  ],
  [
    [0, 0, -1],
    [-1, 0, 0],
    [0, 1, 0]
  ]
];
const CORN = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1]
];
function box(key, w, h, d, x, y, z, ry = 0) {
  if (HAS_ELEV) y += BASEY != null ? BASEY : groundH(x, z);
  const b = BATCH[key],
    S = [w, h, d],
    cs = Math.cos(ry),
    sn = Math.sin(ry);
  for (const [n, ua, va] of FACES) {
    const base = b.pos.length / 3;
    const fw = Math.abs(ua[0] * w + ua[1] * h + ua[2] * d),
      fh = Math.abs(va[0] * w + va[1] * h + va[2] * d);
    for (const [su, sv] of CORN) {
      const lx = (n[0] * 0.5 + ua[0] * su * 0.5 + va[0] * sv * 0.5) * S[0],
        ly = (n[1] * 0.5 + ua[1] * su * 0.5 + va[1] * sv * 0.5) * S[1] + h / 2,
        lz = (n[2] * 0.5 + ua[2] * su * 0.5 + va[2] * sv * 0.5) * S[2];
      b.pos.push(x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs);
      b.nrm.push(n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs);
      b.uv.push((((su + 1) / 2) * fw) / b.unit, (((sv + 1) / 2) * fh) / b.unit);
    }
    b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
function flushBatches() {
  for (const k in BATCH) {
    const b = BATCH[k];
    if (b.idx.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(new THREE.BufferAttribute(new Uint32Array(b.idx), 1));
      world.add(new THREE.Mesh(g, b.mat));
    }
    b.pos = [];
    b.nrm = [];
    b.uv = [];
    b.idx = [];
  }
}
function clearWorld() {
  for (const o of [...world.children]) {
    world.remove(o);
    o.traverse(m => {
      if (m.geometry) m.geometry.dispose();
      if (m.material && m.material.userData.own) {
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      }
    });
  }
  for (const k in BATCH) {
    const b = BATCH[k];
    b.pos = [];
    b.nrm = [];
    b.uv = [];
    b.idx = [];
  }
}

// ---------- the route: real coordinates, smoothed into one closed loop ----------
let ORIGIN = { lat: 12.974, lng: 77.596 },
  SCALE = 1,
  N = 3000,
  PX = new Float32Array(1),
  PZ = PX,
  TX = PX,
  TZ = PX,
  U = [],
  IN = 1;
const projM = (lat, lng) => ({ x: (lng - ORIGIN.lng) * 108560, z: (ORIGIN.lat - lat) * 110620 });
function filleted(P, R) {
  const n = P.length,
    out = [];
  for (let i = 0; i < n; i++) {
    const A = P[(i - 1 + n) % n],
      B = P[i],
      C = P[(i + 1) % n];
    let d1x = A.x - B.x,
      d1z = A.z - B.z;
    const l1 = Math.hypot(d1x, d1z);
    d1x /= l1;
    d1z /= l1;
    let d2x = C.x - B.x,
      d2z = C.z - B.z;
    const l2 = Math.hypot(d2x, d2z);
    d2x /= l2;
    d2z /= l2;
    const th = Math.acos(Math.max(-1, Math.min(1, d1x * d2x + d1z * d2z)));
    if (th > Math.PI - 0.02) {
      out.push({ x: B.x, z: B.z });
      continue;
    }
    let t = R / Math.tan(th / 2),
      r = R;
    const tmax = 0.45 * Math.min(l1, l2);
    if (t > tmax) {
      t = tmax;
      r = t * Math.tan(th / 2);
    }
    let bx = d1x + d2x,
      bz = d1z + d2z;
    const bl = Math.hypot(bx, bz) || 1;
    bx /= bl;
    bz /= bl;
    const hh = r / Math.sin(th / 2),
      O = { x: B.x + bx * hh, z: B.z + bz * hh };
    const T1 = { x: B.x + d1x * t, z: B.z + d1z * t },
      T2 = { x: B.x + d2x * t, z: B.z + d2z * t };
    const a1 = Math.atan2(T1.z - O.z, T1.x - O.x);
    let da = Math.atan2(T2.z - O.z, T2.x - O.x) - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(3, Math.ceil((Math.abs(da) * r) / 3));
    for (let k = 0; k <= steps; k++) {
      const a = a1 + (da * k) / steps;
      out.push({ x: O.x + Math.cos(a) * r, z: O.z + Math.sin(a) * r });
    }
  }
  return out;
}
// gentle [1,2,1] smoothing that takes the GPS wobble out of a track
function smoothPts(P, passes, closed) {
  let A = P;
  for (let p = 0; p < passes; p++) {
    const n = A.length,
      B = [];
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) {
        B.push(A[i]);
        continue;
      }
      const a = A[(i - 1 + n) % n],
        c = A[(i + 1) % n];
      B.push({ x: (a.x + 2 * A[i].x + c.x) / 4, z: (a.z + 2 * A[i].z + c.z) / 4 });
    }
    A = B;
  }
  return A;
}
// raw: closed loop in metres. raceRaw: metres of it the race covers from the start (the rest is drawn but never run)
function setPath(raw, raceRaw) {
  const n = raw.length,
    cum = [0];
  for (let i = 1; i <= n; i++) {
    const a = raw[i - 1],
      b = raw[i % n];
    cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
  }
  const L = cum[n];
  FRAC = raceRaw ? Math.min(1, raceRaw / L) : 1;
  LOOP = RACE / DM / FRAC;
  SCALE = LOOP / L;
  N = Math.round(LOOP * 2.4);
  PX = new Float32Array(N);
  PZ = new Float32Array(N);
  TX = new Float32Array(N);
  TZ = new Float32Array(N);
  let j = 0;
  for (let i = 0; i < N; i++) {
    const s = (i / N) * L;
    while (cum[j + 1] < s) j++;
    const a = raw[j],
      b = raw[(j + 1) % n],
      t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    PX[i] = (a.x + (b.x - a.x) * t) * SCALE;
    PZ[i] = (a.z + (b.z - a.z) * t) * SCALE;
  }
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N,
      b = (i + 1) % N;
    let tx = PX[b] - PX[a],
      tz = PZ[b] - PZ[a];
    const l = Math.hypot(tx, tz) || 1;
    TX[i] = tx / l;
    TZ[i] = tz / l;
  }
  buildGrid();
  POLY = { xs: [], zs: [] };
  for (let i = 0; i < N; i += 4) {
    POLY.xs.push(PX[i]);
    POLY.zs.push(PZ[i]);
  }
  // which side of the runner is the inside of the loop (the lake at Ulsoor)?
  let inside = 0;
  const f = {};
  for (let k = 0; k < 24; k++) {
    frame(k / 24 + 0.01, f);
    if (inPolyXZ(f.x + f.rx * 2, f.z + f.rz * 2, POLY.xs, POLY.zs)) inside++;
  }
  IN = inside >= 12 ? 1 : -1;
}
const proj = (lat, lng) => {
  const m = projM(lat, lng);
  return { x: m.x * SCALE, z: m.z * SCALE };
};
const F = {};
function frame(u, out = F) {
  u = ((u % 1) + 1) % 1;
  const f = u * N,
    i = Math.floor(f) % N,
    j = (i + 1) % N,
    a = f - Math.floor(f);
  out.x = PX[i] + (PX[j] - PX[i]) * a;
  out.z = PZ[i] + (PZ[j] - PZ[i]) * a;
  let tx = TX[i] + (TX[j] - TX[i]) * a,
    tz = TZ[i] + (TZ[j] - TZ[i]) * a;
  const l = Math.hypot(tx, tz) || 1;
  out.tx = tx / l;
  out.tz = tz / l;
  out.rx = -out.tz;
  out.rz = out.tx;
  return out;
}
function nearest(x, z, step = 1) {
  let bd = 1e9,
    bi = 0;
  for (let i = 0; i < N; i += step) {
    const d = (PX[i] - x) ** 2 + (PZ[i] - z) ** 2;
    if (d < bd) {
      bd = d;
      bi = i;
    }
  }
  return { d: Math.sqrt(bd), i: bi };
}
// bucket grid so the many "how far is this from the road" checks stay fast on the long routes
let GRID = new Map(),
  POLY = { xs: [], zs: [] };
const GC = 16,
  gkey = (a, b) => (a + 4096) * 8192 + (b + 4096);
function buildGrid() {
  GRID = new Map();
  for (let i = 0; i < N; i++) {
    const k = gkey(Math.floor(PX[i] / GC), Math.floor(PZ[i] / GC));
    let a = GRID.get(k);
    if (!a) GRID.set(k, (a = []));
    a.push(i);
  }
}
function nearestFast(x, z) {
  const cx = Math.floor(x / GC),
    cz = Math.floor(z / GC);
  let bd = Infinity,
    bi = -1;
  for (let r = 0; r < 24; r++) {
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const a = GRID.get(gkey(cx + dx, cz + dz));
        if (!a) continue;
        for (const i of a) {
          const d = (PX[i] - x) ** 2 + (PZ[i] - z) ** 2;
          if (d < bd) {
            bd = d;
            bi = i;
          }
        }
      }
    if (bi >= 0 && (r * GC) ** 2 >= bd) break;
  }
  return bi < 0 ? nearest(x, z, 4) : { d: Math.sqrt(bd), i: bi };
}
function inPolyXZ(x, z, xs, zs) {
  let c = false;
  for (let i = 0, j = xs.length - 1; i < xs.length; j = i++) {
    if (zs[i] > z !== zs[j] > z && x < ((xs[j] - xs[i]) * (z - zs[i])) / (zs[j] - zs[i]) + xs[i]) c = !c;
  }
  return c;
}
const inR = (u, a, b) => {
  u = ((u % 1) + 1) % 1;
  return a <= b ? u >= a && u <= b : u >= a || u <= b;
};
const uOf = s => {
  const u = (s / RACE) * FRAC + START_U;
  return u - Math.floor(u);
}; // race metres -> position on the drawn loop

// ---------- elevation (from Strava), in race metres ----------
let ELEV = null,
  ELEV_MIN = 0,
  EXAG = 1;
function elevM(s) {
  if (!ELEV) return 0;
  const v = ELEV.v,
    n = v.length;
  const f = Math.max(0, Math.min(RACE, s)) / ELEV.step;
  let i = Math.floor(f);
  if (i > n - 2) i = n - 2;
  const t = f - i;
  const p0 = v[Math.max(0, i - 1)],
    p1 = v[i],
    p2 = v[i + 1],
    p3 = v[Math.min(n - 1, i + 2)];
  return (
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
  );
}
const hS = s => (ELEV ? ((elevM(s) - ELEV_MIN) / DM) * EXAG : 0); // world height under race metre s
const hU = u => {
  if (!ELEV) return 0;
  u = (((u - START_U) % 1) + 1) % 1;
  return hS(Math.min(RACE, (u / FRAC) * RACE));
};
const gradeAt = s => (ELEV ? (elevM(s + 20) - elevM(s - 20)) / 40 : 0); // real rise over run, for the pace maths
function groundH(x, z) {
  if (!HAS_ELEV) return 0;
  const n = nearestFast(x, z);
  const h = hU(n.i / N);
  return C && C.groundAt ? C.groundAt(x, z, h, n.d) : h;
}

// ---------- ground, road, kerbs, footpaths ----------
let GB = { cx: 0, cz: 0, size: 2400 };
function buildGround() {
  let x0 = 1e9,
    x1 = -1e9,
    z0 = 1e9,
    z1 = -1e9;
  for (let i = 0; i < N; i += 8) {
    x0 = Math.min(x0, PX[i]);
    x1 = Math.max(x1, PX[i]);
    z0 = Math.min(z0, PZ[i]);
    z1 = Math.max(z1, PZ[i]);
  }
  const cx = C.id === 'cubbon' ? 0 : (x0 + x1) / 2,
    cz = C.id === 'cubbon' ? 0 : (z0 + z1) / 2,
    size = C.id === 'cubbon' ? 2400 : Math.ceil(Math.max(x1 - x0, z1 - z0) + 900);
  GB = { cx, cz, size };
  const segs = HAS_ELEV ? Math.min(220, Math.ceil(size / 11)) : 1;
  const g = new THREE.PlaneGeometry(size, size, segs, segs);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * size) / 1.5, (uv.getY(i) * size) / 1.5);
  if (HAS_ELEV) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + cx,
        z = -p.getY(i) + cz;
      const d = nearestFast(x, z).d;
      p.setZ(i, groundH(x, z) - 0.08 - 0.5 * Math.max(0, 1 - d / 28));
    }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: C.groundTex || TEX.grass }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(cx, -0.03, cz);
  world.add(m);
}
function ribbon(u0, u1, lat0, lat1, y, mat, vUnit) {
  if (u1 <= u0) u1 += 1;
  const steps = Math.max(2, Math.ceil((u1 - u0) * N));
  const pos = [],
    uv = [],
    nrm = [],
    idx = [];
  const f = {};
  for (let i = 0; i <= steps; i++) {
    const u = u0 + ((u1 - u0) * i) / steps;
    frame(u, f);
    const v = ((u - u0) * LOOP) / vUnit,
      yy = y + hU(u);
    pos.push(f.x + f.rx * lat0, yy, f.z + f.rz * lat0, f.x + f.rx * lat1, yy, f.z + f.rz * lat1);
    uv.push(0, v, (lat1 - lat0) / vUnit, v);
    nrm.push(0, 1, 0, 0, 1, 0);
    if (i < steps) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat);
  world.add(m);
  return m;
}
function wall(u0, u1, lat, y0, y1, mat, vUnit, fullV) {
  if (u1 <= u0) u1 += 1;
  const steps = Math.max(2, Math.ceil(((u1 - u0) * N) / 2));
  const pos = [],
    uv = [],
    nrm = [],
    idx = [];
  const f = {};
  const sg = lat > 0 ? -1 : 1;
  for (let i = 0; i <= steps; i++) {
    const u = u0 + ((u1 - u0) * i) / steps;
    frame(u, f);
    const x = f.x + f.rx * lat,
      z = f.z + f.rz * lat,
      v = ((u - u0) * LOOP) / vUnit,
      h = hU(u);
    pos.push(x, y0 + h, z, x, y1 + h, z);
    uv.push(v, 0, v, fullV ? 1 : (y1 - y0) / vUnit);
    nrm.push(f.rx * sg, 0, f.rz * sg, f.rx * sg, 0, f.rz * sg);
    if (i < steps) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const m = new THREE.Mesh(g, mat);
  world.add(m);
  return m;
}
const DS = THREE.DoubleSide;
const LM_ = (map, o = {}) => new THREE.MeshLambertMaterial({ map, side: DS, ...o });
const matAsphalt = LM_(TEX.asphalt),
  matPav = LM_(TEX.pavers),
  matKerb = LM_(TEX.kerb),
  matEdge = LM_(TEX.concrete);
const matRail = LM_(TEX.railing, { alphaTest: 0.5 }),
  matGrass = LM_(TEX.grass),
  matStone = LM_(TEX.granite),
  matSoil = LM_(TEX.soil),
  matMedian = LM_(TEX.median),
  matBarrier = LM_(TEX.barrier, { alphaTest: 0.5 });
const matWater = new THREE.MeshLambertMaterial({ map: TEX.water, transparent: true, opacity: 0.92 });
const matLineW = new THREE.MeshBasicMaterial({ color: '#f1ece0', side: DS }),
  matLineY = new THREE.MeshBasicMaterial({ color: '#e8c43a', side: DS });
// city road: asphalt with kerbs and paver footpaths both sides (Cubbon)
function cityRoad() {
  ribbon(0, 1, -4.1, 4.1, 0.04, matAsphalt, 3);
  for (const s of [-1, 1]) {
    ribbon(0, 1, s * 4.1, s * 4.65, 0.24, matKerb, 1.2);
    wall(0, 1, s * 4.1, 0.03, 0.24, matKerb, 1.2);
    ribbon(0, 1, s * 4.65, s * 7.2, 0.24, matPav, 2);
    wall(0, 1, s * 7.2, -0.03, 0.24, matEdge, 2);
  }
}
// lane dashes over the given stretches of the loop
function laneDashes(ranges) {
  const dash = new THREE.MeshBasicMaterial({ color: '#f1ece0' });
  const geo = new THREE.BoxGeometry(0.16, 0.02, 1.4);
  const items = [];
  const f = {};
  for (let [a, b] of ranges) {
    if (b < a) b += 1;
    for (let s = a * LOOP; s < b * LOOP; s += 3.5) items.push(s / LOOP);
  }
  const im = new THREE.InstancedMesh(geo, dash, items.length * 2 + 2);
  let k = 0;
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    sc = new THREE.Vector3(1, 1, 1),
    p = new THREE.Vector3();
  for (const u of items) {
    frame(u, f);
    e.set(0, Math.atan2(f.tx, f.tz), 0);
    q.setFromEuler(e);
    const h = hU(u);
    for (const side of [-1, 1]) {
      p.set(f.x + (f.rx * side * LANE) / 2, 0.06 + h, f.z + (f.rz * side * LANE) / 2);
      m4.compose(p, q, sc);
      im.setMatrixAt(k++, m4);
    }
  }
  im.count = k;
  world.add(im);
}

// ---------- signs (canvas text) ----------
function textPlane(lines, w, h, bg, fg, opts = {}) {
  const W = 512,
    H = Math.round((W * h) / w);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  if (opts.border) {
    g.strokeStyle = opts.border;
    g.lineWidth = 10;
    g.strokeRect(12, 12, W - 24, H - 24);
  }
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const sizes = opts.sizes || lines.map((_, i) => (i ? H * 0.26 : H * 0.42));
  const total = sizes.reduce((a, b) => a + b * 1.12, 0);
  let y = H / 2 - total / 2;
  const font = opts.font || '"Pixelify Sans","Courier New",monospace';
  lines.forEach((ln, i) => {
    const fs = sizes[i];
    let size = fs;
    g.font = `700 ${size}px ${font}`;
    while (g.measureText(ln).width > W - 50 && size > 10) {
      size -= 2;
      g.font = `700 ${size}px ${font}`;
    }
    y += fs * 0.56;
    g.fillText(ln, W / 2, y);
    y += fs * 0.56;
  });
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = maxAniso;
  const mat = new THREE.MeshBasicMaterial({ map: t, side: opts.both ? DS : THREE.FrontSide });
  mat.userData.own = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  world.add(m);
  return m;
}
function faceAt(m, x, y, z, tx, tz) {
  m.position.set(x, y, z);
  m.rotation.y = Math.atan2(-tx, -tz);
}
function gantry(u, lines, bg = '#1f6b3a', fg = '#ffffff') {
  const f = frame(u, {}),
    h = hU(u);
  BASEY = h;
  for (const s of [-6.2, 6.2]) box('concrete', 0.45, 7, 0.45, f.x + f.rx * s, 0, f.z + f.rz * s);
  box('concrete', 12.8, 0.5, 0.5, f.x, 6.9, f.z, Math.atan2(f.tx, f.tz));
  BASEY = null;
  const p = textPlane(lines, 9, 2, bg, fg, { border: '#ffffff' });
  faceAt(p, f.x - f.tx * 0.3, 6.1 + h, f.z - f.tz * 0.3, f.tx, f.tz);
}
function roadsideSign(u, side, lines, w, h, bg, fg, y = 2.4) {
  const f = frame(u, {}),
    b = hU(u);
  const x = f.x + f.rx * side,
    z = f.z + f.rz * side;
  BASEY = b;
  box('concrete', 0.25, y, 0.25, x, 0, z);
  BASEY = null;
  const p = textPlane(lines, w, h, bg, fg, { border: fg });
  faceAt(p, x - f.tx * 0.15, y + h / 2 - 0.2 + b, z - f.tz * 0.15, f.tx, f.tz);
}
// start/finish arch over the road at loop position u (span: lateral extent of the posts)
function startArch(u, title, lo = -6.4, hi = 6.4) {
  const f = frame(u, {}),
    h = hU(u);
  BASEY = h;
  for (const s of [lo, hi]) {
    box('dark', 0.9, 7.8, 0.9, f.x + f.rx * s, 0, f.z + f.rz * s);
    box('purple', 1.1, 1, 1.1, f.x + f.rx * s, 7.8, f.z + f.rz * s);
  }
  BASEY = null;
  const mid = (lo + hi) / 2,
    w = hi - lo + 0.6,
    cx = f.x + f.rx * mid,
    cz = f.z + f.rz * mid;
  const p = textPlane([title, 'START · FINISH'], w, 2.6, '#f2c230', '#1b1915', { sizes: [64, 34] });
  faceAt(p, cx, 6.6 + h, cz, f.tx, f.tz);
  const back = textPlane([title], w, 2.6, '#f2c230', '#1b1915');
  back.position.set(cx + f.tx * 0.05, 6.6 + h, cz + f.tz * 0.05);
  back.rotation.y = Math.atan2(f.tx, f.tz);
  ribbon(u - 1 / LOOP, u + 1 / LOOP, -4.1, 4.1, 0.05, matLineW, 1);
}
