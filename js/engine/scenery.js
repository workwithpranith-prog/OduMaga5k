'use strict';
// ---------- landmark helpers ----------
const FOOT = [];
function placeClear(v, r) {
  const n = nearestFast(v.x, v.z);
  const need = r + 8;
  if (n.d < need) {
    const dx = v.x - PX[n.i],
      dz = v.z - PZ[n.i],
      l = Math.hypot(dx, dz) || 1;
    v.x = PX[n.i] + (dx / l) * need;
    v.z = PZ[n.i] + (dz / l) * need;
  }
  FOOT.push({ x: v.x, z: v.z, r: r + 3 });
  return v;
}
function facingRoad(v) {
  const n = nearestFast(v.x, v.z);
  return Math.atan2(PX[n.i] - v.x, PZ[n.i] - v.z);
}
function rel(c, ry) {
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  return (key, w, h, d, lx, ly, lz, r2 = 0) =>
    box(key, w, h, d, c.x + lx * cs + lz * sn, ly, c.z - lx * sn + lz * cs, ry + r2);
}
function relPt(c, ry, lx, lz) {
  const cs = Math.cos(ry),
    sn = Math.sin(ry);
  return { x: c.x + lx * cs + lz * sn, z: c.z - lx * sn + lz * cs };
}
function plaque(c, ry, lz, y, lines, w, h, bg, fg, opts) {
  const p = textPlane(lines, w, h, bg, fg, opts);
  const q = relPt(c, ry, 0, lz);
  p.position.set(q.x, y + (HAS_ELEV ? (BASEY != null ? BASEY : groundH(q.x, q.z)) : 0), q.z);
  p.rotation.y = ry;
  return p;
}
// a spot beside the road at loop position u, `lat` units to the side, facing the road; sets BASEY so the whole thing sits level
function site(u, lat, r = 0) {
  const f = frame(u, {});
  const sg = Math.sign(lat) || 1;
  const c = { x: f.x + f.rx * lat, z: f.z + f.rz * lat };
  if (r) FOOT.push({ x: c.x, z: c.z, r });
  const ry = Math.atan2(-f.rx * sg, -f.rz * sg);
  BASEY = hU(u);
  return { c, ry, R: rel(c, ry), f, h: BASEY };
}
function stadium(c, rx, rz, h, floodlights) {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    const x = c.x + Math.cos(a) * rx,
      z = c.z + Math.sin(a) * rz;
    const tx = -Math.sin(a) * rx,
      tz = Math.cos(a) * rz;
    box('concrete', (Math.hypot(tx, tz) * Math.PI) / 12 + 0.6, h, 3.2, x, 0, z, Math.atan2(-tz, tx));
    box('white', (Math.hypot(tx, tz) * Math.PI) / 12 + 0.6, 0.4, 3.4, x, h, z, Math.atan2(-tz, tx));
  }
  box('track', rx * 1.6, 0.12, rz * 1.6, c.x, 0, c.z);
  box('field', rx * 1.2, 0.18, rz * 1.1, c.x, 0, c.z);
  if (floodlights)
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1]
    ]) {
      const x = c.x + sx * (rx + 2),
        z = c.z + sz * (rz + 2);
      box('concrete', 0.9, h + 18, 0.9, x, 0, z);
      box('lamp', 4.5, 2.6, 1, x, h + 18, z, Math.atan2(-sx, -sz));
    }
}
function domeStack(R, x, y, z, s) {
  R('granite', 4 * s, 1.2 * s, 4 * s, x, y, z);
  R('granite', 3.4 * s, 1.6 * s, 3.4 * s, x, y + 1.2 * s, z);
  R('granite', 2.6 * s, 1.2 * s, 2.6 * s, x, y + 2.8 * s, z);
  R('granite', 1.6 * s, 0.9 * s, 1.6 * s, x, y + 4 * s, z);
  R('gold', 0.4 * s, 1.2 * s, 0.4 * s, x, y + 4.9 * s, z);
}
// ---------- scenery helpers ----------
let srnd = mulberry32(560001);
function clearOf(x, z, r) {
  const n = nearestFast(x, z);
  if (n.d < r) return false;
  for (const f of FOOT) if (Math.hypot(f.x - x, f.z - z) < f.r + r) return false;
  return true;
}
function avenueTree(x, z) {
  const leaf = srnd() < 0.12 ? 'leafP' : 'leafG';
  const h = 2.6 + srnd();
  box('bark', 0.6, h, 0.6, x, 0, z);
  const w = 3 + srnd();
  box(leaf, w, 2.2, w, x, h - 0.2, z);
  box(leaf, w * 0.62, 1.2, w * 0.62, x, h + 2, z);
}
function canopyTree(x, z) {
  const h = 5.2 + srnd() * 1.6;
  box('bark', 0.9, h, 0.9, x, 0, z);
  box('bark', 0.5, 2, 0.5, x, h - 1, z, 0.6);
  const w = 9 + srnd() * 3;
  const leaf = srnd() < 0.06 ? 'leafP' : srnd() < 0.5 ? 'leafD' : 'leafG';
  box(leaf, w, 2, w * 0.85, x, h, z);
  box(leaf, w * 0.7, 1.6, w * 0.65, x, h + 2, z);
  box(leaf, w * 0.4, 1, w * 0.4, x, h + 3.6, z);
}
function eucalyptus(x, z) {
  const h = 9 + srnd() * 5;
  box('bark', 0.5, h, 0.5, x, 0, z);
  const w = 2.2 + srnd();
  box('leafE', w, h * 0.45, w, x, h * 0.55, z);
  box('leafE', w * 0.6, 2, w * 0.6, x, h, z);
}
function palm(x, z) {
  const h = 6 + srnd() * 2;
  box('bark', 0.5, h, 0.5, x, 0, z);
  for (const a of [0, 1.57, 0.78, 2.35]) box('leafG', 4.4, 0.3, 0.9, x, h, z, a);
  box('leafD', 1.2, 1, 1.2, x, h - 0.3, z);
}
function person(x, z, ry, tee, legs) {
  box(legs || 'dark', 0.5, 0.9, 0.3, x, 0, z, ry);
  box(tee, 0.6, 0.8, 0.36, x, 0.9, z, ry);
  box('bark', 0.42, 0.42, 0.42, x, 1.7, z, ry);
}
function clouds() {
  for (let k = 0; k < 26; k++) {
    const a = srnd() * 6.28,
      r = 60 + srnd() * Math.max(360, GB.size * 0.35);
    box(
      'cloud',
      10 + srnd() * 14,
      2.5,
      7 + srnd() * 9,
      GB.cx + Math.cos(a) * r,
      48 + srnd() * 16,
      GB.cz + Math.sin(a) * r
    );
  }
}
const VIA = 9.6;
