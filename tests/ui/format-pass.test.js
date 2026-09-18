import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, setLanguage } from '../../src/ui/strings.js';
import { formatClock, formatDateOnly, formatShortPeriod, zoneCity } from '../../src/ui/format.js';

afterEach(() => setLanguage(DEFAULT_LANGUAGE));

const T = Date.UTC(2026, 9, 4, 13, 30); // Sun 4 Oct 2026 14:30 London, 16:30 Kyiv

describe('boarding-pass formatting', () => {
  it('formats the hero date with and without the year', () => {
    expect(formatDateOnly(T, 'Europe/London', 'en-GB', { year: true })).toMatch(
      /^Sun,? 4 Oct 2026$/,
    );
    expect(formatDateOnly(T, 'Europe/London', 'en-GB')).toMatch(/^Sun,? 4 Oct$/);
    expect(formatDateOnly(T, 'Europe/Kyiv', 'uk-UA')).toMatch(/нд/);
  });

  it('always shows a zero-padded 24-hour clock, in any locale', () => {
    expect(formatClock(T, 'Europe/London')).toBe('14:30');
    expect(formatClock(T, 'Europe/Kyiv')).toBe('16:30');
    expect(formatClock(Date.UTC(2026, 0, 1, 0, 5), 'UTC')).toBe('00:05');
    expect(formatClock(Date.UTC(2026, 0, 1, 23, 59), 'America/New_York')).toBe('18:59');
  });

  it('extracts the city from a zone identifier', () => {
    expect(zoneCity('Europe/Kyiv')).toBe('Kyiv');
    expect(zoneCity('America/New_York')).toBe('New York');
    expect(zoneCity('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(zoneCity('UTC')).toBe('UTC');
  });

  it('formats the compact window per language', () => {
    expect(formatShortPeriod({ unit: 'hours', value: 24 })).toBe('24 h');
    expect(formatShortPeriod({ unit: 'days', value: 3 })).toBe('3 d');
    setLanguage('uk');
    expect(formatShortPeriod({ unit: 'hours', value: 24 })).toBe('24 год');
    setLanguage('de');
    expect(formatShortPeriod({ unit: 'days', value: 30 })).toBe('30 T');
  });
});
