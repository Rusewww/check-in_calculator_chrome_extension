import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  applyTheme,
  isTheme,
  loadSettings,
  resolveLocale,
  saveSettings,
} from '../../src/ui/settings.js';

/** @param {Record<string, string>} [initial] */
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (/** @type {string} */ key) => map.get(key) ?? null,
    setItem: (/** @type {string} */ key, /** @type {string} */ value) => {
      map.set(key, String(value));
    },
    map,
  };
}

describe('loadSettings / saveSettings', () => {
  it('returns defaults when nothing is stored or storage is missing', () => {
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
  it('reads valid values and ignores invalid ones individually', () => {
    const storage = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ theme: 'dark', language: 'xx' }),
    });
    expect(loadSettings(storage)).toEqual({ theme: 'dark', language: 'en' });
    expect(loadSettings(fakeStorage({ [SETTINGS_KEY]: 'not json' }))).toEqual(DEFAULT_SETTINGS);
  });
  it('round-trips', () => {
    const storage = fakeStorage();
    saveSettings({ theme: 'light', language: 'uk' }, storage);
    expect(loadSettings(storage)).toEqual({ theme: 'light', language: 'uk' });
  });
  it('survives a throwing storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
  });
});

describe('isTheme / applyTheme', () => {
  it('recognises themes', () => {
    expect(isTheme('system')).toBe(true);
    expect(isTheme('blue')).toBe(false);
  });
  it('stamps data-theme for explicit themes and removes it for system', () => {
    /** @type {{ dataset: DOMStringMap }} */
    const root = { dataset: {} };
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
    applyTheme('system', root);
    expect('theme' in root.dataset).toBe(false);
  });
});

describe('resolveLocale', () => {
  it('keeps the browser’s English variant, otherwise uses en-GB', () => {
    expect(resolveLocale('en', 'en-US')).toBe('en-US');
    expect(resolveLocale('en', 'en')).toBe('en');
    expect(resolveLocale('en', 'uk-UA')).toBe('en-GB');
    expect(resolveLocale('en', null)).toBe('en-GB');
    expect(resolveLocale('en', '')).toBe('en-GB');
  });
  it('uses fixed locales for the other languages', () => {
    expect(resolveLocale('uk', 'en-US')).toBe('uk-UA');
    expect(resolveLocale('de', 'en-US')).toBe('de-DE');
  });
});
