import { describe, expect, it } from 'vitest';
import {
  buildQueryString,
  formatDepartureString,
  parseDepartureString,
  parseSharedState,
} from '../../src/core/urlState.js';

describe('parseDepartureString / formatDepartureString', () => {
  it('parses the datetime-local value format', () => {
    expect(parseDepartureString('2026-10-05T14:30')).toEqual({
      year: 2026,
      month: 10,
      day: 5,
      hour: 14,
      minute: 30,
      second: 0,
    });
  });
  it('rejects impossible dates and other formats', () => {
    expect(parseDepartureString('2026-02-30T10:00')).toBeNull();
    expect(parseDepartureString('2026-13-01T00:00')).toBeNull();
    expect(parseDepartureString('2026-10-05T24:00')).toBeNull();
    expect(parseDepartureString('2026-10-05 14:30')).toBeNull();
    expect(parseDepartureString('2026-10-05T14:30:00')).toBeNull();
    expect(parseDepartureString(42)).toBeNull();
  });
  it('formats with zero padding', () => {
    expect(formatDepartureString({ year: 2026, month: 1, day: 5, hour: 9, minute: 5 })).toBe(
      '2026-01-05T09:05',
    );
  });
});

describe('parseSharedState / buildQueryString', () => {
  it('round-trips a complete state', () => {
    /** @type {import('../../src/core/urlState.js').SharedState} */
    const state = {
      iata: 'LHR',
      departure: '2026-10-05T14:30',
      period: { unit: 'hours', value: 24 },
      userZone: 'Europe/Kyiv',
    };
    const query = buildQueryString(state);
    expect(query).toBe('?apt=LHR&dep=2026-10-05T14%3A30&per=24h&tz=Europe%2FKyiv');
    expect(parseSharedState(query)).toEqual(state);
    expect(parseSharedState(new URLSearchParams(query))).toEqual(state);
  });
  it('drops invalid values individually and normalises the code', () => {
    expect(parseSharedState('?apt=lhr&dep=2026-02-30T10:00&per=0h&tz=Mars/Olympus')).toEqual({
      iata: 'LHR',
    });
    expect(parseSharedState('?apt=LHRX&per=3d')).toEqual({ period: { unit: 'days', value: 3 } });
    expect(parseSharedState('')).toEqual({});
  });
  it('builds an empty string when nothing is set', () => {
    expect(buildQueryString({})).toBe('');
  });
});
