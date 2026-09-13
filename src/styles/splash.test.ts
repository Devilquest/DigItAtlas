import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const html = read('../../index.html');
const app = read('../App.tsx');
const tokens = read('./tokens.css');
const base = read('./base.css');

/** Every custom property a stylesheet declares, as name and value. */
function declared(css: string): Array<[string, string]> {
  return [...css.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((found) => [found[1]!, found[2]!.trim()]);
}

const valueOf = (css: string, name: string) =>
  declared(css).find(([declaredName]) => declaredName === name)?.[1];

describe('the loading screen inlined in index.html', () => {
  it('repeats the theme, rather than inventing a value the rest of the page does not have', () => {
    const inlined = declared(html);
    expect(inlined.length).toBeGreaterThan(0);
    for (const [name, value] of inlined) {
      expect(valueOf(tokens, name), `--${name}`).toBe(value);
    }
  });

  it('sets the same font the application does, so nothing reflows when the stylesheets arrive', () => {
    const family = /font-family:\s*([^;]+);/.exec(html)?.[1];
    expect(family).toBeDefined();
    expect(base).toContain(family!);
  });

  it('is taken down by the id it is given, which is a coupling nothing else states', () => {
    expect(html).toContain('id="splash"');
    expect(app).toContain(`getElementById('splash')`);
  });

  it('says the loading word the way the application says it, a visit showing the two in a row', () => {
    const caption = /class="loading-caption">([^<]+)</.exec(html)?.[1];
    expect(caption).toBe('Loading…');
    expect(app).toContain('>Loading…<');
  });
});
