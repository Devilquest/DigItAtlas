/** What a parent holds to drive the map: the handle it attaches, what the map publishes, and what it can ask. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';

import type { Rect } from '../../engine/geometry';
import { signal } from '../../engine/signal';
import type { MapCommands, Readouts } from './MapView';

/** One map's wiring, held together because a caller that has one of these always has all four. */
export interface MapControls {
  map: RefObject<MapCommands | null>;
  readouts: Readouts;
  commands: MapCommands;
  openAtActualSize: () => boolean;
}

/** Wires one map to the bar and the minimap, which call these before any map exists to answer them. */
export function useMapCommands(): MapControls {
  const map = useRef<MapCommands>(null);
  const readouts = useMemo(
    () => ({ zoom: signal(1), cursor: signal(''), viewport: signal<Rect>({ x: 0, y: 0, w: 0, h: 0 }) }),
    [],
  );
  // Whether the map on screen was left at exactly 100%, so the next one opens at 100% rather than Fit,
  // the same carry-over the Explorer makes for a 1:1 view. Starts false so the first map frames to Fit.
  const carryActualSize = useRef(false);
  useEffect(
    () => readouts.zoom.subscribe(() => {
      carryActualSize.current = readouts.zoom.get() === 1;
    }),
    [readouts],
  );
  // A getter rather than the value: the map asks when it frames a new scene, so nothing reads the ref
  // during a render, where its value is not guaranteed to be the current one.
  const openAtActualSize = useCallback(() => carryActualSize.current, []);
  const commands = useMemo<MapCommands>(
    () => ({
      zoomBy: (notches) => map.current?.zoomBy(notches),
      actualSize: () => map.current?.actualSize(),
      fit: () => map.current?.fit(),
      centerOn: (target) => map.current?.centerOn(target),
      zoomCenteredOn: (target, notches) => map.current?.zoomCenteredOn(target, notches),
    }),
    [],
  );

  return { map, readouts, commands, openAtActualSize };
}
