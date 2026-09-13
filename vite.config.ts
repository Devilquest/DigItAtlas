import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const catalogPath = fileURLToPath(new URL('./public/data/catalog.json', import.meta.url));
const packagePath = fileURLToPath(new URL('./package.json', import.meta.url));

/** Reads the identifier the export stamped into the data, so that every data request can carry it. */
function dataBuild(): string {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as { build?: { id?: string } };
  const id = catalog.build?.id;
  if (!id) {
    throw new Error('public/data/catalog.json carries no build id, so exported data could be served stale');
  }
  return id;
}

/** Reads the application's own version, so that the one the About box states is the one declared. */
function appVersion(): string {
  const declared = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
  if (!declared.version) {
    throw new Error('package.json carries no version, which the About box states');
  }
  return declared.version;
}

export default defineConfig({
  // The site is published under a repository subpath, not at the root of a domain.
  base: '/DigItAtlas/',
  plugins: [react()],
  define: { __DATA_BUILD__: JSON.stringify(dataBuild()), __APP_VERSION__: JSON.stringify(appVersion()) },
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
