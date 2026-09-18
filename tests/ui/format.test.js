import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, setLanguage } from '../../src/ui/strings.js';
import {
  formatAgo,
  formatCountdown,
  formatDateTime,
  formatIsoInZone,
  formatMinutesDiff,
  formatPeriodText,
  formatZoneLabel,
  zoneDisplayName,
} from '../../src/ui/format.js';

const MS = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1000 };

afterEach(() => setLanguage(DEFAULT_LANGUAGE));

describe('formatCountdown / formatAgo / formatMinutesDiff', () => {
  it('formats in English', () => {
    expect(formatCountdown(2 * MS.d + 4 * MS.h + 12 * MS.m + 9 * MS.s)).toBe('2 d 04:12:09');
    expect(formatCountdown(4 * MS.h + 12 * MS.m + 9 * MS.s)).toBe('04:12:09');
    expect(formatAgo(2 * MS.d + 4 * MS.h)).toBe('2 d 4 h');
    expect(formatAgo(3 * MS.h + 12 * MS.m)).toBe('3 h 12 min');
    expect(formatAgo(12 * MS.m)).toBe('12 min');
    expect(formatAgo(30 * MS.s)).toBe('less than a minute');
    expect(formatMinutesDiff(150)).toBe('2 h 30 min');
    expect(formatMinutesDiff(-120)).toBe('2 h');
    expect(formatMinutesDiff(0)).toBe('0 min');
  });
  it('formats in Ukrainian and German', () => {
    setLanguage('uk');
    expect(formatCountdown(2 * MS.d + 4 * MS.h)).toBe('2 д 04:00:00');
    expect(formatMinutesDiff(150)).toBe('2 год 30 хв');
    expect(formatAgo(30 * MS.s)).toBe('менше хвилини');
    setLanguage('de');
    expect(formatCountdown(1 * MS.d)).toBe('1 T 00:00:00');
    expect(formatMinutesDiff(45)).toBe('45 Min.');
  });
});

describe('formatPeriodText', () => {
  it('uses count and accusative forms per language', () => {
    expect(formatPeriodText({ unit: 'hours', value: 1 })).toBe('1 hour');
    expect(formatPeriodText({ unit: 'days', value: 30 })).toBe('30 days');
    setLanguage('uk');
    expect(formatPeriodText({ unit: 'hours', value: 1 })).toBe('1 година');
    expect(formatPeriodText({ unit: 'hours', value: 1 }, 'accusative')).toBe('1 годину');
    expect(formatPeriodText({ unit: 'hours', value: 24 }, 'accusative')).toBe('24 години');
    expect(formatPeriodText({ unit: 'days', value: 5 }, 'accusative')).toBe('5 днів');
    setLanguage('de');
    expect(formatPeriodText({ unit: 'days', value: 1 })).toBe('1 Tag');
    expect(formatPeriodText({ unit: 'hours', value: 48 }, 'accusative')).toBe('48 Stunden');
  });
});

describe('date and zone labels', () => {
  it('formats dates in the requested locale and zone', () => {
    const t = Date.UTC(2026, 9, 4, 13, 30);
    // ICU versions differ on the comma after the weekday.
    expect(formatDateTime(t, 'Europe/London', 'en-GB')).toMatch(/^Sun,? 4 Oct 2026, 14:30$/);
    expect(formatDateTime(t, 'Europe/Kyiv', 'en-GB')).toMatch(/^Sun,? 4 Oct 2026, 16:30$/);
    expect(formatDateTime(t, 'Europe/London', 'de-DE')).toMatch(/^So\.?, 4\. Okt\. 2026, 14:30$/);
  });
  it('builds ISO strings and zone labels', () => {
    expect(
      formatIsoInZone({
        year: 2026,
        month: 10,
        day: 4,
        hour: 14,
        minute: 30,
        second: 0,
        offsetMinutes: 60,
        zone: 'Europe/London',
      }),
    ).toBe('2026-10-04T14:30:00+01:00');
    expect(formatZoneLabel('America/New_York', -240)).toBe('America/New York (UTC-04:00)');
    expect(zoneDisplayName('Asia/Ho_Chi_Minh')).toBe('Asia/Ho Chi Minh');
  });
});
