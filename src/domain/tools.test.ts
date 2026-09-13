import { describe, expect, it } from 'vitest';

import { AUTHOR, AUTHOR_PROFILE, DIGIT_TOOLS, HEADER_END, HEADER_LEAD } from './tools';

describe('the tool list', () => {
  it('reads as one sentence around the author, whatever the link does to it', () => {
    expect(HEADER_LEAD + AUTHOR + HEADER_END).toBe(
      'Free, unofficial tools for Dig It!, all made by Devilquest.',
    );
  });

  it('names every tool, in the agreed order', () => {
    expect(DIGIT_TOOLS.map((tool) => tool.name)).toEqual([
      'Dig It! Explorer',
      'Dig It! Atlas',
      'Dig It! Patcher',
    ]);
  });

  it('says of each what it is, what it does and where it lives', () => {
    for (const tool of DIGIT_TOOLS) {
      expect(tool.name.trim()).not.toBe('');
      expect(tool.kind.trim()).not.toBe('');
      expect(tool.summary.trim()).not.toBe('');
      expect(() => new URL(tool.url)).not.toThrow();
    }
  });

  it('sends every row to its own tool rather than to a placeholder', () => {
    for (const tool of DIGIT_TOOLS) {
      expect(tool.url).not.toBe(AUTHOR_PROFILE);
    }

    expect(new Set(DIGIT_TOOLS.map((tool) => tool.url)).size).toBe(DIGIT_TOOLS.length);
  });

  it('marks exactly one row as the application showing the dialog', () => {
    const here = DIGIT_TOOLS.filter((tool) => tool.isThisApp);

    expect(here.map((tool) => tool.name)).toEqual(['Dig It! Atlas']);
  });

  // The dialog is a signpost, so a summary says what a tool does and never how good it is.
  it('sells nothing', () => {
    for (const tool of DIGIT_TOOLS) {
      for (const word of ['best', 'easy', 'powerful', 'simply', 'ultimate']) {
        expect(tool.summary.toLowerCase()).not.toContain(word);
      }
    }
  });
});
