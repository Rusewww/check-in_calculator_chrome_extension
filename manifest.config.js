// @ts-check
/**
 * The manifest, as one source of truth. `version` is filled in by the build from
 * `package.json` so there is only one place that number lives.
 * @module manifest.config
 */

/**
 * @param {string} version
 * @returns {object}
 */
export function createManifest(version) {
  return {
    manifest_version: 3,
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version,
    minimum_chrome_version: '123',
    default_locale: 'en',
    permissions: ['storage'],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  };
}
