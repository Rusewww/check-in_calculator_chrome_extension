// @ts-check
/**
 * Shareable links: the parts of the app state that travel in the query string.
 * Example: ?apt=LHR&dep=2026-10-05T14:30&per=24h&tz=Europe/Kyiv
 * @module core/urlState
 */
import { parsePeriod, serializePeriod } from './period.js';
import { isValidWallTime, isValidZone, preferredZoneName } from './timezone.js';

/**
 * @typedef {object} SharedState
 * @property {string} [iata]
 * @property {string} [departure]  "YYYY-MM-DDTHH:mm", local time at the airport
 * @property {import('./period.js').Period} [period]
 * @property {string} [userZone]
 */

export const PARAM = Object.freeze({ airport: 'apt', departure: 'dep', period: 'per', zone: 'tz' });

const DEPARTURE_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Parses "YYYY-MM-DDTHH:mm" (the value format of `<input type="datetime-local">`).
 * @param {unknown} text
 * @returns {import('./timezone.js').WallTime | null}
 */
export function parseDepartureString(text) {
  if (typeof text !== 'string') return null;
  const match = DEPARTURE_RE.exec(text);
  if (!match) return null;
  const wall = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: 0,
  };
  return isValidWallTime(wall) ? wall : null;
}

/**
 * @param {import('./timezone.js').WallTime} wall
 * @returns {string} "YYYY-MM-DDTHH:mm"
 */
export function formatDepartureString(wall) {
  const p2 = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return `${String(wall.year).padStart(4, '0')}-${p2(wall.month)}-${p2(wall.day)}T${p2(wall.hour ?? 0)}:${p2(wall.minute ?? 0)}`;
}

/**
 * Reads the shareable state from a query string, silently dropping invalid values.
 * @param {string | URLSearchParams} search
 * @returns {SharedState}
 */
export function parseSharedState(search) {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  /** @type {SharedState} */
  const state = {};

  const iata = (params.get(PARAM.airport) ?? '').trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(iata)) state.iata = iata;

  const departure = params.get(PARAM.departure);
  if (departure && parseDepartureString(departure)) state.departure = departure;

  const period = parsePeriod(params.get(PARAM.period));
  if (period) state.period = period;

  const zone = params.get(PARAM.zone);
  if (zone && isValidZone(zone)) state.userZone = preferredZoneName(zone);

  return state;
}

/**
 * Builds the query string ("?apt=…" or "" when nothing is set).
 * @param {SharedState} state
 * @returns {string}
 */
export function buildQueryString(state) {
  const params = new URLSearchParams();
  if (state.iata) params.set(PARAM.airport, state.iata);
  if (state.departure) params.set(PARAM.departure, state.departure);
  if (state.period) params.set(PARAM.period, serializePeriod(state.period));
  if (state.userZone) params.set(PARAM.zone, state.userZone);
  const text = params.toString();
  return text ? `?${text}` : '';
}
