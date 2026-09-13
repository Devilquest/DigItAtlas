import { describe, expect, it } from 'vitest';

import { nodeKey, nodeOf, substageOf, worldOf } from './mapId';

describe('a map id', () => {
  it('reads as its three numbers', () => {
    expect(worldOf('3-2-1')).toBe(3);
    expect(substageOf('3-2-4')).toBe(4);
    expect(nodeOf('3-2-4')).toBe('3-2');
  });

  it('names its level the same way the level names itself, which is what lets one find the other', () => {
    expect(nodeOf('3-2-1')).toBe(nodeKey({ w: 3, l: 2 }));
    expect(nodeOf('10-11-12')).toBe(nodeKey({ w: 10, l: 11 }));
  });
});
