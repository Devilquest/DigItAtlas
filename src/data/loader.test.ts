import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { Catalog, Level } from '../domain/types';
import { levelScene } from './loader';
import type { Pictures } from './loader';

const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));
const read = <T>(path: string): T => JSON.parse(readFileSync(join(DATA, path), 'utf8')) as T;

const catalog = read<Catalog>('catalog.json');
const level151 = read<Level>('levels/1-5-1.json');

const dummyPicture = {} as HTMLImageElement;
const pictures: Pictures = [dummyPicture, dummyPicture];

describe('levelScene', () => {
  it('omits navigation route and marks tooltip for exits looping to the same level', () => {
    const sprites = new Map<string, HTMLImageElement>([['dig-spot-exit-w1h.webp', dummyPicture]]);
    const tags = new Map<string, HTMLImageElement>([
      ['substage-1-gray.webp', dummyPicture],
      ['substage-2-amber.webp', dummyPicture],
      ['level-complete-red.webp', dummyPicture],
    ]);

    const scene = levelScene(level151, pictures, catalog, sprites, tags);

    const exitLayer = scene.layers.find((layer) => layer.id === 'dig-spot-exit')!;
    expect(exitLayer).toBeDefined();

    // In 1-5-1, the exit at [22, 352] loops back to 1-5-1 (Substage 1).
    const loopIndex = exitLayer.placements.findIndex(([x, y]) => x === 22 && y === 352);
    expect(loopIndex).toBeGreaterThanOrEqual(0);
    const loopObject = exitLayer.objects[loopIndex]!;
    expect(loopObject.goesTo).toBe('Substage 1 (this level)');
    expect(loopObject.to).toBeUndefined();

    // The exit at [1318, 347] leads to 1-5-3 (Substage 2).
    const navIndex = exitLayer.placements.findIndex(([x, y]) => x === 1318 && y === 347);
    expect(navIndex).toBeGreaterThanOrEqual(0);
    const navObject = exitLayer.objects[navIndex]!;
    expect(navObject.goesTo).toBe('Substage 2');
    expect(navObject.to).toEqual({ kind: 'level', id: '1-5-3' });

    // The exit at [139, 57] completes the level (leads to world map).
    const completeIndex = exitLayer.placements.findIndex(([x, y]) => x === 139 && y === 57);
    expect(completeIndex).toBeGreaterThanOrEqual(0);
    const completeObject = exitLayer.objects[completeIndex]!;
    expect(completeObject.goesTo).toBe('World Map');
    expect(completeObject.to).toEqual({ kind: 'world', n: 1 });

    // In the overlay tags:
    // substage-1-gray tags loop back to the same level, carry no destination route, and omit spatial bounds.
    const grayTagLayer = scene.layers.find((layer) => layer.id === 'tag:substage-1-gray')!;
    expect(grayTagLayer).toBeDefined();
    expect(grayTagLayer.spatial).toBe(false);
    for (const obj of grayTagLayer.objects) {
      expect(obj.label).toBe('Exit Destination Info');
      expect(obj.goesTo).toBe('Substage 1 (this level)');
      expect(obj.to).toBeUndefined();
    }

    const amberTagLayer = scene.layers.find((layer) => layer.id === 'tag:substage-2-amber')!;
    expect(amberTagLayer).toBeDefined();
    expect(amberTagLayer.spatial).toBe(false);
    expect(amberTagLayer.objects[0]?.label).toBe('Exit Destination Info');
    expect(amberTagLayer.objects[0]?.goesTo).toBe('Substage 2');
    expect(amberTagLayer.objects[0]?.to).toEqual({ kind: 'level', id: '1-5-3' });

    const redTagLayer = scene.layers.find((layer) => layer.id === 'tag:level-complete-red')!;
    expect(redTagLayer).toBeDefined();
    expect(redTagLayer.spatial).toBe(false);
    expect(redTagLayer.objects[0]?.label).toBe('Exit Destination Info');
    expect(redTagLayer.objects[0]?.goesTo).toBe('World Map');
    expect(redTagLayer.objects[0]?.to).toEqual({ kind: 'world', n: 1 });
  });

  it('names bonus destination overlays and marks them as non-spatial', () => {
    const level154 = read<Level>('levels/1-5-4.json');
    const tags = new Map<string, HTMLImageElement>([
      ['bonus-1-green.webp', dummyPicture],
      ['substage-2-amber.webp', dummyPicture],
      ['substage-3-gray.webp', dummyPicture],
    ]);

    const scene = levelScene(level154, pictures, catalog, new Map(), tags);

    const bonusTagLayer = scene.layers.find((layer) => layer.id === 'tag:bonus-1-green')!;
    expect(bonusTagLayer).toBeDefined();
    expect(bonusTagLayer.spatial).toBe(false);
    expect(bonusTagLayer.objects[0]?.label).toBe('Bonus Destination Info');
    expect(bonusTagLayer.objects[0]?.goesTo).toBe('Bonus 1');
    expect(bonusTagLayer.objects[0]?.to).toEqual({ kind: 'level', id: '1-5-2' });
  });
});
