// Smoke tests for Odu Maga. They play the real game in a headless browser:
// - three.js is served from node_modules, so the tests don't depend on the CDN
// - Supabase is blocked, so test runs never reach the real leaderboard or run stats
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
const THREE_JS = fs.readFileSync(require.resolve('three/build/three.min.js'));
const ROUTES = ['cubbon', 'ulsoor', 'nice'];
const CORS = { 'Access-Control-Allow-Origin': '*' }; // three.js is loaded with an integrity check, which needs CORS

async function openGame(page, { countMusic = false } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => /Content Security Policy|integrity/i.test(m.text()) && errors.push(m.text())); // blocked
  if (countMusic) {
    // the music scheduler is the only 25 ms interval: count how many are running
    await page.addInitScript(() => {
      const si = window.setInterval,
        ci = window.clearInterval;
      window.__music = new Set();
      window.setInterval = (f, ms, ...a) => {
        const id = si(f, ms, ...a);
        if (ms === 25) window.__music.add(id);
        return id;
      };
      window.clearInterval = id => {
        window.__music.delete(id);
        return ci(id);
      };
    });
  }
  await page.route('**/three.min.js', r =>
    r.fulfill({ body: THREE_JS, contentType: 'application/javascript', headers: CORS })
  );
  await page.route('**/*supabase.co/**', r => r.abort());
  await page.goto(GAME);
  await expect(page.locator('#startBtn')).toBeEnabled({ timeout: 60_000 });
  return errors;
}

async function pickRoute(page, id) {
  await page.click('#startBtn', { force: true }); // the button pulses, so it is never "stable"
  await page.locator('#routeList .route').nth(ROUTES.indexOf(id)).click();
  await expect(page.locator('#countdown')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#countdown')).toBeHidden({ timeout: 10_000 });
}

async function runFor(page, seconds, until) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(140);
    if (until && (await until())) return;
  }
}

const km = async page => parseFloat(await page.locator('#hKm').textContent());

for (const id of ROUTES) {
  test(`${id}: builds and runs`, async ({ page }, info) => {
    const errors = await openGame(page);
    await pickRoute(page, id);
    await runFor(page, 8);
    expect(await km(page)).toBeGreaterThan(0.02);
    await expect(page.locator('#hTotal')).toHaveText({ cubbon: '5', ulsoor: '3', nice: '10' }[id]);
    await expect(page.locator('#elevChip')).toBeVisible({ visible: id !== 'cubbon' });
    await expect(page.locator('#miniMap')).toBeVisible({ visible: id !== 'cubbon' });
    await info.attach(`${id}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    // Back during a run asks first, then quits to the route picker
    await page.click('#backBtn');
    await expect(page.locator('#backBtn')).toHaveText('Tap again to quit');
    await expect(page.locator('#routeScreen')).toBeHidden();
    await page.click('#backBtn');
    await expect(page.locator('#routeScreen')).toBeVisible();
    await page.click('#backBtn'); // and from the route picker, back home
    await expect(page.locator('#startScreen')).toBeVisible();
    await expect(page.locator('#backBtn')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('ulsoor: full run, finish screen, copy handle, leaderboard table, one music track at a time', async ({
  page
}, info) => {
  const errors = await openGame(page, { countMusic: true });
  const players = () => page.evaluate(() => window.__music.size);
  await page.keyboard.press('Space'); // unlocks audio like a first tap
  await pickRoute(page, 'ulsoor');
  await runFor(page, 420, () => page.locator('#finishScreen').isVisible());
  await expect(page.locator('#finishScreen')).toBeVisible();
  expect(await players()).toBeLessThanOrEqual(1);

  // the finish screen: "screenshot this and tag me" with a Copy button, and the leaderboard table under the name form
  await expect(page.locator('#shareBtn')).toHaveCount(0);
  await page.click('#copyHandle');
  await expect(page.locator('#copyHandle')).toHaveText('Copied!');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('@yourrunningbro');
  await expect(page.locator('#fullWrap')).toBeVisible();
  // (the name form itself is hidden in tests, since Supabase is blocked; its status line sits right under it)
  const formY = (await page.locator('#saveStatus').boundingBox()).y;
  expect((await page.locator('#fullWrap').boundingBox()).y).toBeGreaterThan(formY);
  await info.attach('finish.png', { body: await page.screenshot(), contentType: 'image/png' });

  // leaving the finish screen must not re-open it or start a second track
  await page.click('#changeRoute');
  await page.waitForTimeout(1000);
  await expect(page.locator('#routeScreen')).toBeVisible();
  await expect(page.locator('#finishScreen')).toBeHidden();
  await page.click('#backBtn'); // back from the route picker returns to the finish screen
  await expect(page.locator('#finishScreen')).toBeVisible();
  expect(await players()).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('opens on the intro screen; runner name is asked once and remembered after a reload', async ({ page }) => {
  const errors = await openGame(page);
  await expect(page.locator('#startScreen')).toBeVisible();
  await expect(page.locator('#loader')).toBeHidden(); // no loading screen when the link opens
  await expect(page.locator('#runnerBox')).toBeVisible();
  await page.fill('#runnerName', '  Pranith   K ');
  await page.click('#runnerSave');
  await expect(page.locator('#runnerSet')).toBeVisible();
  await expect(page.locator('#runnerShow')).toHaveText('Pranith K');
  await expect(page.locator('#runnerBox')).toBeHidden();
  await page.reload();
  await expect(page.locator('#startBtn')).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator('#runnerShow')).toHaveText('Pranith K');
  await page.click('#runnerChange');
  await expect(page.locator('#runnerName')).toHaveValue('Pranith K');
  expect(errors).toEqual([]);
});

// Posting a time with a stand-in database: the game must send only which run it was and the name (never a time),
// and keep trying while the run's finish stats are still on their way.
test('posting a time: sends the run, not the time, and retries until the run has arrived', async ({ page }) => {
  const errors = [],
    events = [],
    submits = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => /Content Security Policy|integrity/i.test(m.text()) && errors.push(m.text()));
  await page.route('**/three.min.js', r =>
    r.fulfill({ body: THREE_JS, contentType: 'application/javascript', headers: CORS })
  );
  await page.route('**/*supabase.co/**', r => {
    const url = r.request().url(),
      method = r.request().method();
    if (url.includes('/rpc/submit_score')) {
      submits.push(JSON.parse(r.request().postData()));
      if (submits.length === 1)
        return r.fulfill({ status: 400, json: { code: 'P0001', message: 'run not found', hint: 'run_not_found' } });
      return r.fulfill({ json: [{ id: 77, name: 'Tester', time_s: 600, pace_s: 200, route: 'ulsoor', rank: 3 }] });
    }
    if (url.includes('/run_events')) {
      events.push(JSON.parse(r.request().postData()).event);
      return r.fulfill({ status: 201, body: '' });
    }
    if (method === 'POST') return r.fulfill({ status: 403, json: { message: 'direct inserts are closed' } });
    return r.fulfill({ json: [], headers: { 'content-range': '0-0/0' } });
  });
  await page.goto(GAME);
  await expect(page.locator('#startBtn')).toBeEnabled({ timeout: 60_000 });
  await page.fill('#runnerName', 'Tester');
  await page.click('#runnerSave');
  await pickRoute(page, 'ulsoor');
  await runFor(page, 3);
  await page.evaluate(() => (R.s = RACE - 40)); // skip to the last few metres
  await runFor(page, 60, () => page.locator('#finishScreen').isVisible());
  await expect(page.locator('#saveStatus')).toHaveText('Saved as Tester · #3 on the Ulsoor Lake board.', {
    timeout: 15_000
  });
  expect(submits.length).toBe(2);
  expect(Object.keys(submits[1]).sort()).toEqual(['p_name', 'p_run_no', 'p_session']);
  expect(submits[1]).toMatchObject({ p_name: 'Tester', p_run_no: 1 });
  expect(events).toEqual(expect.arrayContaining(['start', 'finish', 'submit']));
  expect(errors).toEqual([]);
});

test('posting a time: a run that fails the check says so and does not retry', async ({ page }) => {
  let submits = 0;
  await page.route('**/three.min.js', r =>
    r.fulfill({ body: THREE_JS, contentType: 'application/javascript', headers: CORS })
  );
  await page.route('**/*supabase.co/**', r => {
    const url = r.request().url();
    if (url.includes('/rpc/submit_score')) {
      submits++;
      return r.fulfill({ status: 400, json: { code: 'P0001', message: 'run does not check out' } });
    }
    if (url.includes('/run_events')) return r.fulfill({ status: 201, body: '' });
    return r.fulfill({ json: [], headers: { 'content-range': '0-0/0' } });
  });
  await page.goto(GAME);
  await expect(page.locator('#startBtn')).toBeEnabled({ timeout: 60_000 });
  await page.fill('#runnerName', 'Tester');
  await page.click('#runnerSave');
  await pickRoute(page, 'ulsoor');
  await runFor(page, 3);
  await page.evaluate(() => (R.s = RACE - 40));
  await runFor(page, 60, () => page.locator('#finishScreen').isVisible());
  await expect(page.locator('#saveStatus')).toHaveText("This run couldn't be checked, so it can't go on the board.", {
    timeout: 15_000
  });
  await page.waitForTimeout(3000);
  expect(submits).toBe(1);
});
