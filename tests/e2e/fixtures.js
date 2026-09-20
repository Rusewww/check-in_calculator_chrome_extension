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
 * .serviceWorkers()` would stay empty). An earlier version of this fixture read
 * the id out of the profile's own `Preferences` file instead, but that file is
 * written to disk asynchronously and isn't there yet by the time a short wait
 * elapses (seen as a flaky ENOENT in CI) — chrome://extensions reflects the
 * command-line-loaded extension immediately, with no disk-flush race, so it's
 * read from there instead, with a short poll for the page's own Polymer
 * components to finish rendering.
 * @module tests/e2e/fixtures
 */
import { mkdtempSync, rmSync } from 'node:fs';
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
      // English is locale-sensitive here (resolveLocale keeps the browser's
      // own English variant, per FR "so US users keep US formats" — see
      // settings.js), so without pinning this, date assertions like "4 Oct"
      // vs "Oct 4" pass or fail depending on the machine's default Chrome
      // locale rather than on the extension's own behaviour.
      locale: 'en-GB',
      args: [`--disable-extensions-except=${DIST_DIR}`, `--load-extension=${DIST_DIR}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const page = await context.newPage();
    await page.goto('chrome://extensions');

    /** @returns {Promise<string | null>} */
    const readId = () =>
      page.evaluate(() => {
        const manager = document.querySelector('extensions-manager');
        const list = manager?.shadowRoot?.querySelector('extensions-item-list');
        const item = list?.shadowRoot?.querySelector('extensions-item');
        return item?.getAttribute('id') ?? null;
      });

    let id = null;
    const deadline = Date.now() + 15_000;
    while (!id && Date.now() < deadline) {
      id = await readId();
      if (!id) await page.waitForTimeout(200);
    }
    if (!id) throw new Error('Extension id not found on chrome://extensions after 15s');

    await page.close();
    await use(id);
  },
});

export const expect = test.expect;
