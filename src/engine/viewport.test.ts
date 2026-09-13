import { describe, expect, it } from 'vitest';

import { drawnRect, overlap, toMap, toScreen, visibleRect, windowRect } from './geometry';
import type { Size, Transform } from './geometry';
import {
  MAX_ZOOM,
  MIN_OVERLAP,
  MIN_ZOOM,
  ZOOM_STEP,
  actualSize,
  canZoom,
  centerOn,
  clampPan,
  fit,
  frameActualSize,
  panBy,
  zoomAt,
  zoomByNotches,
  zoomCenteredOn,
} from './viewport';

const WINDOW: Size = { w: 1920, h: 1080 };

/** The overlap the rule requires, with 250 written out so the expectation cannot move with the value. */
const required = (drawn: number, windowSize: number) => Math.min(250, drawn, windowSize);

/** Asserts that a transform leaves map and window overlapping by at least what the rule asks. */
function expectLegal(view: Transform, map: Size, window: Size) {
  const seen = overlap(drawnRect(view, map), windowRect(window));
  expect(seen.w + 1e-9, `horizontal overlap of ${JSON.stringify(view)}`).toBeGreaterThanOrEqual(
    required(map.w * view.zoom, window.w),
  );
  expect(seen.h + 1e-9, `vertical overlap of ${JSON.stringify(view)}`).toBeGreaterThanOrEqual(
    required(map.h * view.zoom, window.h),
  );
}

/** Every relation a map can have to the window on one axis: far bigger, bigger, smaller, tiny. */
const MAPS: Array<[string, Size]> = [
  ['far wider than the window', { w: 12000, h: 900 }],
  ['a little larger both ways', { w: 2000, h: 1200 }],
  ['smaller both ways', { w: 800, h: 500 }],
  ['smaller than the overlap itself', { w: 80, h: 40 }],
  ['taller than wide', { w: 300, h: 4000 }],
  ['exactly the window', { w: 1920, h: 1080 }],
];

describe('the panning clamp', () => {
  it.each(MAPS)('holds a map %s inside the window however far it is dragged', (_name, map) => {
    for (const dx of [-1e6, -5000, -1, 0, 1, 5000, 1e6]) {
      for (const dy of [-1e6, -3000, 0, 3000, 1e6]) {
        for (const zoom of [MIN_ZOOM, 0.5, 1, 4, MAX_ZOOM]) {
          expectLegal(panBy({ zoom, x: 0, y: 0 }, dx, dy, map, WINDOW), map, WINDOW);
        }
      }
    }
  });

  it('leaves a legal transform untouched', () => {
    const map = MAPS[1]![1];
    const view: Transform = { zoom: 1, x: -40, y: -60 };
    expect(clampPan(view, map, WINDOW)).toEqual(view);
  });

  it('stops a large map with exactly the overlap showing', () => {
    const map: Size = { w: 12000, h: 900 };
    const pushed = panBy({ zoom: 1, x: 0, y: 0 }, 1e6, 0, map, WINDOW);
    expect(pushed.x).toBe(WINDOW.w - 250);
    expect(overlap(drawnRect(pushed, map), windowRect(WINDOW)).w).toBe(250);
    expect(panBy({ zoom: 1, x: 0, y: 0 }, -1e6, 0, map, WINDOW).x).toBe(250 - map.w);
  });

  it('is the 250 px the design fixes', () => {
    expect(MIN_OVERLAP).toBe(250);
  });

  it('keeps a map smaller than the overlap wholly inside', () => {
    const map: Size = { w: 80, h: 40 };
    for (const dx of [-1e6, 1e6]) {
      const pushed = panBy({ zoom: 1, x: 0, y: 0 }, dx, 0, map, WINDOW);
      expect(overlap(drawnRect(pushed, map), windowRect(WINDOW)).w).toBe(map.w);
    }
  });

  it('lets a map smaller than the overlap reach either edge of the window', () => {
    const map: Size = { w: 80, h: 40 };
    expect(panBy({ zoom: 1, x: 0, y: 0 }, -1e6, 0, map, WINDOW).x).toBe(0);
    expect(panBy({ zoom: 1, x: 0, y: 0 }, 1e6, 0, map, WINDOW).x).toBe(WINDOW.w - map.w);
  });

  it('keeps a small map fully visible in a window narrower than the overlap', () => {
    const window: Size = { w: 100, h: 90 };
    const map: Size = { w: 80, h: 40 };
    for (const dx of [-1e6, 1e6]) {
      const pushed = panBy({ zoom: 1, x: 0, y: 0 }, dx, 0, map, window);
      expect(overlap(drawnRect(pushed, map), windowRect(window)).w).toBe(map.w);
    }
  });

  it('holds the map over a window narrower than the overlap', () => {
    const window: Size = { w: 100, h: 90 };
    const map: Size = { w: 12000, h: 900 };
    for (const dx of [-1e6, 1e6]) {
      const pushed = panBy({ zoom: 1, x: 0, y: 0 }, dx, 0, map, window);
      expect(overlap(drawnRect(pushed, map), windowRect(window)).w).toBe(window.w);
    }
  });
});

describe('the zoom ladder', () => {
  const map = { w: 2000, h: 1200 };

  it('is the 10 percent to 3200 percent range, in notches of 1.25x, that the Explorer uses', () => {
    expect([MIN_ZOOM, MAX_ZOOM, ZOOM_STEP]).toEqual([0.1, 32, 1.25]);
  });

  it('moves one notch of 1.25x per step', () => {
    const view = zoomByNotches({ zoom: 1, x: 0, y: 0 }, 1, { x: 0, y: 0 }, map, WINDOW);
    expect(view.zoom).toBeCloseTo(1.25, 10);
    expect(zoomByNotches(view, -1, { x: 0, y: 0 }, map, WINDOW).zoom).toBeCloseTo(1, 10);
    expect(zoomByNotches(view, 2, { x: 0, y: 0 }, map, WINDOW).zoom).toBeCloseTo(1.953125, 10);
  });

  it('stops at the ends rather than passing them', () => {
    const inward = zoomByNotches({ zoom: 1, x: 0, y: 0 }, 100, { x: 0, y: 0 }, map, WINDOW);
    const outward = zoomByNotches({ zoom: 1, x: 0, y: 0 }, -100, { x: 0, y: 0 }, map, WINDOW);
    expect(inward.zoom).toBe(32);
    expect(outward.zoom).toBe(0.1);
    expect(canZoom(inward.zoom, 1)).toBe(false);
    expect(canZoom(outward.zoom, -1)).toBe(false);
    expect(canZoom(inward.zoom, -1)).toBe(true);
  });

  it('takes an absolute zoom, anchored the same way', () => {
    const anchor = { x: 900, y: 500 };
    const view: Transform = { zoom: 1, x: -200, y: -100 };
    const held = toMap(view, anchor);
    const zoomed = zoomAt(view, 8, anchor, map, WINDOW);
    expect(zoomed.zoom).toBe(8);
    expect(toScreen(zoomed, held).x).toBeCloseTo(anchor.x, 6);
    expect(zoomAt(view, 1000, anchor, map, WINDOW).zoom).toBe(32);
  });

  it('keeps the map pixel under the pointer under the pointer', () => {
    const anchor = { x: 640, y: 400 };
    let view: Transform = { zoom: 1, x: -300, y: -120 };
    const held = toMap(view, anchor);
    for (const notches of [1, 1, -1, 3, -2]) {
      view = zoomByNotches(view, notches, anchor, map, WINDOW);
      const drawn = toScreen(view, held);
      expect(drawn.x).toBeCloseTo(anchor.x, 6);
      expect(drawn.y).toBeCloseTo(anchor.y, 6);
    }
  });

  it('anchors on a pointer that is off the map, and still lands somewhere legal', () => {
    const anchor = { x: -500, y: 1800 };
    const view = zoomByNotches({ zoom: 1, x: 0, y: 0 }, 4, anchor, map, WINDOW);
    expectLegal(view, map, WINDOW);
  });

  it.each(MAPS)('never leaves a map %s illegally placed, at any zoom', (_name, map) => {
    let view = fit(map, WINDOW);
    for (const notches of [1, 1, 1, 1, 1, -1, -1, 8, -20, 40]) {
      view = zoomByNotches(view, notches, { x: 1900, y: 1060 }, map, WINDOW);
      expectLegal(view, map, WINDOW);
    }
  });
});

describe('fit', () => {
  it.each(MAPS)('frames the whole of a map %s, centered', (_name, map) => {
    const view = fit(map, WINDOW);
    expect(map.w * view.zoom).toBeLessThanOrEqual(WINDOW.w + 1e-9);
    expect(map.h * view.zoom).toBeLessThanOrEqual(WINDOW.h + 1e-9);
    expect(view.x).toBeCloseTo((WINDOW.w - map.w * view.zoom) / 2, 6);
    expect(view.y).toBeCloseTo((WINDOW.h - map.h * view.zoom) / 2, 6);
  });

  it('touches the tighter axis exactly', () => {
    const view = fit({ w: 12000, h: 900 }, WINDOW);
    expect(12000 * view.zoom).toBeCloseTo(WINDOW.w, 6);
  });

  it('will not zoom in past the limit for a map too small to fill the window', () => {
    const view = fit({ w: 20, h: 12 }, WINDOW);
    expect(view.zoom).toBe(32);
  });

  it('will not zoom out past the limit for a map too large to frame', () => {
    const map = { w: 1_000_000, h: 1000 };
    const view = fit(map, WINDOW);
    expect(view.zoom).toBe(0.1);
    expectLegal(view, map, WINDOW);
  });
});

describe('1:1', () => {
  it('draws at actual size', () => {
    expect(actualSize({ zoom: 7, x: 0, y: 0 }, { w: 2000, h: 1200 }, WINDOW).zoom).toBe(1);
  });

  it('keeps what the middle of the window was showing', () => {
    const map = { w: 12000, h: 900 };
    const view: Transform = { zoom: 4, x: -8000, y: -1200 };
    const middle = { x: WINDOW.w / 2, y: WINDOW.h / 2 };
    const held = toMap(view, middle);
    const shown = toScreen(actualSize(view, map, WINDOW), held);
    expect(shown.x).toBeCloseTo(middle.x, 6);
    expect(shown.y).toBeCloseTo(middle.y, 6);
  });
});

describe('framing a fresh map at actual size', () => {
  it('sets zoom to 1 and centers the map', () => {
    const map = { w: 2000, h: 1200 };
    const view = frameActualSize(map, WINDOW);
    expect(view.zoom).toBe(1);
    expect(view.x).toBeCloseTo((WINDOW.w - map.w) / 2, 6);
    expect(view.y).toBeCloseTo((WINDOW.h - map.h) / 2, 6);
  });

  it('keeps a map larger than the window overlapping it', () => {
    const map = { w: 12000, h: 900 };
    expectLegal(frameActualSize(map, WINDOW), map, WINDOW);
  });
});

describe('the two coordinate spaces', () => {
  it('round-trip through each other', () => {
    const view: Transform = { zoom: 2.5, x: -137, y: 42 };
    for (const p of [{ x: 0, y: 0 }, { x: 1165, y: 402 }, { x: -50, y: 7000 }]) {
      const back = toMap(view, toScreen(view, p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
  });

  it('the visible rectangle is what the window shows, inverted back to map space', () => {
    const view: Transform = { zoom: 2, x: -300, y: -120 };
    const window: Size = { w: 800, h: 500 };
    const visible = visibleRect(view, window);
    expect(toScreen(view, { x: visible.x, y: visible.y })).toEqual({ x: 0, y: 0 });
    expect(toScreen(view, { x: visible.x + visible.w, y: visible.y + visible.h })).toEqual(
      { x: window.w, y: window.h },
    );
  });
});

describe('centering on a point, as the minimap does', () => {
  const map = { w: 2000, h: 1200 };

  it('puts the target map pixel in the middle of the window', () => {
    const target = { x: 300, y: 900 };
    const view = centerOn({ zoom: 3, x: 0, y: 0 }, target, map, WINDOW);
    expect(toScreen(view, target)).toEqual({ x: WINDOW.w / 2, y: WINDOW.h / 2 });
  });

  it('keeps the zoom unchanged', () => {
    expect(centerOn({ zoom: 5, x: 0, y: 0 }, { x: 0, y: 0 }, map, WINDOW).zoom).toBe(5);
  });

  it('still lands somewhere legal for a target outside the map', () => {
    const view = centerOn({ zoom: 1, x: 0, y: 0 }, { x: -9000, y: 9000 }, map, WINDOW);
    expectLegal(view, map, WINDOW);
  });
});

describe('zooming and centering, as the minimap wheel does', () => {
  const map = { w: 2000, h: 1200 };

  it('moves one notch of 1.25x per step', () => {
    const view = zoomCenteredOn({ zoom: 1, x: 0, y: 0 }, 1, { x: 1000, y: 600 }, map, WINDOW);
    expect(view.zoom).toBeCloseTo(1.25, 10);
    expect(zoomCenteredOn(view, -1, { x: 1000, y: 600 }, map, WINDOW).zoom).toBeCloseTo(1, 10);
  });

  it('brings the target map pixel to the middle of the window', () => {
    const target = { x: 300, y: 900 };
    const view = zoomCenteredOn({ zoom: 1, x: -50, y: -20 }, 2, target, map, WINDOW);
    expect(toScreen(view, target)).toEqual({ x: WINDOW.w / 2, y: WINDOW.h / 2 });
  });

  it('stops at the ends rather than passing them', () => {
    const target = { x: 1000, y: 600 };
    expect(zoomCenteredOn({ zoom: 1, x: 0, y: 0 }, 100, target, map, WINDOW).zoom).toBe(32);
    expect(zoomCenteredOn({ zoom: 1, x: 0, y: 0 }, -100, target, map, WINDOW).zoom).toBe(0.1);
  });

  it.each(MAPS)('never leaves a map %s illegally placed, at any zoom', (_name, map) => {
    let view: Transform = fit(map, WINDOW);
    for (const notches of [1, 1, 1, -1, 4, -20, 40]) {
      view = zoomCenteredOn(view, notches, { x: map.w * 0.75, y: map.h * 0.25 }, map, WINDOW);
      expectLegal(view, map, WINDOW);
    }
  });
});
