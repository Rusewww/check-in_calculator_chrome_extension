// @ts-check
/**
 * Departure airport: a search box with inline results while choosing, and a
 * "ticket" (code · name · place, plus the zone chip) once an airport is selected.
 * @module ui/components/AirportSearch
 */
import { h } from '../dom.js';
import { t } from '../strings.js';
import { placeOf } from '../../core/airports.js';
import { formatOffset, offsetAt } from '../../core/timezone.js';

/**
 * @param {HTMLElement} container
 * @param {{ store: import('../store.js').Store<import('../state.js').AppState> }} ctx
 * @returns {() => void} dispose
 */
export function mountAirportSearch(container, { store }) {
  const listId = 'airport-options';
  const input = /** @type {HTMLInputElement} */ (
    h('input', {
      id: 'airport-input',
      type: 'text',
      role: 'combobox',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      placeholder: t('airportPlaceholder'),
      'aria-autocomplete': 'list',
      'aria-expanded': 'false',
      'aria-controls': listId,
      'aria-haspopup': 'listbox',
      disabled: true,
    })
  );
  const hits = h('span', { class: 'hits', hidden: true });
  const searchBox = h('div', { class: 'search' }, input, hits);
  const listbox = h('ul', { id: listId, class: 'results', role: 'listbox', hidden: true });
  const hint = h('p', { class: 'hint', 'aria-live': 'polite' });
  const ticket = h('button', { type: 'button', class: 'ticket', hidden: true });
  const zoneRow = h('div', { class: 'zone-row', hidden: true });

  container.append(
    h('label', { class: 'eyebrow', for: 'airport-input' }, t('airportLabel')),
    searchBox,
    listbox,
    hint,
    ticket,
    zoneRow,
  );

  /** @type {import('../../core/airports.js').Airport[]} */
  let results = [];
  let activeIndex = -1;
  /** True while the user is typing a new airport although one is already selected. */
  let editing = false;
  /** @typedef {'loading' | 'none' | 'hint' | 'no-results'} HintMode */
  /** @type {HintMode} */
  let hintMode = 'loading';

  /**
   * @param {HintMode} mode
   * @param {string} text
   */
  function setHint(mode, text) {
    hintMode = mode;
    hint.textContent = text;
  }

  function renderOptions() {
    listbox.replaceChildren(
      ...results.map((airport, i) =>
        h(
          'li',
          {
            id: `${listId}-${i}`,
            role: 'option',
            class: `result${i === activeIndex ? ' is-active' : ''}`,
            'aria-selected': i === activeIndex ? 'true' : 'false',
            onmousedown: (/** @type {Event} */ event) => {
              event.preventDefault(); // keep focus in the input
              choose(airport);
            },
          },
          h('span', { class: 'result-code' }, airport.iata),
          h(
            'span',
            {},
            h('span', { class: 'result-name' }, airport.name),
            h('span', { class: 'result-place' }, placeOf(airport)),
          ),
        ),
      ),
    );
    const open = results.length > 0;
    listbox.hidden = !open;
    hits.hidden = !open;
    if (open) hits.textContent = t('airportHits', { n: results.length });
    input.setAttribute('aria-expanded', String(open));
    if (open && activeIndex >= 0) {
      input.setAttribute('aria-activedescendant', `${listId}-${activeIndex}`);
      listbox.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function closeList() {
    results = [];
    activeIndex = -1;
    renderOptions();
  }

  /** @param {import('../../core/airports.js').Airport} airport */
  function choose(airport) {
    editing = false;
    input.value = airport.iata;
    closeList();
    setHint('hint', t('airportHint'));
    store.set({ airport, pendingIata: null });
    render(store.get());
  }

  function runSearch() {
    const { data, airport } = store.get();
    if (data.status !== 'ready' || !data.index) return;
    const query = input.value.trim();
    // The previous airport stays selected until a new one is chosen, so Escape or a
    // blur simply returns to the ticket.
    if (airport && query.toUpperCase() !== airport.iata) editing = true;
    results = query ? data.index.search(query, 8) : [];
    activeIndex = results.length > 0 ? 0 : -1;
    renderOptions();
    if (query && results.length === 0) setHint('no-results', t('airportNoResults', { query }));
    else setHint('hint', t('airportHint'));
  }

  function startEditing() {
    const { airport } = store.get();
    editing = true;
    render(store.get());
    input.value = airport ? airport.iata : '';
    input.focus();
    input.select();
    runSearch();
  }

  function stopEditing() {
    editing = false;
    closeList();
    render(store.get());
  }

  ticket.addEventListener('click', startEditing);

  input.addEventListener('input', runSearch);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length === 0) {
        runSearch();
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + delta + results.length) % results.length;
      renderOptions();
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault();
        choose(results[activeIndex]);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (store.get().airport) stopEditing();
      else closeList();
    }
  });
  input.addEventListener('blur', () => {
    const { data, airport } = store.get();
    const code = input.value.trim().toUpperCase();
    if (!airport && data.index && /^[A-Z]{3}$/.test(code)) {
      const exact = data.index.byIata(code);
      if (exact) {
        choose(exact);
        return;
      }
    }
    if (airport) stopEditing();
    else closeList();
  });

  /** @param {import('../state.js').AppState} state */
  function render(state) {
    const ready = state.data.status === 'ready';
    input.disabled = !ready;
    if (state.data.status === 'loading') setHint('loading', t('airportsLoading'));
    else if (state.data.status === 'error') setHint('none', '');
    else if (hintMode === 'loading' || hintMode === 'none') setHint('hint', t('airportHint'));

    const { airport } = state;
    const showTicket = Boolean(airport) && !editing;
    searchBox.hidden = showTicket;
    hint.hidden = showTicket;
    if (showTicket) listbox.hidden = true;
    else renderOptions();
    ticket.hidden = !showTicket;
    zoneRow.hidden = !showTicket;

    if (airport) {
      if (document.activeElement !== input && input.value !== airport.iata) {
        input.value = airport.iata;
      }
      ticket.replaceChildren(
        h('span', { class: 'ticket-code' }, airport.iata),
        h('span', { class: 'ticket-divider', 'aria-hidden': 'true' }),
        h(
          'span',
          { class: 'ticket-text' },
          h('span', { class: 'ticket-name' }, airport.name),
          h('span', { class: 'ticket-place' }, placeOf(airport)),
        ),
        h('span', { class: 'ticket-change' }, t('airportChange')),
      );
      ticket.setAttribute(
        'aria-label',
        `${airport.iata} · ${airport.name} · ${t('airportChange')}`,
      );
      zoneRow.replaceChildren(
        h('span', { class: 'chip-mono' }, airport.tz),
        h('span', { class: 'mono-small' }, formatOffset(offsetAt(Date.now(), airport.tz))),
      );
    }
  }

  const unsubscribe = store.subscribe(render);
  render(store.get());
  return unsubscribe;
}
