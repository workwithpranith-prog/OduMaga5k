'use strict';
// ================= the routes =================
const COURSES = {
  cubbon: {
    id: 'cubbon',
    name: 'Cubbon Park',
    km: 5,
    race: 5000,
    clock: 15,
    sky: 0xa9d8ef,
    fog: [60, 165],
    eyebrow: 'Kanteerava · UB City · MG Road · Vidhana Soudha · Cubbon Park',
    tagline: 'Flat city loop past UB City, MG Road and Vidhana Soudha, then into Cubbon Park.',
    meta: 'Flat · autos, cows, Cubbon dogs',
    finishAt: 'Kanteerava Stadium',
    color: '#2b5d8a',
    treat: {
      title: 'Masala dosa + filter coffee',
      text: 'Your finish-line trophy: a crisp masala dosa with butter, chutneys and palya, and a strong filter coffee on the side.',
      toast: 'Finish! Masala dosa + filter coffee earned',
      short: 'a masala dosa and filter coffee'
    },
    pbKey: 'nammarun5k.pb',
    randomKit: true, // new tee colour every run (no bib: not a race)
    hazards: [
      ['auto', 'auto', 'autos'],
      ['cow', 'cow', 'cows'],
      ['dog', 'dog', 'dogs']
    ],
    path() {
      ORIGIN = { lat: 12.974, lng: 77.596 };
      return {
        raw: filleted(
          CTRL.map(p => projM(p[0], p[1])),
          48
        )
      };
    },
    prep() {
      U = CTRL.map(p => {
        const v = proj(p[0], p[1]);
        return nearest(v.x, v.z).i / N;
      });
    },
    build() {
      cityRoad();
      cubbonRailings();
      laneDashes([[0, 1]]);
      landmarks();
      cubbonMetro();
      cubbonSigns();
      cubbonScenery();
    },
    zoneOf: u => (isCubbon(u) ? 'cubbon' : isVS(u) ? 'vs' : isMG(u) ? 'mg' : 'city'),
    zoneMsg: { cubbon: 'Into Cubbon Park. Mind the dogs!' },
    obstacles: cubbonObstacles,
    pickups: { water: [650, 1500, 2350, 3200, 4050], gel: [350, 1050, 1800, 2600, 3400, 4300] }
  },
  ulsoor: {
    id: 'ulsoor',
    name: 'Ulsoor Lake',
    km: 3,
    race: 3000,
    clock: 15,
    sky: 0xb3dcf0,
    fog: [70, 270],
    exag: 1.4,
    eyebrow: 'MEG & Centre · Kempegowda Tower · Kensington Road · Gurudwara',
    tagline: 'One lap round the lake on the footpath and the road: army tanks, the watch tower and the Gurudwara.',
    meta: 'Near flat · steps, food carts, walkers',
    finishAt: 'Ulsoor Lake',
    color: '#2f7f8f',
    treat: {
      title: 'Honey cake + masala chai',
      text: 'Your finish-line trophy: a slab of bakery honey cake with jam and coconut, and a hot glass of masala chai.',
      toast: 'Finish! Honey cake + masala chai earned',
      short: 'honey cake and masala chai'
    },
    pbKey: 'odumaga.pb.ulsoor',
    randomKit: true, // new tee colour every run (no bib: not a race)
    hazards: [
      ['cart', 'food cart', 'food carts'],
      ['walkers', 'walker', 'walkers'],
      ['auto', 'auto', 'autos'],
      ['dog', 'dog', 'dogs']
    ],
    path() {
      ORIGIN = { lat: ULS_GPS[0][0], lng: ULS_GPS[0][1] };
      return {
        raw: smoothPts(
          ULS_GPS.map(p => projM(p[0], p[1])),
          5,
          true
        )
      };
    },
    elev() {
      const n = ULS_ELEV.length - 1,
        o = ULS_START * n,
        v = [];
      for (let k = 0; k <= n; k++) {
        const f = (k + o) % n,
          i = Math.floor(f),
          a = f - i;
        v.push(ULS_ELEV[i] + (ULS_ELEV[i + 1] - ULS_ELEV[i]) * a);
      }
      return { step: 50, v };
    },
    startU: ULS_START,
    minimap: true,
    sights: [
      [0.17, 'On your right: a WWII tank at MEG & Centre'],
      [0.235, 'MEG & Centre: home of the Madras Sappers'],
      [0.31, 'Sappers War Memorial on your right'],
      [0.43, 'Kempegowda watch tower, out on the lake to your left'],
      [0.505, 'Ulsoor boat club on your left'],
      [0.59, 'Kensington Road. Swimming pool on your right'],
      [0.845, 'Sri Guru Singh Sabha Gurudwara on your right']
    ],
    prep: ulsoorPrep,
    groundAt: (x, z, h) => (inPolyXZ(x, z, POLY.xs, POLY.zs) ? WATER_Y - 1.6 : h), // everything inside the loop is lake bed, so no bank hides the water
    build: buildUlsoor,
    zoneOf: u => ulsZone(u),
    zoneMsg: { road: 'On the road. Watch for autos!', path: 'Back on the footpath. Steps and carts!' },
    obstacles(r) {
      const out = [];
      let s = 220,
        steps = 0;
      while (s < RACE - 120) {
        const z = ulsZone(uOf(s));
        const lanes = [-1, 0, 1].sort(() => r() - 0.5);
        if (z === 'road') out.push({ type: r() < 0.7 ? 'auto' : 'walkers', s, lane: lanes[0] });
        else {
          const k = r();
          if (k < 0.3 && steps < 5 && s > 350) {
            out.push({ type: 'steps', s, lane: 0 });
            steps++;
          } else if (k < 0.62) {
            out.push({ type: 'cart', s, lane: lanes[0] });
            if (r() < 0.3) out.push({ type: 'walkers', s: s + 8, lane: lanes[1] });
          } else if (k < 0.9) out.push({ type: 'walkers', s, lane: lanes[0] });
          else out.push({ type: 'dog', s, lane: lanes[0] });
        }
        s += 140 + r() * 90;
      }
      return out;
    },
    pickups: { water: [780, 1950], gel: [430, 1380, 2420] }
  },
  nice: {
    id: 'nice',
    name: 'NICE Road',
    km: 10,
    race: 10000,
    clock: 20,
    sky: 0xb8dcef,
    fog: [70, 230],
    exag: 2.2,
    heat: 1.08,
    eyebrow: 'NICE Road · Peripheral Ring Road · out and back',
    tagline: '5 km out along the open expressway, U-turn, 5 km back. Rolling climbs all the way, no shade.',
    meta: 'Hilly · 114 m of climbing · aid every 2 km',
    finishAt: 'NICE Road',
    color: '#b5401f',
    treat: {
      title: 'Banana, coconut water + idli chutney',
      text: 'A finisher medal round your neck, then the classic Bengaluru race breakfast: a banana, fresh tender coconut water, and soft idlis with coconut chutney.',
      toast: 'Finisher medal! Banana, coconut water + idli chutney earned',
      short: 'a finisher medal and idli breakfast'
    },
    pbKey: 'odumaga.pb.nice',
    // race-day extras on this route only
    aid: [2000, 4000, 6000, 8000], // aid-station tables on the left: run in the left lane to refuel
    medal: true, // finisher medal on the runner's neck before the treat
    finishPhoto: true, // the photographer at the line takes your photo
    runOut: 28, // metres the runner can coast past the line into the finish area
    cheer: 'NICE RUN!', // the big end-of-race banner
    bib: { event: 'ODU MAGA 10K', number: '1001' }, // race bib on the runner's tee
    randomKit: true, // new tee colour and random bib number every run
    hazards: [['racer', 'runner', 'runners']],
    path: nicePath,
    elev() {
      const v = [];
      for (let k = 0; k <= 200; k++) v.push(NICE_ELEV[k <= 100 ? k : 200 - k]);
      return { step: 50, v };
    },
    prep() {
      NICE_TURN = uOf(5000);
    },
    groundAt: (x, z, h, d) => (d < 7.6 ? h : h - Math.min(1.8, (d - 7.6) * 0.12)),
    build: buildNice,
    zoneOf: u => (u < NICE_TURN ? 'out' : 'back'),
    zoneMsg: { back: 'U-turn done. 5 km to home!' },
    obstacles(r) {
      const out = [];
      let s = 300;
      while (s < RACE - 180) {
        if (Math.abs(s - 5000) < 170 || Math.abs(s - 1700) < 30 || C.aid.some(a => Math.abs(s - a) < 110)) {
          s += 60;
          continue;
        }
        // a race field: everyone holds their own pace, about 5:00 to 9:20 per km (pace = 15000 / speed),
        // sometimes in twos and threes across the road. Quicker ones pull away; slower ones you weave past.
        const lanes = [-1, 0, 1].sort(() => r() - 0.5),
          group = r() < 0.3 ? (r() < 0.4 ? 3 : 2) : 1,
          pace = 300 + r() * 260;
        for (let k = 0; k < group; k++)
          out.push({
            type: 'racer',
            s: s + k * (1 + r() * 5),
            lane: lanes[k],
            speed: 15000 / (pace + (r() - 0.5) * 30),
            ph: r() * 6
          });
        s += 110 + r() * 110;
      }
      return out;
    },
    pickups: { water: [], gel: [] } // no floating power-ups here: the aid stations do the job
  }
};
