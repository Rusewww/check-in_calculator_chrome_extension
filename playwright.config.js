// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false, // one persistent-context extension load at a time
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
