// @ts-nocheck -- see the note below; not part of the tsc or Vitest project.
/**
 * Launches the built, unpacked extension (dist/) in a persistent Chromium
 * context — the only way Chrome loads a real extension — and resolves its id so
 * tests can navigate straight to chrome-extension://<id>/popup.html.
 *
 * Chrome does not support loading extensions in headless mode at all (a
 * longstanding Chromium limitation, not something this project can work around),
 * so this must run headed, which in turn needs a display: a real desktop, or a
 * virtual one such as Xvfb in CI (`ci.yml` runs this suite under `xvfb-run`).
 *
 * There is no background service worker in v1.0 to read the id from (`context
 * .serviceWorkers()` would stay empty), so it is read out of the profile's own
 * `Preferences` file instead, matched by the extension's install path.
 * @module tests/e2e/fixtures
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test as base, chromium } from '@playwright/test';

const DIST_DIR = resolve(import.meta.dirname, '../../dist');

export const test = base.extend({
  // Playwright parses this literal destructuring pattern to detect fixture dependencies.
  // eslint-disable-next-line no-empty-pattern
  userDataDir: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'check-in-calculator-e2e-'));
    await use(dir);
    rmSync(dir, { recursive: true, force: true });
  },
  context: async ({ userDataDir }, use) => {
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [`--disable-extensions-except=${DIST_DIR}`, `--load-extension=${DIST_DIR}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context, userDataDir }, use) => {
    // Give the profile a moment to flush extensions.settings to disk.
    const page = await context.newPage();
    await page.waitForTimeout(500);
    await page.close();

    const prefsPath = join(userDataDir, 'Default', 'Preferences');
    const prefs = JSON.parse(readFileSync(prefsPath, 'utf8'));
    const settings = prefs.extensions?.settings ?? {};
    const entry = Object.entries(settings).find(
      ([, value]) => value.path && value.path.toLowerCase() === DIST_DIR.toLowerCase(),
    );
    if (!entry) throw new Error(`Extension not found in ${prefsPath} (path ${DIST_DIR})`);
    await use(entry[0]);
  },
});

export const expect = test.expect;
