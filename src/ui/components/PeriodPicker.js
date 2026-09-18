// @ts-check
/**
 * Check-in window picker: Hours/Days switch, a row of preset buttons and an inline
 * custom-value box.
 * @module ui/components/PeriodPicker
 */
import { h } from '../dom.js';
import { t } from '../strings.js';
import { LIMITS, PRESETS, UNITS } from '../../core/period.js';
import { applyCustomInput, applyPeriodUnit, applyPreset } from '../state.js';

/** @type {Record<import('../../core/period.js').PeriodError, (unit: import('../../core/period.js').PeriodUnit) => string>} */
const ERROR_TEXT = {
  empty: () => t('periodErrorEmpty'),
  'not-integer': () => t('periodErrorNotInteger'),
  'out-of-range': (unit) => t('periodErrorRange', { min: LIMITS[unit].min, max: LIMITS[unit].max }),
};

/**
 * @param {HTMLElement} container
 * @param {{ store: import('../store.js').Store<import('../state.js').AppState> }} ctx
 * @returns {() => void} dispose
 */
export function mountPeriodPicker(container, { store }) {
  const tabs = UNITS.map((unit) =>
    h(
      'button',
      {
        type: 'button',
        role: 'tab',
        id: `period-tab-${unit}`,
        class: 'seg-btn',
        'aria-selected': 'false',
        'aria-controls': 'period-panel',
        onclick: () => store.set((state) => applyPeriodUnit(state, unit)),
      },
      t(unit === 'hours' ? 'tabHours' : 'tabDays'),
    ),
  );
  const tablist = h(
    'div',
    { class: 'segmented', role: 'tablist', 'aria-label': t('periodLabel') },
    tabs,
  );
  const custom = /** @type {HTMLInputElement} */ (
    h('input', {
      id: 'period-custom',
      type: 'number',
      inputmode: 'numeric',
      min: '1',
      step: '1',
      placeholder: t('customPlaceholder'),
      'aria-label': t('customLabel'),
      'aria-describedby': 'period-error',
    })
  );
  const unit = h('span', { class: 'custom-unit' });
  const customBox = h('label', { class: 'custom-box', for: 'period-custom' }, custom, unit);
  const presets = h('div', { class: 'presets', role: 'group', 'aria-label': t('presetsLabel') });
  const error = h('p', { id: 'period-error', class: 'field-error', role: 'alert', hidden: true });
  const panel = h(
    'div',
    { id: 'period-panel', role: 'tabpanel', 'aria-labelledby': 'period-tab-hours' },
    presets,
    error,
  );

  container.append(
    h('div', { class: 'section-head' }, h('p', { class: 'eyebrow' }, t('periodLabel')), tablist),
    panel,
  );

  custom.addEventListener('input', () => {
    store.set((state) => applyCustomInput(state, custom.value));
  });

  /** @param {import('../state.js').AppState} state */
  function render(state) {
    const activeUnit = state.period.unit;
    for (const tab of tabs) {
      const selected = tab.id === `period-tab-${activeUnit}`;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', `period-tab-${activeUnit}`);

    presets.replaceChildren(
      ...PRESETS[activeUnit].map((value) =>
        h(
          'button',
          {
            type: 'button',
            class: 'preset',
            'aria-pressed': String(!state.periodError && state.period.value === value),
            'aria-label': `${value} ${t(activeUnit === 'hours' ? 'unitHoursShort' : 'unitDaysShort')}`,
            onclick: () => store.set((s) => applyPreset(s, value)),
          },
          String(value),
        ),
      ),
      customBox,
    );

    custom.max = String(LIMITS[activeUnit].max);
    if (document.activeElement !== custom && custom.value !== state.customInput[activeUnit]) {
      custom.value = state.customInput[activeUnit];
    }
    unit.textContent = t(activeUnit === 'hours' ? 'unitHoursShort' : 'unitDaysShort');

    if (state.periodError) {
      error.textContent = ERROR_TEXT[state.periodError](activeUnit);
      error.hidden = false;
      custom.setAttribute('aria-invalid', 'true');
    } else {
      error.hidden = true;
      custom.removeAttribute('aria-invalid');
    }
  }

  tablist.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = UNITS.indexOf(store.get().period.unit);
    const next =
      UNITS[(current + (event.key === 'ArrowRight' ? 1 : -1) + UNITS.length) % UNITS.length];
    store.set((state) => applyPeriodUnit(state, next));
    tabs[UNITS.indexOf(next)].focus();
  });

  const unsubscribe = store.subscribe(render);
  render(store.get());
  return unsubscribe;
}
