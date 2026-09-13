import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

const overlays = [
  { selector: '.goto', css: read('../ui/GoTo/GoTo.css') },
  { selector: '.dialog', css: read('../ui/controls/Dialog.css') },
];

/** The declarations of the rule whose selector is exactly the one given, comments and whitespace aside. */
function declarationsOf(css: string, selector: string): string {
  const rule = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .find((chunk) => chunk.slice(0, chunk.indexOf('{')).trim() === selector);
  expect(rule, selector).toBeDefined();
  return rule!.slice(rule!.indexOf('{') + 1);
}

const declaresDisplay = (declarations: string) => /(^|;)\s*display\s*:/.test(declarations);

describe('the overlays drawn by a dialog element', () => {
  it.each(overlays)(
    '$selector leaves the closed state the browser draws, which is no box at all',
    ({ selector, css }) => {
      expect(declaresDisplay(declarationsOf(css, selector))).toBe(false);
    },
  );

  it('lays the go to map palette out when it opens, which is the other half of that rule', () => {
    expect(declaresDisplay(declarationsOf(read('../ui/GoTo/GoTo.css'), '.goto[open]'))).toBe(true);
  });
});
