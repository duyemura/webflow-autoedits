import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite doesn't resolve .js imports to .ts sources automatically.
// This plugin rewrites them so vitest can find our TypeScript files.
const resolveJsToTs = {
  name: 'resolve-js-to-ts',
  resolveId(source: string, importer: string | undefined) {
    if (!importer || !source.endsWith('.js')) return null;
    if (!source.startsWith('.')) return null;
    const abs = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
    return abs;
  },
};

export default defineConfig({
  plugins: [resolveJsToTs],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/system/**/*.test.ts'],
    setupFiles: ['tests/system/setup.ts'],
  },
});
