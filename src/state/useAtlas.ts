/** What the atlas has loaded and what it is showing: the map the address names, and its layers. */
import { useEffect, useMemo, useState } from 'react';

import { openMap, prefetchAround } from '../data/ahead';
import { atlasFiles } from '../data/loader';
import type { Startup } from '../data/loader';
import { record, resolve, spokenFor } from '../domain/layerMemory';
import { leavesOf, matching, setAll, stateOf, toggled, visibleIds } from '../domain/layerTree';
import type { LayerNode } from '../domain/layerTree';
import { buildTree } from '../domain/levels';
import type { WorldBranch } from '../domain/levels';
import { currentRoute, onRouteChange } from '../domain/route';
import type { Route } from '../domain/route';
import type { Signal } from '../engine/signal';
import { OPENING, whileLoading } from './showing';
import type { Showing } from './showing';
import type { Stored } from './usePreferences';

/** The layers of no map, which is one value so that nothing downstream re-runs while none is open. */
const NO_LAYERS: LayerNode[] = [];

/** No keys at all, held once for the same reason. */
const NO_KEYS: ReadonlySet<string> = new Set();

/** Everything one map brings with it, from what is drawn to what the layers panel lists about it. */
export interface Atlas {
  ready: Startup | null;
  route: Route;
  showing: Showing;
  /** A map is on its way, which the map already on screen gives no sign of by itself. */
  busy: boolean;
  tree: WorldBranch[];
  /** The layers of the map on screen, and none at all while there is no map. */
  layers: LayerNode[];
  /** The scene layers to draw, which is what the ticked leaves come to. */
  visible: ReadonlySet<string>;
  /** The layers the panel lists, which its own search narrows. */
  shownLayers: LayerNode[];
  ticked: ReadonlySet<string>;
  layerText: string;
  setLayerText: (text: string) => void;
  /** The groups the panel draws collapsed, which a search overrides. */
  hiddenGroups: ReadonlySet<string>;
  toggleLayer: (node: LayerNode) => void;
  setEveryShown: (value: boolean) => void;
}

/**
 * Loads the atlas and the map an address names together, and holds what the visitor says about its layers.
 *
 * @param cursor - The map's cursor readout, cleared here because the map it described is gone.
 */
export function useAtlas(
  stored: Stored,
  collapsedGroups: ReadonlySet<string>,
  cursor: Signal<string>,
): Atlas {
  const [ready, setReady] = useState<Startup | null>(null);
  const [route, setRoute] = useState<Route>(currentRoute);
  const [showing, setShowing] = useState<Showing>(OPENING);
  const [busy, setBusy] = useState(false);
  // Ticked by leaf key, which visibleIds turns into the scene layer ids to draw.
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const [layerText, setLayerText] = useState('');

  const tree = useMemo(() => (ready ? buildTree(ready.index) : []), [ready]);

  const layers = showing.state === 'map' ? showing.layers : NO_LAYERS;
  const visible = useMemo(() => visibleIds(layers, ticked), [layers, ticked]);
  const shownLayers = useMemo(() => matching(layers, layerText), [layers, layerText]);
  // A search shows what it matched, so a group it matched into is open while it runs, whatever was
  // collapsed before and whatever will be collapsed after.
  const hiddenGroups = layerText.trim() === '' ? collapsedGroups : NO_KEYS;

  // A statement about a layer and the tick that produced it are one action, so each of these records what
  // it did as it does it.
  const toggleLayer = (node: LayerNode) => {
    const turningOn = stateOf(node, ticked) !== 'on';
    setTicked(toggled(ticked, node));
    stored.update((was) => ({ ...was, layers: record(was.layers, [node.key], turningOn) }));
  };

  const setEveryShown = (value: boolean) => {
    const reached = new Set(leavesOf(shownLayers).map((leaf) => leaf.key));
    setTicked(setAll(ticked, shownLayers, value));
    stored.update((was) => ({
      ...was,
      layers: record(was.layers, spokenFor(layers, reached), value),
    }));
  };

  useEffect(() => onRouteChange(setRoute), []);

  useEffect(() => {
    let live = true;
    atlasFiles().then((loaded) => {
      if (!live) return;
      if (loaded.ok) setReady(loaded.value);
      else setShowing({ state: 'failed', trouble: loaded.trouble });
    });
    return () => {
      live = false;
    };
  }, []);

  const memory = stored.memory;
  // Not waiting for the atlas's own files: the map is fetched beside them, and only building it needs them.
  useEffect(() => {
    let live = true;
    setBusy(true);
    setShowing(whileLoading);
    openMap(route).then((opened) => {
      if (!live) return;
      if (opened.ok) {
        const { scene, title, layers: built } = opened.value;
        // Everything the window says about a map changes in the same beat as the map itself.
        setShowing({ state: 'map', route, scene, title, layers: built });
        setTicked(resolve(built, memory.current));
        // The panel is rebuilt for the new map, so a command scoped to the previous map's search would act
        // on a set nobody chose.
        setLayerText('');
        // Nothing on screen waits for this, and a click that outruns it is served as if it had never run.
        void prefetchAround(route);
      } else {
        setShowing({ state: 'failed', trouble: opened.trouble });
      }
      cursor.set('');
      setBusy(false);
    });
    return () => {
      live = false;
    };
  }, [route, cursor, memory]);

  return {
    ready,
    route,
    showing,
    busy,
    tree,
    layers,
    visible,
    shownLayers,
    ticked,
    layerText,
    setLayerText,
    hiddenGroups,
    toggleLayer,
    setEveryShown,
  };
}
