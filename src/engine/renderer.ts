/** Draws one frame of the map onto a canvas, nearest-neighbor at every scale and blended at none. */
import { TERRAIN_LAYER } from '../domain/layerTree';
import type { Route } from '../domain/route';
import type { Placement } from '../domain/types';
import { drawnRect, overlap, screenRect, windowRect } from './geometry';
import type { Rect, Size, Transform } from './geometry';

/** What hovering one placed object tells the visitor, and where clicking it travels if it travels anywhere. */
export interface SceneObject {
  /** Absent for something the pointer can click but that is never named, so no tooltip is shown for it. */
  label?: string;
  note?: string;
  goesTo?: string;
  to?: Route;
}

/** One object type's picture and everywhere the map puts it, one entry of `objects` per placement. */
export interface SceneLayer {
  id: string;
  image: CanvasImageSource;
  w: number;
  h: number;
  placements: Placement[];
  objects: SceneObject[];
  /** False for a layer the pointer passes through, which is drawn over objects that answer for it. */
  hoverable?: boolean;
  /** True for a layer that is clicked but never named, and that yields the pointer to any named object. */
  silent?: boolean;
}

/** A picture covering the whole map, drawn over the terrain: a collision plane, a walk path. */
export interface SceneOverlay {
  id: string;
  image: CanvasImageSource;
  /** True for an overlay drawn in front of every object, so no sprite can cover part of it. */
  inFront?: boolean;
}

/** Everything one map needs to be drawn. */
export interface Scene {
  size: Size;
  terrain: CanvasImageSource;
  overlays: SceneOverlay[];
  layers: SceneLayer[];
}

export interface DrawOptions {
  /** Layer and overlay ids to draw; absent draws the terrain and every object layer, and no overlay. */
  visible?: ReadonlySet<string>;
}

/** Whether one placed sprite falls inside the window at all, so that the rest can be skipped. */
export function isOnScreen(
  at: Placement,
  w: number,
  h: number,
  view: Transform,
  window: Size,
): boolean {
  const seen = overlap(screenRect(view, { x: at[0], y: at[1], w, h }), windowRect(window));
  return seen.w > 0 && seen.h > 0;
}

function place(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  at: Placement,
  w: number,
  h: number,
  view: Transform,
) {
  const box = screenRect(view, { x: at[0], y: at[1], w, h });
  if (at[2] === -1) {
    ctx.save();
    ctx.translate(box.x + box.w, box.y);
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 0, box.w, box.h);
    ctx.restore();
    return;
  }
  ctx.drawImage(image, box.x, box.y, box.w, box.h);
}

/** Draws the map, the object layers, and the overlays asked for, each in its place in the stack. */
export function draw(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  view: Transform,
  window: Size,
  options: DrawOptions = {},
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, window.w, window.h);

  const map = drawnRect(view, scene.size);
  const overlay = (layer: SceneOverlay) => {
    if (options.visible?.has(layer.id)) ctx.drawImage(layer.image, map.x, map.y, map.w, map.h);
  };

  if (options.visible?.has(TERRAIN_LAYER) ?? true) {
    ctx.drawImage(scene.terrain, map.x, map.y, map.w, map.h);
  }
  for (const layer of scene.overlays) if (!layer.inFront) overlay(layer);

  // Objects are clipped to the map, so a sprite wider than the map (a water-level pipe) is cut at the
  // edge rather than hanging into the margin around it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(map.x, map.y, map.w, map.h);
  ctx.clip();
  for (const layer of scene.layers) {
    if (options.visible && !options.visible.has(layer.id)) continue;
    for (const at of layer.placements) {
      if (isOnScreen(at, layer.w, layer.h, view, window)) {
        place(ctx, layer.image, at, layer.w, layer.h, view);
      }
    }
  }
  ctx.restore();

  for (const layer of scene.overlays) if (layer.inFront) overlay(layer);
}

/** Outlines whatever the pointer is over, at a screen rectangle the caller has clamped to the map. */
export function drawHover(ctx: CanvasRenderingContext2D, rect: Rect, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  ctx.restore();
}

/** Sizes the canvas to its box and returns the size to draw in, in layout pixels rather than device ones. */
export function resize(canvas: HTMLCanvasElement, ratio: number): Size {
  const box = canvas.getBoundingClientRect();
  const size = { w: Math.round(box.width), h: Math.round(box.height) };
  const backing = { w: Math.round(size.w * ratio), h: Math.round(size.h * ratio) };
  if (canvas.width !== backing.w || canvas.height !== backing.h) {
    canvas.width = backing.w;
    canvas.height = backing.h;
  }
  return size;
}


/** Recolors a mask, keeping its shape and replacing every visible pixel with one color. */
export function tint(image: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}
