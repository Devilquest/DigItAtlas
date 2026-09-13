/** The small view of the whole map, with the current viewport drawn on it as a rectangle. */
import { clamp } from './geometry';
import type { Point, Rect, Size } from './geometry';

/** Box pixels per map pixel, on each axis. */
export function minimapScale(map: Size, box: Size): Point {
  return { x: box.w / map.w, y: box.h / map.h };
}

/** A point in the minimap's own box back to the map pixel under it. */
export function toMapPoint(at: Point, map: Size, box: Size): Point {
  const scale = minimapScale(map, box);
  return { x: at.x / scale.x, y: at.y / scale.y };
}

/** The main view's visible rectangle (in map pixels, from `visibleRect`), scaled into the box and clamped to it. */
export function toBoxRect(visible: Rect, map: Size, box: Size): Rect {
  const scale = minimapScale(map, box);
  const x0 = clamp(visible.x * scale.x, 0, box.w);
  const y0 = clamp(visible.y * scale.y, 0, box.h);
  const x1 = clamp((visible.x + visible.w) * scale.x, 0, box.w);
  const y1 = clamp((visible.y + visible.h) * scale.y, 0, box.h);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * The viewport rectangle's four corner radii, in `roundRect` order.
 *
 * @returns For each corner, the smallest radius keeping it clear of the panel's rounded corner.
 */
export function cornerRadii(
  rect: Rect,
  box: Size,
  radius: number,
): [number, number, number, number] {
  const left = rect.x;
  const right = box.w - (rect.x + rect.w);
  const top = rect.y;
  const bottom = box.h - (rect.y + rect.h);
  // The radius whose arc is tangent to the box corner's arc from inside, given the corner's gap to each edge.
  const fit = (dx: number, dy: number) =>
    Math.max(0, radius - dx - dy - Math.sqrt(2 * dx * dy));
  return [fit(left, top), fit(right, top), fit(right, bottom), fit(left, bottom)];
}

/** Draws the whole map into the box, with the viewport rectangle over it. */
export function draw(
  ctx: CanvasRenderingContext2D,
  terrain: CanvasImageSource,
  map: Size,
  box: Size,
  visible: Rect,
  color: string,
  radius: number,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, box.w, box.h);
  ctx.drawImage(terrain, 0, 0, box.w, box.h);
  const rect = toBoxRect(visible, map, box);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  // On the widest maps at full zoom the rectangle is thinner than the stroke it is inset by, which would
  // otherwise ask roundRect for a negative side.
  ctx.roundRect(
    rect.x + 0.75,
    rect.y + 0.75,
    Math.max(0, rect.w - 1.5),
    Math.max(0, rect.h - 1.5),
    cornerRadii(rect, box, radius),
  );
  ctx.stroke();
}
