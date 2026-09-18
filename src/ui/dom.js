// @ts-check
/**
 * Tiny DOM helper: `h('button', { class: 'btn', onclick }, 'Label')`.
 * @module ui/dom
 */

/** @typedef {Node | string | number | null | undefined | false} Child */

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [attrs]  `class`, `on*` listeners, boolean attributes, or plain attributes
 * @param {...(Child | Child[])} children
 * @returns {HTMLElement}
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') {
      el.className = String(value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), /** @type {EventListener} */ (value));
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
}
