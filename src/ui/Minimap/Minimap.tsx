import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { pointIn } from '../../engine/geometry';
import type { Point, Rect } from '../../engine/geometry';
import { draw, toMapPoint } from '../../engine/minimap';
import { resize } from '../../engine/renderer';
import type { Scene } from '../../engine/renderer';
import type { Signal } from '../../engine/signal';
import { themeColor, themePixels } from '../../engine/theme';
import { useSignal } from '../../state/hooks';
import Panel from '../controls/Panel';
import useAnimatedHeight from '../controls/useAnimatedHeight';
import './Minimap.css';

export interface MinimapProps {
  scene: Scene;
  viewport: Signal<Rect>;
  onCenter: (target: Point) => void;
  onZoom: (target: Point, notches: number) => void;
}

/** The whole map at a glance, with the viewport as a rectangle; click or drag it to move the view. */
export default function Minimap({ scene, viewport, onCenter, onZoom }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useSignal(viewport);
  const draggingRef = useRef(false);
  // The drawing carries the motion and the panel follows it, since a panel clips what it holds rather than
  // scaling it, and two animations over one shape are two chances to disagree about where it is.
  useAnimatedHeight(canvasRef);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const size = resize(canvas, window.devicePixelRatio || 1);
    if (size.w === 0 || size.h === 0) return;
    ctx.setTransform(canvas.width / size.w, 0, 0, canvas.height / size.h, 0, 0);
    draw(ctx, scene.terrain, scene.size, size, visible, themeColor('--accent'), themePixels('--radius-panel'));
  }, [scene, visible]);

  // Before the frame the new size is drawn in, so the box and the picture in it are never a frame apart.
  useLayoutEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  // Registered directly rather than through React, whose wheel listener is passive and cannot stop the
  // page from scrolling behind the panel.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = canvas.getBoundingClientRect();
      const at = pointIn(box, event);
      onZoom(toMapPoint(at, scene.size, { w: box.width, h: box.height }), event.deltaY < 0 ? 1 : -1);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [scene, onZoom]);

  const moveTo = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const at = pointIn(box, event);
    onCenter(toMapPoint(at, scene.size, { w: box.width, h: box.height }));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    moveTo(event);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingRef.current) moveTo(event);
  };

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    draggingRef.current = false;
  };

  return (
    <Panel title="Minimap" home="rail" className="minimap-panel" hideTitle animateHeight={false}>
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        style={{ aspectRatio: `${scene.size.w} / ${scene.size.h}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </Panel>
  );
}
