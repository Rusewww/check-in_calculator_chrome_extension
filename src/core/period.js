// @ts-check
/**
 * The check-in opening window: how long before departure online check-in opens.
 * @module core/period
 */

/** @typedef {'hours' | 'days'} PeriodUnit */
/** @typedef {{ unit: PeriodUnit, value: number }} Period */
/** @typedef {'empty' | 'not-integer' | 'out-of-range'} PeriodError */

/** @type {readonly PeriodUnit[]} */
export const UNITS = Object.freeze(['hours', 'days']);

/** @type {Readonly<Record<PeriodUnit, readonly number[]>>} */
export const PRESETS = Object.freeze({
  hours: Object.freeze([12, 24, 36, 48, 72]),
  days: Object.freeze([3, 5, 7, 10, 30, 60]),
});

/** @type {Readonly<Record<PeriodUnit, { min: number, max: number }>>} */
export const LIMITS = Object.freeze({
  hours: Object.freeze({ min: 1, max: 8760 }),
  days: Object.freeze({ min: 1, max: 365 }),
});

/** @type {Readonly<Record<PeriodUnit, number>>} */
export const DEFAULT_PRESET_BY_UNIT = Object.freeze({ hours: 24, days: 3 });

/** @type {Readonly<Period>} */
export const DEFAULT_PERIOD = Object.freeze({ unit: 'hours', value: 24 });

const UNIT_MS = Object.freeze({ hours: 3_600_000, days: 86_400_000 });

/**
 * @param {unknown} value
 * @returns {value is PeriodUnit}
 */
export function isPeriodUnit(value) {
  return value === 'hours' || value === 'days';
}

/**
 * Validates user input for a custom period value.
 * @param {PeriodUnit} unit
 * @param {string | number} raw
 * @returns {{ ok: true, value: number } | { ok: false, error: PeriodError }}
 */
export function validatePeriodValue(unit, raw) {
  const text = String(raw).trim();
  if (text === '') return { ok: false, error: 'empty' };
  if (!/^\d+$/.test(text)) return { ok: false, error: 'not-integer' };
  const value = Number(text);
  const { min, max } = LIMITS[unit];
  if (value < min || value > max) return { ok: false, error: 'out-of-range' };
  return { ok: true, value };
}

/**
 * @param {Period} period
 * @returns {boolean}
 */
export function isPreset(period) {
  return PRESETS[period.unit].includes(period.value);
}

/**
 * Exact duration of the period in milliseconds (a "day" here is 24 hours).
 * @param {Period} period
 * @returns {number}
 */
export function periodToMs(period) {
  return period.value * UNIT_MS[period.unit];
}

/**
 * Compact form for URLs: "24h", "3d".
 * @param {Period} period
 * @returns {string}
 */
export function serializePeriod(period) {
  return `${period.value}${period.unit === 'hours' ? 'h' : 'd'}`;
}

/**
 * Parses the compact form; returns null for anything invalid or out of range.
 * @param {unknown} text
 * @returns {Period | null}
 */
export function parsePeriod(text) {
  if (typeof text !== 'string') return null;
  const match = /^(\d+)([hd])$/i.exec(text.trim());
  if (!match) return null;
  /** @type {PeriodUnit} */
  const unit = match[2].toLowerCase() === 'h' ? 'hours' : 'days';
  const result = validatePeriodValue(unit, match[1]);
  return result.ok ? { unit, value: result.value } : null;
}
