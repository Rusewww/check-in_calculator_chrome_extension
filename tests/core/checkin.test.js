import { describe, expect, it } from 'vitest';
import { computeCheckIn, splitDuration, statusAt } from '../../src/core/checkin.js';

const LONDON = 'Europe/London';
const KYIV = 'Europe/Kyiv';

describe('computeCheckIn', () => {
  it('opens 24 hours before a summer departure from London, shown in Kyiv time', () => {
    const result = computeCheckIn({
      departure: { year: 2026, month: 10, day: 5, hour: 14, minute: 30 },
      airportZone: LONDON,
      userZone: KYIV,
      period: { unit: 'hours', value: 24 },
      nowMs: Date.UTC(2026, 9, 1),
    });
    expect(result.departure.epochMs).toBe(Date.UTC(2026, 9, 5, 13, 30));
    expect(result.opens.epochMs).toBe(Date.UTC(2026, 9, 4, 13, 30));
    expect(result.opens.airport).toMatchObject({
      month: 10,
      day: 4,
      hour: 14,
      minute: 30,
      offsetMinutes: 60,
    });
    expect(result.opens.user).toMatchObject({
      month: 10,
      day: 4,
      hour: 16,
      minute: 30,
      offsetMinutes: 180,
    });
    expect(result.zoneDifference).toEqual({
      atOpenMinutes: 120,
      atDepartureMinutes: 120,
      changes: false,
    });
    expect(result.status).toBe('before-open');
    expect(result.msUntilOpen).toBe(Date.UTC(2026, 9, 4, 13, 30) - Date.UTC(2026, 9, 1));
  });

  it('applies every hour preset as an exact duration', () => {
    for (const hours of [12, 24, 36, 48, 72]) {
      const result = computeCheckIn({
        departure: { year: 2026, month: 6, day: 1, hour: 10 },
        airportZone: 'Asia/Tokyo',
        userZone: 'Asia/Tokyo',
        period: { unit: 'hours', value: hours },
        nowMs: 0,
      });
      expect(result.departure.epochMs - result.opens.epochMs).toBe(hours * 3_600_000);
    }
  });

  it('uses calendar days by default: same local time N days earlier', () => {
    // Departure 10 Nov 2026 10:00 GMT; 30 days earlier London is still on BST.
    const departure = { year: 2026, month: 11, day: 10, hour: 10 };
    const calendar = computeCheckIn({
      departure,
      airportZone: LONDON,
      userZone: 'Asia/Tokyo',
      period: { unit: 'days', value: 30 },
      nowMs: 0,
    });
    expect(calendar.opens.airport).toMatchObject({
      month: 10,
      day: 11,
      hour: 10,
      minute: 0,
      offsetMinutes: 60,
    });
    expect(calendar.opens.epochMs).toBe(Date.UTC(2026, 9, 11, 9, 0));
    expect(calendar.zoneDifference).toEqual({
      atOpenMinutes: 480,
      atDepartureMinutes: 540,
      changes: true,
    });

    const exact = computeCheckIn({
      departure,
      airportZone: LONDON,
      userZone: 'Asia/Tokyo',
      period: { unit: 'days', value: 30 },
      nowMs: 0,
      daysMode: 'exact',
    });
    expect(exact.opens.epochMs).toBe(Date.UTC(2026, 9, 11, 10, 0));
    expect(exact.opens.airport).toMatchObject({ hour: 11, minute: 0 });
  });

  it('applies every day preset in calendar mode', () => {
    for (const days of [3, 5, 7, 10, 30, 60]) {
      const result = computeCheckIn({
        departure: { year: 2026, month: 8, day: 20, hour: 6, minute: 45 },
        airportZone: 'America/New_York',
        userZone: 'America/New_York',
        period: { unit: 'days', value: days },
        nowMs: 0,
      });
      expect(result.opens.airport).toMatchObject({ hour: 6, minute: 45 });
      const expected = new Date(Date.UTC(2026, 7, 20 - days));
      expect(result.opens.airport.month).toBe(expected.getUTCMonth() + 1);
      expect(result.opens.airport.day).toBe(expected.getUTCDate());
    }
  });

  it('reports a departure time that falls into a daylight-saving gap', () => {
    const result = computeCheckIn({
      departure: { year: 2026, month: 3, day: 29, hour: 1, minute: 30 },
      airportZone: LONDON,
      userZone: LONDON,
      period: { unit: 'hours', value: 12 },
      nowMs: 0,
    });
    expect(result.departure.resolution).toBe('gap');
    expect(result.departure.airport).toMatchObject({ hour: 2, minute: 30, offsetMinutes: 60 });
    expect(result.opens.epochMs).toBe(result.departure.epochMs - 12 * 3_600_000);
  });

  it('reports an opening time that lands in an overlap', () => {
    // Departure 27 Oct 2026 01:30 GMT; 2 calendar days earlier is the ambiguous 01:30 on 25 Oct.
    const result = computeCheckIn({
      departure: { year: 2026, month: 10, day: 27, hour: 1, minute: 30 },
      airportZone: LONDON,
      userZone: LONDON,
      period: { unit: 'days', value: 2 },
      nowMs: 0,
    });
    expect(result.opens.resolution).toBe('overlap');
    expect(result.opens.epochMs).toBe(Date.UTC(2026, 9, 25, 0, 30));
  });

  it('derives the status from now', () => {
    const departure = { year: 2026, month: 10, day: 5, hour: 14, minute: 30 };
    /** @type {import('../../src/core/period.js').Period} */
    const period = { unit: 'hours', value: 24 };
    const base = { departure, airportZone: LONDON, userZone: LONDON, period };
    expect(computeCheckIn({ ...base, nowMs: Date.UTC(2026, 9, 4, 13, 29) }).status).toBe(
      'before-open',
    );
    expect(computeCheckIn({ ...base, nowMs: Date.UTC(2026, 9, 4, 13, 30) }).status).toBe('open');
    expect(computeCheckIn({ ...base, nowMs: Date.UTC(2026, 9, 5, 13, 29) }).status).toBe('open');
    expect(computeCheckIn({ ...base, nowMs: Date.UTC(2026, 9, 5, 13, 30) }).status).toBe(
      'departed',
    );
  });
});

describe('statusAt', () => {
  it('returns signed distances', () => {
    expect(statusAt(100, 200, 300)).toEqual({
      status: 'before-open',
      msUntilOpen: 100,
      msUntilDeparture: 200,
    });
    expect(statusAt(250, 200, 300)).toEqual({
      status: 'open',
      msUntilOpen: -50,
      msUntilDeparture: 50,
    });
    expect(statusAt(400, 200, 300).status).toBe('departed');
  });
});

describe('splitDuration', () => {
  it('splits into days, hours, minutes and seconds', () => {
    expect(splitDuration(((2 * 24 + 4) * 3600 + 12 * 60 + 9) * 1000 + 500)).toEqual({
      days: 2,
      hours: 4,
      minutes: 12,
      seconds: 9,
    });
    expect(splitDuration(-61_000)).toEqual({ days: 0, hours: 0, minutes: 1, seconds: 1 });
  });
});
