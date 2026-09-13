import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';

import { cursorReadout, objectPosition, spriteSize } from '../../domain/format';
import type { Route } from '../../domain/route';
import { intersection, pointIn, screenRect, toMap, visibleRect } from '../../engine/geometry';
import type { Point, Rect, Size, Transform } from '../../engine/geometry';
import { hitTest } from '../../engine/hitTest';
import { draw, drawHover, resize } from '../../engine/renderer';
import type { Scene } from '../../engine/renderer';
import type { Signal } from '../../engine/signal';
import { themeColor } from '../../engine/theme';
import {
  actualSize,
  centerOn,
  fit,
  frameActualSize,
  panBy,
  zoomByNotches,
  zoomCenteredOn,
} from '../../engine/viewport';
import HoverTip from './HoverTip';
import type { HoverTipInfo } from './HoverTip';
import './MapView.css';

/** A pointer that has moved less than this since going down is a click, not a drag. */
const CLICK_TOLERANCE = 4;

/** What is under the pointer: the outline and tooltip anchor, clamped to the map, and where it travels. */
interface Hover {
  rect: Rect;
  /** Absent for something outlined and clickable that names nothing, such as a destination label. */
  info?: HoverTipInfo;
  to?: Route;
}

/** What the map publishes for the bar and the minimap to display, as values rather than the transform itself. */
export interface Readouts {
  zoom: Signal<number>;
  cursor: Signal<string>;
  /** The visible region, in the map's own pixels, for the minimap's rectangle. */
  viewport: Signal<Rect>;
}

/** What the bar and the minimap can ask of the map, the transform being the map's own to change. */
export interface MapCommands {
  zoomBy: (notches: number) => void;
  actualSize: () => void;
  fit: () => void;
  centerOn: (target: Point) => void;
  zoomCenteredOn: (target: Point, notches: number) => void;
}

export interface MapViewProps {
  scene: Scene;
  /** One screen of the game, which the cursor readout counts columns and rows in. */
  block: Size;
  visible?: ReadonlySet<string>;
  readouts: Readouts;
  /** Asked when a new map is framed: true opens it at 100% instead of Fit. */
  openAtActualSize?: () => boolean;
  onNavigate: (route: Route) => void;
  ref?: Ref<MapCommands>;
}

/** A pointer's own down position, tracked separately from its last-seen one, to tell a click from a drag. */
interface DragState {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/** The canvas the map is drawn on, and the pointer gestures that move it. */
export default function MapView({
  scene,
  block,
  visible,
  readouts,
  openAtActualSize,
  onNavigate,
  ref,
}: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The transform is a ref and not state: a drag produces dozens of changes a second, and every one of
  // them matters to the canvas alone. Routing them through React would re-render at pointer speed.
  const viewRef = useRef<Transform>({ zoom: 1, x: 0, y: 0 });
  const sizeRef = useRef<Size>({ w: 0, h: 0 });
  const frameRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const framedRef = useRef<Scene | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const paint = useCallback(() => {
    frameRef.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const size = resize(canvas, window.devicePixelRatio || 1);
    if (size.w === 0 || size.h === 0) return;
    sizeRef.current = size;
    // A new map is framed rather than inheriting where the last one was left, and framed here rather than
    // on mount because a canvas that has not been laid out yet has no size to frame against.
    if (framedRef.current !== scene) {
      framedRef.current = scene;
      viewRef.current = openAtActualSize?.() ? frameActualSize(scene.size, size) : fit(scene.size, size);
    }
    ctx.setTransform(canvas.width / size.w, 0, 0, canvas.height / size.h, 0, 0);
    draw(ctx, scene, viewRef.current, size, visible ? { visible } : {});
    // Read per frame rather than once, so the outline follows the stylesheet if the theme changes.
    if (hover) drawHover(ctx, hover.rect, themeColor('--accent'));
    readouts.zoom.set(viewRef.current.zoom);
    readouts.viewport.set(visibleRect(viewRef.current, size));
  }, [scene, visible, readouts, hover, openAtActualSize]);

  const schedule = useCallback(() => {
    if (frameRef.current === 0) frameRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    schedule();
    return () => {
      // Clearing the id matters as much as canceling the frame: schedule() reads a non-zero id as a paint
      // already on the way, so a canceled one left behind stops the canvas being painted again at all.
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [schedule]);

  useEffect(() => setHover(null), [scene]);

  useImperativeHandle(
    ref,
    (): MapCommands => ({
      // A button has no pointer to anchor on, so it holds the middle of the window instead.
      zoomBy: (notches) => {
        const size = sizeRef.current;
        viewRef.current = zoomByNotches(
          viewRef.current,
          notches,
          { x: size.w / 2, y: size.h / 2 },
          scene.size,
          size,
        );
        schedule();
      },
      actualSize: () => {
        viewRef.current = actualSize(viewRef.current, scene.size, sizeRef.current);
        schedule();
      },
      fit: () => {
        viewRef.current = fit(scene.size, sizeRef.current);
        schedule();
      },
      centerOn: (target) => {
        viewRef.current = centerOn(viewRef.current, target, scene.size, sizeRef.current);
        schedule();
      },
      zoomCenteredOn: (target, notches) => {
        viewRef.current = zoomCenteredOn(viewRef.current, notches, target, scene.size, sizeRef.current);
        setHover(null);
        schedule();
      },
    }),
    [scene, schedule],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [schedule]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setHover(null);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const at = pointIn(event.currentTarget.getBoundingClientRect(), event);
    const mapPoint = toMap(viewRef.current, at);
    readouts.cursor.set(cursorReadout(mapPoint, scene.size, block));

    const drag = dragRef.current;
    if (drag && drag.id === event.pointerId) {
      if (!drag.moved) {
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (dx * dx + dy * dy > CLICK_TOLERANCE * CLICK_TOLERANCE) drag.moved = true;
      }
      viewRef.current = panBy(
        viewRef.current,
        event.clientX - drag.x,
        event.clientY - drag.y,
        scene.size,
        sizeRef.current,
      );
      drag.x = event.clientX;
      drag.y = event.clientY;
      schedule();
      return;
    }

    const found = hitTest(scene, mapPoint, visible);
    if (!found) {
      setHover((was) => (was ? null : was));
      return;
    }
    const layer = scene.layers.find((entry) => entry.id === found.layerId)!;
    const placement = layer.placements[found.index]!;
    const object = layer.objects[found.index]!;
    // The part of the sprite still on the map after the renderer clips the rest away: the outline closes
    // here and the tooltip sits flush against this edge, not out where the uncut sprite would end.
    const shown = intersection(
      { x: placement[0], y: placement[1], w: layer.w, h: layer.h },
      { x: 0, y: 0, w: scene.size.w, h: scene.size.h },
    );
    setHover({
      rect: screenRect(viewRef.current, shown),
      ...(object.label !== undefined && {
        info: {
          label: object.label,
          position: objectPosition(placement[0], placement[1]),
          size: spriteSize(layer.w, layer.h, { w: shown.w, h: shown.h }),
          ...(object.note && { note: object.note }),
          ...(object.goesTo && { goesTo: object.goesTo }),
        },
      }),
      ...(object.to && { to: object.to }),
    });
  };

  /** Common to a pointer going up and one being canceled, returning the drag it ended. */
  const releaseDrag = (event: React.PointerEvent<HTMLCanvasElement>): DragState | null => {
    if (dragRef.current?.id !== event.pointerId) return null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const drag = dragRef.current;
    dragRef.current = null;
    return drag;
  };

  /** A pointer that goes up without having moved is a click: travel wherever the object under it leads. */
  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = releaseDrag(event);
    if (!drag || drag.moved) return;
    const mapPoint = toMap(viewRef.current, pointIn(event.currentTarget.getBoundingClientRect(), event));
    const found = hitTest(scene, mapPoint, visible);
    if (!found) return;
    const layer = scene.layers.find((entry) => entry.id === found.layerId)!;
    const to = layer.objects[found.index]!.to;
    if (to) onNavigate(to);
  };

  // Registered directly rather than through React, whose wheel listener is passive and cannot stop the
  // page from scrolling behind the map.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      viewRef.current = zoomByNotches(
        viewRef.current,
        event.deltaY < 0 ? 1 : -1,
        pointIn(canvas.getBoundingClientRect(), event),
        scene.size,
        sizeRef.current,
      );
      setHover(null);
      schedule();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [scene, schedule]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="map-view"
        // An object that leads nowhere still names itself, so it gets the help cursor rather than the map's grab.
        style={{ cursor: hover ? (hover.to ? 'pointer' : 'help') : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={releaseDrag}
        onPointerLeave={() => {
          readouts.cursor.set('');
          setHover(null);
        }}
      />
      <HoverTip info={hover?.info ?? null} anchor={hover?.rect ?? null} bounds={sizeRef.current} />
    </>
  );
}
