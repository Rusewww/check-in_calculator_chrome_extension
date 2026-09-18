// @ts-check
/**
 * `chrome.storage.local` behind a synchronous port. `settings.js` and `state.js`
 * read preferences synchronously (they already accept an injectable storage
 * object, the same shape `localStorage` has), while `chrome.storage.local` is
 * asynchronous — so this hydrates everything once at startup into an in-memory
 * cache and exposes the same `getItem`/`setItem` pair. Writes are fire-and-forget
 * and debounced, because the store emits on every keystroke. Every access is
 * wrapped in try/catch: a storage failure degrades to "nothing is remembered",
 * never to a broken popup (PRF FR-9.5).
 * @module data/prefs
 */

const DEBOUNCE_MS = 150;

/** @typedef {Pick<Storage, 'getItem' | 'setItem'>} PrefsPort */

/**
 * @param {{ get(keys: null): Promise<Record<string, unknown>>, set(items: Record<string, unknown>): Promise<void> } | undefined} [area]
 * @returns {Promise<PrefsPort>}
 */
export async function createPrefsPort(area = globalThis.chrome?.storage?.local) {
  /** @type {Record<string, string>} */
  const cache = {};

  if (area) {
    try {
      const stored = await area.get(null);
      for (const [key, value] of Object.entries(stored)) {
        if (typeof value === 'string') cache[key] = value;
      }
    } catch {
      // Storage unavailable: the popup opens on defaults.
    }
  }

  /** @type {Record<string, ReturnType<typeof setTimeout>>} */
  const timers = {};

  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null;
    },
    setItem(key, value) {
      cache[key] = value;
      if (!area) return;
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => {
        Promise.resolve(area.set({ [key]: value })).catch(() => {
          // Quota exceeded or the extension context is going away: the
          // in-memory cache still serves the rest of this popup session.
        });
      }, DEBOUNCE_MS);
    },
  };
}
