import { describe, expect, it } from 'vitest';
import {
  createAirportIndex,
  decodeDataset,
  describeAirport,
  normalizeText,
  placeOf,
} from '../../src/core/airports.js';

const FIELDS = [
  'iata',
  'icao',
  'name',
  'city',
  'region',
  'country',
  'countryCode',
  'tz',
  'lat',
  'lon',
  'type',
  'scheduled',
];

const DATASET = {
  fields: FIELDS,
  airports: [
    [
      'LHR',
      'EGLL',
      'London Heathrow Airport',
      'London',
      'England',
      'United Kingdom',
      'GB',
      'Europe/London',
      51.471,
      -0.46,
      'L',
      1,
    ],
    [
      'LGW',
      'EGKK',
      'London Gatwick Airport',
      'London',
      'England',
      'United Kingdom',
      'GB',
      'Europe/London',
      51.148,
      -0.19,
      'L',
      1,
    ],
    [
      'LCY',
      'EGLC',
      'London City Airport',
      'London',
      'England',
      'United Kingdom',
      'GB',
      'Europe/London',
      51.505,
      0.055,
      'M',
      1,
    ],
    [
      'LHE',
      'OPLA',
      'Allama Iqbal International Airport',
      'Lahore',
      'Punjab',
      'Pakistan',
      'PK',
      'Asia/Karachi',
      31.522,
      74.404,
      'L',
      1,
    ],
    [
      'ZRH',
      'LSZH',
      'Zürich Airport',
      'Zürich',
      'Zurich',
      'Switzerland',
      'CH',
      'Europe/Zurich',
      47.465,
      8.549,
      'L',
      1,
    ],
    [
      'LDN',
      '',
      'Lamidanda Airport',
      'Lamidanda',
      'Province 1',
      'Nepal',
      'NP',
      'Asia/Kathmandu',
      27.253,
      86.67,
      'S',
      0,
    ],
    [
      'KBP',
      'UKBB',
      'Boryspil International Airport',
      'Kyiv',
      'Kyiv Oblast',
      'Ukraine',
      'UA',
      'Europe/Kyiv',
      50.345,
      30.895,
      'L',
      1,
    ],
    [
      'JFK',
      'KJFK',
      'John F Kennedy International Airport',
      'New York',
      'New York',
      'United States',
      'US',
      'America/New_York',
      40.64,
      -73.779,
      'L',
      1,
    ],
    [
      'ALB',
      'KALB',
      'Albany International Airport',
      'Albany',
      'New York',
      'United States',
      'US',
      'America/New_York',
      42.748,
      -73.803,
      'L',
      1,
    ],
    [
      'ELS',
      'FAEL',
      'King Phalo Airport',
      'East London',
      'Eastern Cape',
      'South Africa',
      'ZA',
      'Africa/Johannesburg',
      -33.036,
      27.826,
      'L',
      1,
    ],
  ],
};

describe('decodeDataset', () => {
  it('maps rows to airport objects', () => {
    const airports = decodeDataset(DATASET);
    expect(airports).toHaveLength(10);
    expect(airports[0]).toEqual({
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
    });
    expect(airports[5].scheduled).toBe(false);
  });
  it('rejects malformed input', () => {
    expect(() => decodeDataset(null)).toThrow(TypeError);
    expect(() => decodeDataset({ fields: ['iata'], airports: [] })).toThrow(/missing field/);
    expect(() => decodeDataset({ fields: FIELDS, airports: [['LHR']] })).toThrow(/wrong length/);
  });
});

describe('normalizeText / placeOf / describeAirport', () => {
  it('strips accents and case', () => {
    expect(normalizeText('Zürich Flughafen')).toBe('zurich flughafen');
  });
  it('joins distinct place parts', () => {
    const [lhr, , , , zrh] = decodeDataset(DATASET);
    expect(placeOf(lhr)).toBe('London, England, United Kingdom');
    expect(placeOf(zrh)).toBe('Zürich, Zurich, Switzerland');
    expect(describeAirport(lhr)).toBe('London Heathrow Airport, London, England, United Kingdom');
  });
});

describe('createAirportIndex', () => {
  const index = createAirportIndex(decodeDataset(DATASET));

  it('looks up by IATA code, case-insensitively', () => {
    expect(index.byIata('lhr')?.name).toBe('London Heathrow Airport');
    expect(index.byIata(' KBP ')?.tz).toBe('Europe/Kyiv');
    expect(index.byIata('XXX')).toBeNull();
    expect(index.size).toBe(10);
  });

  it('puts an exact IATA match first', () => {
    expect(index.search('LHR').map((a) => a.iata)).toEqual(['LHR']);
    expect(index.search('lhe')[0].iata).toBe('LHE');
  });

  it('matches IATA prefixes for one or two letters, large scheduled airports first', () => {
    expect(index.search('L').map((a) => a.iata)).toEqual(['LGW', 'LHE', 'LHR', 'LCY', 'LDN']);
    expect(index.search('LH').map((a) => a.iata)).toEqual(['LHE', 'LHR']);
  });

  it('only matches codes for a single letter, never names or countries', () => {
    expect(index.search('k').map((a) => a.iata)).toEqual(['KBP']);
    expect(index.search('z').map((a) => a.iata)).toEqual(['ZRH']);
    expect(index.search('q')).toEqual([]);
  });

  it('ranks names and cities that begin with the query above later-word matches', () => {
    // "East London" contains the word, but the London airports start with it.
    expect(index.search('lond').map((a) => a.iata)).toEqual(['LGW', 'LHR', 'LCY', 'ELS']);
    expect(index.search('east lond')[0].iata).toBe('ELS');
  });

  it('ranks a city match above a region match', () => {
    expect(index.search('new york').map((a) => a.iata)).toEqual(['JFK', 'ALB']);
    expect(index.search('york').map((a) => a.iata)).toEqual(['JFK', 'ALB']);
    expect(index.search('albany')[0].iata).toBe('ALB');
  });

  it('matches ICAO codes and words of the name, city and country', () => {
    expect(index.search('EGKK')[0].iata).toBe('LGW');
    expect(index.search('heathrow')[0].iata).toBe('LHR');
    expect(index.search('london').map((a) => a.iata)).toEqual(['LGW', 'LHR', 'LCY', 'ELS']);
    expect(index.search('zurich')[0].iata).toBe('ZRH');
    expect(index.search('Zürich')[0].iata).toBe('ZRH');
    expect(index.search('nepal')[0].iata).toBe('LDN');
    expect(index.search('united states').map((a) => a.iata)).toEqual(['ALB', 'JFK']);
  });

  it('ranks word-start matches above substring matches', () => {
    // "dan" starts no word for LDN ("lamidanda") but is a substring of it.
    expect(index.search('dan').map((a) => a.iata)).toEqual(['LDN']);
    expect(index.search('lam')[0].iata).toBe('LDN');
  });

  it('honours the limit and empty queries', () => {
    expect(index.search('london', 2)).toHaveLength(2);
    expect(index.search('   ')).toEqual([]);
    expect(index.search('qqq')).toEqual([]);
  });
});
