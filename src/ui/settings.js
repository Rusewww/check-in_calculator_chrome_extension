// @ts-check
/**
 * User settings: colour theme and UI language. Persisted in localStorage.
 * @module ui/settings
 */
import { DEFAULT_LANGUAGE, isLanguage, languageLocale } from './strings.js';

/** @typedef {'system' | 'light' | 'dark'} Theme */
/** @typedef {{ theme: Theme, language: import('./strings.js').LanguageCode }} Settings */
/** @typedef {Pick<Storage, 'getItem' | 'setItem'>} SettingsStorage */

export const SETTINGS_KEY = 'checkin-calculator.settings';

/** @type {readonly Theme[]} */
export const THEMES = Object.freeze(['system', 'light', 'dark']);

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({ theme: 'system', language: DEFAULT_LANGUAGE });

/**
 * @param {unknown} value
 * @returns {value is Theme}
 */
export function isTheme(value) {
  return THEMES.includes(/** @type {Theme} */ (value));
}

/**
 * @param {SettingsStorage | undefined} [storage]
 * @returns {Settings}
 */
export function loadSettings(storage = globalThis.localStorage) {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return settings;
    const parsed = JSON.parse(raw);
    if (isTheme(parsed?.theme)) settings.theme = parsed.theme;
    if (isLanguage(parsed?.language)) settings.language = parsed.language;
  } catch {
    // Unavailable or corrupted storage: keep defaults.
  }
  return settings;
}

/**
 * @param {Settings} settings
 * @param {SettingsStorage | undefined} [storage]
 */
export function saveSettings(settings, storage = globalThis.localStorage) {
  try {
    storage?.setItem(
      SETTINGS_KEY,
      JSON.stringify({ theme: settings.theme, language: settings.language }),
    );
  } catch {
    // Private mode or quota exceeded: the choice simply is not remembered.
  }
}

/**
 * Applies the theme by stamping `data-theme` on the root element; the stylesheet
 * switches `color-scheme` on it. "system" removes the attribute so the OS setting rules.
 * @param {Theme} theme
 * @param {{ dataset: DOMStringMap }} [root]
 */
export function applyTheme(theme, root = document.documentElement) {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/**
 * Locale for `Intl` formatting. English follows the browser's own English variant
 * (so US users keep US formats) and otherwise uses British conventions; the other
 * languages have a fixed locale.
 * @param {import('./strings.js').LanguageCode} language
 * @param {string | null | undefined} [navigatorLanguage]  pass null for "no browser language"
 * @returns {string}
 */
export function resolveLocale(language, navigatorLanguage = globalThis.navigator?.language) {
  if (language === 'en') {
    return typeof navigatorLanguage === 'string' && /^en(-|$)/i.test(navigatorLanguage)
      ? navigatorLanguage
      : 'en-GB';
  }
  return languageLocale(language);
}
