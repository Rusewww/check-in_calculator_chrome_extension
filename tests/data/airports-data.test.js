import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createAirportIndex, decodeDataset } from '../../src/core/airports.js';
import { isValidZone } from '../../src/core/timezone.js';

// Guards the committed dataset (public/data/airports.json) that the site ships.
const dataset = JSON.parse(
  readFileSync(new URL('../../public/data/airports.json', import.meta.url), 'utf8'),
);
const meta = JSON.parse(
  readFileSync(new URL('../../public/data/airports.meta.json', import.meta.url), 'utf8'),
);
const airports = decodeDataset(dataset);
const index = createAirportIndex(airports);

describe('shipped airport dataset', () => {
  it('has a plausible size and matching metadata', () => {
    expect(airports.length).toBeGreaterThan(8000);
    expect(meta.count).toBe(airports.length);
    expect(meta.fields).toEqual(dataset.fields);
    expect(Number.isNaN(Date.parse(meta.generated))).toBe(false);
  });

  it('has unique, well-formed IATA codes, sorted', () => {
    const codes = airports.map((a) => a.iata);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z]{3}$/.test(c))).toBe(true);
    expect([...codes].sort()).toEqual(codes);
  });

  it('gives every airport a name, country, coordinates and a valid time zone', () => {
    const zones = new Set();
    for (const a of airports) {
      expect(a.name, a.iata).not.toBe('');
      expect(a.country, a.iata).not.toBe('');
      expect(Number.isFinite(a.lat) && Number.isFinite(a.lon), a.iata).toBe(true);
      zones.add(a.tz);
    }
    for (const zone of zones) expect(isValidZone(zone), zone).toBe(true);
  });

  it('resolves well-known airports to the expected zones', () => {
    const expected = {
      LHR: 'Europe/London',
      JFK: 'America/New_York',
      LAX: 'America/Los_Angeles',
      KBP: 'Europe/Kyiv',
      NRT: 'Asia/Tokyo',
      SYD: 'Australia/Sydney',
      DEL: 'Asia/Kolkata',
      DXB: 'Asia/Dubai',
      KTM: 'Asia/Kathmandu',
      GRU: 'America/Sao_Paulo',
    };
    for (const [code, zone] of Object.entries(expected)) {
      expect(index.byIata(code)?.tz, code).toBe(zone);
    }
    expect(index.byIata('LHR')).toMatchObject({
      name: 'London Heathrow Airport',
      city: 'London',
      region: 'England',
      country: 'United Kingdom',
      countryCode: 'GB',
      type: 'L',
      scheduled: true,
    });
  });

  it('searches sensibly on the real data', () => {
    expect(index.search('LHR')[0].iata).toBe('LHR');
    expect(index.search('heathrow')[0].iata).toBe('LHR');
    expect(index.search('kyiv').map((a) => a.iata)).toContain('KBP');
    expect(
      index
        .search('new york')
        .slice(0, 3)
        .map((a) => a.iata),
    ).toContain('JFK');
  });
});
