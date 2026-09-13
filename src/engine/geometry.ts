/** The shapes a map and a window are measured in, and the arithmetic that converts between the two. */

/** A position, in whichever space the caller is working in. */
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the map sits on screen and how large it is drawn: a map pixel `p` lands at `p * zoom + (x, y)`. */
export interface Transform {
  zoom: number;
  x: number;
  y: number;
}

/** Holds a value inside a range, taking the lower bound where the range is empty. */
export function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

/** Converts a point in the map's own pixels to the screen point that draws it. */
export function toScreen(view: Transform, p: Point): Point {
  return { x: p.x * view.zoom + view.x, y: p.y * view.zoom + view.y };
}

/** Converts a screen point to the map pixel under it, which may be outside the map. */
export function toMap(view: Transform, p: Point): Point {
  return { x: (p.x - view.x) / view.zoom, y: (p.y - view.y) / view.zoom };
}

/** The screen rectangle a map-space rectangle covers under one transform. */
export function screenRect(view: Transform, rect: Rect): Rect {
  return {
    x: rect.x * view.zoom + view.x,
    y: rect.y * view.zoom + view.y,
    w: rect.w * view.zoom,
    h: rect.h * view.zoom,
  };
}

/** The screen rectangle a map of the given size covers under one transform. */
export function drawnRect(view: Transform, map: Size): Rect {
  return screenRect(view, { x: 0, y: 0, w: map.w, h: map.h });
}

/** The map-space rectangle a window shows through one transform, the inverse of drawnRect. */
export function visibleRect(view: Transform, window: Size): Rect {
  return { x: -view.x / view.zoom, y: -view.y / view.zoom, w: window.w / view.zoom, h: window.h / view.zoom };
}

/** How far two rectangles overlap on each axis, zero on an axis where they do not meet. */
export function overlap(a: Rect, b: Rect): Size {
  return {
    w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)),
    h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)),
  };
}

/** The overlap of two rectangles as a rectangle, with zero width or height on an axis where they do not meet. */
export function intersection(a: Rect, b: Rect): Rect {
  const size = overlap(a, b);
  return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), w: size.w, h: size.h };
}

/** Where a pointer landed inside a box, in that box's own pixels. */
export function pointIn(
  box: { left: number; top: number },
  at: { clientX: number; clientY: number },
): Point {
  return { x: at.clientX - box.left, y: at.clientY - box.top };
}

/** The rectangle a window of the given size occupies in screen space. */
export function windowRect(view: Size): Rect {
  return { x: 0, y: 0, w: view.w, h: view.h };
}
