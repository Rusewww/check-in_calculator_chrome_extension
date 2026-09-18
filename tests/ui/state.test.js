import { describe, expect, it } from 'vitest';
import {
  applyCustomInput,
  applyPeriodUnit,
  applyPreset,
  createInitialState,
  effectiveUserZone,
  loadLastInput,
  loadZonePreference,
  saveLastInput,
  saveZonePreference,
  toLastInput,
} from '../../src/ui/state.js';

const deviceZone = 'Europe/Kyiv';

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

/** @type {import('../../src/core/airports.js').Airport} */
const airport = {
  iata: 'LHR',
  icao: 'EGLL',
  name: 'London Heathrow Airport',
  city: 'London',
  region: 'England',
  country: 'United Kingdom',
  countryCode: 'GB',
  tz: 'Europe/London',
  lat: 51.471,
  lon: -0.46,
  type: 'L',
  scheduled: true,
};

describe('createInitialState', () => {
  it('uses defaults when nothing is shared or stored', () => {
    const state = createInitialState({ deviceZone });
    expect(state.period).toEqual({ unit: 'hours', value: 24 });
    expect(state.lastPresetByUnit).toEqual({ hours: 24, days: 3 });
    expect(state.customInput).toEqual({ hours: '', days: '' });
    expect(state.followAirportZone).toBe(true);
    expect(state.userZone).toBe(deviceZone);
    expect(state.pendingIata).toBeNull();
  });
  it('takes shared state from the URL, treating a custom value as custom input', () => {
    const state = createInitialState({
      shared: {
        iata: 'LHR',
        departure: '2026-10-05T14:30',
        period: { unit: 'days', value: 20 },
        userZone: 'Asia/Tokyo',
      },
      pref: { follow: true, zone: 'Europe/Paris' },
      deviceZone,
    });
    expect(state.pendingIata).toBe('LHR');
    expect(state.departure).toBe('2026-10-05T14:30');
    expect(state.period).toEqual({ unit: 'days', value: 20 });
    expect(state.customInput).toEqual({ hours: '', days: '20' });
    expect(state.lastPresetByUnit).toEqual({ hours: 24, days: 3 });
    expect(state.followAirportZone).toBe(false);
    expect(state.userZone).toBe('Asia/Tokyo');
  });
  it('falls back to the stored zone preference', () => {
    const state = createInitialState({ pref: { follow: false, zone: 'Europe/Paris' }, deviceZone });
    expect(state.followAirportZone).toBe(false);
    expect(state.userZone).toBe('Europe/Paris');
  });
});

describe('effectiveUserZone', () => {
  it('follows the airport, then the device, unless set explicitly', () => {
    const base = createInitialState({ deviceZone });
    expect(effectiveUserZone(base, deviceZone)).toBe(deviceZone);
    /** @type {import('../../src/core/airports.js').Airport} */
    const airport = {
      iata: 'LHR',
      icao: 'EGLL',
      name: 'London Heathrow Airport',
      city: 'London',
      region: 'England',
      country: 'United Kingdom',
      countryCode: 'GB',
      tz: 'Europe/London',
      lat: 51.471,
      lon: -0.46,
      type: 'L',
      scheduled: true,
    };
    expect(effectiveUserZone({ ...base, airport }, deviceZone)).toBe('Europe/London');
    expect(
      effectiveUserZone(
        { ...base, airport, followAirportZone: false, userZone: 'Asia/Tokyo' },
        deviceZone,
      ),
    ).toBe('Asia/Tokyo');
  });
});

describe('period transitions', () => {
  const start = createInitialState({ deviceZone });

  it('selects presets and clears custom input', () => {
    const typed = applyCustomInput(start, '17');
    const state = applyPreset(typed, 48);
    expect(state.period).toEqual({ unit: 'hours', value: 48 });
    expect(state.customInput.hours).toBe('');
    expect(state.lastPresetByUnit.hours).toBe(48);
    expect(state.periodError).toBeNull();
  });

  it('accepts valid custom input without touching the last preset', () => {
    const state = applyCustomInput(start, '17');
    expect(state.period).toEqual({ unit: 'hours', value: 17 });
    expect(state.lastPresetByUnit.hours).toBe(24);
    expect(state.periodError).toBeNull();
  });

  it('flags invalid custom input and keeps the last valid period', () => {
    const state = applyCustomInput(start, '0');
    expect(state.periodError).toBe('out-of-range');
    expect(state.period).toEqual({ unit: 'hours', value: 24 });
    expect(state.customInput.hours).toBe('0');
  });

  it('reverts to the last preset when the custom box is cleared', () => {
    const state = applyCustomInput(applyCustomInput(start, '17'), '');
    expect(state.period).toEqual({ unit: 'hours', value: 24 });
    expect(state.periodError).toBeNull();
  });

  it('switches units, remembering each unit’s custom value', () => {
    const hours17 = applyCustomInput(start, '17');
    const days = applyPeriodUnit(hours17, 'days');
    expect(days.period).toEqual({ unit: 'days', value: 3 });
    const days9 = applyCustomInput(days, '9');
    const backToHours = applyPeriodUnit(days9, 'hours');
    expect(backToHours.period).toEqual({ unit: 'hours', value: 17 });
    const backToDays = applyPeriodUnit(backToHours, 'days');
    expect(backToDays.period).toEqual({ unit: 'days', value: 9 });
  });

  it('re-validates a remembered custom value on switch', () => {
    const badDays = applyCustomInput(applyPeriodUnit(start, 'days'), '999');
    expect(badDays.periodError).toBe('out-of-range');
    const hours = applyPeriodUnit(badDays, 'hours');
    expect(hours.periodError).toBeNull();
    expect(applyPeriodUnit(hours, 'days').periodError).toBe('out-of-range');
  });
});

describe('createInitialState with a restored lastInput (FR-9.2)', () => {
  it('restores the whole airport record, independent of the dataset', () => {
    const state = createInitialState({
      restored: {
        airport,
        departure: '2026-10-04T14:30',
        period: { unit: 'hours', value: 24 },
        customInput: { hours: '', days: '' },
      },
      deviceZone,
    });
    expect(state.airport).toEqual(airport);
    expect(state.pendingIata).toBeNull();
    expect(state.departure).toBe('2026-10-04T14:30');
    expect(state.period).toEqual({ unit: 'hours', value: 24 });
  });

  it('takes priority over a shared URL state when both are present', () => {
    const state = createInitialState({
      shared: { iata: 'CDG', departure: '2026-01-01T00:00' },
      restored: {
        airport,
        departure: '2026-10-04T14:30',
        period: { unit: 'days', value: 3 },
        customInput: { hours: '', days: '' },
      },
      deviceZone,
    });
    expect(state.airport).toEqual(airport);
    expect(state.departure).toBe('2026-10-04T14:30');
  });

  it('remembers a restored custom value as the active period', () => {
    const state = createInitialState({
      restored: {
        airport: null,
        departure: '',
        period: { unit: 'hours', value: 17 },
        customInput: { hours: '17', days: '' },
      },
      deviceZone,
    });
    expect(state.period).toEqual({ unit: 'hours', value: 17 });
    expect(state.customInput).toEqual({ hours: '17', days: '' });
    expect(state.lastPresetByUnit).toEqual({ hours: 24, days: 3 });
  });

  it('falls back to defaults with no restored input and no shared state', () => {
    const state = createInitialState({ restored: null, deviceZone });
    expect(state.airport).toBeNull();
    expect(state.period).toEqual({ unit: 'hours', value: 24 });
  });
});

describe('toLastInput / loadLastInput / saveLastInput', () => {
  it('round-trips the fields FR-9.1 remembers', () => {
    const state = createInitialState({ deviceZone });
    const record = toLastInput({ ...state, airport, departure: '2026-10-04T14:30' });
    const storage = fakeStorage();
    saveLastInput(record, storage);
    expect(loadLastInput(storage)).toEqual(record);
  });

  it('returns null when nothing is stored or storage is missing', () => {
    expect(loadLastInput(fakeStorage())).toBeNull();
    expect(loadLastInput(undefined)).toBeNull();
  });

  it('ignores corrupted or shape-invalid stored data', () => {
    expect(loadLastInput(fakeStorage({ 'checkin-calculator.lastInput': 'not json' }))).toBeNull();
    expect(
      loadLastInput(fakeStorage({ 'checkin-calculator.lastInput': JSON.stringify({}) })),
    ).toBeNull();
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
    expect(loadLastInput(broken)).toBeNull();
    expect(() =>
      saveLastInput(toLastInput(createInitialState({ deviceZone })), broken),
    ).not.toThrow();
  });
});

describe('loadZonePreference / saveZonePreference with an injected storage', () => {
  it('round-trips through a non-localStorage port', () => {
    const storage = fakeStorage();
    const state = {
      ...createInitialState({ deviceZone }),
      followAirportZone: false,
      userZone: 'Asia/Tokyo',
    };
    saveZonePreference(state, storage);
    expect(loadZonePreference(storage)).toEqual({ follow: false, zone: 'Asia/Tokyo' });
  });
});
