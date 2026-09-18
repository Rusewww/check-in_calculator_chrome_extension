// @ts-check
/**
 * "Add to calendar": a Google Calendar template link and an iCalendar (.ics) file.
 * All instants are written in UTC, so calendars show them correctly in any zone.
 * @module core/calendar
 */

/**
 * @typedef {object} CalendarEvent
 * @property {string} title
 * @property {string} description  plain text, newlines allowed
 * @property {string} location
 * @property {number} startMs
 * @property {number} endMs
 * @property {string} [url]
 */

export const EVENT_DURATION_MS = 30 * 60_000;

const encoder = new TextEncoder();

/**
 * "20261004T133000Z"
 * @param {number} epochMs
 * @returns {string}
 */
export function formatUtcStamp(epochMs) {
  const d = new Date(epochMs);
  const p2 = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}` +
    `T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`
  );
}

/**
 * Link that opens Google Calendar's "new event" form pre-filled with the event.
 * @param {CalendarEvent} event
 * @param {{ displayZone?: string }} [options]  zone Google Calendar should display the event in
 * @returns {string}
 */
export function googleCalendarUrl(event, options = {}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatUtcStamp(event.startMs)}/${formatUtcStamp(event.endMs)}`,
    details: event.description,
    location: event.location,
  });
  if (options.displayZone) params.set('ctz', options.displayZone);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Escapes a TEXT value per RFC 5545 §3.3.11.
 * @param {string} text
 * @returns {string}
 */
export function escapeIcsText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Folds a content line so no physical line exceeds 75 octets (RFC 5545 §3.1),
 * never splitting a multi-byte character.
 * @param {string} line
 * @returns {string}
 */
export function foldIcsLine(line) {
  const MAX = 75;
  /** @type {string[]} */
  const physical = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > MAX) {
      physical.push(current);
      current = ` ${ch}`;
      bytes = 1 + size;
    } else {
      current += ch;
      bytes += size;
    }
  }
  physical.push(current);
  return physical.join('\r\n');
}

/**
 * Builds a single-event iCalendar document with a display reminder.
 * @param {CalendarEvent} event
 * @param {object} options
 * @param {string} options.uid           stable identifier so re-imports update instead of duplicating
 * @param {number} options.dtstampMs     when the file was generated
 * @param {number} [options.alarmMinutesBefore]  reminder offset; omit or 0 to skip the alarm
 * @param {string} [options.alarmText]
 * @param {string} [options.prodId]
 * @returns {string}
 */
export function buildIcs(event, options) {
  const {
    uid,
    dtstampMs,
    alarmMinutesBefore = 10,
    alarmText = event.title,
    prodId = '-//Check-in Calculator//EN',
  } = options;

  /** @type {string[]} */
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${prodId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtcStamp(dtstampMs)}`,
    `DTSTART:${formatUtcStamp(event.startMs)}`,
    `DTEND:${formatUtcStamp(event.endMs)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
  ];
  if (event.url) lines.push(`URL:${event.url.replace(/[\r\n]/g, '')}`);
  if (alarmMinutesBefore > 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(alarmText)}`,
      `TRIGGER:-PT${Math.round(alarmMinutesBefore)}M`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

/**
 * "check-in-LHR-20261004.ics"
 * @param {string} iata
 * @param {number} startMs
 * @returns {string}
 */
export function icsFileName(iata, startMs) {
  return `check-in-${iata}-${formatUtcStamp(startMs).slice(0, 8)}.ics`;
}
