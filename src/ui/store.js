// @ts-check
/**
 * Minimal observable state container.
 * @module ui/store
 */

/**
 * @template S
 * @typedef {object} Store
 * @property {() => S} get
 * @property {(patch: Partial<S> | ((state: S) => Partial<S>)) => void} set
 * @property {(listener: (state: S) => void) => () => void} subscribe
 */

/**
 * @template S
 * @param {S} initial
 * @returns {Store<S>}
 */
export function createStore(initial) {
  let state = initial;
  /** @type {Set<(state: S) => void>} */
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      const partial = typeof patch === 'function' ? patch(state) : patch;
      const next = { ...state, ...partial };
      let changed = false;
      for (const key of Object.keys(next)) {
        if (/** @type {any} */ (next)[key] !== /** @type {any} */ (state)[key]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = next;
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
