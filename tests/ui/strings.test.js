import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  STRING_TABLES,
  getLanguage,
  isLanguage,
  languageLocale,
  setLanguage,
  t,
} from '../../src/ui/strings.js';

afterEach(() => setLanguage(DEFAULT_LANGUAGE));

describe('languages', () => {
  it('offers English (default), Ukrainian and German', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'uk', 'de']);
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(isLanguage('uk')).toBe(true);
    expect(isLanguage('fr')).toBe(false);
    expect(languageLocale('de')).toBe('de-DE');
  });
  it('rejects unknown languages', () => {
    expect(() => setLanguage(/** @type {any} */ ('fr'))).toThrow(RangeError);
    expect(getLanguage()).toBe('en');
  });
});

describe('t', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(t('heroYourLabel', { date: 'Sun 4 Oct 2026', city: 'Kyiv' })).toBe(
      'Sun 4 Oct 2026 · Your time · Kyiv',
    );
    expect(t('periodErrorRange', { min: 1 })).toBe('Enter a number between 1 and {max}.');
  });
  it('throws on a missing key', () => {
    expect(() => t(/** @type {any} */ ('nope'))).toThrow(/Missing string/);
  });
  it('switches language', () => {
    setLanguage('uk');
    expect(t('tabHours')).toBe('Години');
    setLanguage('de');
    expect(t('tabHours')).toBe('Stunden');
  });
  it('selects English plural forms', () => {
    expect(t('hoursCount', { n: 1 })).toBe('1 hour');
    expect(t('hoursCount', { n: 2 })).toBe('2 hours');
    expect(t('airportHits', { n: 1 })).toBe('1 hit');
    expect(t('airportHits', { n: 4 })).toBe('4 hits');
  });
  it('selects Ukrainian plural forms (one / few / many)', () => {
    setLanguage('uk');
    expect(t('hoursCount', { n: 1 })).toBe('1 година');
    expect(t('hoursCount', { n: 3 })).toBe('3 години');
    expect(t('hoursCount', { n: 5 })).toBe('5 годин');
    expect(t('hoursCount', { n: 11 })).toBe('11 годин');
    expect(t('hoursCount', { n: 21 })).toBe('21 година');
    expect(t('hoursCount', { n: 24 })).toBe('24 години');
    expect(t('daysCount', { n: 30 })).toBe('30 днів');
    expect(t('hoursAccusative', { n: 1 })).toBe('1 годину');
  });
  it('selects German plural forms', () => {
    setLanguage('de');
    expect(t('daysCount', { n: 1 })).toBe('1 Tag');
    expect(t('daysCount', { n: 7 })).toBe('7 Tage');
  });
});

describe('translation completeness', () => {
  /** @typedef {import('../../src/ui/strings.js').StringValue} StringValue */

  /** @param {StringValue} value */
  const texts = (value) =>
    typeof value === 'string'
      ? [value]
      : Object.values(value).filter((text) => typeof text === 'string');

  /** @param {StringValue} value */
  const placeholders = (value) =>
    [
      ...new Set(texts(value).flatMap((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))),
    ].sort();

  for (const code of /** @type {const} */ (['uk', 'de'])) {
    it(`gives ${code} the same keys, placeholders and plural coverage as English`, () => {
      /** @type {Record<string, StringValue>} */
      const en = STRING_TABLES.en;
      /** @type {Record<string, StringValue>} */
      const table = STRING_TABLES[code];
      expect(Object.keys(table).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(en)) {
        const translated = table[key];
        expect(placeholders(translated), key).toEqual(placeholders(value));
        if (typeof value !== 'string') {
          expect(typeof translated, key).toBe('object');
          if (typeof translated !== 'string') expect(translated.other, key).toBeTypeOf('string');
        }
        for (const text of texts(translated)) expect(text.trim(), key).not.toBe('');
      }
    });
  }
});
