/// <reference types="vitest/config" />
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { createManifest } from './manifest.config.js';
import { STRING_TABLES, LANGUAGES } from './src/ui/strings.js';

const root = import.meta.dirname;
const outDir = resolve(root, 'dist');

/**
 * Writes `dist/manifest.json` (version from package.json) and `dist/_locales/*`
 * (name + description, generated from `src/ui/strings.js` so the two never drift),
 * then asserts the build guarantees this project depends on rather than remembers:
 * no inline `<script>` in the emitted HTML, and only relative asset paths.
 */
function writeManifestPlugin() {
  return {
    name: 'write-manifest',
    closeBundle() {
      const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
      const manifest = createManifest(pkg.version);
      writeFileSync(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      for (const { code } of LANGUAGES) {
        const dir = resolve(outDir, '_locales', code);
        mkdirSync(dir, { recursive: true });
        const messages = {
          extName: { message: 'Check-in Calculator' },
          extDescription: { message: STRING_TABLES[code].extDescription },
        };
        writeFileSync(resolve(dir, 'messages.json'), JSON.stringify(messages, null, 2));
      }

      const html = readFileSync(resolve(outDir, 'popup.html'), 'utf8');
      if (/<script(?![^>]*\bsrc=)[^>]*>[^<]/.test(html)) {
        throw new Error(
          'Build assertion failed: inline <script> in popup.html (MV3 CSP blocks it)',
        );
      }
      const absoluteAsset = html.match(/(?:src|href)="\/(?!\/)[^"]*"/);
      if (absoluteAsset) {
        throw new Error(
          `Build assertion failed: absolute asset path ${absoluteAsset[0]} (must be relative for chrome-extension:// pages)`,
        );
      }
    },
  };
}

export default defineConfig({
  root: resolve(root, 'src/extension'),
  publicDir: resolve(root, 'public'),
  base: './',
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: { input: { popup: resolve(root, 'src/extension/popup.html') } },
  },
  plugins: [writeManifestPlugin()],
  test: {
    // Vitest otherwise inherits the build's `root` (src/extension) above, and
    // would search there for tests instead of the project's tests/ directory.
    root,
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
