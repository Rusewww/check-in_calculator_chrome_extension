// @ts-check
import '../ui/styles.css';
import './popup.css';
import { mountApp } from '../ui/app.js';
import { createPrefsPort } from '../data/prefs.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

// `npm run dev` serves this same page in a plain browser tab (no chrome.* APIs)
// for fast local iteration outside the load-unpacked-and-reload cycle; fall back
// to plain relative URLs so that keeps working.
const getURL = globalThis.chrome?.runtime?.getURL ?? ((path) => `./${path}`);

const storage = await createPrefsPort();
mountApp(root, {
  dataUrl: getURL('data/airports.json'),
  metaUrl: getURL('data/airports.meta.json'),
  shareBaseUrl: 'https://rusewww.github.io/check-in_calculator/',
  storage,
});
