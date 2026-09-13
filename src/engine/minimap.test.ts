import { describe, expect, it } from 'vitest';

import type { Rect, Size } from './geometry';
import { cornerRadii, minimapScale, toBoxRect, toMapPoint } from './minimap';

const MAP: Size = { w: 2000, h: 1200 };
const BOX: Size = { w: 200, h: 120 };

describe('the minimap scale', () => {
  it('is one ratio on both axes for a box sharing the map aspect, which is every box at rest', () => {
    expect(minimapScale(MAP, BOX).x).toBeCloseTo(0.1, 10);
    expect(minimapScale(MAP, BOX).y).toBeCloseTo(0.1, 10);
  });

  it('is each axis on its own while the panel is between the shapes of two maps', () => {
    expect(minimapScale(MAP, { w: 200, h: 200 })).toEqual({ x: 0.1, y: 200 / 1200 });
  });
});

describe('box and map points', () => {
  it('round-trip a box click back to the map pixel it names', () => {
    for (const at of [{ x: 0, y: 0 }, { x: 137, y: 42 }, { x: BOX.w, y: BOX.h }]) {
      const point = toMapPoint(at, MAP, BOX);
      expect(point.x * minimapScale(MAP, BOX).x).toBeCloseTo(at.x, 9);
      expect(point.y * minimapScale(MAP, BOX).y).toBeCloseTo(at.y, 9);
    }
  });

  it('places the map center at the box center', () => {
    const center = toMapPoint({ x: BOX.w / 2, y: BOX.h / 2 }, MAP, BOX);
    expect(center.x).toBeCloseTo(MAP.w / 2, 9);
    expect(center.y).toBeCloseTo(MAP.h / 2, 9);
  });
});

describe('a box the panel is still growing into', () => {
  // The map fills the width throughout and the drawing follows the height, so both stay true of the box it
  // has at that moment rather than the one it is heading for.
  const TALLER: Size = { w: 200, h: 200 };

  it('still puts the map center at the box center', () => {
    const center = toMapPoint({ x: TALLER.w / 2, y: TALLER.h / 2 }, MAP, TALLER);
    expect(center.x).toBeCloseTo(MAP.w / 2, 9);
    expect(center.y).toBeCloseTo(MAP.h / 2, 9);
  });

  it('still covers the whole box with the whole map', () => {
    const visible: Rect = { x: 0, y: 0, w: MAP.w, h: MAP.h };
    expect(toBoxRect(visible, MAP, TALLER)).toEqual({ x: 0, y: 0, w: TALLER.w, h: TALLER.h });
  });

  it('stretches the viewport rectangle with the box, so it stays over what it marks', () => {
    const visible: Rect = { x: 500, y: 300, w: 1000, h: 600 };
    expect(toBoxRect(visible, MAP, TALLER)).toEqual({ x: 50, y: 50, w: 100, h: 100 });
  });
});

describe('the viewport rectangle in box space', () => {
  it('covers the whole box when the whole map is visible', () => {
    const visible: Rect = { x: 0, y: 0, w: MAP.w, h: MAP.h };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 0, y: 0, w: BOX.w, h: BOX.h });
  });

  it('scales a smaller visible region down with the same ratio', () => {
    const visible: Rect = { x: 500, y: 300, w: 1000, h: 600 };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 50, y: 30, w: 100, h: 60 });
  });

  it('clamps to the box on both axes when the view overhangs the map on both', () => {
    const visible: Rect = { x: -400, y: -200, w: 2800, h: 1600 };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 0, y: 0, w: BOX.w, h: BOX.h });
  });

  it('clamps only the overhanging axis, matching Fit on a width-limited map', () => {
    // Fit on a width-limited map shows the whole height and leaves a blank margin either side of it.
    const visible: Rect = { x: -900, y: 0, w: 3800, h: 1200 };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 0, y: 0, w: BOX.w, h: BOX.h });
  });

  it('clamps only the overhanging axis, matching Fit on a height-limited map', () => {
    const visible: Rect = { x: 0, y: -300, w: 2000, h: 1800 };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 0, y: 0, w: BOX.w, h: BOX.h });
  });

  it('draws the bound axis flush with the box edge while the overhanging one stays inset', () => {
    // Zoomed in past Fit on one axis only: that axis is a proper sub-rectangle, the other still overhangs.
    const visible: Rect = { x: -100, y: 100, w: 2200, h: 1000 };
    expect(toBoxRect(visible, MAP, BOX)).toEqual({ x: 0, y: 10, w: BOX.w, h: 100 });
  });
});

describe('the viewport rectangle corner radii', () => {
  const R = 12;
  const at = (visible: Rect) => cornerRadii(toBoxRect(visible, MAP, BOX), BOX, R);

  it('is square where every corner clears the box corners', () => {
    expect(at({ x: 500, y: 300, w: 1000, h: 600 })).toEqual([0, 0, 0, 0]);
    expect(at({ x: 90, y: 90, w: 400, h: 240 })).toEqual([0, 0, 0, 0]);
  });

  it('is square down an edge that is clear of its own corners', () => {
    expect(at({ x: 0, y: 360, w: 400, h: 240 })).toEqual([0, 0, 0, 0]);
  });

  it('takes the full panel radius at a corner sitting exactly in a box corner', () => {
    expect(at({ x: 0, y: 0, w: 400, h: 240 })).toEqual([R, 0, 0, 0]);
    expect(at({ x: 1600, y: 960, w: 400, h: 240 })).toEqual([0, 0, R, 0]);
  });

  it('eases the radius in as a corner nears a box corner, before any edge is flush', () => {
    const [topLeft] = at({ x: 30, y: 30, w: 400, h: 240 });
    expect(topLeft).toBeGreaterThan(0);
    expect(topLeft).toBeLessThan(R);
  });

  it('rounds a corner flush with one edge to the panel radius less the other gap', () => {
    // Left edge flush, top edge 5 box px (0.1 per map px) short.
    expect(at({ x: 0, y: 50, w: 400, h: 240 })[0]).toBeCloseTo(R - 5);
  });

  it('grows the radius monotonically as the corner approaches the box corner', () => {
    const radii = [60, 30, 10, 0].map((n) => at({ x: n, y: n, w: 400, h: 240 })[0]);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    expect(radii[0]).toBe(0);
    expect(radii[3]).toBe(R);
  });

  it('rounds both corners along a fully covered edge', () => {
    expect(at({ x: 0, y: 0, w: MAP.w, h: 600 })).toEqual([R, R, 0, 0]);
  });

  it('rounds all four when the whole map is in view', () => {
    expect(at({ x: 0, y: 0, w: MAP.w, h: MAP.h })).toEqual([R, R, R, R]);
  });
});
