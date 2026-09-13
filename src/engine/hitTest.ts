/** What is under a point, since a canvas map has no elements of its own to hit-test for us. */
import type { Point } from './geometry';
import type { Scene } from './renderer';

/** One placed object, addressed by its layer and its place in it. */
export interface HoverTarget {
  layerId: string;
  index: number;
}

/** The topmost object under the point among the layers of one kind, named or silent. */
function topmost(
  scene: Scene,
  at: Point,
  visible: ReadonlySet<string> | undefined,
  silent: boolean,
): HoverTarget | null {
  for (let li = scene.layers.length - 1; li >= 0; li--) {
    const layer = scene.layers[li]!;
    if (layer.hoverable === false) continue;
    if ((layer.silent === true) !== silent) continue;
    if (visible && !visible.has(layer.id)) continue;
    for (let i = layer.placements.length - 1; i >= 0; i--) {
      const [x, y] = layer.placements[i]!;
      if (at.x >= x && at.x < x + layer.w && at.y >= y && at.y < y + layer.h) {
        return { layerId: layer.id, index: i };
      }
    }
  }
  return null;
}

/** The topmost drawn object under a map-space point, among the visible layers, or none. */
export function hitTest(scene: Scene, at: Point, visible?: ReadonlySet<string>): HoverTarget | null {
  // Sprite parts past the map edge are clipped away when drawn, so nothing there is under the pointer.
  if (at.x < 0 || at.y < 0 || at.x >= scene.size.w || at.y >= scene.size.h) return null;
  // A silent layer answers only where no named object does, so a destination label drawn over its marker
  // stays clickable without taking away the tooltip that names the marker.
  return topmost(scene, at, visible, false) ?? topmost(scene, at, visible, true);
}
