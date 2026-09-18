#!/usr/bin/env node
// @ts-check
/**
 * Builds public/data/airports.json and public/data/airports.meta.json from open data.
 *
 * Sources
 *   - OurAirports (public domain): codes, names, municipality, region, country, type,
 *     scheduled-service flag, coordinates.
 *   - mwgg/Airports (MIT): IANA time zone per airport, joined by ICAO then IATA code.
 *   - geo-tz (MIT, build-time only): time zone from coordinates for the remainder.
 *
 * The build fails if any airport ends up without a valid zone or if an IATA code repeats.
 * Output is sorted by IATA code, one airport per line, so refresh diffs are reviewable.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { find as findZones } from 'geo-tz';

const OURAIRPORTS = 'https://davidmegginson.github.io/ourairports-data';
const MWGG = 'https://raw.githubusercontent.com/mwgg/Airports/master';

const SOURCES = [
  {
    name: 'OurAirports',
    url: `${OURAIRPORTS}/airports.csv`,
    license: 'Public domain (Unlicense)',
    homepage: 'https://ourairports.com/data/',
  },
  {
    name: 'mwgg/Airports',
    url: `${MWGG}/airports.json`,
    license: 'MIT',
    homepage: 'https://github.com/mwgg/Airports',
  },
  {
    name: 'geo-tz',
    url: 'https://www.npmjs.com/package/geo-tz',
    license: 'MIT',
    homepage: 'https://github.com/evansiroky/node-geo-tz',
  },
];

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

/** @type {Record<string, string>} */
const TYPE_CODES = {
  large_airport: 'L',
  medium_airport: 'M',
  small_airport: 'S',
  seaplane_base: 'P',
  heliport: 'H',
  balloonport: 'B',
};

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/data');

/**
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchText(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'check-in-calculator data pipeline (github.com/Rusewww)' },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

/**
 * Minimal RFC 4180 parser: quoted fields, doubled quotes, embedded newlines.
 * @param {string} text
 * @returns {Array<Record<string, string>>}
 */
function parseCsv(text) {
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const header = rows[0];
  return rows
    .slice(1)
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((name, i) => [name, r[i]])));
}

/**
 * @param {string} zone
 * @returns {boolean}
 */
function isValidZone(zone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** @param {number} n */
const round3 = (n) => Math.round(n * 1000) / 1000;

async function main() {
  console.log('Downloading sources…');
  const [airportsCsv, regionsCsv, countriesCsv, mwggJson, mwggLicense] = await Promise.all([
    fetchText(`${OURAIRPORTS}/airports.csv`),
    fetchText(`${OURAIRPORTS}/regions.csv`),
    fetchText(`${OURAIRPORTS}/countries.csv`),
    fetchText(`${MWGG}/airports.json`),
    fetchText(`${MWGG}/LICENSE`),
  ]);

  const regions = new Map(parseCsv(regionsCsv).map((r) => [r.code, r.name]));
  const countries = new Map(parseCsv(countriesCsv).map((r) => [r.code, r.name]));

  /** @type {Record<string, { iata?: string, tz?: string }>} */
  const mwggByIcao = JSON.parse(mwggJson);
  /** @type {Map<string, { iata?: string, tz?: string }>} */
  const mwggByIata = new Map();
  for (const entry of Object.values(mwggByIcao)) {
    if (entry.iata) mwggByIata.set(entry.iata, entry);
  }

  const rows = parseCsv(airportsCsv);
  console.log(`OurAirports rows: ${rows.length}`);

  /** @type {Array<Array<string | number>>} */
  const airports = [];
  const tzSources = { mwgg: 0, 'geo-tz': 0 };
  /** @type {Set<string>} */
  const seen = new Set();
  let skippedNoCoords = 0;

  for (const r of rows) {
    const iata = r.iata_code;
    if (!/^[A-Z]{3}$/.test(iata) || r.type === 'closed') continue;

    const lat = Number(r.latitude_deg);
    const lon = Number(r.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      skippedNoCoords++;
      continue;
    }

    const icao = r.icao_code || (/^[A-Z0-9]{4}$/.test(r.ident) ? r.ident : '');

    let tz = '';
    const mwgg = (icao && mwggByIcao[icao]) || mwggByIata.get(iata);
    if (mwgg?.tz && isValidZone(mwgg.tz)) {
      tz = mwgg.tz;
      tzSources.mwgg++;
    } else {
      const candidate = findZones(lat, lon)[0];
      if (candidate && isValidZone(candidate)) {
        tz = candidate;
        tzSources['geo-tz']++;
      }
    }
    if (!tz) throw new Error(`No valid time zone for ${iata} (${r.name})`);

    if (seen.has(iata)) throw new Error(`Duplicate IATA code ${iata}`);
    seen.add(iata);

    airports.push([
      iata,
      icao,
      r.name,
      r.municipality,
      regions.get(r.iso_region) ?? '',
      countries.get(r.iso_country) ?? r.iso_country,
      r.iso_country,
      tz,
      round3(lat),
      round3(lon),
      TYPE_CODES[r.type] ?? 'S',
      r.scheduled_service === 'yes' ? 1 : 0,
    ]);
  }

  airports.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const meta = {
    generated: new Date().toISOString(),
    count: airports.length,
    scheduledService: airports.filter((a) => a[11] === 1).length,
    timeZoneSources: tzSources,
    fields: FIELDS,
    typeCodes: TYPE_CODES,
    sources: SOURCES,
    notices: {
      'mwgg/Airports': mwggLicense.trim(),
      OurAirports: 'Released into the public domain by OurAirports contributors.',
    },
  };

  await mkdir(outDir, { recursive: true });
  const datasetJson =
    `{"fields":${JSON.stringify(FIELDS)},"airports":[\n` +
    airports.map((a) => JSON.stringify(a)).join(',\n') +
    '\n]}\n';
  await writeFile(path.join(outDir, 'airports.json'), datasetJson, 'utf8');
  await writeFile(
    path.join(outDir, 'airports.meta.json'),
    JSON.stringify(meta, null, 2) + '\n',
    'utf8',
  );

  console.log(
    `Wrote ${airports.length} airports (${meta.scheduledService} with scheduled service); ` +
      `zones from mwgg: ${tzSources.mwgg}, from geo-tz: ${tzSources['geo-tz']}; ` +
      `skipped without coordinates: ${skippedNoCoords}.`,
  );
  console.log(`Output: ${outDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
