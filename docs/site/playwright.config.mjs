import { defineConfig } from '@playwright/test';
const port = Number(process.env.DOCS_PORT ?? 5231);
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 1,
  retries: 0,
  use: { baseURL: `http://127.0.0.1:${port}/puzlwerk/`, trace: 'retain-on-failure' },
  webServer: { command: 'node serve.mjs', url: `http://127.0.0.1:${port}/puzlwerk/`, reuseExistingServer: false },
});
