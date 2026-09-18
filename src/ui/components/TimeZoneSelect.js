// @ts-check
/**
 * "Show times in": follows the airport's zone by default, or any IANA zone.
 * @module ui/components/TimeZoneSelect
 */
import { h } from '../dom.js';
import { t } from '../strings.js';
import { formatOffset, isValidZone, offsetAt } from '../../core/timezone.js';
import { zoneDisplayName } from '../format.js';
import { effectiveUserZone } from '../state.js';

/**
 * @param {HTMLElement} container
 * @param {{ store: import('../store.js').Store<import('../state.js').AppState>, zones: string[], deviceZone: string }} ctx
 * @returns {() => void} dispose
 */
export function mountTimeZoneSelect(container, { store, zones, deviceZone }) {
  const follow = /** @type {HTMLInputElement} */ (
    h('input', { id: 'zone-follow', type: 'checkbox' })
  );
  const followText = h('span', {}, t('zoneFollowAirport'));
  const select = /** @type {HTMLSelectElement} */ (
    h('select', { id: 'zone-select', class: 'input', 'aria-label': t('zoneSelectLabel') })
  );

  container.append(
    h('label', { class: 'eyebrow', for: 'zone-select' }, t('zoneLabel')),
    select,
    h('label', { class: 'checkbox-row', for: 'zone-follow' }, follow, followText),
  );

  const now = Date.now();
  /** @type {Map<string, HTMLOptGroupElement>} */
  const groups = new Map();
  /** @type {Set<string>} */
  const known = new Set();

  /** @param {string} zone */
  function addOption(zone) {
    if (known.has(zone) || !isValidZone(zone)) return;
    known.add(zone);
    const region = zone.includes('/') ? zone.slice(0, zone.indexOf('/')) : 'Other';
    let group = groups.get(region);
    if (!group) {
      group = /** @type {HTMLOptGroupElement} */ (
        h('optgroup', { label: region === 'Other' ? t('zoneGroupOther') : region })
      );
      groups.set(region, group);
      const after = [...groups.keys()].sort().indexOf(region) + 1;
      const next = [...groups.keys()].sort()[after];
      select.insertBefore(group, next ? (groups.get(next) ?? null) : null);
    }
    const option = /** @type {HTMLOptionElement} */ (
      h(
        'option',
        { value: zone },
        `${zoneDisplayName(zone)} (${formatOffset(offsetAt(now, zone))})`,
      )
    );
    const siblings = [...group.children];
    const before = siblings.find((o) => /** @type {HTMLOptionElement} */ (o).value > zone);
    group.insertBefore(option, before ?? null);
  }

  for (const zone of zones) addOption(zone);
  addOption(deviceZone);

  follow.addEventListener('change', () => {
    store.set((state) => ({
      followAirportZone: follow.checked,
      // When switching to manual, start from the zone currently shown.
      userZone: follow.checked ? state.userZone : effectiveUserZone(state, deviceZone),
    }));
  });
  select.addEventListener('change', () => {
    store.set({ userZone: select.value, followAirportZone: false });
  });

  /** @param {import('../state.js').AppState} state */
  function render(state) {
    const zone = effectiveUserZone(state, deviceZone);
    addOption(zone);
    select.value = zone;
    select.disabled = state.followAirportZone;
    follow.checked = state.followAirportZone;
  }

  const unsubscribe = store.subscribe(render);
  render(store.get());
  return unsubscribe;
}
