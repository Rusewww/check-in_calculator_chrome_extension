// @ts-check
/**
 * Airport records, the compact dataset format, and an in-memory search index.
 * @module core/airports
 */

/**
 * @typedef {object} Airport
 * @property {string} iata         3-letter IATA code
 * @property {string} icao         4-character ICAO code, may be empty
 * @property {string} name
 * @property {string} city         municipality
 * @property {string} region       e.g. "England", "California"
 * @property {string} country      e.g. "United Kingdom"
 * @property {string} countryCode  ISO 3166-1 alpha-2
 * @property {string} tz           IANA time zone
 * @property {number} lat
 * @property {number} lon
 * @property {string} type         L large, M medium, S small, P seaplane base, H heliport, B balloonport
 * @property {boolean} scheduled   has scheduled commercial service
 */

/**
 * The shipped JSON: a header of field names and one array per airport, to keep it small.
 * @typedef {{ fields: string[], airports: Array<Array<string | number>> }} AirportDataset
 */

/**
 * @typedef {object} AirportIndex
 * @property {number} size
 * @property {(code: string) => Airport | null} byIata
 * @property {(query: string, limit?: number) => Airport[]} search
 * @property {() => Airport[]} all
 */

const REQUIRED_FIELDS = [
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

/** @type {Record<string, number>} */
const TYPE_RANK = { L: 0, M: 1, S: 2, P: 3, H: 4, B: 5 };

/**
 * Turns the compact dataset into airport objects, validating its shape.
 * @param {unknown} dataset
 * @returns {Airport[]}
 */
export function decodeDataset(dataset) {
  if (!dataset || typeof dataset !== 'object')
    throw new TypeError('Airport dataset is not an object');
  const { fields, airports } = /** @type {Partial<AirportDataset>} */ (dataset);
  if (!Array.isArray(fields) || !Array.isArray(airports)) {
    throw new TypeError('Airport dataset must have "fields" and "airports" arrays');
  }
  for (const field of REQUIRED_FIELDS) {
    if (!fields.includes(field)) throw new TypeError(`Airport dataset is missing field "${field}"`);
  }
  const at = Object.fromEntries(fields.map((name, i) => [name, i]));
  return airports.map((row, i) => {
    if (!Array.isArray(row) || row.length !== fields.length) {
      throw new TypeError(`Airport row ${i} has the wrong length`);
    }
    /** @param {string} name */
    const str = (name) => String(row[at[name]] ?? '');
    return {
      iata: str('iata'),
      icao: str('icao'),
      name: str('name'),
      city: str('city'),
      region: str('region'),
      country: str('country'),
      countryCode: str('countryCode'),
      tz: str('tz'),
      lat: Number(row[at.lat]),
      lon: Number(row[at.lon]),
      type: str('type'),
      scheduled: Boolean(row[at.scheduled]),
    };
  });
}

/**
 * Lower-case, accent-stripped text for matching ("Zürich" → "zurich").
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase();
}

/**
 * @param {string} text
 * @returns {string}
 */
function wordsOnly(text) {
  return text.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * "London, England, United Kingdom" (duplicates and blanks removed).
 * @param {Airport} airport
 * @returns {string}
 */
export function placeOf(airport) {
  /** @type {string[]} */
  const parts = [];
  for (const part of [airport.city, airport.region, airport.country]) {
    if (part && !parts.includes(part)) parts.push(part);
  }
  return parts.join(', ');
}

/**
 * "London Heathrow Airport, London, England, United Kingdom".
 * @param {Airport} airport
 * @returns {string}
 */
export function describeAirport(airport) {
  const place = placeOf(airport);
  return place ? `${airport.name}, ${place}` : airport.name;
}

/**
 * @param {Airport} airport
 * @returns {number} lower ranks first
 */
function rankOf(airport) {
  return (airport.scheduled ? 0 : 10) + (TYPE_RANK[airport.type] ?? 9);
}

/**
 * Builds a search index. Ranking tiers: exact IATA code; IATA prefix (1–2 letters) or
 * exact ICAO code; the name or city beginning with the query; a later word of the name
 * or city starting with the query; a word of the region or country starting with the
 * query; a substring of the name or city; a substring of the region or country. Within
 * a tier, airports with scheduled service and larger airports come first.
 * @param {Airport[]} airports
 * @returns {AirportIndex}
 */
export function createAirportIndex(airports) {
  /** @type {Map<string, Airport>} */
  const byIata = new Map();
  const entries = airports.map((airport) => {
    byIata.set(airport.iata, airport);
    const primary = normalizeText([airport.name, airport.city].filter(Boolean).join(' '));
    const secondary = normalizeText([airport.region, airport.country].filter(Boolean).join(' '));
    return {
      airport,
      primary,
      secondary,
      nameStart: wordsOnly(normalizeText(airport.name)),
      cityStart: wordsOnly(normalizeText(airport.city)),
      primaryWords: ` ${wordsOnly(primary)} `,
      secondaryWords: ` ${wordsOnly(secondary)} `,
      rank: rankOf(airport),
    };
  });

  return {
    size: airports.length,
    all: () => airports.slice(),
    byIata(code) {
      return byIata.get(String(code).trim().toUpperCase()) ?? null;
    },
    search(query, limit = 8) {
      const trimmed = String(query).trim();
      if (!trimmed) return [];
      const code = trimmed.toUpperCase();
      const isIata = /^[A-Z]{3}$/.test(code);
      const isIataPrefix = /^[A-Z]{1,2}$/.test(code);
      const isIcao = /^[A-Z0-9]{4}$/.test(code);
      const normalized = normalizeText(trimmed);
      const words = wordsOnly(normalized);
      // Free-text matching needs at least two characters; substring matching needs three,
      // otherwise one letter would match almost every airport.
      const wordQuery = words.length >= 2 ? ` ${words}` : null;
      const substring = normalized.length >= 3 ? normalized : null;

      /** @type {Array<{ entry: (typeof entries)[number], tier: number }>} */
      const matches = [];
      for (const entry of entries) {
        const { airport } = entry;
        let tier;
        if (isIata && airport.iata === code) tier = 0;
        else if (isIataPrefix && airport.iata.startsWith(code)) tier = 1;
        else if (isIcao && airport.icao === code) tier = 1;
        else if (
          wordQuery &&
          (entry.nameStart.startsWith(words) || entry.cityStart.startsWith(words))
        )
          tier = 2;
        else if (wordQuery && entry.primaryWords.includes(wordQuery)) tier = 3;
        else if (wordQuery && entry.secondaryWords.includes(wordQuery)) tier = 4;
        else if (substring && entry.primary.includes(substring)) tier = 5;
        else if (substring && entry.secondary.includes(substring)) tier = 6;
        else continue;
        matches.push({ entry, tier });
      }

      matches.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (a.entry.rank !== b.entry.rank) return a.entry.rank - b.entry.rank;
        // Code matches read best in code order; text matches in name order.
        return a.tier <= 1
          ? a.entry.airport.iata.localeCompare(b.entry.airport.iata)
          : a.entry.airport.name.localeCompare(b.entry.airport.name);
      });
      return matches.slice(0, limit).map((m) => m.entry.airport);
    },
  };
}
