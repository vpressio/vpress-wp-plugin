import { defineConfig, devices } from '@playwright/test';
import { loadCredentials, STORAGE_STATE } from './tests/e2e/helpers/credentials.js';

const { baseURL } = loadCredentials();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'setup',
      testMatch: /setup\/.*\.setup\.js/
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 1000 },
        storageState: STORAGE_STATE
      }
    }
  ]
});
