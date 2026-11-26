// Smoke tests for Odu Maga. They play the real game in a headless browser:
// - three.js is served from node_modules, so the tests don't depend on the CDN
// - Supabase is blocked, so test runs never reach the real leaderboard or run stats
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const GAME = 'file://' + path.resolve(__dirname, '..', 'index.html');
const THREE_JS = fs.readFileSync(require.resolve('three/build/three.min.js'));
const ROUTES = ['cubbon', 'ulsoor', 'nice'];

async function openGame(page, { countMusic = false } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
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
  await page.route('**/three.min.js', r => r.fulfill({ body: THREE_JS, contentType: 'application/javascript' }));
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
    expect(errors).toEqual([]);
  });
}

test('ulsoor: full run, finish screen, share text, one music track at a time', async ({ page }, info) => {
  const errors = await openGame(page, { countMusic: true });
  const players = () => page.evaluate(() => window.__music.size);
  await page.keyboard.press('Space'); // unlocks audio like a first tap
  await pickRoute(page, 'ulsoor');
  await runFor(page, 420, () => page.locator('#finishScreen').isVisible());
  await expect(page.locator('#finishScreen')).toBeVisible();
  expect(await players()).toBeLessThanOrEqual(1);

  // Share copies the message (no food line, Instagram follow link) and opens no other app
  const popups = [];
  page.context().on('page', p => popups.push(p));
  await page.click('#shareBtn');
  await expect(page.locator('#sharePrev')).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('Ulsoor Lake 3K');
  expect(text).toContain('https://www.instagram.com/yourrunningbro');
  expect(text).not.toMatch(/honey|chai|earned/i);
  expect(popups).toHaveLength(0);
  await info.attach('finish.png', { body: await page.screenshot(), contentType: 'image/png' });

  // leaving the finish screen must not re-open it or start a second track
  await page.click('#openBoard2', { force: true });
  await page.waitForTimeout(1000);
  await expect(page.locator('#boardScreen')).toBeVisible();
  await expect(page.locator('#finishScreen')).toBeHidden();
  await page.click('#boardBack');
  await page.click('#changeRoute');
  await page.waitForTimeout(1000);
  await expect(page.locator('#routeScreen')).toBeVisible();
  await expect(page.locator('#finishScreen')).toBeHidden();
  expect(await players()).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
