// @ts-check
/**
 * Time-zone helpers built on the `Intl` API that ships with every modern browser and Node.
 * No network access, no dependencies. Instants are epoch milliseconds (UTC); wall-clock
 * times are plain objects with year/month/day/hour/minute/second in a named IANA zone.
 * @module core/timezone
 */

/**
 * @typedef {object} WallTime
 * @property {number} year
 * @property {number} month  1–12
 * @property {number} day    1–31
 * @property {number} [hour]   0–23
 * @property {number} [minute] 0–59
 * @property {number} [second] 0–59
 */

/**
 * @typedef {object} ZonedTime
 * @property {number} year
 * @property {number} month
 * @property {number} day
 * @property {number} hour
 * @property {number} minute
 * @property {number} second
 * @property {number} offsetMinutes  UTC offset in minutes at that instant (east = positive)
 * @property {string} zone
 */

/**
 * How to resolve a wall-clock time that does not exist (clocks jumped forward) or exists
 * twice (clocks went back). `compatible` follows the Temporal specification: gaps move
 * forward, overlaps take the earlier instant.
 * @typedef {'compatible' | 'earlier' | 'later' | 'reject'} Disambiguation
 */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** @type {Map<string, Intl.DateTimeFormat>} */
const formatterCache = new Map();

/**
 * @param {string} zone
 * @returns {Intl.DateTimeFormat}
 */
function formatterFor(zone) {
  let formatter = formatterCache.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(zone, formatter);
  }
  return formatter;
}

/**
 * Epoch milliseconds for a UTC wall-clock time. Unlike `Date.UTC`, years 0–99 are not
 * remapped to 1900–1999.
 * @param {number} year
 * @param {number} month 1–12
 * @param {number} day
 * @param {number} [hour]
 * @param {number} [minute]
 * @param {number} [second]
 * @returns {number}
 */
export function utcMs(year, month, day, hour = 0, minute = 0, second = 0) {
  const date = new Date(Date.UTC(2000, month - 1, day, hour, minute, second));
  date.setUTCFullYear(year);
  return date.getTime();
}

/**
 * True when the engine knows the IANA zone identifier (aliases such as Asia/Calcutta count).
 * @param {unknown} zone
 * @returns {zone is string}
 */
export function isValidZone(zone) {
  if (typeof zone !== 'string' || zone.length === 0) return false;
  try {
    formatterFor(zone);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks that the fields form a real calendar date and time (e.g. rejects 30 February).
 * @param {WallTime} wall
 * @returns {boolean}
 */
export function isValidWallTime(wall) {
  const { year, month, day, hour = 0, minute = 0, second = 0 } = wall;
  if (![year, month, day, hour, minute, second].every(Number.isInteger)) return false;
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return false;
  const date = new Date(utcMs(year, month, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day
  );
}

/**
 * Wall-clock time and UTC offset of an instant in a zone.
 * @param {number} epochMs
 * @param {string} zone
 * @returns {ZonedTime}
 */
export function epochToZoned(epochMs, zone) {
  if (!Number.isFinite(epochMs)) throw new RangeError('epochMs must be a finite number');
  const parts = formatterFor(zone).formatToParts(new Date(epochMs));
  /** @type {Record<string, number>} */
  const values = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  const hour = values.hour === 24 ? 0 : values.hour;
  const wallAsUtc = utcMs(
    values.year,
    values.month,
    values.day,
    hour,
    values.minute,
    values.second,
  );
  const wholeSeconds = Math.floor(epochMs / 1000) * 1000;
  const offsetMinutes = Math.round((wallAsUtc - wholeSeconds) / MINUTE_MS);
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour,
    minute: values.minute,
    second: values.second,
    offsetMinutes,
    zone,
  };
}

/**
 * UTC offset (minutes east of UTC) in effect in `zone` at the given instant.
 * @param {number} epochMs
 * @param {string} zone
 * @returns {number}
 */
export function offsetAt(epochMs, zone) {
  return epochToZoned(epochMs, zone).offsetMinutes;
}

/**
 * Converts a wall-clock time in a zone to an instant, reporting whether the wall-clock
 * time was unique, fell into a daylight-saving gap, or was ambiguous (overlap).
 * @param {WallTime} wall
 * @param {string} zone
 * @param {Disambiguation} [disambiguation]
 * @returns {{ epochMs: number, resolution: 'unique' | 'gap' | 'overlap' }}
 */
export function zonedToEpoch(wall, zone, disambiguation = 'compatible') {
  if (!isValidWallTime(wall)) throw new RangeError('Invalid wall-clock time');
  const { year, month, day, hour = 0, minute = 0, second = 0 } = wall;
  const wallAsUtc = utcMs(year, month, day, hour, minute, second);

  // Offsets one day before and after bracket any transition close to the wall time.
  const offsetBefore = offsetAt(wallAsUtc - DAY_MS, zone);
  const offsetAfter = offsetAt(wallAsUtc + DAY_MS, zone);

  /** @type {number[]} */
  const candidates = [];
  for (const offset of new Set([offsetBefore, offsetAfter])) {
    const instant = wallAsUtc - offset * MINUTE_MS;
    if (offsetAt(instant, zone) === offset) candidates.push(instant);
  }

  if (candidates.length === 1) {
    return { epochMs: candidates[0], resolution: 'unique' };
  }

  if (candidates.length === 2) {
    if (disambiguation === 'reject') throw new RangeError('Ambiguous wall-clock time');
    const earlier = Math.min(candidates[0], candidates[1]);
    const later = Math.max(candidates[0], candidates[1]);
    return { epochMs: disambiguation === 'later' ? later : earlier, resolution: 'overlap' };
  }

  // Gap: the wall-clock time was skipped. Interpreting it with the offset in force before
  // the transition yields an instant after the transition (shifted forward by the gap);
  // the offset after the transition yields an instant before it (shifted backward).
  if (disambiguation === 'reject') throw new RangeError('Nonexistent wall-clock time');
  const offset = disambiguation === 'earlier' ? offsetAfter : offsetBefore;
  return { epochMs: wallAsUtc - offset * MINUTE_MS, resolution: 'gap' };
}

/**
 * Calendar-day arithmetic on a wall-clock time (no zone involved): the same time of day,
 * `days` days later (negative = earlier).
 * @param {WallTime} wall
 * @param {number} days
 * @returns {WallTime & { hour: number, minute: number, second: number }}
 */
export function addDays(wall, days) {
  if (!Number.isInteger(days)) throw new RangeError('days must be an integer');
  const { year, month, day, hour = 0, minute = 0, second = 0 } = wall;
  const date = new Date(utcMs(year, month, day, hour, minute, second) + days * DAY_MS);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

/**
 * "UTC+05:45", "UTC-03:30", "UTC+00:00".
 * @param {number} offsetMinutes
 * @returns {string}
 */
export function formatOffset(offsetMinutes) {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

/**
 * "+05:45" style offset suitable for ISO 8601 strings.
 * @param {number} offsetMinutes
 * @returns {string}
 */
export function formatIsoOffset(offsetMinutes) {
  return formatOffset(offsetMinutes).slice(3);
}

/**
 * Zones that IANA renamed but that engines may still report under the old spelling
 * (CLDR keeps the historical identifier as canonical). Both spellings behave
 * identically; the app shows the current IANA name so a zone never appears twice.
 * Only renames are listed, never merges of distinct places.
 * @type {ReadonlyMap<string, string>}
 */
const PREFERRED_ZONE_NAMES = new Map([
  ['Africa/Asmera', 'Africa/Asmara'],
  ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires'],
  ['America/Catamarca', 'America/Argentina/Catamarca'],
  ['America/Cordoba', 'America/Argentina/Cordoba'],
  ['America/Godthab', 'America/Nuuk'],
  ['America/Indianapolis', 'America/Indiana/Indianapolis'],
  ['America/Jujuy', 'America/Argentina/Jujuy'],
  ['America/Louisville', 'America/Kentucky/Louisville'],
  ['America/Mendoza', 'America/Argentina/Mendoza'],
  ['Asia/Ashkhabad', 'Asia/Ashgabat'],
  ['Asia/Calcutta', 'Asia/Kolkata'],
  ['Asia/Dacca', 'Asia/Dhaka'],
  ['Asia/Katmandu', 'Asia/Kathmandu'],
  ['Asia/Macao', 'Asia/Macau'],
  ['Asia/Rangoon', 'Asia/Yangon'],
  ['Asia/Saigon', 'Asia/Ho_Chi_Minh'],
  ['Asia/Thimbu', 'Asia/Thimphu'],
  ['Asia/Ujung_Pandang', 'Asia/Makassar'],
  ['Asia/Ulan_Bator', 'Asia/Ulaanbaatar'],
  ['Atlantic/Faeroe', 'Atlantic/Faroe'],
  ['Europe/Kiev', 'Europe/Kyiv'],
  ['Pacific/Enderbury', 'Pacific/Kanton'],
  ['Pacific/Ponape', 'Pacific/Pohnpei'],
  ['Pacific/Truk', 'Pacific/Chuuk'],
]);

/**
 * The current IANA spelling of a zone, when the engine accepts it; otherwise the input.
 * @param {string} zone
 * @returns {string}
 */
export function preferredZoneName(zone) {
  const preferred = PREFERRED_ZONE_NAMES.get(zone);
  return preferred && isValidZone(preferred) ? preferred : zone;
}

/**
 * IANA zone identifiers known to this engine (current spellings, de-duplicated),
 * sorted. Always includes "UTC".
 * @returns {string[]}
 */
export function listZones() {
  /** @type {string[]} */
  let zones = [];
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      zones = Intl.supportedValuesOf('timeZone');
    } catch {
      zones = [];
    }
  }
  const unique = new Set(zones.map(preferredZoneName));
  unique.add('UTC');
  return [...unique].sort();
}

/**
 * The zone the device is configured for (current spelling), falling back to UTC.
 * @returns {string}
 */
export function getDeviceZone() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidZone(zone) ? preferredZoneName(zone) : 'UTC';
  } catch {
    return 'UTC';
  }
}
