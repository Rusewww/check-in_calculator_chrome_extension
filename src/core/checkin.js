// @ts-check
/**
 * The calculation: when does online check-in open, and what is the status right now.
 * @module core/checkin
 */
import { addDays, epochToZoned, zonedToEpoch } from './timezone.js';
import { periodToMs } from './period.js';

/** @typedef {'before-open' | 'open' | 'departed'} CheckInStatus */

/**
 * How "N days before departure" is interpreted:
 * - `calendar`: the same local wall-clock time N calendar days earlier at the airport
 *   (differs from N × 24 h only when a daylight-saving change falls inside the window).
 * - `exact`: exactly N × 24 hours earlier.
 * @typedef {'calendar' | 'exact'} DaysMode
 */

/**
 * @typedef {object} Moment
 * @property {number} epochMs
 * @property {import('./timezone.js').ZonedTime} airport  wall clock in the airport's zone
 * @property {import('./timezone.js').ZonedTime} user     wall clock in the user's zone
 * @property {'unique' | 'gap' | 'overlap'} resolution   how the wall-clock input resolved
 */

/**
 * @typedef {object} CheckInResult
 * @property {Moment} departure
 * @property {Moment} opens
 * @property {{ atOpenMinutes: number, atDepartureMinutes: number, changes: boolean }} zoneDifference
 *   user offset minus airport offset (positive = user is ahead), at the two instants
 * @property {CheckInStatus} status
 * @property {number} msUntilOpen        negative once open
 * @property {number} msUntilDeparture   negative once departed
 */

/**
 * @param {object} input
 * @param {import('./timezone.js').WallTime} input.departure  scheduled departure, local time at the airport
 * @param {string} input.airportZone   IANA zone of the departure airport
 * @param {string} input.userZone      IANA zone to show times in
 * @param {import('./period.js').Period} input.period
 * @param {number} input.nowMs
 * @param {DaysMode} [input.daysMode]
 * @returns {CheckInResult}
 */
export function computeCheckIn(input) {
  const { departure, airportZone, userZone, period, nowMs, daysMode = 'calendar' } = input;

  const dep = zonedToEpoch(departure, airportZone, 'compatible');

  let opensMs;
  /** @type {'unique' | 'gap' | 'overlap'} */
  let opensResolution = 'unique';
  if (period.unit === 'days' && daysMode === 'calendar') {
    const departureWall = epochToZoned(dep.epochMs, airportZone);
    const resolved = zonedToEpoch(addDays(departureWall, -period.value), airportZone, 'compatible');
    opensMs = resolved.epochMs;
    opensResolution = resolved.resolution;
  } else {
    opensMs = dep.epochMs - periodToMs(period);
  }

  const departureAirport = epochToZoned(dep.epochMs, airportZone);
  const departureUser = epochToZoned(dep.epochMs, userZone);
  const opensAirport = epochToZoned(opensMs, airportZone);
  const opensUser = epochToZoned(opensMs, userZone);

  const atOpenMinutes = opensUser.offsetMinutes - opensAirport.offsetMinutes;
  const atDepartureMinutes = departureUser.offsetMinutes - departureAirport.offsetMinutes;

  return {
    departure: {
      epochMs: dep.epochMs,
      airport: departureAirport,
      user: departureUser,
      resolution: dep.resolution,
    },
    opens: {
      epochMs: opensMs,
      airport: opensAirport,
      user: opensUser,
      resolution: opensResolution,
    },
    zoneDifference: {
      atOpenMinutes,
      atDepartureMinutes,
      changes: atOpenMinutes !== atDepartureMinutes,
    },
    ...statusAt(nowMs, opensMs, dep.epochMs),
  };
}

/**
 * Status relative to "now". Cheap enough to call every second for a countdown.
 * @param {number} nowMs
 * @param {number} opensMs
 * @param {number} departureMs
 * @returns {{ status: CheckInStatus, msUntilOpen: number, msUntilDeparture: number }}
 */
export function statusAt(nowMs, opensMs, departureMs) {
  /** @type {CheckInStatus} */
  let status;
  if (nowMs < opensMs) status = 'before-open';
  else if (nowMs < departureMs) status = 'open';
  else status = 'departed';
  return { status, msUntilOpen: opensMs - nowMs, msUntilDeparture: departureMs - nowMs };
}

/**
 * Splits a duration (sign ignored) into whole days, hours, minutes and seconds.
 * @param {number} ms
 * @returns {{ days: number, hours: number, minutes: number, seconds: number }}
 */
export function splitDuration(ms) {
  let total = Math.floor(Math.abs(ms) / 1000);
  const days = Math.floor(total / 86_400);
  total -= days * 86_400;
  const hours = Math.floor(total / 3_600);
  total -= hours * 3_600;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  return { days, hours, minutes, seconds };
}
