'use strict';
// ================= dynamic models =================
const GEO = {},
  MAT = {};
const gk = (w, h, d) => GEO[w + '|' + h + '|' + d] || (GEO[w + '|' + h + '|' + d] = new THREE.BoxGeometry(w, h, d));
const mk = c => MAT[c] || (MAT[c] = new THREE.MeshLambertMaterial({ color: c }));
function part(parent, w, h, d, c, x, y, z) {
  const m = new THREE.Mesh(gk(w, h, d), mk(c));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function pivot(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
const SKIN = '#8d5a3b',
  TEE = '#ef3b2d',
  SHORTS = '#3d4a61',
  SHOE = '#cdf3b0';
function makeRunner() {
  const g = new THREE.Group(),
    body = pivot(g, 0, 0, 0);
  part(body, 0.64, 0.74, 0.36, TEE, 0, 1.32, 0);
  part(body, 0.5, 0.5, 0.5, SKIN, 0, 1.95, 0);
  part(body, 0.52, 0.16, 0.52, '#16120f', 0, 2.24, 0);
  part(body, 0.52, 0.24, 0.1, '#16120f', 0, 2.08, -0.22);
  const legs = [],
    arms = [];
  for (const sx of [-1, 1]) {
    const L = pivot(body, sx * 0.16, 0.96, 0);
    part(L, 0.27, 0.36, 0.29, SHORTS, 0, -0.18, 0);
    part(L, 0.21, 0.5, 0.21, SKIN, 0, -0.6, 0);
    part(L, 0.27, 0.08, 0.4, '#f4f1ea', 0, -0.94, 0.05);
    part(L, 0.26, 0.12, 0.38, SHOE, 0, -0.84, 0.05);
    legs.push(L);
    const A = pivot(body, sx * 0.43, 1.62, 0);
    part(A, 0.21, 0.32, 0.23, TEE, 0, -0.14, 0);
    part(A, 0.215, 0.04, 0.235, '#ffffff', 0, -0.05, 0);
    part(A, 0.215, 0.04, 0.235, '#ffffff', 0, -0.13, 0);
    part(A, 0.215, 0.04, 0.235, '#ffffff', 0, -0.21, 0);
    part(A, 0.17, 0.4, 0.18, SKIN, 0, -0.5, 0);
    part(A, 0.2, 0.1, 0.21, sx < 0 ? '#111111' : '#1d1d1d', 0, -0.62, 0);
    arms.push(A);
  }
  const sh = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 16),
    new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false })
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.04;
  g.add(sh);
  scene.add(g);
  // race bib, front and back (routes with bib: true); paintBib() draws the number once the fonts are in
  const bibTex = new THREE.CanvasTexture(document.createElement('canvas'));
  bibTex.anisotropy = maxAniso;
  const bibMat = new THREE.MeshLambertMaterial({ map: bibTex });
  const bib = pivot(body, 0, 0, 0);
  for (const sz of [1, -1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), bibMat);
    m.position.set(0, 1.36, sz * 0.185);
    if (sz < 0) m.rotation.y = Math.PI;
    bib.add(m);
  }
  bib.visible = false;
  // finisher medal: ribbon round the neck and a gold disc on the chest (front of the runner is +z)
  const medal = pivot(body, 0, 0, 0);
  for (const sx of [-1, 1]) {
    const strap = part(medal, 0.08, 0.46, 0.03, '#2f6fb3', sx * 0.12, 1.5, 0.19);
    strap.rotation.z = sx * 0.42;
  }
  const disc = cyl(medal, 0.15, 0.15, 0.05, '#e3b23c', 0, 1.25, 0.21, 16);
  disc.rotation.x = Math.PI / 2;
  part(medal, 0.12, 0.12, 0.02, '#c9902a', 0, 1.25, 0.245);
  medal.visible = false;
  return { g, body, legs, arms, medal, bib, bibTex };
}
function makeAuto() {
  const g = new THREE.Group();
  part(g, 0.22, 0.42, 0.42, '#141414', 0, 0.21, 0.95);
  for (const sx of [-1, 1]) part(g, 0.22, 0.42, 0.42, '#141414', sx * 0.62, 0.21, -0.72);
  part(g, 1.32, 0.62, 2.1, '#1d6a3c', 0, 0.72, 0);
  part(g, 1.44, 0.9, 1.7, '#f2c230', 0, 1.44, -0.15);
  part(g, 1.5, 0.12, 1.78, '#d9a91f', 0, 1.92, -0.15);
  part(g, 1.16, 0.58, 0.06, '#24343a', 0, 1.38, 0.72);
  part(g, 1.3, 0.5, 0.06, '#1b1915', 0, 1.42, -1.02);
  part(g, 0.42, 0.16, 0.04, '#f7f2e6', 0, 0.86, -1.07);
  for (const sx of [-1, 1]) part(g, 0.14, 0.12, 0.04, '#e0533a', sx * 0.5, 0.86, -1.07);
  scene.add(g);
  return g;
}
function makeCow() {
  const g = new THREE.Group();
  part(g, 0.92, 0.82, 1.7, '#f1ece2', 0, 1.15, 0);
  part(g, 0.94, 0.32, 0.42, '#2b2724', 0, 1.3, 0.25);
  part(g, 0.94, 0.26, 0.3, '#2b2724', 0, 1.05, -0.45);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 0.22, 0.78, 0.22, '#e8e2d6', sx * 0.3, 0.39, sz * 0.6);
  part(g, 0.56, 0.56, 0.62, '#ece5d8', 0, 1.45, 1.06);
  part(g, 0.46, 0.24, 0.14, '#d9a6a0', 0, 1.32, 1.4);
  part(g, 0.09, 0.32, 0.09, '#e0633a', -0.2, 1.88, 1.0);
  part(g, 0.09, 0.32, 0.09, '#2c6db3', 0.2, 1.88, 1.0);
  part(g, 0.08, 0.62, 0.08, '#e8e2d6', 0, 0.98, -0.9);
  part(g, 0.5, 0.16, 0.1, '#c9b24a', 0, 0.95, 1.08);
  scene.add(g);
  return g;
}
function makeDog() {
  const g = new THREE.Group();
  const c = ['#b5824e', '#2b2522', '#d8c7a6'][(Math.random() * 3) | 0];
  const c2 = shade(c, -0.12);
  part(g, 0.4, 0.38, 0.88, c, 0, 0.6, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 0.13, 0.42, 0.13, c2, sx * 0.13, 0.21, sz * 0.3);
  part(g, 0.38, 0.34, 0.38, c2, 0, 0.88, 0.52);
  part(g, 0.2, 0.15, 0.2, shade(c, -0.25), 0, 0.82, 0.78);
  for (const sx of [-1, 1]) part(g, 0.1, 0.16, 0.08, shade(c, -0.3), sx * 0.13, 1.1, 0.46);
  const tail = pivot(g, 0, 0.78, -0.44);
  part(tail, 0.08, 0.38, 0.08, c, 0, 0.18, 0);
  g.userData.tail = tail;
  scene.add(g);
  return g;
}
function makeWater() {
  const g = new THREE.Group(),
    i = pivot(g, 0, 0, 0);
  const clear = new THREE.MeshLambertMaterial({ color: '#8fd0f2', transparent: true, opacity: 0.82 });
  const body = new THREE.Mesh(gk(0.4, 0.8, 0.4), clear);
  i.add(body);
  part(i, 0.42, 0.22, 0.42, '#f7f2e6', 0, -0.02, 0);
  part(i, 0.28, 0.12, 0.28, '#8fd0f2', 0, 0.46, 0);
  part(i, 0.24, 0.14, 0.24, '#1f6fd1', 0, 0.58, 0);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.9, 24),
    new THREE.MeshBasicMaterial({ color: '#5cc8f2', transparent: true, opacity: 0.6, side: DS })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.75;
  g.add(ring);
  g.userData.spin = i;
  scene.add(g);
  return g;
}
function makeGel() {
  const g = new THREE.Group(),
    i = pivot(g, 0, 0, 0);
  part(i, 0.56, 0.8, 0.16, '#c6f03a', 0, 0, 0);
  part(i, 0.58, 0.24, 0.17, '#1b1915', 0, 0.08, 0);
  part(i, 0.3, 0.14, 0.16, '#c6f03a', 0, 0.46, 0);
  part(i, 0.2, 0.08, 0.18, '#ff3fa4', 0, 0.08, 0);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.9, 24),
    new THREE.MeshBasicMaterial({ color: '#c6f03a', transparent: true, opacity: 0.6, side: DS })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.75;
  g.add(ring);
  g.userData.spin = i;
  scene.add(g);
  return g;
}
function makeTrain() {
  const cars = [];
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group();
    part(g, 2.8, 2.9, 7.4, '#ece9e2', 0, 1.45, 0);
    part(g, 2.84, 0.6, 7.44, '#8a4bb0', 0, 0.9, 0);
    part(g, 2.86, 0.7, 6.2, '#33414a', 0, 2.0, 0);
    part(g, 2.86, 0.18, 7.44, '#8a4bb0', 0, 2.75, 0);
    scene.add(g);
    cars.push(g);
  }
  return cars;
}
function cyl(parent, rt, rb, h, c, x, y, z, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'string' ? mk(c) : c);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function makeTrophy() {
  const g = new THREE.Group();
  // small wooden table
  part(g, 3.6, 0.16, 3.6, '#7a5232', 0, -0.08, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 0.22, 1.2, 0.22, '#5e3e25', sx * 1.5, -0.76, sz * 1.5);
  const plateG = new THREE.Group();
  scene.add(plateG);
  const spin = pivot(plateG, 0, 0, 0);
  const L = t => new THREE.MeshLambertMaterial({ map: t });
  cyl(spin, 1.62, 1.62, 0.05, L(TEX.weave), 0, 0.03, 0, 24); // woven mat
  cyl(spin, 1.38, 1.3, 0.09, '#f4f2ec', 0, 0.1, 0, 24); // white plate
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.03, 1.75), L(TEX.leaf));
  leaf.position.set(0, 0.16, 0);
  leaf.rotation.y = -0.35;
  spin.add(leaf);
  // the dosa: folded, roasted golden-brown, with a rolled edge and a butter cube
  const dz = pivot(spin, 0.15, 0.17, 0.25);
  dz.rotation.y = -0.3;
  const dm = L(TEX.dosa);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.95), dm);
  slab.position.y = 0.09;
  dz.add(slab);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.5, 10), dm);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, 0.14, -0.44);
  dz.add(roll);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.7), mk('#e9b04a'));
  tip.position.set(1.32, 0.07, 0.05);
  tip.rotation.y = 0.25;
  dz.add(tip);
  part(dz, 0.24, 0.2, 0.24, '#f6e08a', -0.1, 0.27, 0.05);
  // coconut chutney, potato palya (steel bowls) and red chutney (white bowl)
  const bowl = (x, z, c, steel) => {
    cyl(spin, 0.34, 0.26, 0.22, steel ? '#c3c7cb' : '#f4f2ec', x, 0.28, z, 14);
    cyl(spin, 0.29, 0.29, 0.03, c, x, 0.38, z, 14);
  };
  bowl(-0.5, -0.55, '#efeadc', true);
  bowl(0.42, -0.7, '#e3bf3a', true);
  bowl(-1.0, 0.2, '#cf3f26', false);
  for (const [x, z] of [
    [-0.55, -0.5],
    [-0.42, -0.62],
    [0.38, -0.62],
    [0.5, -0.76]
  ])
    part(spin, 0.1, 0.04, 0.06, '#2f6f26', x, 0.41, z);
  for (const [x, z] of [
    [0.32, -0.72],
    [0.48, -0.62],
    [0.42, -0.82]
  ])
    part(spin, 0.1, 0.08, 0.1, '#f0d050', x, 0.42, z);
  // filter coffee: steel davara and tumbler with froth, plus steam
  const cf = new THREE.Group();
  scene.add(cf);
  cyl(cf, 0.42, 0.3, 0.16, '#c3c7cb', 0, 0.08, 0, 16);
  cyl(cf, 0.2, 0.16, 0.55, '#d6d9dc', 0, 0.42, 0, 14);
  cyl(cf, 0.19, 0.19, 0.02, '#7a4a26', 0, 0.7, 0, 14);
  cyl(cf, 0.1, 0.1, 0.03, '#d9b98f', 0, 0.72, 0, 10);
  const steam = [];
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(
      gk(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 })
    );
    m.position.set(0, 0.8, 0);
    cf.add(m);
    steam.push(m);
  }
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.6, 32),
    new THREE.MeshBasicMaterial({ color: '#f2c230', transparent: true, opacity: 0.7, side: DS })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.3;
  g.add(glow);
  g.userData.spin = spin;
  g.userData.steam = steam;
  g.userData.plateG = plateG;
  g.userData.cf = cf;
  g.visible = plateG.visible = cf.visible = false;
  scene.add(g);
  return g;
}
// ---------- new route hazards ----------
const TEES = ['#2f6fb3', '#f2c230', '#6fd07a', '#e8457a', '#7b4bd0', '#ef7a2d', '#2bb3a8', '#f7f2e6'];
function makePerson(g, x, tee, legs, skin, h = 1) {
  const p = pivot(g, x, 0, 0);
  part(p, 0.46, 0.72 * h, 0.3, legs, 0, 0.38 * h, 0);
  part(p, 0.56, 0.7 * h, 0.34, tee, 0, 1.08 * h, 0);
  part(p, 0.4, 0.4, 0.4, skin, 0, 1.66 * h, 0);
  const arms = [];
  for (const sx of [-1, 1]) {
    const A = pivot(p, sx * 0.36, 1.36 * h, 0);
    part(A, 0.16, 0.6, 0.18, tee, 0, -0.28, 0);
    arms.push(A);
  }
  return { p, arms };
}
// food cart with its vendor and a customer eating off a leaf plate
function makeCart() {
  const g = new THREE.Group();
  const kind = (Math.random() * 3) | 0;
  part(g, 1.9, 0.9, 1.2, '#8a5a32', 0, 0.75, 0);
  for (const sx of [-1, 1]) part(g, 0.16, 0.6, 0.6, '#1b1915', sx * 0.9, 0.3, 0);
  part(g, 0.1, 0.9, 0.1, '#5e3e25', 0, 1.65, 0);
  part(g, 2.4, 0.12, 2, ['#e3b23c', '#c63b2b', '#2f6fb3'][kind], 0, 2.55, 0);
  if (kind === 0) {
    for (let k = 0; k < 5; k++) part(g, 0.16, 0.16, 0.5, '#f0d050', -0.6 + k * 0.3, 1.28, 0);
  } else if (kind === 1) {
    part(g, 0.8, 0.4, 0.8, '#c3c7cb', -0.4, 1.4, 0);
    part(g, 0.5, 0.3, 0.5, '#e3bf3a', 0.5, 1.35, 0);
  } else {
    for (let k = 0; k < 6; k++) part(g, 0.22, 0.22, 0.22, '#e9b04a', -0.6 + (k % 3) * 0.4, 1.32, k > 2 ? 0.2 : -0.2);
  }
  makePerson(g, -1.3, TEES[(Math.random() * 8) | 0], '#3d4a61', TEXT_SKIN[(Math.random() * 4) | 0]);
  const c = makePerson(g, 1.4, TEES[(Math.random() * 8) | 0], '#2b2724', TEXT_SKIN[(Math.random() * 4) | 0]);
  c.arms[0].rotation.x = -1.2;
  part(g, 0.5, 0.04, 0.5, '#3f8f32', 1.4, 1.2, 0.45);
  scene.add(g);
  return g;
}
// a pair of morning walkers
function makeWalkers() {
  const g = new THREE.Group();
  const a = makePerson(g, -0.45, '#f7f2e6', '#2b2724', '#8d5a3b'),
    b = makePerson(g, 0.45, ['#e8457a', '#2bb3a8', '#ef7a2d'][(Math.random() * 3) | 0], '#e8457a', '#a86f48', 0.95);
  g.userData.walk = [a, b];
  scene.add(g);
  return g;
}
// footpath steps: three down, a landing, three up (well, up then down)
const STEP_HALF = 3.6; // world units from the middle to each end
function makeSteps() {
  const g = new THREE.Group();
  part(g, 8.4, 0.45, 3, '#b2ab9f', 0, 0.225, 0);
  for (let k = 1; k <= 3; k++)
    for (const sz of [-1, 1]) {
      const h = 0.45 - k * 0.15;
      if (h <= 0) continue;
      part(g, 8.4, h, 0.7, k % 2 ? '#a39c90' : '#b9b2a6', 0, h / 2, sz * (1.5 + (k - 0.5) * 0.7));
    }
  part(g, 8.4, 0.04, 0.2, '#f2c230', 0, 0.47, 1.45);
  part(g, 8.4, 0.04, 0.2, '#f2c230', 0, 0.47, -1.45);
  scene.add(g);
  return g;
}
function bumpAt(w) {
  w = Math.abs(w);
  if (w >= STEP_HALF) return 0;
  if (w <= 1.5) return 0.45;
  return Math.max(0, 3 - Math.ceil((w - 1.5) / 0.7)) * 0.15;
}
function makeRacer() {
  const g = new THREE.Group(),
    body = pivot(g, 0, 0, 0);
  const tee = TEES[(Math.random() * 8) | 0],
    skin = TEXT_SKIN[(Math.random() * 4) | 0];
  const shorts = ['#2b2724', '#3d4a61', '#1f3f8a', '#4a4a4a', '#7b3fa0'][(Math.random() * 5) | 0];
  part(body, 0.62, 0.72, 0.36, tee, 0, 1.32, 0);
  for (const sz of [1, -1]) {
    part(body, 0.36, 0.3, 0.04, '#ffffff', 0, 1.3, sz * 0.2); // bib, front and back
    part(body, 0.36, 0.06, 0.05, '#f0742a', 0, 1.42, sz * 0.205);
    part(body, 0.18, 0.08, 0.05, '#16140f', 0, 1.28, sz * 0.215);
  }
  part(body, 0.48, 0.48, 0.48, skin, 0, 1.94, 0);
  part(body, 0.5, 0.14, 0.5, '#16120f', 0, 2.22, 0);
  const look = Math.random();
  if (look < 0.3) {
    part(body, 0.52, 0.12, 0.52, tee, 0, 2.28, 0); // cap
    part(body, 0.4, 0.05, 0.28, tee, 0, 2.24, 0.34);
  } else if (look < 0.6) part(body, 0.16, 0.34, 0.16, '#16120f', 0, 2.0, -0.3); // ponytail
  const legs = [],
    arms = [];
  for (const sx of [-1, 1]) {
    const L = pivot(body, sx * 0.16, 0.96, 0);
    part(L, 0.27, 0.36, 0.29, shorts, 0, -0.18, 0);
    part(L, 0.2, 0.5, 0.2, skin, 0, -0.6, 0);
    part(L, 0.26, 0.12, 0.38, TEES[(Math.random() * 8) | 0], 0, -0.84, 0.05);
    legs.push(L);
    const A = pivot(body, sx * 0.42, 1.6, 0);
    part(A, 0.2, 0.3, 0.22, tee, 0, -0.14, 0);
    part(A, 0.16, 0.4, 0.17, skin, 0, -0.48, 0);
    arms.push(A);
  }
  g.userData.legs = legs;
  g.userData.arms = arms;
  scene.add(g);
  return g;
}

// ---------- finish trophies for the new routes ----------
function trophyBase() {
  const g = new THREE.Group();
  part(g, 3.6, 0.16, 3.6, '#7a5232', 0, -0.08, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, 0.22, 1.2, 0.22, '#5e3e25', sx * 1.5, -0.76, sz * 1.5);
  const plateG = new THREE.Group();
  scene.add(plateG);
  const spin = pivot(plateG, 0, 0, 0);
  const cf = new THREE.Group();
  scene.add(cf);
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.6, 32),
    new THREE.MeshBasicMaterial({ color: '#f2c230', transparent: true, opacity: 0.7, side: DS })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -1.3;
  g.add(glow);
  g.userData.spin = spin;
  g.userData.plateG = plateG;
  g.userData.cf = cf;
  g.userData.steam = [];
  g.visible = plateG.visible = cf.visible = false;
  scene.add(g);
  return g;
}
function makeTrophyChai() {
  const g = trophyBase(),
    { spin, cf } = g.userData;
  cyl(spin, 1.38, 1.3, 0.09, '#f4f2ec', 0, 0.1, 0, 24);
  for (const [x, z, r] of [
    [-0.35, 0.05, 0.25],
    [0.55, -0.15, -0.5]
  ]) {
    const s = pivot(spin, x, 0.15, z);
    s.rotation.y = r;
    part(s, 1.5, 0.62, 0.9, '#d9913f', 0, 0.31, 0);
    part(s, 1.52, 0.16, 0.92, '#c4362b', 0, 0.66, 0);
    part(s, 1.5, 0.06, 0.9, '#f6efe0', 0, 0.77, 0);
    for (let k = 0; k < 5; k++) part(s, 0.14, 0.05, 0.14, '#ffffff', -0.6 + k * 0.3, 0.82, ((k % 2) - 0.5) * 0.4);
  }
  cyl(
    cf,
    0.24,
    0.18,
    0.62,
    new THREE.MeshLambertMaterial({ color: '#e8eef0', transparent: true, opacity: 0.55 }),
    0,
    0.31,
    0,
    14
  );
  cyl(cf, 0.21, 0.16, 0.5, '#b07a45', 0, 0.27, 0, 14);
  cyl(cf, 0.21, 0.21, 0.03, '#d9b98f', 0, 0.53, 0, 14);
  const steam = [];
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(
      gk(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 })
    );
    m.position.set(0, 0.8, 0);
    cf.add(m);
    steam.push(m);
  }
  g.userData.steam = steam;
  return g;
}
// NICE Road: the race breakfast. Plate: three idlis, coconut and tomato chutney, a banana. In the other hand: tender coconut water.
function makeTrophyNice() {
  const g = trophyBase(),
    { spin, cf } = g.userData;
  cyl(spin, 1.38, 1.3, 0.09, '#c3c7cb', 0, 0.1, 0, 24); // steel plate
  for (const [x, z] of [
    [-0.45, 0.25],
    [0.2, 0.45],
    [-0.05, -0.15]
  ]) {
    cyl(spin, 0.42, 0.4, 0.22, '#f4f1e6', x, 0.25, z, 16); // idli
    cyl(spin, 0.36, 0.36, 0.02, '#e8e2cf', x, 0.37, z, 16);
  }
  cyl(spin, 0.32, 0.25, 0.2, '#c3c7cb', 0.75, 0.24, -0.35, 14);
  cyl(spin, 0.28, 0.28, 0.03, '#eef0dc', 0.75, 0.34, -0.35, 14); // coconut chutney
  part(spin, 0.08, 0.04, 0.06, '#2f6f26', 0.7, 0.37, -0.3);
  cyl(spin, 0.28, 0.22, 0.18, '#c3c7cb', 0.65, 0.23, 0.45, 14);
  cyl(spin, 0.24, 0.24, 0.03, '#cf3f26', 0.65, 0.32, 0.45, 14); // tomato chutney
  const ban = pivot(spin, -0.55, 0.22, -0.75);
  ban.rotation.y = 0.4;
  for (let j = 0; j < 5; j++) {
    const m = part(ban, 0.3, 0.18, 0.2, '#f2d23a', -0.6 + j * 0.28, Math.abs(j - 2) * 0.06, 0);
    m.rotation.z = (j - 2) * 0.22;
  }
  part(ban, 0.1, 0.1, 0.12, '#5e3e25', -0.82, 0.16, 0);
  // tender coconut with a straw
  cyl(cf, 0.36, 0.48, 0.7, '#5c9a2e', 0, 0.35, 0, 10);
  cyl(cf, 0.18, 0.36, 0.25, '#7fb33e', 0, 0.82, 0, 10);
  cyl(cf, 0.18, 0.18, 0.03, '#e9eecf', 0, 0.95, 0, 10);
  const straw = cyl(cf, 0.035, 0.035, 0.7, '#ff3fa4', 0.06, 1.2, 0, 8);
  straw.rotation.z = -0.3;
  return g;
}

const runner = makeRunner();
// draw the player's race bib: orange strip with the event, big number
function paintBib(event, number) {
  const c = document.createElement('canvas');
  c.width = 230;
  c.height = 170;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 230, 170);
  g.fillStyle = '#f0742a';
  g.fillRect(0, 0, 230, 42);
  g.fillStyle = '#16140f';
  g.textAlign = 'center';
  g.font = '400 28px Bungee, "Arial Black", sans-serif';
  g.fillText(event, 115, 32);
  g.font = '800 92px "JetBrains Mono", monospace';
  g.fillText(number, 115, 140);
  runner.bibTex.image = c;
  runner.bibTex.needsUpdate = true;
}
const train = makeTrain();
const TROPHIES = { cubbon: makeTrophy(), ulsoor: makeTrophyChai(), nice: makeTrophyNice() };
let trophy = TROPHIES.cubbon;
