// @ts-check
/**
 * Locale-aware display formatting. Zone math lives in core; this only renders.
 * @module ui/format
 */
import { splitDuration } from '../core/checkin.js';
import { formatIsoOffset, formatOffset } from '../core/timezone.js';
import { t } from './strings.js';

/**
 * "Sun, 4 Oct 2026, 14:30" in the given zone and locale.
 * @param {number} epochMs
 * @param {string} zone
 * @param {string} [locale]
 * @returns {string}
 */
export function formatDateTime(epochMs, zone, locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(epochMs);
}

/**
 * "Sun 4 Oct" or, with `year`, "Sun 4 Oct 2026".
 * @param {number} epochMs
 * @param {string} zone
 * @param {string} [locale]
 * @param {{ year?: boolean }} [options]
 * @returns {string}
 */
export function formatDateOnly(epochMs, zone, locale, options = {}) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(options.year ? { year: 'numeric' } : {}),
  }).format(epochMs);
}

/**
 * "14:30" (or "2:30 PM" in 12-hour locales).
 * @param {number} epochMs
 * @param {string} zone
 * @param {string} [locale]
 * @returns {string}
 */
export function formatTimeOnly(epochMs, zone, locale) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(epochMs);
}

/**
 * Always "14:30": a 24-hour, zero-padded clock, as on departure boards, in any locale.
 * @param {number} epochMs
 * @param {string} zone
 * @returns {string}
 */
export function formatClock(epochMs, zone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(epochMs);
}

/**
 * ISO 8601 with offset for `<time datetime>`: "2026-10-04T14:30:00+01:00".
 * @param {import('../core/timezone.js').ZonedTime} zoned
 * @returns {string}
 */
export function formatIsoInZone(zoned) {
  const p2 = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return (
    `${String(zoned.year).padStart(4, '0')}-${p2(zoned.month)}-${p2(zoned.day)}` +
    `T${p2(zoned.hour)}:${p2(zoned.minute)}:${p2(zoned.second)}${formatIsoOffset(zoned.offsetMinutes)}`
  );
}

/**
 * "America/New York"
 * @param {string} zone
 * @returns {string}
 */
export function zoneDisplayName(zone) {
  return zone.replace(/_/g, ' ');
}

/**
 * The place part of a zone identifier: "Europe/Kyiv" → "Kyiv", "America/New_York" → "New York".
 * @param {string} zone
 * @returns {string}
 */
export function zoneCity(zone) {
  const segment = zone.split('/').pop() ?? zone;
  return segment.replace(/_/g, ' ');
}

/**
 * "Europe/Kyiv (UTC+03:00)"
 * @param {string} zone
 * @param {number} offsetMinutes
 * @returns {string}
 */
export function formatZoneLabel(zone, offsetMinutes) {
  return `${zoneDisplayName(zone)} (${formatOffset(offsetMinutes)})`;
}

/**
 * "2 h", "5 h 30 min", "45 min", "0 min" (sign ignored), in the active language.
 * @param {number} minutes
 * @returns {string}
 */
export function formatMinutesDiff(minutes) {
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  /** @type {string[]} */
  const parts = [];
  if (hours > 0) parts.push(t('shortHours', { n: hours }));
  if (rest > 0 || hours === 0) parts.push(t('shortMinutes', { n: rest }));
  return parts.join(' ');
}

/**
 * "2 d 04:12:09" or "04:12:09".
 * @param {number} ms
 * @returns {string}
 */
export function formatCountdown(ms) {
  const d = splitDuration(ms);
  const p2 = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const clock = `${p2(d.hours)}:${p2(d.minutes)}:${p2(d.seconds)}`;
  return d.days > 0 ? `${t('shortDays', { n: d.days })} ${clock}` : clock;
}

/**
 * Coarse elapsed time: "2 d 4 h", "3 h 12 min", "12 min", "less than a minute".
 * @param {number} ms
 * @returns {string}
 */
export function formatAgo(ms) {
  const d = splitDuration(ms);
  if (d.days > 0) return `${t('shortDays', { n: d.days })} ${t('shortHours', { n: d.hours })}`;
  if (d.hours > 0)
    return `${t('shortHours', { n: d.hours })} ${t('shortMinutes', { n: d.minutes })}`;
  if (d.minutes > 0) return t('shortMinutes', { n: d.minutes });
  return t('lessThanMinute');
}

/**
 * "24 hours", "1 day", "30 days". The accusative form is for "opens {period} before
 * departure" phrases in languages that inflect (Ukrainian "за 1 годину").
 * @param {import('../core/period.js').Period} period
 * @param {'nominative' | 'accusative'} [form]
 * @returns {string}
 */
export function formatPeriodText(period, form = 'nominative') {
  const accusative = form === 'accusative';
  const key =
    period.unit === 'hours'
      ? accusative
        ? 'hoursAccusative'
        : 'hoursCount'
      : accusative
        ? 'daysAccusative'
        : 'daysCount';
  return t(key, { n: period.value });
}

/**
 * "24 h", "3 d": the compact form used on the boarding-pass stub.
 * @param {import('../core/period.js').Period} period
 * @returns {string}
 */
export function formatShortPeriod(period) {
  return period.unit === 'hours'
    ? t('shortHours', { n: period.value })
    : t('shortDays', { n: period.value });
}
