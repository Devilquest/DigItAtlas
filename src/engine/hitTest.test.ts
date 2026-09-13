import { describe, expect, it } from 'vitest';

import type { Placement } from '../domain/types';
import { hitTest } from './hitTest';
import type { Scene, SceneLayer } from './renderer';

const layer = (id: string, w: number, h: number, placements: Placement[]): SceneLayer => ({
  id,
  image: {} as CanvasImageSource,
  w,
  h,
  placements,
  objects: placements.map(() => ({ label: id })),
});

const sceneOf = (layers: SceneLayer[]): Scene => ({
  size: { w: 1000, h: 1000 },
  terrain: {} as CanvasImageSource,
  overlays: [],
  layers,
});

describe('finding what the pointer is over', () => {
  it('hits an object it falls inside, and misses one it does not', () => {
    const scene = sceneOf([layer('gem-16', 13, 13, [[100, 100]])]);
    expect(hitTest(scene, { x: 105, y: 105 })).toEqual({ layerId: 'gem-16', index: 0 });
    expect(hitTest(scene, { x: 200, y: 200 })).toBeNull();
  });

  it('is inclusive on the near edge and exclusive on the far one', () => {
    const scene = sceneOf([layer('gem-16', 10, 10, [[100, 100]])]);
    expect(hitTest(scene, { x: 100, y: 100 })).not.toBeNull();
    expect(hitTest(scene, { x: 110, y: 100 })).toBeNull();
    expect(hitTest(scene, { x: 109, y: 109 })).not.toBeNull();
  });

  it('picks the placement drawn last where two overlap in the same layer', () => {
    const scene = sceneOf([
      layer('rocker', 20, 20, [
        [100, 100],
        [105, 105],
      ]),
    ]);
    expect(hitTest(scene, { x: 108, y: 108 })).toEqual({ layerId: 'rocker', index: 1 });
  });

  it('picks the layer drawn last where two layers overlap', () => {
    const scene = sceneOf([
      layer('gem-16', 20, 20, [[100, 100]]),
      layer('slugger', 20, 20, [[100, 100]]),
    ]);
    expect(hitTest(scene, { x: 105, y: 105 })).toEqual({ layerId: 'slugger', index: 0 });
  });

  it('misses an object part that lies past the map edge, where it is clipped away', () => {
    const scene = sceneOf([layer('drain', 90, 50, [[960, 400]])]);
    expect(hitTest(scene, { x: 995, y: 420 })).toEqual({ layerId: 'drain', index: 0 });
    expect(hitTest(scene, { x: 1005, y: 420 })).toBeNull();
  });

  it('skips a layer that is not visible', () => {
    const scene = sceneOf([layer('collision-plane', 20, 20, [[100, 100]])]);
    expect(hitTest(scene, { x: 105, y: 105 }, new Set())).toBeNull();
    expect(hitTest(scene, { x: 105, y: 105 }, new Set(['collision-plane']))).not.toBeNull();
  });
});

describe('a layer the pointer passes through', () => {
  const stamp = (id: string, placements: Placement[]): SceneLayer => ({
    ...layer(id, 20, 20, placements),
    hoverable: false,
  });

  it('is never what the pointer finds, even drawn last and over an object', () => {
    const scene = sceneOf([
      layer('moving-platform', 20, 20, [[100, 100]]),
      stamp('collision:moving-platform', [[100, 100]]),
    ]);
    expect(hitTest(scene, { x: 105, y: 105 })).toEqual({ layerId: 'moving-platform', index: 0 });
  });

  it('leaves the pointer finding nothing where it covers nothing else', () => {
    expect(hitTest(sceneOf([stamp('collision:drain', [[100, 100]])]), { x: 105, y: 105 })).toBeNull();
  });
});

describe('a silent layer', () => {
  const label = (id: string, w: number, placements: Placement[]): SceneLayer => ({
    ...layer(id, w, 26, placements),
    silent: true,
  });

  it('yields to a named object it is drawn over, so the marker keeps its own tooltip', () => {
    const scene = sceneOf([
      layer('dig-spot-exit', 34, 38, [[100, 100]]),
      label('tag:substage-2-amber', 136, [[49, 106]]),
    ]);
    expect(hitTest(scene, { x: 110, y: 110 })).toEqual({ layerId: 'dig-spot-exit', index: 0 });
  });

  it('is what the pointer finds where it covers nothing named', () => {
    const scene = sceneOf([
      layer('dig-spot-exit', 34, 38, [[100, 100]]),
      label('tag:substage-2-amber', 136, [[49, 106]]),
    ]);
    expect(hitTest(scene, { x: 60, y: 110 })).toEqual({ layerId: 'tag:substage-2-amber', index: 0 });
  });

  it('is skipped like any other layer when it is not visible', () => {
    const scene = sceneOf([label('tag:bonus-1-green', 96, [[100, 100]])]);
    expect(hitTest(scene, { x: 110, y: 110 }, new Set())).toBeNull();
  });
});
