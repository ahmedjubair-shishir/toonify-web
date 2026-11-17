import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  // Extensions share one browser profile per test, so keep runs sequential.
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tests/fixtures/server.mjs',
    url: 'http://localhost:4173/static.html',
    reuseExistingServer: true,
  },
});
