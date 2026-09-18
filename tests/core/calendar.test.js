import { describe, expect, it } from 'vitest';
import {
  EVENT_DURATION_MS,
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  formatUtcStamp,
  googleCalendarUrl,
  icsFileName,
} from '../../src/core/calendar.js';

const START = Date.UTC(2026, 9, 4, 13, 30);
const EVENT = {
  title: 'Online check-in opens · LHR',
  description:
    'Check-in opens: Sun, 4 Oct 2026, 14:30 (Europe/London)\nDeparture: Mon, 5 Oct; 14:30, gate A1',
  location: 'London Heathrow Airport, London, England, United Kingdom',
  startMs: START,
  endMs: START + EVENT_DURATION_MS,
  url: 'https://example.test/?apt=LHR&dep=2026-10-05T14%3A30&per=24h',
};

describe('formatUtcStamp', () => {
  it('writes basic ISO 8601 in UTC', () => {
    expect(formatUtcStamp(START)).toBe('20261004T133000Z');
    expect(formatUtcStamp(Date.UTC(2026, 0, 1, 0, 0, 5))).toBe('20260101T000005Z');
  });
});

describe('googleCalendarUrl', () => {
  it('builds a template link with UTC dates and the display zone', () => {
    const url = new URL(googleCalendarUrl(EVENT, { displayZone: 'Europe/Kyiv' }));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe(EVENT.title);
    expect(url.searchParams.get('dates')).toBe('20261004T133000Z/20261004T140000Z');
    expect(url.searchParams.get('details')).toBe(EVENT.description);
    expect(url.searchParams.get('location')).toBe(EVENT.location);
    expect(url.searchParams.get('ctz')).toBe('Europe/Kyiv');
  });
  it('omits ctz when no display zone is given', () => {
    expect(new URL(googleCalendarUrl(EVENT)).searchParams.has('ctz')).toBe(false);
  });
});

describe('escapeIcsText / foldIcsLine', () => {
  it('escapes backslashes, newlines, semicolons and commas', () => {
    expect(escapeIcsText('a\\b; c, d\r\ne\nf')).toBe('a\\\\b\\; c\\, d\\ne\\nf');
  });
  it('folds long lines at 75 octets without splitting multi-byte characters', () => {
    const line = 'DESCRIPTION:' + 'Zürich '.repeat(30);
    const folded = foldIcsLine(line);
    const physical = folded.split('\r\n');
    expect(physical.length).toBeGreaterThan(1);
    for (const p of physical) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    for (const p of physical.slice(1)) expect(p.startsWith(' ')).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });
  it('leaves short lines alone', () => {
    expect(foldIcsLine('BEGIN:VEVENT')).toBe('BEGIN:VEVENT');
  });
});

describe('buildIcs', () => {
  const ics = buildIcs(EVENT, {
    uid: `${START}-LHR@check-in-calculator`,
    dtstampMs: Date.UTC(2026, 8, 13, 12, 0),
    alarmMinutesBefore: 10,
    alarmText: 'Online check-in opens in 10 minutes',
  });
  const unfolded = ics.replace(/\r\n[ \t]/g, '');
  const lines = unfolded.split('\r\n');

  it('uses CRLF line endings only', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
  it('contains a well-formed calendar with one event and an alarm', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('BEGIN:VEVENT');
    expect(lines).toContain(`UID:${START}-LHR@check-in-calculator`);
    expect(lines).toContain('DTSTAMP:20260913T120000Z');
    expect(lines).toContain('DTSTART:20261004T133000Z');
    expect(lines).toContain('DTEND:20261004T140000Z');
    expect(lines).toContain('SUMMARY:Online check-in opens · LHR');
    expect(lines).toContain(
      'DESCRIPTION:Check-in opens: Sun\\, 4 Oct 2026\\, 14:30 (Europe/London)\\nDeparture: Mon\\, 5 Oct\\; 14:30\\, gate A1',
    );
    expect(lines).toContain(
      'LOCATION:London Heathrow Airport\\, London\\, England\\, United Kingdom',
    );
    expect(lines).toContain(`URL:${EVENT.url}`);
    expect(lines).toContain('TRIGGER:-PT10M');
    expect(lines).toContain('DESCRIPTION:Online check-in opens in 10 minutes');
    expect(lines.filter((l) => l === 'END:VEVENT')).toHaveLength(1);
    expect(lines[lines.length - 2]).toBe('END:VCALENDAR');
  });
  it('keeps every physical line within 75 octets', () => {
    for (const physical of ics.split('\r\n')) {
      expect(new TextEncoder().encode(physical).length).toBeLessThanOrEqual(75);
    }
  });
  it('omits the alarm when disabled', () => {
    const noAlarm = buildIcs(EVENT, { uid: 'x', dtstampMs: 0, alarmMinutesBefore: 0 });
    expect(noAlarm).not.toContain('VALARM');
  });
});

describe('icsFileName', () => {
  it('uses the code and the UTC date', () => {
    expect(icsFileName('LHR', START)).toBe('check-in-LHR-20261004.ics');
  });
});
