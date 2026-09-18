// @ts-check
/**
 * Scheduled departure: a Date box and a Time box, interpreted in the airport's zone.
 * @module ui/components/DepartureField
 */
import { h } from '../dom.js';
import { t } from '../strings.js';
import { formatDepartureString, parseDepartureString } from '../../core/urlState.js';

/**
 * @param {HTMLElement} container
 * @param {{ store: import('../store.js').Store<import('../state.js').AppState> }} ctx
 * @returns {() => void} dispose
 */
export function mountDepartureField(container, { store }) {
  const date = /** @type {HTMLInputElement} */ (
    h('input', { id: 'departure-date', type: 'date', required: true })
  );
  const time = /** @type {HTMLInputElement} */ (
    h('input', { id: 'departure-time', type: 'time', step: '60', required: true })
  );
  const error = h('p', { class: 'field-error', role: 'alert', hidden: true });

  container.append(
    h(
      'p',
      { class: 'eyebrow' },
      t('departureLabel'),
      ' ',
      h('span', { class: 'eyebrow-note' }, t('departureNote')),
    ),
    h(
      'div',
      { class: 'dt-grid' },
      h(
        'label',
        { class: 'dt-box', for: 'departure-date' },
        h('span', { class: 'dt-label' }, t('dateLabel')),
        date,
      ),
      h(
        'label',
        { class: 'dt-box', for: 'departure-time' },
        h('span', { class: 'dt-label' }, t('timeLabel')),
        time,
      ),
    ),
    error,
  );

  function onChange() {
    if (!date.value || !time.value) {
      store.set({ departure: '' });
      error.hidden = true;
      return;
    }
    // Some browsers include seconds in the time value; the shared format is minute precision.
    const wall = parseDepartureString(`${date.value}T${time.value.slice(0, 5)}`);
    if (wall) {
      store.set({ departure: formatDepartureString(wall) });
      error.hidden = true;
    } else {
      store.set({ departure: '' });
      error.textContent = t('departureInvalid');
      error.hidden = false;
    }
  }

  for (const input of [date, time]) {
    input.addEventListener('input', onChange);
    input.addEventListener('change', onChange);
  }

  /** @param {string} departure */
  function fill(departure) {
    const active = document.activeElement;
    if (active === date || active === time) return;
    const nextDate = departure.slice(0, 10);
    const nextTime = departure.slice(11, 16);
    if (date.value !== nextDate) date.value = nextDate;
    if (time.value !== nextTime) time.value = nextTime;
  }

  const unsubscribe = store.subscribe((state) => fill(state.departure));
  fill(store.get().departure);
  return unsubscribe;
}
