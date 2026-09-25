import { defineConfig, devices } from '@playwright/test';
import { loadCredentials, STORAGE_STATE } from './tests/e2e/helpers/credentials.js';

const { baseURL } = loadCredentials();

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  /*
   * One worker, because these specs share one WordPress: they create and
   * delete charts, pages and datasets through the REST API, and some of them
   * count what is there. `fullyParallel: false` only serialises the tests
   * INSIDE a file — without this, the files still ran on as many workers as
   * the machine had, and editor-smoke's "one more chart than before" raced
   * whatever annotations.spec.js and story.spec.js were creating at the time.
   * Latent while there were twelve tests across six files; reproducible the
   * moment a seventh file also created a chart.
   */
  workers: 1,
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
