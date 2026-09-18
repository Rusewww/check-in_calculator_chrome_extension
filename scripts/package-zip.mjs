// Excluded from jsconfig.json's typecheck: archiver ships no types, and tsc's
// checkJs would otherwise walk into its (and its dependencies') untyped sources.
/**
 * Zips dist/ into check-in-calculator-<version>.zip for the GitHub Release and the
 * Web Store upload, and enforces the size budget of PRF.md NFR-3 (≤ 3 MB unpacked)
 * so a regression fails the build instead of being caught by memory.
 * @module scripts/package-zip
 */
import { createWriteStream, readFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = `${root}dist`;

const BUDGET_BYTES = 3 * 1024 * 1024;
const FORBIDDEN_EXTENSIONS = new Set(['.map']);
const FORBIDDEN_NAMES = new Set(['node_modules']);

/**
 * @param {string} dir
 * @returns {Promise<Array<{ path: string, size: number }>>}
 */
async function listFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  /** @type {Array<{ path: string, size: number }>} */
  const files = [];
  for (const entry of entries) {
    if (FORBIDDEN_NAMES.has(entry.name)) {
      throw new Error(`Build assertion failed: ${prefix}${entry.name} must not ship in dist/`);
    }
    const relPath = `${prefix}${entry.name}`;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, `${relPath}/`)));
    } else {
      if (FORBIDDEN_EXTENSIONS.has(extname(entry.name))) {
        throw new Error(`Build assertion failed: source map shipped at ${relPath}`);
      }
      const { size } = await stat(fullPath);
      files.push({ path: relPath, size });
    }
  }
  return files;
}

async function main() {
  const files = await listFiles(distDir);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const fontsBytes = files
    .filter((f) => f.path.startsWith('fonts/'))
    .reduce((sum, file) => sum + file.size, 0);
  const iconsBytes = files
    .filter((f) => f.path.startsWith('icons/'))
    .reduce((sum, file) => sum + file.size, 0);
  const datasetBytes = files
    .filter((f) => f.path.startsWith('data/'))
    .reduce((sum, file) => sum + file.size, 0);

  console.log(`dist/: ${files.length} files, ${(totalBytes / 1024).toFixed(0)} KB unpacked`);
  console.log(`  data/  ${(datasetBytes / 1024).toFixed(0)} KB`);
  console.log(`  fonts/ ${(fontsBytes / 1024).toFixed(0)} KB (budget 300 KB)`);
  console.log(`  icons/ ${(iconsBytes / 1024).toFixed(0)} KB (budget 30 KB)`);

  if (totalBytes > BUDGET_BYTES) {
    throw new Error(
      `Size budget exceeded: ${(totalBytes / 1024 / 1024).toFixed(2)} MB unpacked > 3 MB (NFR-3)`,
    );
  }

  const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
  const zipPath = `${root}check-in-calculator-${pkg.version}.zip`;
  await new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    output.on('close', () => resolve(undefined));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
  const zipSize = (await stat(zipPath)).size;
  console.log(`wrote ${zipPath} (${(zipSize / 1024).toFixed(0)} KB)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
