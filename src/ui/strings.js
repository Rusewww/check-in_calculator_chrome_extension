// @ts-check
/**
 * All user-facing text, in every supported language. Placeholders use `{name}`.
 * A value may be a plural object ({ one, few, many, other }) chosen by the `n` parameter
 * with `Intl.PluralRules` for the active language.
 * @module ui/strings
 */

/** @typedef {'en' | 'uk' | 'de'} LanguageCode */
/** @typedef {string | Partial<Record<Intl.LDMLPluralRule, string>>} StringValue */

/** @type {ReadonlyArray<{ code: LanguageCode, label: string, locale: string }>} */
export const LANGUAGES = Object.freeze([
  { code: 'en', label: 'English', locale: 'en-GB' },
  { code: 'uk', label: 'Українська', locale: 'uk-UA' },
  { code: 'de', label: 'Deutsch', locale: 'de-DE' },
]);

/** @type {LanguageCode} */
export const DEFAULT_LANGUAGE = 'en';

const en = {
  appTitle: 'Check-in Calculator',

  themeGroupLabel: 'Theme',
  themeAuto: 'Auto',
  themeLight: 'Light',
  themeDark: 'Dark',
  languageButton: 'Language',

  airportLabel: 'Departure airport',
  airportPlaceholder: 'IATA code, airport or city, e.g. LHR',
  airportHint: 'Type the 3-letter IATA code or start typing the airport or city name.',
  airportsLoading: 'Loading the airport list…',
  airportNoResults: 'No airports match “{query}”.',
  airportHits: { one: '{n} hit', other: '{n} hits' },
  airportChange: 'Change',
  dataError: 'The airport list could not be loaded. {error}',
  retry: 'Retry',

  departureLabel: 'Scheduled departure',
  departureNote: '— local at the airport',
  dateLabel: 'Date',
  timeLabel: 'Time',
  departureInvalid: 'Enter a valid date and time.',

  periodLabel: 'Opens before',
  tabHours: 'Hours',
  tabDays: 'Days',
  presetsLabel: 'Presets',
  customLabel: 'Custom value',
  customPlaceholder: '20',
  unitHoursShort: 'h',
  unitDaysShort: 'd',
  periodErrorEmpty: 'Enter a number.',
  periodErrorNotInteger: 'Enter a whole number.',
  periodErrorRange: 'Enter a number between {min} and {max}.',

  zoneLabel: 'Times in',
  zoneFollowAirport: 'As airport',
  zoneSelectLabel: 'Your time zone',
  zoneGroupOther: 'Other',

  resultPlaceholder: 'Pick an airport and a departure time to see when check-in opens.',
  bandTitle: 'Online check-in opens',
  statusOpensIn: 'in {countdown}',
  statusOpenNow: 'Open now · opened {ago} ago',
  statusDeparted: 'Departed',
  heroAirportLabel: '{date} · Airport time',
  heroYourLabel: '{date} · Your time · {city}',
  sideAirportLabel: 'Airport time · {iata}',
  airportAhead: '{diff} ahead of you',
  airportBehind: '{diff} behind you',
  diffSame: 'Same offset as you',
  diffChanges:
    'At departure the difference will be {diff}, because a daylight-saving change falls in between.',
  noticeDepartureGap:
    'The departure time you entered does not exist at this airport (clocks jump forward that night). It was moved to {time}.',
  noticeDepartureOverlap:
    'The departure time you entered occurs twice at this airport (clocks go back that night). The first occurrence is used.',
  noticeOpensGap:
    'The opening time falls in a daylight-saving gap at the airport and was moved forward.',
  noticeOpensOverlap:
    'The opening time occurs twice at the airport (clocks go back that night). The first occurrence is used.',
  stubDeparture: 'Departure',
  stubWindow: 'Window',
  windowBefore: '{period} before',
  stubDepartsIn: 'Departs in',
  stubDeparted: 'Departed',

  addToGoogle: 'Add to Google Calendar',
  downloadIcs: '.ics',
  downloadIcsTitle: 'Calendar file for Apple Calendar, Outlook and other apps',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  copyFailed: 'Copy failed. Copy the address bar instead.',

  calendarTitle: 'Online check-in opens · {iata}',
  calendarIntro:
    'Online check-in for your flight from {iata} ({airport}) opens {period} before departure.',
  calendarOpens: 'Check-in opens: {when} · {zone}',
  calendarOpensUser: 'In your time zone: {when} · {zone}',
  calendarDeparture: 'Departure: {when} · {zone}',
  calendarLink: 'Calculated with Check-in Calculator: {link}',
  calendarAlarm: 'Online check-in opens in 10 minutes',

  hoursCount: { one: '{n} hour', other: '{n} hours' },
  hoursAccusative: { one: '{n} hour', other: '{n} hours' },
  daysCount: { one: '{n} day', other: '{n} days' },
  daysAccusative: { one: '{n} day', other: '{n} days' },
  shortDays: '{n} d',
  shortHours: '{n} h',
  shortMinutes: '{n} min',
  lessThanMinute: 'less than a minute',

  footnote:
    'Computed in your browser from its built-in time-zone database. Nothing leaves your device.',
  footerData: 'Airport data: OurAirports (public domain) and mwgg/Airports (MIT).',
  footerDataUpdated: 'Airport list updated: {date}',
  footerSource: 'Source code on GitHub',

  extDescription:
    'Calculates when online check-in opens for a flight and shows it in the airport’s time zone and yours.',
};

/** @typedef {keyof typeof en} StringKey */

/** @type {Record<StringKey, StringValue>} */
const uk = {
  appTitle: 'Калькулятор реєстрації',

  themeGroupLabel: 'Тема',
  themeAuto: 'Авто',
  themeLight: 'Світла',
  themeDark: 'Темна',
  languageButton: 'Мова',

  airportLabel: 'Аеропорт вильоту',
  airportPlaceholder: 'Код IATA, аеропорт або місто, напр. KBP',
  airportHint: 'Введіть трилітерний код IATA або почніть вводити назву аеропорту чи міста.',
  airportsLoading: 'Завантаження списку аеропортів…',
  airportNoResults: 'Немає аеропортів за запитом «{query}».',
  airportHits: { one: '{n} збіг', few: '{n} збіги', many: '{n} збігів', other: '{n} збігу' },
  airportChange: 'Змінити',
  dataError: 'Не вдалося завантажити список аеропортів. {error}',
  retry: 'Повторити',

  departureLabel: 'Запланований виліт',
  departureNote: '— місцевий час аеропорту',
  dateLabel: 'Дата',
  timeLabel: 'Час',
  departureInvalid: 'Введіть коректні дату й час.',

  periodLabel: 'Відкривається за',
  tabHours: 'Години',
  tabDays: 'Дні',
  presetsLabel: 'Готові варіанти',
  customLabel: 'Своє значення',
  customPlaceholder: '20',
  unitHoursShort: 'год',
  unitDaysShort: 'д',
  periodErrorEmpty: 'Введіть число.',
  periodErrorNotInteger: 'Введіть ціле число.',
  periodErrorRange: 'Введіть число від {min} до {max}.',

  zoneLabel: 'Час у поясі',
  zoneFollowAirport: 'Як в аеропорту',
  zoneSelectLabel: 'Ваш часовий пояс',
  zoneGroupOther: 'Інше',

  resultPlaceholder: 'Оберіть аеропорт і час вильоту, щоб побачити, коли відкриється реєстрація.',
  bandTitle: 'Онлайн-реєстрація відкривається',
  statusOpensIn: 'через {countdown}',
  statusOpenNow: 'Відкрито · відкрилася {ago} тому',
  statusDeparted: 'Рейс вилетів',
  heroAirportLabel: '{date} · час аеропорту',
  heroYourLabel: '{date} · ваш час · {city}',
  sideAirportLabel: 'Час аеропорту · {iata}',
  airportAhead: 'на {diff} попереду вас',
  airportBehind: 'на {diff} позаду вас',
  diffSame: 'той самий зсув, що й у вас',
  diffChanges:
    'На момент вильоту різниця становитиме {diff}, бо між цими датами відбувається перехід на літній або зимовий час.',
  noticeDepartureGap:
    'Введеного часу вильоту в цьому аеропорту не існує (тієї ночі годинники переводять уперед). Його перенесено на {time}.',
  noticeDepartureOverlap:
    'Введений час вильоту трапляється в цьому аеропорту двічі (тієї ночі годинники переводять назад). Використано перший варіант.',
  noticeOpensGap:
    'Час відкриття припадає на пропущену під час переходу на літній час годину в аеропорту, тому його зсунуто вперед.',
  noticeOpensOverlap:
    'Час відкриття трапляється в аеропорту двічі (тієї ночі годинники переводять назад). Використано перший варіант.',
  stubDeparture: 'Виліт',
  stubWindow: 'Вікно',
  windowBefore: 'за {period}',
  stubDepartsIn: 'Виліт через',
  stubDeparted: 'Вилетів',

  addToGoogle: 'Додати в Google Календар',
  downloadIcs: '.ics',
  downloadIcsTitle: 'Файл календаря для Apple Calendar, Outlook та інших застосунків',
  copyLink: 'Копіювати посилання',
  linkCopied: 'Посилання скопійовано',
  copyFailed: 'Не вдалося скопіювати. Скопіюйте адресу з адресного рядка.',

  calendarTitle: 'Відкриття онлайн-реєстрації · {iata}',
  calendarIntro:
    'Онлайн-реєстрація на ваш рейс із {iata} ({airport}) відкривається за {period} до вильоту.',
  calendarOpens: 'Реєстрація відкривається: {when} · {zone}',
  calendarOpensUser: 'У вашому часовому поясі: {when} · {zone}',
  calendarDeparture: 'Виліт: {when} · {zone}',
  calendarLink: 'Розраховано за допомогою Калькулятора реєстрації: {link}',
  calendarAlarm: 'Онлайн-реєстрація відкриється за 10 хвилин',

  hoursCount: { one: '{n} година', few: '{n} години', many: '{n} годин', other: '{n} години' },
  hoursAccusative: { one: '{n} годину', few: '{n} години', many: '{n} годин', other: '{n} години' },
  daysCount: { one: '{n} день', few: '{n} дні', many: '{n} днів', other: '{n} дня' },
  daysAccusative: { one: '{n} день', few: '{n} дні', many: '{n} днів', other: '{n} дня' },
  shortDays: '{n} д',
  shortHours: '{n} год',
  shortMinutes: '{n} хв',
  lessThanMinute: 'менше хвилини',

  footnote:
    'Обчислено у вашому браузері за його вбудованою базою часових поясів. Жодні дані не покидають ваш пристрій.',
  footerData: 'Дані про аеропорти: OurAirports (суспільне надбання) та mwgg/Airports (MIT).',
  footerDataUpdated: 'Список аеропортів оновлено: {date}',
  footerSource: 'Вихідний код на GitHub',

  extDescription:
    'Розраховує, коли відкриється онлайн-реєстрація на рейс, і показує це за часом аеропорту та вашим.',
};

/** @type {Record<StringKey, StringValue>} */
const de = {
  appTitle: 'Check-in-Rechner',

  themeGroupLabel: 'Design',
  themeAuto: 'Auto',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  languageButton: 'Sprache',

  airportLabel: 'Abflughafen',
  airportPlaceholder: 'IATA-Code, Flughafen oder Stadt, z. B. FRA',
  airportHint:
    'Geben Sie den dreistelligen IATA-Code ein oder beginnen Sie, den Flughafen- oder Stadtnamen zu tippen.',
  airportsLoading: 'Flughafenliste wird geladen…',
  airportNoResults: 'Keine Flughäfen für „{query}“ gefunden.',
  airportHits: { one: '{n} Treffer', other: '{n} Treffer' },
  airportChange: 'Ändern',
  dataError: 'Die Flughafenliste konnte nicht geladen werden. {error}',
  retry: 'Erneut versuchen',

  departureLabel: 'Planmäßiger Abflug',
  departureNote: '— Ortszeit am Flughafen',
  dateLabel: 'Datum',
  timeLabel: 'Uhrzeit',
  departureInvalid: 'Geben Sie ein gültiges Datum und eine gültige Uhrzeit ein.',

  periodLabel: 'Öffnet vor',
  tabHours: 'Stunden',
  tabDays: 'Tage',
  presetsLabel: 'Voreinstellungen',
  customLabel: 'Eigener Wert',
  customPlaceholder: '20',
  unitHoursShort: 'Std.',
  unitDaysShort: 'T',
  periodErrorEmpty: 'Geben Sie eine Zahl ein.',
  periodErrorNotInteger: 'Geben Sie eine ganze Zahl ein.',
  periodErrorRange: 'Geben Sie eine Zahl zwischen {min} und {max} ein.',

  zoneLabel: 'Zeit in',
  zoneFollowAirport: 'Wie am Flughafen',
  zoneSelectLabel: 'Ihre Zeitzone',
  zoneGroupOther: 'Sonstige',

  resultPlaceholder:
    'Wählen Sie einen Flughafen und eine Abflugzeit, um zu sehen, wann der Check-in öffnet.',
  bandTitle: 'Online-Check-in öffnet',
  statusOpensIn: 'in {countdown}',
  statusOpenNow: 'Jetzt offen · seit {ago}',
  statusDeparted: 'Abgeflogen',
  heroAirportLabel: '{date} · Flughafenzeit',
  heroYourLabel: '{date} · Ihre Zeit · {city}',
  sideAirportLabel: 'Flughafenzeit · {iata}',
  airportAhead: '{diff} vor Ihnen',
  airportBehind: '{diff} hinter Ihnen',
  diffSame: 'Gleicher Versatz wie bei Ihnen',
  diffChanges:
    'Beim Abflug beträgt der Unterschied {diff}, weil dazwischen eine Zeitumstellung liegt.',
  noticeDepartureGap:
    'Die eingegebene Abflugzeit existiert an diesem Flughafen nicht (in dieser Nacht werden die Uhren vorgestellt). Sie wurde auf {time} verschoben.',
  noticeDepartureOverlap:
    'Die eingegebene Abflugzeit kommt an diesem Flughafen zweimal vor (in dieser Nacht werden die Uhren zurückgestellt). Es wird das erste Vorkommen verwendet.',
  noticeOpensGap:
    'Die Öffnungszeit fällt am Flughafen in die Lücke der Zeitumstellung und wurde nach vorn verschoben.',
  noticeOpensOverlap:
    'Die Öffnungszeit kommt am Flughafen zweimal vor (in dieser Nacht werden die Uhren zurückgestellt). Es wird das erste Vorkommen verwendet.',
  stubDeparture: 'Abflug',
  stubWindow: 'Fenster',
  windowBefore: '{period} vorher',
  stubDepartsIn: 'Abflug in',
  stubDeparted: 'Abgeflogen',

  addToGoogle: 'Zu Google Kalender hinzufügen',
  downloadIcs: '.ics',
  downloadIcsTitle: 'Kalenderdatei für Apple Kalender, Outlook und andere Apps',
  copyLink: 'Link kopieren',
  linkCopied: 'Link kopiert',
  copyFailed: 'Kopieren fehlgeschlagen. Kopieren Sie stattdessen die Adresszeile.',

  calendarTitle: 'Online-Check-in öffnet · {iata}',
  calendarIntro:
    'Der Online-Check-in für Ihren Flug ab {iata} ({airport}) öffnet {period} vor Abflug.',
  calendarOpens: 'Check-in öffnet: {when} · {zone}',
  calendarOpensUser: 'In Ihrer Zeitzone: {when} · {zone}',
  calendarDeparture: 'Abflug: {when} · {zone}',
  calendarLink: 'Berechnet mit dem Check-in-Rechner: {link}',
  calendarAlarm: 'Online-Check-in öffnet in 10 Minuten',

  hoursCount: { one: '{n} Stunde', other: '{n} Stunden' },
  hoursAccusative: { one: '{n} Stunde', other: '{n} Stunden' },
  daysCount: { one: '{n} Tag', other: '{n} Tage' },
  daysAccusative: { one: '{n} Tag', other: '{n} Tage' },
  shortDays: '{n} T',
  shortHours: '{n} Std.',
  shortMinutes: '{n} Min.',
  lessThanMinute: 'weniger als eine Minute',

  footnote:
    'In Ihrem Browser mit dessen eingebauter Zeitzonendatenbank berechnet. Keine Daten verlassen Ihr Gerät.',
  footerData: 'Flughafendaten: OurAirports (gemeinfrei) und mwgg/Airports (MIT).',
  footerDataUpdated: 'Flughafenliste aktualisiert: {date}',
  footerSource: 'Quellcode auf GitHub',

  extDescription:
    'Berechnet, wann der Online-Check-in für einen Flug öffnet, in der Zeitzone des Flughafens und Ihrer eigenen.',
};

/** @type {Record<LanguageCode, Record<StringKey, StringValue>>} */
const STRINGS = { en, uk, de };

/** Read-only view of every translation table, for tests and tooling. */
export const STRING_TABLES = /** @type {Readonly<typeof STRINGS>} */ (STRINGS);

/** @type {LanguageCode} */
let currentLanguage = DEFAULT_LANGUAGE;
let pluralRules = new Intl.PluralRules(DEFAULT_LANGUAGE);

/**
 * @param {unknown} code
 * @returns {code is LanguageCode}
 */
export function isLanguage(code) {
  return LANGUAGES.some((language) => language.code === code);
}

/** @returns {LanguageCode} */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Switches the language used by `t()`. Components render text at mount time, so the
 * app re-mounts its UI after calling this.
 * @param {LanguageCode} code
 */
export function setLanguage(code) {
  if (!isLanguage(code)) throw new RangeError(`Unsupported language: ${code}`);
  currentLanguage = code;
  pluralRules = new Intl.PluralRules(code);
}

/**
 * BCP 47 locale associated with a language, for `Intl` date formatting.
 * @param {LanguageCode} code
 * @returns {string}
 */
export function languageLocale(code) {
  const language = LANGUAGES.find((entry) => entry.code === code);
  return language ? language.locale : 'en-GB';
}

/**
 * Looks up a string in the active language (falling back to English), selects the
 * plural form from `params.n` when applicable, and fills `{placeholders}`.
 * @param {StringKey} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const value = STRINGS[currentLanguage][key] ?? en[key];
  if (value === undefined) throw new Error(`Missing string: ${key}`);
  let template;
  if (typeof value === 'string') {
    template = value;
  } else {
    const category = pluralRules.select(Number(params.n));
    template = value[category] ?? value.other ?? Object.values(value)[0] ?? '';
  }
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}
