# Privacy policy — Check-in Calculator

> This page belongs on the website's GitHub Pages site (`docs/ARCHITECTURE.md` of
> that repository), not in this one — PRF.md §11.3 requires the Chrome Web Store
> listing to link to a privacy policy page, and the website is where it is hosted.
> This file is the source text to publish there; it is not served by the extension.

_Last updated: 2026-09-18_

## Summary

Check-in Calculator does not collect, transmit, or sell any data. Everything you
type — the airport, the departure date and time, the check-in window, your time
zone — is used only to compute an answer in your browser and is stored only on
your own device, in the extension's local storage. Nothing is sent to us or to
any third party as part of using the extension.

## What is stored, and where

The extension remembers, in `chrome.storage.local` (which never leaves your
device and is never synced by us to any server):

- your chosen theme (Auto / Light / Dark) and interface language,
- the time zone you last chose to display times in,
- the last airport, departure date/time and check-in window you entered, so the
  popup can show your last answer the next time you open it.

You can clear this at any time by removing the extension, or via Chrome's own
"Clear browsing data" for extension storage.

## What is never collected

No accounts, no analytics, no telemetry, no crash reporting, no advertising
identifiers. The extension requests no host permissions and cannot read or
modify the pages you visit.

## The only outbound network requests

Both are actions you take yourself, never automatic:

1. **Add to Google Calendar** opens `calendar.google.com` in a new tab with a
   pre-filled event template. Google's own calendar page is what you see and
   confirm — the extension does not create the event on your behalf, and
   nothing about your flight is sent anywhere except in that one URL you chose
   to open.
2. **Copy link** copies a URL to your clipboard that encodes your current
   inputs (airport, departure, check-in window, time zone) so you can share it
   or open it on the website. Copying is local; nothing is sent until and
   unless you paste that link somewhere yourself.

Downloading a `.ics` calendar file happens entirely on your device — the file is
generated in the popup and handed to Chrome's normal download mechanism.

## Third-party data in the package

The bundled airport dataset is built from OurAirports (public domain) and
mwgg/Airports (MIT); see `THIRD-PARTY-NOTICES.md` in the extension's repository
for full attribution. Using the extension does not query these sources at
runtime — the dataset is static and ships inside the package.

## Changes to this policy

If this policy changes, the "Last updated" date above will change and the new
version will be posted at this same URL.

## Contact

Questions about this policy or the extension's data handling can be raised via
the issue tracker on the project's GitHub repository.
