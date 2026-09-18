// @ts-check
/**
 * The answer as a boarding pass: status band, hero opening time (airport time and the
 * user's time), perforated tear line, stub with departure / window / countdown,
 * daylight-saving notices, and the calendar actions below.
 * @module ui/components/ResultPanel
 */
import { h } from '../dom.js';
import { t } from '../strings.js';
import { computeCheckIn, statusAt } from '../../core/checkin.js';
import { parseDepartureString } from '../../core/urlState.js';
import {
  EVENT_DURATION_MS,
  buildIcs,
  googleCalendarUrl,
  icsFileName,
} from '../../core/calendar.js';
import { describeAirport } from '../../core/airports.js';
import { effectiveUserZone } from '../state.js';
import {
  formatAgo,
  formatClock,
  formatCountdown,
  formatDateOnly,
  formatDateTime,
  formatIsoInZone,
  formatMinutesDiff,
  formatPeriodText,
  formatShortPeriod,
  formatTimeOnly,
  formatZoneLabel,
  zoneCity,
} from '../format.js';

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {import('../store.js').Store<import('../state.js').AppState>} ctx.store
 * @param {string} ctx.deviceZone
 * @param {string} [ctx.locale]
 * @param {() => string} ctx.getShareUrl
 * @returns {() => void} dispose
 */
export function mountResultPanel(container, { store, deviceZone, locale, getShareUrl }) {
  const placeholder = h('p', { class: 'placeholder' }, t('resultPlaceholder'));
  const pass = h('section', { class: 'pass', 'aria-labelledby': 'pass-title', hidden: true });
  const actions = h('div', { class: 'actions', hidden: true });
  const footnote = h('p', { class: 'footnote', hidden: true }, t('footnote'));
  container.append(placeholder, pass, actions, footnote);

  /** @type {import('../../core/checkin.js').CheckInResult | null} */
  let current = null;
  /** @type {HTMLElement | null} */
  let statusEl = null;
  /** @type {HTMLElement | null} */
  let departsEl = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;

  function stopTimer() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function renderStatus() {
    if (!current || !statusEl || !departsEl) return;
    const s = statusAt(Date.now(), current.opens.epochMs, current.departure.epochMs);
    if (s.status === 'before-open') {
      statusEl.className = 'pill pill-countdown';
      statusEl.textContent = t('statusOpensIn', { countdown: formatCountdown(s.msUntilOpen) });
    } else if (s.status === 'open') {
      statusEl.className = 'pill pill-open';
      statusEl.replaceChildren(
        h('span', { class: 'pill-dot', 'aria-hidden': 'true' }),
        t('statusOpenNow', { ago: formatAgo(-s.msUntilOpen) }),
      );
    } else {
      statusEl.className = 'pill pill-departed';
      statusEl.textContent = t('statusDeparted');
    }
    departsEl.textContent =
      s.status === 'departed' ? t('stubDeparted') : formatCountdown(s.msUntilDeparture);
    if (s.status === 'departed') stopTimer();
  }

  /**
   * @param {import('../state.js').AppState} state
   * @param {import('../../core/checkin.js').CheckInResult} result
   * @param {string} userZone
   */
  function buildEvent(state, result, userZone) {
    const airport = /** @type {import('../../core/airports.js').Airport} */ (state.airport);
    const link = getShareUrl();
    const lines = [
      t('calendarIntro', {
        iata: airport.iata,
        airport: describeAirport(airport),
        period: formatPeriodText(state.period, 'accusative'),
      }),
      '',
      t('calendarOpens', {
        when: formatDateTime(result.opens.epochMs, airport.tz, locale),
        zone: formatZoneLabel(airport.tz, result.opens.airport.offsetMinutes),
      }),
    ];
    if (userZone !== airport.tz) {
      lines.push(
        t('calendarOpensUser', {
          when: formatDateTime(result.opens.epochMs, userZone, locale),
          zone: formatZoneLabel(userZone, result.opens.user.offsetMinutes),
        }),
      );
    }
    lines.push(
      t('calendarDeparture', {
        when: formatDateTime(result.departure.epochMs, airport.tz, locale),
        zone: formatZoneLabel(airport.tz, result.departure.airport.offsetMinutes),
      }),
      '',
      t('calendarLink', { link }),
    );
    return {
      title: t('calendarTitle', { iata: airport.iata }),
      description: lines.join('\n'),
      location: describeAirport(airport),
      startMs: result.opens.epochMs,
      endMs: result.opens.epochMs + EVENT_DURATION_MS,
      url: link,
    };
  }

  /**
   * @param {import('../../core/calendar.js').CalendarEvent} event
   * @param {string} iata
   */
  function downloadIcs(event, iata) {
    const ics = buildIcs(event, {
      uid: `${event.startMs}-${iata}@check-in-calculator`,
      dtstampMs: Date.now(),
      alarmMinutesBefore: 10,
      alarmText: t('calendarAlarm'),
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = h('a', { href: url, download: icsFileName(iata, event.startMs), hidden: true });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  /**
   * @param {string} label
   * @param {string | HTMLElement} value
   */
  function stubCell(label, value) {
    return h(
      'div',
      {},
      h('div', { class: 'stub-label' }, label),
      h('div', { class: 'stub-value' }, value),
    );
  }

  /** @param {import('../state.js').AppState} state */
  function render(state) {
    const departure = state.departure ? parseDepartureString(state.departure) : null;
    if (!state.airport || !departure || state.periodError) {
      current = null;
      statusEl = null;
      departsEl = null;
      stopTimer();
      pass.replaceChildren();
      actions.replaceChildren();
      pass.hidden = true;
      actions.hidden = true;
      footnote.hidden = true;
      placeholder.hidden = false;
      return;
    }

    const airport = state.airport;
    const userZone = effectiveUserZone(state, deviceZone);
    const result = computeCheckIn({
      departure,
      airportZone: airport.tz,
      userZone,
      period: state.period,
      nowMs: Date.now(),
    });
    current = result;
    const sameZone = userZone === airport.tz;

    statusEl = h('span', { class: 'pill', 'aria-live': 'polite' });
    const band = h(
      'div',
      { class: 'pass-band' },
      h('h2', { id: 'pass-title', class: 'pass-band-title' }, t('bandTitle')),
      statusEl,
    );

    // The opening time in the user's own zone is what matters most, so it takes the
    // hero whenever the zones differ; the airport time then moves to the side.
    const heroZone = sameZone ? airport.tz : userZone;
    const heroZoned = sameZone ? result.opens.airport : result.opens.user;
    const heroDate = formatDateOnly(result.opens.epochMs, heroZone, locale, { year: true });
    const heroMain = h(
      'div',
      {},
      h(
        'div',
        { class: 'hero-label hero-date' },
        sameZone
          ? t('heroAirportLabel', { date: heroDate })
          : t('heroYourLabel', { date: heroDate, city: zoneCity(userZone) }),
      ),
      h(
        'time',
        { class: 'hero-time', datetime: formatIsoInZone(heroZoned) },
        formatClock(result.opens.epochMs, heroZone),
      ),
    );

    let heroSide = null;
    if (!sameZone) {
      // zoneDifference is user minus airport: positive means the airport is behind the user.
      const diff = result.zoneDifference.atOpenMinutes;
      const diffText =
        diff > 0
          ? t('airportBehind', { diff: formatMinutesDiff(diff) })
          : diff < 0
            ? t('airportAhead', { diff: formatMinutesDiff(diff) })
            : t('diffSame');
      const sameDay =
        result.opens.user.day === result.opens.airport.day &&
        result.opens.user.month === result.opens.airport.month;
      const note = sameDay
        ? diffText
        : `${formatDateOnly(result.opens.epochMs, airport.tz, locale)} · ${diffText}`;
      heroSide = h(
        'div',
        { class: 'hero-side' },
        h('div', { class: 'hero-label' }, t('sideAirportLabel', { iata: airport.iata })),
        h(
          'time',
          { class: 'hero-side-time', datetime: formatIsoInZone(result.opens.airport) },
          formatClock(result.opens.epochMs, airport.tz),
        ),
        h('div', { class: 'hero-side-note' }, note),
      );
    }

    const tear = h(
      'div',
      { class: 'tear', 'aria-hidden': 'true' },
      h('div', { class: 'tear-line' }),
      h('div', { class: 'tear-notch tear-notch-l' }),
      h('div', { class: 'tear-notch tear-notch-r' }),
    );

    departsEl = h('span', {});
    const stub = h(
      'div',
      { class: 'stub' },
      stubCell(
        t('stubDeparture'),
        h(
          'span',
          {},
          h(
            'span',
            { class: 'stub-part' },
            formatDateOnly(result.departure.epochMs, airport.tz, locale),
          ),
          ' · ',
          h('span', { class: 'stub-part' }, formatClock(result.departure.epochMs, airport.tz)),
        ),
      ),
      stubCell(t('stubWindow'), t('windowBefore', { period: formatShortPeriod(state.period) })),
      stubCell(t('stubDepartsIn'), departsEl),
    );

    /** @type {HTMLElement[]} */
    const notes = [];
    if (!sameZone && result.zoneDifference.changes) {
      const at = result.zoneDifference.atDepartureMinutes;
      const sign = at > 0 ? '+' : at < 0 ? '−' : '';
      notes.push(
        h('p', { class: 'notice' }, t('diffChanges', { diff: `${sign}${formatMinutesDiff(at)}` })),
      );
    }
    if (result.departure.resolution === 'gap') {
      notes.push(
        h(
          'p',
          { class: 'notice' },
          t('noticeDepartureGap', {
            time: formatTimeOnly(result.departure.epochMs, airport.tz, locale),
          }),
        ),
      );
    } else if (result.departure.resolution === 'overlap') {
      notes.push(h('p', { class: 'notice' }, t('noticeDepartureOverlap')));
    }
    if (result.opens.resolution === 'gap') {
      notes.push(h('p', { class: 'notice' }, t('noticeOpensGap')));
    } else if (result.opens.resolution === 'overlap') {
      notes.push(h('p', { class: 'notice' }, t('noticeOpensOverlap')));
    }

    pass.replaceChildren(
      band,
      h('div', { class: 'pass-hero' }, heroMain, heroSide),
      tear,
      stub,
      ...notes,
    );

    const event = buildEvent(state, result, userZone);
    const copyButton = h('button', { type: 'button', class: 'btn' }, t('copyLink'));
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(getShareUrl());
        copyButton.textContent = t('linkCopied');
      } catch {
        copyButton.textContent = t('copyFailed');
      }
      setTimeout(() => {
        copyButton.textContent = t('copyLink');
      }, 2500);
    });
    actions.replaceChildren(
      h(
        'a',
        {
          class: 'btn btn-primary',
          href: googleCalendarUrl(event, { displayZone: userZone }),
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        t('addToGoogle'),
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          title: t('downloadIcsTitle'),
          onclick: () => downloadIcs(event, airport.iata),
        },
        t('downloadIcs'),
      ),
      copyButton,
    );

    pass.hidden = false;
    actions.hidden = false;
    footnote.hidden = false;
    placeholder.hidden = true;

    renderStatus();
    stopTimer();
    timer = setInterval(renderStatus, 1000);
  }

  const unsubscribe = store.subscribe(render);
  render(store.get());
  return () => {
    unsubscribe();
    stopTimer();
  };
}
