import { describe, expect, it, vi } from 'vitest';
import { createPrefsPort } from '../../src/data/prefs.js';

/** @param {Record<string, string>} [initial] */
function fakeArea(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get: vi.fn(async () => Object.fromEntries(map)),
    set: vi.fn(async (items) => {
      for (const [key, value] of Object.entries(items)) map.set(key, value);
    }),
  };
}

describe('createPrefsPort', () => {
  it('hydrates the cache from the storage area at startup', async () => {
    const area = fakeArea({ 'checkin-calculator.settings': '{"theme":"dark"}' });
    const port = await createPrefsPort(area);
    expect(area.get).toHaveBeenCalledWith(null);
    expect(port.getItem('checkin-calculator.settings')).toBe('{"theme":"dark"}');
    expect(port.getItem('missing-key')).toBeNull();
  });

  it('reads back a value written in the same session before the debounce fires', async () => {
    const area = fakeArea();
    const port = await createPrefsPort(area);
    port.setItem('a', 'b');
    expect(port.getItem('a')).toBe('b');
  });

  it('debounces writes to the storage area', async () => {
    vi.useFakeTimers();
    try {
      const area = fakeArea();
      const port = await createPrefsPort(area);
      port.setItem('a', '1');
      port.setItem('a', '2');
      port.setItem('a', '3');
      expect(area.set).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(area.set).toHaveBeenCalledTimes(1);
      expect(area.set).toHaveBeenCalledWith({ a: '3' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens on defaults when the storage area is unavailable', async () => {
    const port = await createPrefsPort(undefined);
    expect(port.getItem('anything')).toBeNull();
    expect(() => port.setItem('anything', 'x')).not.toThrow();
  });

  it('survives a hydration read that throws (FR-9.5)', async () => {
    const area = {
      get: vi.fn(async () => {
        throw new Error('storage blocked');
      }),
      set: vi.fn(async () => {}),
    };
    const port = await createPrefsPort(area);
    expect(port.getItem('anything')).toBeNull();
  });

  it('survives a debounced write that rejects', async () => {
    vi.useFakeTimers();
    try {
      const area = fakeArea();
      area.set.mockRejectedValueOnce(new Error('quota exceeded'));
      const port = await createPrefsPort(area);
      port.setItem('a', '1');
      await vi.runAllTimersAsync();
      expect(port.getItem('a')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });
});
