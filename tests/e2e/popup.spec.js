// @ts-nocheck -- see tests/e2e/fixtures.js
/**
 * End-to-end tests against the real built extension (dist/), loaded unpacked in
 * a persistent Chromium context — the only way to exercise the actual popup
 * surface: chrome.storage.local, the bundled dataset served from
 * chrome-extension://, and the native date/time pickers. Run `npm run build`
 * first. Covers PRF.md's AT-2 (calculation), AT-7 (restore), AT-9 (native
 * pickers don't dismiss the popup) and part of AT-12 (clean console).
 * @module tests/e2e/popup.spec
 */
import { test, expect } from './fixtures.js';

test.describe('popup', () => {
  test('AT-2: selecting an airport and a departure computes the opening time', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(new Error(msg.text()));
    });

    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByPlaceholder(/IATA code/)).toBeVisible();

    await page.getByPlaceholder(/IATA code/).fill('LHR');
    await page.getByRole('option', { name: /London Heathrow/ }).click();
    // Not getByText('Europe/London'): that also matches the (hidden) matching
    // <option> in the zone <select>, a strict-mode violation. The zone chip is
    // the only element with this class.
    await expect(page.locator('.chip-mono')).toHaveText('Europe/London');

    await page.locator('#departure-date').fill('2026-10-04');
    await page.locator('#departure-time').fill('14:30');

    await expect(page.getByText('ONLINE CHECK-IN OPENS', { exact: false })).toBeVisible();
    await expect(page.locator('.hero-time')).toHaveText('14:30');
    await expect(page.locator('.stub-value').first()).toContainText('4 Oct');

    // FR-9.7: a clean run logs nothing to the popup console.
    expect(errors).toEqual([]);
  });

  test('AT-7: reopening the popup restores the last input', async ({ context, extensionId }) => {
    const first = await context.newPage();
    await first.goto(`chrome-extension://${extensionId}/popup.html`);
    await first.getByPlaceholder(/IATA code/).fill('LHR');
    await first.getByRole('option', { name: /London Heathrow/ }).click();
    await first.locator('#departure-date').fill('2026-10-04');
    await first.locator('#departure-time').fill('14:30');
    await first.getByRole('button', { name: '36' }).click();
    // The prefs port debounces writes (150ms) before chrome.storage.local.set resolves.
    await first.waitForTimeout(400);
    await first.close();

    const second = await context.newPage();
    await second.goto(`chrome-extension://${extensionId}/popup.html`);
    // Not getByText('LHR'): harmless today (only the ticket shows the IATA
    // code while the display zone follows the airport), but the same
    // substring-match trap as the .chip-mono fix above the moment a different
    // display zone is in play (the hero's side block also reads "· LHR" then).
    await expect(second.locator('.ticket-code')).toHaveText('LHR');
    await expect(second.locator('#departure-date')).toHaveValue('2026-10-04');
    await expect(second.locator('#departure-time')).toHaveValue('14:30');
    await expect(second.getByRole('button', { name: '36' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await second.close();
  });

  test('AT-9: the native date and time pickers stay open inside the popup', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await page.getByPlaceholder(/IATA code/).fill('LHR');
    await page.getByRole('option', { name: /London Heathrow/ }).click();

    const date = page.locator('#departure-date');
    await date.click();
    // The popup document itself must still be alive and responsive — a native
    // picker that dismissed the popup would leave nothing to assert against.
    await date.fill('2026-10-04');
    await expect(date).toHaveValue('2026-10-04');
    // The search input stays in the DOM (AirportSearch.js only hides its
    // wrapper), so toHaveCount(0) never passes — toBeHidden() reflects what
    // "the ticket replaced the search box" actually means here.
    await expect(page.getByPlaceholder(/IATA code/)).toBeHidden();
    await page.close();
  });
});
