'use strict';
// ================= three.js scene =================
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
const scene = new THREE.Scene();
const SKY = 0xa9d8ef;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 60, 165);
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 420);
scene.add(new THREE.HemisphereLight(0xffffff, 0x5f7f45, 0.78));
const sun = new THREE.DirectionalLight(0xfff3dc, 0.72);
sun.position.set(60, 110, 30);
scene.add(sun);
function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = Math.max(62, Math.min(90, 62 + (1 - camera.aspect) * 45));
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- pixel textures ----------
const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
function pixTex(w, draw, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  return t;
}
const trnd = mulberry32(7);
function noise(cols) {
  return (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        g.fillStyle = cols[(trnd() * cols.length) | 0];
        g.fillRect(x, y, 1, 1);
      }
  };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
const TEX = {
  grass: pixTex(16, noise(['#5d8f3c', '#6a9c45', '#5a8a39', '#73a34c', '#4f7f33', '#679a42'])),
  asphalt: pixTex(16, noise(['#6a6762', '#716e69', '#64615c', '#77746e', '#6d6a65'])),
  pavers: pixTex(16, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const blk = ((x >> 2) + (y >> 2)) % 2;
        const base = blk ? ['#b9b2a6', '#b2ab9f'] : ['#a39c90', '#9b9488'];
        g.fillStyle = x % 4 === 0 || y % 4 === 0 ? '#8b8478' : base[(trnd() * 2) | 0];
        g.fillRect(x, y, 1, 1);
      }
  }),
  kerb: pixTex(
    2,
    g => {
      g.fillStyle = '#2f8f5b';
      g.fillRect(0, 0, 2, 8);
      g.fillStyle = '#f0eee6';
      g.fillRect(0, 8, 2, 8);
    },
    16
  ),
  railing: (() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = '#24332b';
    for (let x = 1; x < 16; x += 4) g.fillRect(x, 2, 1, 14);
    g.fillRect(0, 2, 16, 1);
    g.fillRect(0, 12, 16, 1);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  })(),
  granite: pixTex(16, noise(['#e2d6b8', '#dccfae', '#e8ddc2', '#d4c6a3', '#ded2b4'])),
  vsWall: pixTex(16, (g, w, h) => {
    noise(['#e2d6b8', '#dccfae', '#e8ddc2', '#d8cbaa'])(g, w, h);
    g.fillStyle = '#6d5f45';
    for (const y0 of [2, 9])
      for (let x = 1; x < 16; x += 4) {
        g.fillRect(x, y0 + 1, 2, 4);
        g.fillRect(x, y0, 2, 1);
      }
    g.fillStyle = '#c9bb97';
    g.fillRect(0, 7, 16, 1);
    g.fillRect(0, 15, 16, 1);
  }),
  redwall: pixTex(16, (g, w, h) => {
    noise(['#d8503f', '#cf4a3a', '#df5a47', '#c84536'])(g, w, h);
    g.fillStyle = '#f3ead8';
    for (const y0 of [3, 10])
      for (let x = 2; x < 16; x += 5) {
        g.fillRect(x - 1, y0 - 1, 4, 5);
      }
    g.fillStyle = '#2d3740';
    for (const y0 of [3, 10])
      for (let x = 2; x < 16; x += 5) {
        g.fillRect(x, y0, 2, 3);
      }
  }),
  brick: pixTex(16, (g, w, h) => {
    noise(['#a8402f', '#b34a36', '#9b3a2a', '#ad4532'])(g, w, h);
    g.fillStyle = '#d8c8b0';
    for (let y = 3; y < h; y += 4) g.fillRect(0, y, w, 1);
    for (let y = 0; y < h; y += 4) {
      const o = (y / 4) % 2 ? 2 : 6;
      for (let x = o; x < w; x += 8) g.fillRect(x, y, 1, 3);
    }
  }),
  leafG: pixTex(16, noise(['#3f7a2e', '#4a8a36', '#36692a', '#56973e', '#2f5f24'])),
  leafD: pixTex(16, noise(['#2f6324', '#36702a', '#28561f', '#3f7a2e', '#4a8a36'])),
  leafP: pixTex(16, noise(['#8e6bbf', '#9d7cce', '#7d5aae', '#a98bd6', '#4a8a36'])),
  bark: pixTex(16, noise(['#5a4636', '#4e3c2e', '#66503e', '#463528'])),
  glass: pixTex(16, (g, w, h) => {
    noise(['#6f9fc4', '#7aaad0', '#6493b8', '#86b5d8'])(g, w, h);
    g.fillStyle = '#d9e8f2';
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.fillStyle = '#4d7596';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
  }),
  concrete: pixTex(16, noise(['#a7a39a', '#9e9a91', '#b0aca3', '#a3a096'])),
  purple: pixTex(16, noise(['#7b3fa0', '#8a4bb0', '#74399a'])),
  track: pixTex(16, (g, w, h) => {
    noise(['#b5533a', '#c25e43', '#ad4e36'])(g, w, h);
    g.fillStyle = '#f0e6dc';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
  }),
  field: pixTex(16, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        g.fillStyle = (y >> 2) % 2 ? (trnd() < 0.5 ? '#4e9a3a' : '#53a03e') : trnd() < 0.5 ? '#5aa846' : '#60ae4b';
        g.fillRect(x, y, 1, 1);
      }
  }),
  tile: pixTex(16, (g, w, h) => {
    noise(['#b9785a', '#c4825f', '#a96b4f'])(g, w, h);
    g.fillStyle = '#8a4f37';
    for (let y = 3; y < h; y += 4) g.fillRect(0, y, w, 1);
  }),
  hedge: pixTex(16, noise(['#4f8a2c', '#5c9a34', '#447a26', '#68a83c'])),
  dosa: pixTex(16, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = Math.abs(y - 7.5) / 8;
        const r = trnd();
        g.fillStyle =
          c < 0.55 ? (r < 0.35 ? '#a95a22' : r < 0.7 ? '#b8692a' : '#c9822f') : r < 0.5 ? '#e2a23d' : '#e9b04a';
        g.fillRect(x, y, 1, 1);
      }
  }),
  leaf: pixTex(16, (g, w, h) => {
    noise(['#3f8f32', '#4a9a3a', '#458f35'])(g, w, h);
    g.fillStyle = '#7cc35c';
    for (let y = 1; y < h; y += 3) g.fillRect(0, y, w, 1);
    g.fillStyle = '#2f6f26';
    g.fillRect(0, 0, w, 1);
  }),
  weave: pixTex(16, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        g.fillStyle =
          ((x >> 1) + (y >> 1)) % 2 ? (trnd() < 0.5 ? '#c9a66b' : '#c29e62') : trnd() < 0.5 ? '#b48e55' : '#a98450';
        g.fillRect(x, y, 1, 1);
      }
  }),
  mural: pixTex(32, (g, w, h) => {
    g.fillStyle = '#efe3c4';
    g.fillRect(0, 0, w, h);
    const cols = ['#2bb3a8', '#e8457a', '#f2c230', '#7b4bd0', '#ef7a2d', '#2a6fd1', '#9be0d6'];
    for (let k = 0; k < 26; k++) {
      g.fillStyle = cols[(trnd() * cols.length) | 0];
      const x = trnd() * w,
        y = trnd() * h,
        r = 2 + trnd() * 6;
      for (let yy = -r; yy <= r; yy++)
        for (let xx = -r; xx <= r; xx++)
          if (xx * xx + yy * yy <= r * r) g.fillRect(Math.floor(x + xx), Math.floor(y + yy), 1, 1);
    }
    g.fillStyle = '#2f3a44';
    for (const [x, y] of [
      [13, 4],
      [13, 13],
      [2, 22],
      [8, 22]
    ])
      g.fillRect(x, y, 6, 4);
    g.fillStyle = '#d8c9a6';
    for (const y of [10, 20]) g.fillRect(0, y, w, 1);
  })
};
function wallTex(base, win) {
  return pixTex(16, (g, w, h) => {
    const cols = [base, base, shade(base, -0.06), shade(base, 0.05)];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        g.fillStyle = cols[(trnd() * cols.length) | 0];
        g.fillRect(x, y, 1, 1);
      }
    g.fillStyle = win;
    for (const [wx, wy] of [
      [3, 3],
      [9, 3],
      [3, 9],
      [9, 9]
    ])
      g.fillRect(wx, wy, 4, 4);
    g.fillStyle = shade(win, 0.25);
    for (const [wx, wy] of [
      [3, 3],
      [9, 3],
      [3, 9],
      [9, 9]
    ])
      g.fillRect(wx, wy, 4, 1);
  });
}
const WALLS = [
  ['#e8dcc0', '#3d5566'],
  ['#a9c4d6', '#2f4555'],
  ['#e2b3ae', '#3a4a55'],
  ['#e8cf7a', '#33475a'],
  ['#efeee8', '#425a6b'],
  ['#c9805d', '#2e3e4a'],
  ['#a8c29a', '#334a3a']
].map(([b, w]) => wallTex(b, w));
const SOLID = c =>
  pixTex(4, g => {
    g.fillStyle = c;
    g.fillRect(0, 0, 4, 4);
  });

// ---------- static batcher (one draw call per material) ----------
const BATCH = {};
function defMat(key, tex, unit, opts = {}) {
  BATCH[key] = { mat: new THREE.MeshLambertMaterial({ map: tex, ...opts }), unit, pos: [], nrm: [], uv: [], idx: [] };
}
defMat('granite', TEX.granite, 2);
defMat('vsWall', TEX.vsWall, 4);
defMat('redwall', TEX.redwall, 3.2);
defMat('brick', TEX.brick, 2);
defMat('leafG', TEX.leafG, 1.2);
defMat('leafD', TEX.leafD, 1.2);
defMat('leafP', TEX.leafP, 1.2);
defMat('bark', TEX.bark, 1);
defMat('hedge', TEX.hedge, 1);
defMat('glass', TEX.glass, 3);
defMat('concrete', TEX.concrete, 2);
defMat('purple', TEX.purple, 2);
defMat('track', TEX.track, 2);
defMat('field', TEX.field, 2);
defMat('tile', TEX.tile, 1.5);
defMat('mural', TEX.mural, 14);
defMat('white', SOLID('#f2efe6'), 4);
defMat('gold', SOLID('#e3b23c'), 4);
defMat('dark', SOLID('#2a2722'), 4);
defMat('teal', SOLID('#5fae9e'), 4);
defMat('yellowpath', SOLID('#e8c95a'), 4);
defMat('pillarA', SOLID('#7fa3c4'), 4);
defMat('pillarB', SOLID('#d9876e'), 4);
defMat('pillarC', SOLID('#e0a050'), 4);
defMat('cloud', SOLID('#ffffff'), 40, { fog: false, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.7 });
defMat('lamp', SOLID('#fff6c8'), 4, { emissive: new THREE.Color('#fff2b0'), emissiveIntensity: 0.8 });
WALLS.forEach((t, i) => defMat('wall' + i, t, 3));
// extra textures for Ulsoor Lake and NICE Road
TEX.water = pixTex(16, (g, w, h) => {
  noise(['#4f8fae', '#5698b6', '#4a87a5', '#5e9fbd', '#4c8aa8'])(g, w, h);
  g.fillStyle = '#8cc3db';
  for (let k = 0; k < 7; k++) {
    const x = (trnd() * w) | 0,
      y = (trnd() * h) | 0;
    g.fillRect(x, y, 3, 1);
  }
});
TEX.army = pixTex(16, noise(['#5d6b3a', '#56643a', '#637244', '#525f33']));
TEX.whitewash = pixTex(16, (g, w, h) => {
  noise(['#efece2', '#e8e4d8', '#f3f0e8', '#e4dfd1'])(g, w, h);
  g.fillStyle = '#b9a98a';
  g.fillRect(0, 13, 16, 3);
});
TEX.marble = pixTex(16, (g, w, h) => {
  noise(['#f6f3ec', '#f1ede4', '#faf8f3', '#ece7dc'])(g, w, h);
  g.fillStyle = '#ddd5c4';
  g.fillRect(0, 15, 16, 1);
  g.fillRect(7, 0, 1, 16);
});
TEX.rock = pixTex(16, noise(['#8e8a84', '#99948d', '#85817b', '#a39e96', '#7c7872']));
TEX.soil = pixTex(16, noise(['#9c6b45', '#a5744c', '#93633f', '#ab7a50']));
TEX.crop = pixTex(16, (g, w, h) => {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      g.fillStyle = x % 4 < 2 ? (trnd() < 0.5 ? '#7fa83c' : '#86b043') : trnd() < 0.5 ? '#9c6b45' : '#a5744c';
      g.fillRect(x, y, 1, 1);
    }
});
TEX.median = pixTex(16, noise(['#6f8a3f', '#7a9446', '#8c6a48', '#688338']));
TEX.barrier = (() => {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#b9bec2';
  g.fillRect(0, 3, 16, 7);
  g.fillStyle = '#e6e9eb';
  g.fillRect(0, 4, 16, 2);
  g.fillStyle = '#8a9095';
  g.fillRect(0, 9, 16, 1);
  g.fillStyle = '#4a4e52';
  g.fillRect(2, 3, 1, 13);
  g.fillRect(10, 3, 1, 13);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
})();
defMat('army', TEX.army, 2);
defMat('whitewash', TEX.whitewash, 3);
defMat('marble', TEX.marble, 2);
defMat('rock', TEX.rock, 2);
defMat('soil', TEX.soil, 2);
defMat('crop', TEX.crop, 2);
defMat('saffron', SOLID('#f08a24'), 4);
defMat('wood', SOLID('#8a5a32'), 4);
defMat('green', SOLID('#1f6b3a'), 4);
defMat('orange', SOLID('#f0742a'), 4);
defMat('blue', SOLID('#2f6fb3'), 4);
defMat('red', SOLID('#c63b2b'), 4);
defMat('cream', SOLID('#efe3c4'), 4);
defMat('leafE', pixTex(16, noise(['#4d7a4a', '#57855a', '#466f43', '#62906a'])), 1.2);
const TEXT_SKIN = ['#8d5a3b', '#a86f48', '#6e4429', '#c08a5e'];
