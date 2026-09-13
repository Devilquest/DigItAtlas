import { describe, expect, it } from 'vitest';

import type { Placement } from '../domain/types';
import type { Rect, Size, Transform } from './geometry';
import { intersection } from './geometry';
import type { Scene, SceneLayer } from './renderer';
import { draw, drawHover, isOnScreen } from './renderer';

const WINDOW: Size = { w: 1920, h: 1080 };
const SPRITE = { w: 38, h: 36 };

const at = (x: number, y: number): Placement => [x, y];

describe('deciding what is worth drawing', () => {
  it('draws what is inside the window', () => {
    const view: Transform = { zoom: 1, x: 0, y: 0 };
    expect(isOnScreen(at(0, 0), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(true);
    expect(isOnScreen(at(960, 540), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(true);
  });

  it('skips what is past every edge', () => {
    const view: Transform = { zoom: 1, x: 0, y: 0 };
    expect(isOnScreen(at(-100, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
    expect(isOnScreen(at(5000, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
    expect(isOnScreen(at(500, -100), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
    expect(isOnScreen(at(500, 5000), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
  });

  it('draws a sprite hanging over an edge, and skips it once it has cleared it', () => {
    const view: Transform = { zoom: 1, x: 0, y: 0 };
    expect(isOnScreen(at(-SPRITE.w + 1, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(true);
    expect(isOnScreen(at(-SPRITE.w, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
    expect(isOnScreen(at(WINDOW.w - 1, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(true);
    expect(isOnScreen(at(WINDOW.w, 500), SPRITE.w, SPRITE.h, view, WINDOW)).toBe(false);
  });

  it('follows the transform rather than the map coordinates', () => {
    const far = at(9000, 400);
    expect(isOnScreen(far, SPRITE.w, SPRITE.h, { zoom: 1, x: 0, y: 0 }, WINDOW)).toBe(false);
    expect(isOnScreen(far, SPRITE.w, SPRITE.h, { zoom: 1, x: -8500, y: 0 }, WINDOW)).toBe(true);
    expect(isOnScreen(far, SPRITE.w, SPRITE.h, { zoom: 0.1, x: 0, y: 0 }, WINDOW)).toBe(true);
  });

  it('brings a sprite past the right edge back as the map shrinks', () => {
    const right = at(9000, 400);
    expect(isOnScreen(right, SPRITE.w, SPRITE.h, { zoom: 1, x: 0, y: 0 }, WINDOW)).toBe(false);
    expect(isOnScreen(right, SPRITE.w, SPRITE.h, { zoom: 0.2, x: 0, y: 0 }, WINDOW)).toBe(true);
  });

  it('cannot rescue a sprite past the left edge by zooming, because both ends move together', () => {
    const left = at(-SPRITE.w, 500);
    for (const zoom of [0.1, 0.5, 1, 4, 32]) {
      expect(isOnScreen(left, SPRITE.w, SPRITE.h, { zoom, x: 0, y: 0 }, WINDOW), `zoom ${zoom}`).toBe(
        false,
      );
    }
  });
});

/** A canvas context that records image draws after applying the clip region, enough to check clipping. */
class FakeContext {
  imageSmoothingEnabled = false;
  strokeStyle = '';
  lineWidth = 0;
  readonly drawn: Rect[] = [];
  readonly strokes: Rect[] = [];
  private clips: Rect[] = [{ x: -1e6, y: -1e6, w: 2e6, h: 2e6 }];
  private pending: Rect | null = null;

  clearRect() {}
  strokeRect(x: number, y: number, w: number, h: number) {
    this.strokes.push({ x, y, w, h });
  }
  beginPath() {
    this.pending = null;
  }
  rect(x: number, y: number, w: number, h: number) {
    this.pending = { x, y, w, h };
  }
  clip() {
    if (this.pending) this.clips[this.clips.length - 1] = intersection(this.currentClip(), this.pending);
  }
  save() {
    this.clips.push({ ...this.currentClip() });
  }
  restore() {
    this.clips.pop();
  }
  translate() {}
  scale() {}
  drawImage(_image: unknown, x: number, y: number, w: number, h: number) {
    const seen = intersection(this.currentClip(), { x, y, w, h });
    if (seen.w > 0 && seen.h > 0) this.drawn.push(seen);
  }
  private currentClip(): Rect {
    return this.clips[this.clips.length - 1]!;
  }
}

const oneLayer = (placements: Placement[]): SceneLayer => ({
  id: 'drain',
  image: {} as CanvasImageSource,
  w: 90,
  h: 50,
  placements,
  objects: placements.map(() => ({ label: 'drain' })),
});

const sceneOf = (layers: SceneLayer[]): Scene => ({
  size: { w: 1000, h: 800 },
  terrain: {} as CanvasImageSource,
  overlays: [],
  layers,
});

describe('clipping objects to the map', () => {
  const view: Transform = { zoom: 1, x: 0, y: 0 };
  const window: Size = { w: 1920, h: 1080 };

  it('trims a sprite that hangs past the map edge', () => {
    const ctx = new FakeContext();
    draw(ctx as unknown as CanvasRenderingContext2D, sceneOf([oneLayer([[960, 400]])]), view, window);
    const sprite = ctx.drawn.at(-1)!;
    expect(sprite).toEqual({ x: 960, y: 400, w: 40, h: 50 });
  });

  it('leaves a sprite fully inside the map untouched', () => {
    const ctx = new FakeContext();
    draw(ctx as unknown as CanvasRenderingContext2D, sceneOf([oneLayer([[500, 400]])]), view, window);
    expect(ctx.drawn.at(-1)).toEqual({ x: 500, y: 400, w: 90, h: 50 });
  });
});

describe('the hover outline', () => {
  it('strokes the rectangle it is handed, inset half a pixel so the line lands on the grid', () => {
    const ctx = new FakeContext();
    drawHover(ctx as unknown as CanvasRenderingContext2D, { x: 100, y: 50, w: 40, h: 60 }, '#f0f');
    expect(ctx.strokes).toEqual([{ x: 100.5, y: 50.5, w: 39, h: 59 }]);
  });
});

describe('drawing a footprint', () => {
  it('draws a layer the pointer passes through like any other', () => {
    const ctx = new FakeContext();
    const stamp: SceneLayer = { ...oneLayer([[500, 400]]), id: 'collision:drain', hoverable: false };
    draw(ctx as unknown as CanvasRenderingContext2D, sceneOf([stamp]), { zoom: 1, x: 0, y: 0 }, WINDOW, {
      visible: new Set(['collision:drain']),
    });
    expect(ctx.drawn.at(-1)).toEqual({ x: 500, y: 400, w: 90, h: 50 });
  });
});

describe('placing an overlay in the stack', () => {
  const view: Transform = { zoom: 1, x: 0, y: 0 };
  const withOverlay = (overlay: Scene['overlays'][number]): Scene => ({
    ...sceneOf([oneLayer([[500, 400]])]),
    overlays: [overlay],
  });

  it('draws an inFront overlay after every object', () => {
    const ctx = new FakeContext();
    const scene = withOverlay({ id: 'collision', image: {} as CanvasImageSource, inFront: true });
    draw(ctx as unknown as CanvasRenderingContext2D, scene, view, WINDOW, {
      visible: new Set(['collision', 'drain']),
    });
    expect(ctx.drawn.at(-1)).toEqual({ x: 0, y: 0, w: 1000, h: 800 });
  });

  it('keeps a plain overlay under the objects', () => {
    const ctx = new FakeContext();
    const scene = withOverlay({ id: 'path', image: {} as CanvasImageSource });
    draw(ctx as unknown as CanvasRenderingContext2D, scene, view, WINDOW, {
      visible: new Set(['path', 'drain']),
    });
    expect(ctx.drawn.at(-1)).toEqual({ x: 500, y: 400, w: 90, h: 50 });
  });
});

describe('drawing the terrain', () => {
  const view: Transform = { zoom: 1, x: 0, y: 0 };
  const window: Size = { w: 1920, h: 1080 };
  const scene = sceneOf([oneLayer([[500, 400]])]);

  it('draws the map under the objects when nothing says what is visible', () => {
    const ctx = new FakeContext();
    draw(ctx as unknown as CanvasRenderingContext2D, scene, view, window);
    expect(ctx.drawn[0]).toEqual({ x: 0, y: 0, w: 1000, h: 800 });
  });

  it('draws it when its own layer is visible', () => {
    const ctx = new FakeContext();
    draw(ctx as unknown as CanvasRenderingContext2D, scene, view, window, {
      visible: new Set(['terrain', 'drain']),
    });
    expect(ctx.drawn[0]).toEqual({ x: 0, y: 0, w: 1000, h: 800 });
  });

  it('leaves the map out while its layer is off, and still draws the objects over it', () => {
    const ctx = new FakeContext();
    draw(ctx as unknown as CanvasRenderingContext2D, scene, view, window, {
      visible: new Set(['drain']),
    });
    expect(ctx.drawn).toEqual([{ x: 500, y: 400, w: 90, h: 50 }]);
  });
});
