import { describe, expect, it } from 'vitest';

import { OPENING, whileLoading } from './showing';
import type { Showing } from './showing';

const shown = { state: 'map' } as Showing;

describe('what is on screen while a map loads', () => {
  it('is the map already drawn, untouched', () => {
    expect(whileLoading(shown)).toBe(shown);
  });

  it('is the loading screen where the visit has not settled a map yet', () => {
    expect(whileLoading(OPENING)).toEqual({ state: 'loading', opening: true });
  });

  it('is a wait inside the window where the last map failed, so one message never covers another', () => {
    expect(whileLoading({ state: 'failed', trouble: 'missing' })).toEqual({
      state: 'loading',
      opening: false,
    });
  });

  it('is a wait inside the window once a map has settled, however that map ended', () => {
    const afterFailure = whileLoading({ state: 'failed', trouble: 'missing' });
    expect(whileLoading(afterFailure)).toEqual({ state: 'loading', opening: false });
  });
});
