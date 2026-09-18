// @ts-check
/**
 * The brand mark: a paper plane on a rounded tile. Colours come from the theme tokens
 * (`--logo-bg`, `--logo-plane`, `--logo-fold` in styles.css), so the light theme shows the
 * white plane on the dark-violet tile and the dark theme the dark plane on the
 * light-violet tile. Standalone copies live in public/logo-light.svg and public/logo-dark.svg.
 * @module ui/logo
 */

/** Geometry shared by every rendering of the mark (viewBox 0 0 208 208). */
export const LOGO_SHAPES =
  '<rect width="208" height="208" rx="56" fill="var(--logo-bg)"/>' +
  '<g clip-path="url(#logo-tile)">' +
  '<polygon points="22,131 300,4 128,157" fill="var(--logo-plane)"/>' +
  '<polygon points="128,157 300,4 340,80 200,249" fill="var(--logo-fold)"/>' +
  '</g>';

export const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 208" aria-hidden="true" focusable="false">' +
  '<defs><clipPath id="logo-tile"><rect width="208" height="208" rx="56"/></clipPath></defs>' +
  LOGO_SHAPES +
  '</svg>';
