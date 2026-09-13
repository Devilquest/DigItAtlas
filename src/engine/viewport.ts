/** The transform the map is drawn under and every operation on it, as pure functions with no canvas. */
import { clamp, toMap } from './geometry';
import type { Point, Size, Transform } from './geometry';

/** The zoom range and notch, matching Dig It! Explorer so that the two tools behave the same way. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 32;
export const ZOOM_STEP = 1.25;

/** How much of the map must stay inside the window, on every side. */
export const MIN_OVERLAP = 250;

/** Holds one axis of the offset inside the range that keeps map and window overlapping. */
function clampAxis(offset: number, drawn: number, windowSize: number): number {
  const need = Math.min(MIN_OVERLAP, drawn, windowSize);
  return clamp(offset, need - drawn, windowSize - need);
}

/** Slides the map back until it overlaps the window on both axes. */
export function clampPan(view: Transform, map: Size, window: Size): Transform {
  return {
    zoom: view.zoom,
    x: clampAxis(view.x, map.w * view.zoom, window.w),
    y: clampAxis(view.y, map.h * view.zoom, window.h),
  };
}

/** Moves the map by a screen distance, as a drag does. */
export function panBy(view: Transform, dx: number, dy: number, map: Size, window: Size): Transform {
  return clampPan({ zoom: view.zoom, x: view.x + dx, y: view.y + dy }, map, window);
}

/** Changes the zoom while keeping the map pixel under `anchor` under it, on or off the map. */
export function zoomAt(
  view: Transform,
  zoom: number,
  anchor: Point,
  map: Size,
  window: Size,
): Transform {
  const next = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  const held = toMap(view, anchor);
  return clampPan(
    { zoom: next, x: anchor.x - held.x * next, y: anchor.y - held.y * next },
    map,
    window,
  );
}

/** Zooms by whole notches, positive to zoom in, as a wheel or a button does. */
export function zoomByNotches(
  view: Transform,
  notches: number,
  anchor: Point,
  map: Size,
  window: Size,
): Transform {
  return zoomAt(view, view.zoom * ZOOM_STEP ** notches, anchor, map, window);
}

/** Frames the whole map in the window, centered. */
export function fit(map: Size, window: Size): Transform {
  const wide = map.w > 0 ? window.w / map.w : MAX_ZOOM;
  const tall = map.h > 0 ? window.h / map.h : MAX_ZOOM;
  const zoom = clamp(Math.min(wide, tall), MIN_ZOOM, MAX_ZOOM);
  return clampPan(
    { zoom, x: (window.w - map.w * zoom) / 2, y: (window.h - map.h * zoom) / 2 },
    map,
    window,
  );
}

/** Draws the map at actual size without moving what the middle of the window is showing. */
export function actualSize(view: Transform, map: Size, window: Size): Transform {
  return zoomAt(view, 1, { x: window.w / 2, y: window.h / 2 }, map, window);
}

/** Frames a fresh map at actual size, centered, as one opened while the last was at 100% is. */
export function frameActualSize(map: Size, window: Size): Transform {
  return clampPan(
    { zoom: 1, x: (window.w - map.w) / 2, y: (window.h - map.h) / 2 },
    map,
    window,
  );
}

/** Recenters the window on a map point, keeping the zoom, as the minimap's click or drag does. */
export function centerOn(view: Transform, target: Point, map: Size, window: Size): Transform {
  return clampPan(
    { zoom: view.zoom, x: window.w / 2 - target.x * view.zoom, y: window.h / 2 - target.y * view.zoom },
    map,
    window,
  );
}

/** Zooms by whole notches and recenters on a map point, as rolling the wheel over the minimap does. */
export function zoomCenteredOn(
  view: Transform,
  notches: number,
  target: Point,
  map: Size,
  window: Size,
): Transform {
  const next = clamp(view.zoom * ZOOM_STEP ** notches, MIN_ZOOM, MAX_ZOOM);
  return centerOn({ zoom: next, x: view.x, y: view.y }, target, map, window);
}

/** Whether the zoom can still move in one direction, for the buttons that offer it. */
export function canZoom(zoom: number, direction: 1 | -1): boolean {
  return direction > 0 ? zoom < MAX_ZOOM : zoom > MIN_ZOOM;
}
