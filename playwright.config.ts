import { defineConfig, devices } from '@playwright/test';

const servers = [
  { name: '@mfe/product', url: 'http://127.0.0.1:3001/mf-manifest.json' },
  { name: '@mfe/cart', url: 'http://127.0.0.1:3002/mf-manifest.json' },
  { name: '@mfe/profile', url: 'http://127.0.0.1:3003/mf-manifest.json' },
  { name: '@mfe/host', url: 'http://127.0.0.1:3000' },
];

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: servers.map((server) => ({
    command: `pnpm --filter ${server.name} dev`,
    url: server.url,
    reuseExistingServer: true,
    timeout: 180_000,
  })),
});
