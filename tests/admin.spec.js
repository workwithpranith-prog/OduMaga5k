// Control centre (admin.html) with a fake database answer: the real dashboard is never called from tests.
const { test, expect } = require('@playwright/test');
const path = require('path');

const ADMIN = 'file://' + path.resolve(__dirname, '..', 'admin.html');
const today = new Date().toISOString();
const FAKE = {
  generated_at: today,
  kpi: {
    visits: 40,
    players: 12,
    runs: 20,
    finished: 14,
    dnf: 5,
    running: 1,
    playing_now: 1,
    posted: 9,
    returning: 3,
    avg_finish_s: 1500,
    best_finish_s: 540
  },
  funnel: { visits: 40, started: 15, finished: 11, posted: 8 },
  giveup: [
    { km: 0, n: 3 },
    { km: 2, n: 2 }
  ],
  daily: [{ d: today.slice(0, 10), route: 'nice', runs: 4, finished: 3 }],
  hours: [
    { h: 7, n: 5 },
    { h: 19, n: 9 }
  ],
  routes: [{ route: 'nice', runs: 20, finished: 14, players: 12, avg_s: 2400, best_s: 1900 }],
  times: [
    { route: 'nice', s: 1900 },
    { route: 'nice', s: 2500 }
  ],
  sources: [
    { k: 'insta', runs: 12, players: 8 },
    { k: '<b>x</b>', runs: 8, players: 4 }
  ],
  devices: [
    { k: 'phone', n: 10 },
    { k: 'desktop', n: 2 }
  ],
  os: [
    { k: 'Android', n: 7 },
    { k: 'iOS', n: 5 }
  ],
  browsers: [
    { k: 'Instagram', n: 6 },
    { k: 'Chrome', n: 6 }
  ],
  difficulty: { avg_hits: 4.2, avg_water: 3, avg_gels: 1.5, low_energy_pct: 20 },
  latest: [
    {
      at: today,
      route: 'nice',
      player: 'abc123',
      device: 'phone',
      ref: 'insta',
      status: 'finished',
      finish_s: 1900,
      km: 10
    }
  ]
};

test('control centre: wrong password, then the dashboard and its filters', async ({ page }) => {
  const errors = [],
    calls = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => /Content Security Policy/i.test(m.text()) && errors.push(m.text()));
  await page.route('**/rpc/admin_dashboard', r => {
    const body = JSON.parse(r.request().postData());
    calls.push(body);
    if (body.p_pass !== 'right') return r.fulfill({ json: { error: 'wrong_password' } });
    return r.fulfill({ json: FAKE });
  });
  const scores = [
    { id: 5, name: 'Fast Freddy', time_s: 1900, route: 'nice', at: today, hidden: false, checked: true },
    { id: 4, name: '<i>old</i>', time_s: 900, route: 'cubbon', at: today, hidden: false, checked: false }
  ];
  const hides = [];
  await page.route('**/rpc/admin_scores', r => r.fulfill({ json: { scores } }));
  await page.route('**/rpc/admin_hide_score', r => {
    const b = JSON.parse(r.request().postData());
    hides.push(b);
    scores.find(x => x.id === b.p_id).hidden = b.p_hidden;
    return r.fulfill({ json: { ok: true } });
  });
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto(ADMIN);

  await page.fill('#pass', 'nope');
  await page.click('#unlock');
  await expect(page.locator('#lockMsg')).toHaveText(/Wrong password/);
  await expect(page.locator('#dash')).toBeHidden();

  await page.fill('#pass', 'right');
  await page.click('#unlock');
  await expect(page.locator('#dash')).toBeVisible();
  await expect(page.locator('#tiles')).toContainText('Runs started');
  await expect(page.locator('#tiles .tile').first()).toContainText('20');
  await expect(page.locator('#latest')).toContainText('Finished in 31:40');
  await expect(page.locator('#sources')).toContainText('<b>x</b>'); // shown as text, never as HTML

  // leaderboard entries: names are text, never HTML; Hide takes one off the boards and Show puts it back
  await expect(page.locator('#scores')).toContainText('Fast Freddy');
  await expect(page.locator('#scores')).toContainText('<i>old</i>');
  await page.locator('#scores button.hideBtn').first().click();
  await expect(page.locator('#scores')).toContainText('hidden');
  expect(hides.at(-1)).toMatchObject({ p_pass: 'right', p_id: 5, p_hidden: true });
  await page.locator('#scores button.hideBtn').first().click();
  await expect(page.locator('#scores')).not.toContainText('hidden');
  expect(hides.at(-1)).toMatchObject({ p_id: 5, p_hidden: false });

  await page.click('#fRoute button[data-v="nice"]');
  await page.click('#fDays button[data-v="7"]');
  await expect.poll(() => calls.at(-1)).toMatchObject({ p_route: 'nice', p_days: 7 });
  await expect(page.locator('#timesTitle')).toContainText('NICE Road 10K');

  // remembered on this device: a reload opens straight into the dashboard
  await page.reload();
  await expect(page.locator('#dash')).toBeVisible();
  await page.click('#logout');
  await expect(page.locator('#lock')).toBeVisible();
  expect(errors).toEqual([]);
});

test('control centre: too many wrong tries says it is locked', async ({ page }) => {
  await page.route('**/rpc/admin_dashboard', r => r.fulfill({ json: { error: 'locked' } }));
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.goto(ADMIN);
  await page.fill('#pass', 'anything');
  await page.click('#unlock');
  await expect(page.locator('#lockMsg')).toHaveText(/locked for 15 minutes/);
  await expect(page.locator('#dash')).toBeHidden();
});
