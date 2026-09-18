// @ts-check
/**
 * Top-bar controls: the Auto / Light / Dark theme switch and the language button
 * (shows the current code, opens a menu of languages).
 * @module ui/components/HeaderControls
 */
import { h } from '../dom.js';
import { LANGUAGES, t } from '../strings.js';
import { THEMES } from '../settings.js';

/** @type {Record<import('../settings.js').Theme, import('../strings.js').StringKey>} */
const THEME_LABEL = { system: 'themeAuto', light: 'themeLight', dark: 'themeDark' };

/**
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {import('../settings.js').Settings} ctx.settings
 * @param {(settings: import('../settings.js').Settings) => void} ctx.onChange
 * @returns {() => void} dispose
 */
export function mountHeaderControls(container, { settings, onChange }) {
  let current = { ...settings };

  const themeButtons = THEMES.map((theme) =>
    h(
      'button',
      {
        type: 'button',
        role: 'radio',
        class: 'seg-btn',
        'aria-checked': String(current.theme === theme),
        onclick: () => {
          current = { ...current, theme };
          THEMES.forEach((value, i) =>
            themeButtons[i].setAttribute('aria-checked', String(value === theme)),
          );
          onChange(current);
        },
      },
      t(THEME_LABEL[theme]),
    ),
  );
  const themeGroup = h(
    'div',
    { class: 'segmented', role: 'radiogroup', 'aria-label': t('themeGroupLabel') },
    themeButtons,
  );

  const menuId = 'language-menu';
  const langButton = h(
    'button',
    {
      type: 'button',
      class: 'lang-btn',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': menuId,
      'aria-label': t('languageButton'),
      title: t('languageButton'),
    },
    current.language.toUpperCase(),
  );
  const items = LANGUAGES.map((language) =>
    h(
      'button',
      {
        type: 'button',
        role: 'menuitemradio',
        class: 'lang-item',
        lang: language.code,
        'aria-checked': String(language.code === current.language),
        onclick: () => {
          closeMenu();
          if (language.code !== current.language) {
            current = { ...current, language: language.code };
            onChange(current);
          }
        },
      },
      h('span', {}, language.label),
      h('span', { class: 'lang-item-code' }, language.code.toUpperCase()),
    ),
  );
  const menu = h(
    'ul',
    { id: menuId, class: 'lang-menu', role: 'menu', hidden: true },
    items.map((item) => h('li', { role: 'none' }, item)),
  );
  const langWrap = h('div', { class: 'lang' }, langButton, menu);

  /** @param {Event} event */
  function onPointerDown(event) {
    if (!(event.target instanceof Node) || !langWrap.contains(event.target)) closeMenu();
  }

  /** @param {KeyboardEvent} event */
  function onKeyDown(event) {
    if (event.key === 'Escape') {
      closeMenu();
      langButton.focus();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const index = items.findIndex((item) => item === document.activeElement);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + delta + items.length) % items.length].focus();
    }
  }

  function openMenu() {
    menu.hidden = false;
    langButton.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    (items.find((item) => item.getAttribute('aria-checked') === 'true') ?? items[0]).focus();
  }

  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    langButton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('keydown', onKeyDown);
  }

  langButton.addEventListener('click', () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  container.append(themeGroup, langWrap);

  return () => {
    closeMenu();
    themeGroup.remove();
    langWrap.remove();
  };
}
