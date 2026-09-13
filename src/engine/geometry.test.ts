import { describe, expect, it } from 'vitest';

import { drawnRect, intersection, pointIn, screenRect } from './geometry';

describe('the overlap of two rectangles', () => {
  it('is the shared area when they meet', () => {
    expect(intersection({ x: 960, y: 400, w: 90, h: 50 }, { x: 0, y: 0, w: 1000, h: 800 })).toEqual({
      x: 960,
      y: 400,
      w: 40,
      h: 50,
    });
  });

  it('is the first rectangle when it sits wholly inside the second', () => {
    expect(intersection({ x: 10, y: 10, w: 20, h: 20 }, { x: 0, y: 0, w: 100, h: 100 })).toEqual({
      x: 10,
      y: 10,
      w: 20,
      h: 20,
    });
  });

  it('has zero size on an axis where they do not meet', () => {
    expect(intersection({ x: 200, y: 0, w: 50, h: 50 }, { x: 0, y: 0, w: 100, h: 100 }).w).toBe(0);
  });
});

describe('a map-space rectangle drawn on screen', () => {
  it('is scaled by the zoom and moved by the offset', () => {
    expect(screenRect({ zoom: 2, x: 30, y: 10 }, { x: 5, y: 4, w: 16, h: 8 })).toEqual({
      x: 40,
      y: 18,
      w: 32,
      h: 16,
    });
  });

  it('is where the whole map is drawn when it is the whole map, which is the one caller that says so', () => {
    const view = { zoom: 3, x: -120, y: 45 };
    expect(drawnRect(view, { w: 640, h: 400 })).toEqual(
      screenRect(view, { x: 0, y: 0, w: 640, h: 400 }),
    );
  });
});

describe('a pointer inside a box', () => {
  it('lands where the box begins, whatever the page has scrolled', () => {
    expect(pointIn({ left: 200, top: 44 }, { clientX: 260, clientY: 44 })).toEqual({ x: 60, y: 0 });
  });

  it('reads negative outside the box, which a drag beyond its edge produces', () => {
    expect(pointIn({ left: 200, top: 44 }, { clientX: 190, clientY: 20 })).toEqual({ x: -10, y: -24 });
  });
});
