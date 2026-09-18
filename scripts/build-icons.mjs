// @ts-check
/**
 * Rasterises the brand mark (public/favicon.svg) into the PNG sizes the manifest
 * needs, plus the 128x128 Chrome Web Store listing icon (96x96 artwork padded to
 * 128x128, per the store's icon guidelines).
 * @module scripts/build-icons
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
// logo-light.svg (not favicon.svg) — its fills are hard-coded colours, not
// light-dark() CSS custom properties, which the SVG rasteriser cannot resolve.
// It lives outside public/ because, unlike the generated PNGs, it is a build-time
// source asset only — nothing in the shipped popup references it at runtime.
const svgPath = `${root}assets/brand/logo-light.svg`;
const iconsDir = `${root}public/icons`;
// Listing-only asset (§11.5) — not part of the shipped package, so it lives
// outside public/, which is copied verbatim into dist/.
const storeAssetsDir = `${root}store-assets`;

const MANIFEST_SIZES = [16, 32, 48, 128];
const STORE_CANVAS = 128;
const STORE_ART = 96;

async function main() {
  await mkdir(iconsDir, { recursive: true });
  await mkdir(storeAssetsDir, { recursive: true });
  const svg = await readFile(svgPath);

  for (const size of MANIFEST_SIZES) {
    const png = await sharp(svg, { density: (size / 208) * 96 * 4 })
      .resize(size, size)
      .png()
      .toBuffer();
    await writeFile(`${iconsDir}/icon-${size}.png`, png);
    console.log(`wrote icons/icon-${size}.png (${png.byteLength} bytes)`);
  }

  const art = await sharp(svg, { density: (STORE_ART / 208) * 96 * 4 })
    .resize(STORE_ART, STORE_ART)
    .png()
    .toBuffer();
  const storeIcon = await sharp({
    create: {
      width: STORE_CANVAS,
      height: STORE_CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: art, left: (STORE_CANVAS - STORE_ART) / 2, top: (STORE_CANVAS - STORE_ART) / 2 },
    ])
    .png()
    .toBuffer();
  await writeFile(`${storeAssetsDir}/store-icon-128.png`, storeIcon);
  console.log(`wrote store-assets/store-icon-128.png (${storeIcon.byteLength} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
