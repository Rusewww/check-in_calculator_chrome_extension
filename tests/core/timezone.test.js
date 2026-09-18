import { describe, expect, it } from 'vitest';
import {
  addDays,
  epochToZoned,
  formatIsoOffset,
  formatOffset,
  getDeviceZone,
  isValidWallTime,
  isValidZone,
  listZones,
  offsetAt,
  preferredZoneName,
  utcMs,
  zonedToEpoch,
} from '../../src/core/timezone.js';

describe('utcMs', () => {
  it('matches Date.UTC for ordinary years', () => {
    expect(utcMs(2026, 10, 5, 14, 30)).toBe(Date.UTC(2026, 9, 5, 14, 30));
  });
  it('does not remap years 0–99 to the 1900s', () => {
    expect(new Date(utcMs(50, 1, 1)).getUTCFullYear()).toBe(50);
  });
});

describe('isValidZone', () => {
  it('accepts canonical names and aliases', () => {
    expect(isValidZone('Europe/London')).toBe(true);
    expect(isValidZone('Asia/Calcutta')).toBe(true);
    expect(isValidZone('UTC')).toBe(true);
  });
  it('rejects unknown names and non-strings', () => {
    expect(isValidZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidZone('')).toBe(false);
    expect(isValidZone(null)).toBe(false);
  });
});

describe('isValidWallTime', () => {
  it('accepts real dates', () => {
    expect(isValidWallTime({ year: 2028, month: 2, day: 29, hour: 23, minute: 59 })).toBe(true);
  });
  it('rejects impossible dates and out-of-range fields', () => {
    expect(isValidWallTime({ year: 2026, month: 2, day: 30 })).toBe(false);
    expect(isValidWallTime({ year: 2027, month: 2, day: 29 })).toBe(false);
    expect(isValidWallTime({ year: 2026, month: 13, day: 1 })).toBe(false);
    expect(isValidWallTime({ year: 2026, month: 1, day: 1, hour: 24 })).toBe(false);
    expect(isValidWallTime({ year: 2026.5, month: 1, day: 1 })).toBe(false);
  });
});

describe('offsetAt / epochToZoned', () => {
  it('handles whole-hour, half-hour and quarter-hour offsets', () => {
    const t = Date.UTC(2026, 5, 15, 12, 0);
    expect(offsetAt(t, 'UTC')).toBe(0);
    expect(offsetAt(t, 'Europe/London')).toBe(60);
    expect(offsetAt(t, 'Asia/Kolkata')).toBe(330);
    expect(offsetAt(t, 'Asia/Kathmandu')).toBe(345);
    expect(offsetAt(t, 'America/St_Johns')).toBe(-150);
    expect(offsetAt(t, 'Pacific/Kiritimati')).toBe(840);
  });
  it('tracks daylight saving, including Lord Howe’s 30-minute shift', () => {
    expect(offsetAt(Date.UTC(2026, 0, 15), 'Europe/London')).toBe(0);
    expect(offsetAt(Date.UTC(2026, 6, 15), 'Europe/London')).toBe(60);
    expect(offsetAt(Date.UTC(2026, 0, 15), 'Australia/Lord_Howe')).toBe(660);
    expect(offsetAt(Date.UTC(2026, 6, 15), 'Australia/Lord_Howe')).toBe(630);
  });
  it('returns the wall clock in the zone', () => {
    const z = epochToZoned(Date.UTC(2026, 9, 5, 13, 30, 15), 'Europe/London');
    expect(z).toMatchObject({
      year: 2026,
      month: 10,
      day: 5,
      hour: 14,
      minute: 30,
      second: 15,
      offsetMinutes: 60,
      zone: 'Europe/London',
    });
  });
  it('reports midnight as hour 0', () => {
    expect(epochToZoned(Date.UTC(2026, 0, 1, 0, 0), 'UTC').hour).toBe(0);
  });
  it('ignores sub-second precision when computing the offset', () => {
    expect(offsetAt(Date.UTC(2026, 0, 1, 0, 0, 0, 999), 'Asia/Tokyo')).toBe(540);
  });
});

describe('zonedToEpoch', () => {
  it('converts unique wall-clock times', () => {
    expect(zonedToEpoch({ year: 2026, month: 6, day: 15, hour: 12 }, 'Asia/Kolkata')).toEqual({
      epochMs: Date.UTC(2026, 5, 15, 6, 30),
      resolution: 'unique',
    });
    expect(
      zonedToEpoch({ year: 2026, month: 6, day: 15, hour: 12 }, 'Asia/Kathmandu').epochMs,
    ).toBe(Date.UTC(2026, 5, 15, 6, 15));
    expect(zonedToEpoch({ year: 2026, month: 1, day: 1 }, 'Pacific/Kiritimati').epochMs).toBe(
      Date.UTC(2025, 11, 31, 10, 0),
    );
    expect(
      zonedToEpoch({ year: 2026, month: 1, day: 15, hour: 12 }, 'Australia/Lord_Howe').epochMs,
    ).toBe(Date.UTC(2026, 0, 15, 1, 0));
    expect(
      zonedToEpoch({ year: 2026, month: 7, day: 15, hour: 12 }, 'Australia/Lord_Howe').epochMs,
    ).toBe(Date.UTC(2026, 6, 15, 1, 30));
  });

  it('resolves the spring-forward gap in London (29 Mar 2026, 01:00 UTC)', () => {
    const wall = { year: 2026, month: 3, day: 29, hour: 1, minute: 30 };
    const compatible = zonedToEpoch(wall, 'Europe/London');
    expect(compatible).toEqual({ epochMs: Date.UTC(2026, 2, 29, 1, 30), resolution: 'gap' });
    expect(epochToZoned(compatible.epochMs, 'Europe/London')).toMatchObject({
      hour: 2,
      minute: 30,
    });
    expect(zonedToEpoch(wall, 'Europe/London', 'later').epochMs).toBe(Date.UTC(2026, 2, 29, 1, 30));
    expect(zonedToEpoch(wall, 'Europe/London', 'earlier').epochMs).toBe(
      Date.UTC(2026, 2, 29, 0, 30),
    );
    expect(() => zonedToEpoch(wall, 'Europe/London', 'reject')).toThrow(RangeError);
  });

  it('resolves the fall-back overlap in London (25 Oct 2026, 01:00 UTC)', () => {
    const wall = { year: 2026, month: 10, day: 25, hour: 1, minute: 30 };
    const compatible = zonedToEpoch(wall, 'Europe/London');
    expect(compatible).toEqual({ epochMs: Date.UTC(2026, 9, 25, 0, 30), resolution: 'overlap' });
    expect(zonedToEpoch(wall, 'Europe/London', 'earlier').epochMs).toBe(
      Date.UTC(2026, 9, 25, 0, 30),
    );
    expect(zonedToEpoch(wall, 'Europe/London', 'later').epochMs).toBe(Date.UTC(2026, 9, 25, 1, 30));
    expect(() => zonedToEpoch(wall, 'Europe/London', 'reject')).toThrow(RangeError);
  });

  it('handles the New York transitions (8 Mar 2026 and 1 Nov 2026)', () => {
    const gap = zonedToEpoch(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30 },
      'America/New_York',
    );
    expect(gap).toEqual({ epochMs: Date.UTC(2026, 2, 8, 7, 30), resolution: 'gap' });
    expect(epochToZoned(gap.epochMs, 'America/New_York')).toMatchObject({ hour: 3, minute: 30 });

    const overlap = zonedToEpoch(
      { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
      'America/New_York',
    );
    expect(overlap).toEqual({ epochMs: Date.UTC(2026, 10, 1, 5, 30), resolution: 'overlap' });
    expect(
      zonedToEpoch(
        { year: 2026, month: 11, day: 1, hour: 1, minute: 30 },
        'America/New_York',
        'later',
      ).epochMs,
    ).toBe(Date.UTC(2026, 10, 1, 6, 30));
  });

  it('treats times just outside a transition as unique', () => {
    expect(
      zonedToEpoch({ year: 2026, month: 3, day: 29, hour: 0, minute: 59 }, 'Europe/London')
        .resolution,
    ).toBe('unique');
    expect(
      zonedToEpoch({ year: 2026, month: 3, day: 29, hour: 2, minute: 0 }, 'Europe/London')
        .resolution,
    ).toBe('unique');
    expect(
      zonedToEpoch({ year: 2026, month: 10, day: 25, hour: 0, minute: 59 }, 'Europe/London')
        .resolution,
    ).toBe('unique');
    expect(
      zonedToEpoch({ year: 2026, month: 10, day: 25, hour: 2, minute: 0 }, 'Europe/London')
        .resolution,
    ).toBe('unique');
  });

  it('rejects invalid wall-clock input', () => {
    expect(() => zonedToEpoch({ year: 2026, month: 2, day: 30 }, 'UTC')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries keeping the time of day', () => {
    expect(addDays({ year: 2026, month: 3, day: 1, hour: 9, minute: 15 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
      hour: 9,
      minute: 15,
      second: 0,
    });
    expect(addDays({ year: 2026, month: 1, day: 10 }, -30)).toMatchObject({
      year: 2025,
      month: 12,
      day: 11,
    });
  });
});

describe('formatOffset', () => {
  it('formats signed hh:mm', () => {
    expect(formatOffset(0)).toBe('UTC+00:00');
    expect(formatOffset(345)).toBe('UTC+05:45');
    expect(formatOffset(-210)).toBe('UTC-03:30');
    expect(formatIsoOffset(-210)).toBe('-03:30');
  });
});

describe('preferredZoneName', () => {
  it('maps legacy spellings to the current IANA names', () => {
    expect(preferredZoneName('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(preferredZoneName('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(preferredZoneName('America/Buenos_Aires')).toBe('America/Argentina/Buenos_Aires');
  });
  it('leaves current names and unknown names untouched', () => {
    expect(preferredZoneName('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(preferredZoneName('Europe/London')).toBe('Europe/London');
    expect(preferredZoneName('Mars/Olympus_Mons')).toBe('Mars/Olympus_Mons');
  });
});

describe('listZones / getDeviceZone', () => {
  it('lists many valid zones, sorted, de-duplicated, including UTC', () => {
    const zones = listZones();
    expect(zones.length).toBeGreaterThan(300);
    expect(zones).toContain('UTC');
    expect(zones).toContain('Europe/London');
    expect(zones).toContain('Europe/Kyiv');
    expect(zones).not.toContain('Europe/Kiev');
    expect(zones).not.toContain('Asia/Calcutta');
    expect(new Set(zones).size).toBe(zones.length);
    expect([...zones].sort()).toEqual(zones);
    expect(zones.every(isValidZone)).toBe(true);
  });
  it('returns a valid device zone in its current spelling', () => {
    const zone = getDeviceZone();
    expect(isValidZone(zone)).toBe(true);
    expect(preferredZoneName(zone)).toBe(zone);
  });
});
