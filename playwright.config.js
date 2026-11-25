// Browser tests for the game: `npm test`. They open index.html straight from disk (no server needed).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 10 * 60 * 1000, // a full Ulsoor run takes a few minutes in a headless browser
  workers: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    viewport: { width: 430, height: 860 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'off',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] }
  }
});
