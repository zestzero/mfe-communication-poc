import { defineConfig, devices } from '@playwright/test';
import { remoteRegistry } from './apps/host/src/remotes/registry.generated';

const external = process.env.E2E_EXTERNAL === '1';
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  use: { baseURL, trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: external
    ? undefined
    : [
        ...remoteRegistry.map((remote) => ({
          command: `pnpm --filter @platform/${remote.name}-mfe dev`,
          url: `http://127.0.0.1:${remote.port}/static/mf-manifest.json`,
          reuseExistingServer: true,
          timeout: 180_000,
        })),
        { command: 'pnpm --filter @platform/host dev', url: baseURL, reuseExistingServer: true, timeout: 180_000 },
      ],
});
