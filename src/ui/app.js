// @ts-check
/**
 * Assembles the application: top bar, inputs panel, result column, data loading,
 * URL sync and user settings (theme, language). Used by the website entry point and,
 * later, by the Chrome extension popup.
 * @module ui/app
 */
import { h } from './dom.js';
import { setLanguage, t } from './strings.js';
import { createStore } from './store.js';
import {
  createInitialState,
  loadLastInput,
  loadZonePreference,
  saveLastInput,
  saveZonePreference,
  toLastInput,
} from './state.js';
import { applyTheme, loadSettings, resolveLocale, saveSettings } from './settings.js';
import { getDeviceZone, listZones } from '../core/timezone.js';
import { buildQueryString } from '../core/urlState.js';
import { createAirportIndex } from '../core/airports.js';
import { loadAirportDataset, loadDatasetMeta } from '../data/airportSource.js';
import { mountAirportSearch } from './components/AirportSearch.js';
import { mountDepartureField } from './components/DepartureField.js';
import { mountPeriodPicker } from './components/PeriodPicker.js';
import { mountTimeZoneSelect } from './components/TimeZoneSelect.js';
import { mountResultPanel } from './components/ResultPanel.js';
import { mountHeaderControls } from './components/HeaderControls.js';
import { LOGO_SVG } from './logo.js';

/**
 * @param {HTMLElement} root
 * @param {object} options
 * @param {string} options.dataUrl   URL of airports.json
 * @param {string} [options.metaUrl] URL of airports.meta.json
 * @param {string} [options.repoUrl]
 * @param {string} [options.shareBaseUrl] base URL "Copy link" builds on (FR-8.3);
 *   the popup has no address bar of its own (FR-9.4), so links always point at
 *   the website.
 * @param {import('./state.js').PreferenceStorage} [options.storage] preferences
 *   port (chrome.storage.local behind a synchronous cache); defaults to
 *   `localStorage` for local development previews.
 * @returns {import('./store.js').Store<import('./state.js').AppState>}
 */
export function mountApp(root, options) {
  const deviceZone = getDeviceZone();
  const zones = listZones();
  const storage = options.storage;
  const shareBaseUrl = options.shareBaseUrl ?? 'https://rusewww.github.io/check-in_calculator/';
  const restored = loadLastInput(storage);
  const store = createStore(
    createInitialState({ restored, pref: loadZonePreference(storage), deviceZone }),
  );

  let settings = loadSettings(storage);
  applyTheme(settings.theme);
  setLanguage(settings.language);

  /** @type {Date | null} */
  let dataGenerated = null;
  /** @type {() => void} */
  let renderDataUpdated = () => {};
  /** @type {Array<() => void>} */
  let disposers = [];

  /**
   * Builds the UI on top of the store. Called once, and again after a language change
   * because components render their text when they mount.
   */
  function renderShell() {
    for (const dispose of disposers) dispose();
    disposers = [];
    root.replaceChildren();

    document.documentElement.lang = settings.language;
    document.title = t('appTitle');
    const locale = resolveLocale(settings.language);

    const controls = h('div', { class: 'topbar-controls' });
    const banner = h('div', { class: 'banner', role: 'alert', hidden: true });
    const airportSection = h('div', { class: 'section' });
    const departureSection = h('div', { class: 'section' });
    const periodSection = h('div', { class: 'section' });
    const zoneSection = h('div', { class: 'section section--divided' });
    const resultCol = h('div', { class: 'result-col' });
    const dataUpdated = h('p', { hidden: true });
    const brandMark = h('span', { class: 'brand-mark', 'aria-hidden': 'true' });
    brandMark.innerHTML = LOGO_SVG; // static markup from logo.js, no user data

    root.append(
      h(
        'div',
        { class: 'app' },
        h(
          'header',
          { class: 'topbar' },
          h('h1', { class: 'brand' }, brandMark, t('appTitle')),
          controls,
        ),
        banner,
        h(
          'main',
          { class: 'layout' },
          h(
            'form',
            {
              class: 'panel',
              novalidate: true,
              onsubmit: (/** @type {Event} */ event) => event.preventDefault(),
            },
            airportSection,
            departureSection,
            periodSection,
            zoneSection,
          ),
          resultCol,
        ),
        h(
          'footer',
          { class: 'app-footer' },
          h('p', {}, t('footerData')),
          dataUpdated,
          options.repoUrl
            ? h('p', {}, h('a', { href: options.repoUrl, rel: 'noopener' }, t('footerSource')))
            : null,
        ),
      ),
    );

    /** @param {import('./state.js').AppState} state */
    function renderBanner(state) {
      if (state.data.status === 'error') {
        banner.replaceChildren(
          h('span', {}, t('dataError', { error: state.data.error ?? '' })),
          h('button', { type: 'button', class: 'btn', onclick: () => loadData() }, t('retry')),
        );
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
    }

    /** @param {import('./state.js').AppState} state */
    function renderDimming(state) {
      // The rest of the form waits, visually, until an airport is chosen.
      for (const section of [departureSection, periodSection, zoneSection]) {
        section.classList.toggle('is-dimmed', !state.airport);
      }
    }

    renderDataUpdated = () => {
      if (!dataGenerated) return;
      dataUpdated.textContent = t('footerDataUpdated', {
        date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(dataGenerated),
      });
      dataUpdated.hidden = false;
    };

    disposers.push(
      mountHeaderControls(controls, { settings, onChange: updateSettings }),
      mountAirportSearch(airportSection, { store }),
      mountDepartureField(departureSection, { store }),
      mountPeriodPicker(periodSection, { store }),
      mountTimeZoneSelect(zoneSection, { store, zones, deviceZone }),
      mountResultPanel(resultCol, {
        store,
        deviceZone,
        locale,
        getShareUrl,
      }),
      store.subscribe(renderBanner),
      store.subscribe(renderDimming),
    );
    renderBanner(store.get());
    renderDimming(store.get());
    renderDataUpdated();
  }

  /** @param {import('./settings.js').Settings} next */
  function updateSettings(next) {
    const languageChanged = next.language !== settings.language;
    settings = next;
    saveSettings(settings, storage);
    applyTheme(settings.theme);
    if (languageChanged) {
      setLanguage(settings.language);
      renderShell();
    }
  }

  /**
   * The website URL "Copy link" and the calendar description point at (FR-8.3,
   * FR-8.4) — built fresh from the current state, since the popup has no address
   * bar of its own to keep in sync (FR-9.4).
   */
  function getShareUrl() {
    const state = store.get();
    return (
      shareBaseUrl +
      buildQueryString({
        iata: state.airport?.iata ?? state.pendingIata ?? undefined,
        departure: state.departure || undefined,
        period: state.periodError ? undefined : state.period,
        userZone: state.followAirportZone ? undefined : state.userZone,
      })
    );
  }

  async function loadData() {
    store.set({ data: { status: 'loading', index: null, error: null } });
    try {
      const airports = await loadAirportDataset(options.dataUrl);
      const index = createAirportIndex(airports);
      store.set((state) => ({
        data: { status: 'ready', index, error: null },
        airport: state.airport ?? (state.pendingIata ? index.byIata(state.pendingIata) : null),
        pendingIata: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      store.set({ data: { status: 'error', index: null, error: message } });
    }
  }

  renderShell();

  store.subscribe((state) => {
    saveLastInput(toLastInput(state), storage);
    saveZonePreference(state, storage);
  });

  loadData();

  if (options.metaUrl) {
    loadDatasetMeta(options.metaUrl).then((meta) => {
      const generated =
        meta && typeof meta.generated === 'string' ? new Date(meta.generated) : null;
      if (generated && !Number.isNaN(generated.getTime())) {
        dataGenerated = generated;
        renderDataUpdated();
      }
    });
  }

  return store;
}
