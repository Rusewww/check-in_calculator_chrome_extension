// Excluded from jsconfig.json's typecheck: subset-font ships no types, and tsc's
// checkJs would otherwise walk into its (and its dependencies') untyped sources.
/**
 * Self-hosts Geist and Geist Mono as woff2 subsets covering Basic Latin, Latin-1
 * Supplement, Latin Extended-A/B, general punctuation and Cyrillic (the interface
 * ships English, Ukrainian and German — NFR-8). Source: the `geist` npm package
 * (Vercel, SIL OFL 1.1), a build-time-only devDependency; nothing is fetched at
 * runtime.
 * @module scripts/build-fonts
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = fileURLToPath(new URL('..', import.meta.url));
const fontsDir = `${root}public/fonts`;
// `geist`'s package.json "exports" only allows importing the JS loaders, not the
// raw font files, so read the ttf files straight out of its installed package
// directory instead of resolving a subpath export.
const geistRoot = `${root}node_modules/geist`;

const RANGES = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1 Supplement
  [0x0100, 0x017f], // Latin Extended-A
  [0x0180, 0x024f], // Latin Extended-B
  [0x2000, 0x206f], // General Punctuation (en/em dash, ellipsis, etc.)
  [0x0400, 0x04ff], // Cyrillic
  [0x0500, 0x052f], // Cyrillic Supplement
];

function subsetText() {
  let text = '';
  for (const [start, end] of RANGES) {
    for (let cp = start; cp <= end; cp++) text += String.fromCodePoint(cp);
  }
  return text;
}

const FACES = [
  { family: 'geist-sans', weight: 400, src: 'geist/dist/fonts/geist-sans/Geist-Regular.ttf' },
  { family: 'geist-sans', weight: 500, src: 'geist/dist/fonts/geist-sans/Geist-Medium.ttf' },
  { family: 'geist-sans', weight: 600, src: 'geist/dist/fonts/geist-sans/Geist-SemiBold.ttf' },
  { family: 'geist-sans', weight: 700, src: 'geist/dist/fonts/geist-sans/Geist-Bold.ttf' },
  { family: 'geist-mono', weight: 400, src: 'geist/dist/fonts/geist-mono/GeistMono-Regular.ttf' },
  { family: 'geist-mono', weight: 500, src: 'geist/dist/fonts/geist-mono/GeistMono-Medium.ttf' },
  { family: 'geist-mono', weight: 600, src: 'geist/dist/fonts/geist-mono/GeistMono-SemiBold.ttf' },
];

async function main() {
  await mkdir(fontsDir, { recursive: true });
  const text = subsetText();

  for (const face of FACES) {
    const inputPath = `${geistRoot}/${face.src.replace(/^geist\//, '')}`;
    const input = await readFile(inputPath);
    const woff2 = await subsetFont(input, text, { targetFormat: 'woff2' });
    const outPath = `${fontsDir}/${face.family}-${face.weight}.woff2`;
    await writeFile(outPath, woff2);
    console.log(`wrote fonts/${face.family}-${face.weight}.woff2 (${woff2.byteLength} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
