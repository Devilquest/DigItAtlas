/** The loading tiers: what a visit waits for once, and what one map needs before it can be drawn. */
import {
  COLLISION_LAYER,
  PATH_LAYER,
  buildLevelLayers,
  buildWorldLayers,
  colliderLayer,
  tagLayer,
} from '../domain/layerTree';
import type { LayerNode } from '../domain/layerTree';
import { carries } from '../domain/levels';
import { nodeKey, nodeOf, worldOf } from '../domain/mapId';
import { linkDestination, nodeDestination } from '../domain/route';
import type { Route } from '../domain/route';
import { drawableIn } from '../domain/types';
import type { Catalog, Level, LevelIndex, Link, WorldMap } from '../domain/types';
import { tint } from '../engine/renderer';
import type { Scene, SceneLayer } from '../engine/renderer';
import { themeColor } from '../engine/theme';
import { dataUrl, failed, fetchCatalog, fetchIndex, fetchLevel, fetchWorld } from './client';
import type { Fetched } from './client';

/** Decodes one exported image. */
function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`${path} could not be decoded`));
    image.src = dataUrl(path);
  });
}

/** Runs a step built on images, whose only failure is one of them not arriving. */
async function decoding<T>(step: () => Promise<T>): Promise<Fetched<T>> {
  try {
    return { ok: true, value: await step() };
  } catch (error) {
    return failed(String(error), 'unreachable');
  }
}

/** Every picture the catalog names, by file name. */
async function loadSprites(catalog: Catalog): Promise<Map<string, HTMLImageElement>> {
  const names = new Set<string>();
  for (const type of Object.values(catalog.types)) {
    for (const form of [type, ...Object.values(type.looks ?? {})]) {
      names.add(form.sprite);
      if (form.collider) names.add(form.collider);
    }
  }
  for (const sign of Object.values(catalog.signs)) {
    for (const file of Object.values(sign.sprites)) names.add(file);
  }
  const loaded = await Promise.all(
    [...names].map(async (name) => [name, await loadImage(`sprites/${name}`)] as const),
  );
  return new Map(loaded);
}

/** Every destination label the catalog names, by file name. */
async function loadTags(catalog: Catalog): Promise<Map<string, HTMLImageElement>> {
  const loaded = await Promise.all(
    Object.values(catalog.tags).map(
      async (tag) => [tag.sprite, await loadImage(`tags/${tag.sprite}`)] as const,
    ),
  );
  return new Map(loaded);
}

/** Everything one visit loads once, whatever map it opens on. */
export interface Startup {
  catalog: Catalog;
  index: LevelIndex;
  sprites: Map<string, HTMLImageElement>;
  tags: Map<string, HTMLImageElement>;
}

async function startup(): Promise<Fetched<Startup>> {
  const [catalog, index] = await Promise.all([fetchCatalog(), fetchIndex()]);
  if (!catalog.ok) return catalog;
  if (!index.ok) return index;
  const pictures = await decoding(async () => {
    const [sprites, tags] = await Promise.all([loadSprites(catalog.value), loadTags(catalog.value)]);
    return { sprites, tags };
  });
  if (!pictures.ok) return pictures;
  return { ok: true, value: { catalog: catalog.value, index: index.value, ...pictures.value } };
}

let opening: Promise<Fetched<Startup>> | null = null;

/** The atlas's own files, fetched once per visit however many maps go on to wait for them. */
export function atlasFiles(): Promise<Fetched<Startup>> {
  opening ??= startup();
  return opening;
}

/** One map's own file, whichever kind of map an address names. */
type MapFile = { kind: 'level'; level: Level } | { kind: 'world'; world: WorldMap };

/** Fetches the file of the map a route names, which depends on nothing else having arrived. */
async function fetchMapFile(route: Route): Promise<Fetched<MapFile>> {
  if (route.kind === 'world') {
    const world = await fetchWorld(route.n);
    return world.ok ? { ok: true, value: { kind: 'world', world: world.value } } : world;
  }
  if (route.kind === 'level') {
    const level = await fetchLevel(route.id);
    return level.ok ? { ok: true, value: { kind: 'level', level: level.value } } : level;
  }
  return { ok: false, trouble: 'missing' };
}

/** The two pictures a map is drawn from, in the order its scene overlays them. */
export type Pictures = [terrain: HTMLImageElement, over: HTMLImageElement];

function loadPictures(file: MapFile): Promise<Fetched<Pictures>> {
  const [terrain, over] =
    file.kind === 'level'
      ? [file.level.terrain, file.level.collision]
      : [file.world.terrain, file.world.path];
  return decoding(() => Promise.all([loadImage(terrain), loadImage(over)]));
}

/** The catalog group the game draws in front of every other object to fake depth. */
const FOREGROUND_GROUP = 'decor';

/** 1 for a type the game draws in front, 0 for the rest, so a stable sort puts the foreground last. */
function drawLast(catalog: Catalog, id: string): number {
  return catalog.types[id]?.group === FOREGROUND_GROUP ? 1 : 0;
}

/** Navigation target and tooltip destination text for a link. */
function linkDestinationInfo(link: Link, levelId: string, world: number): { goesTo: string; to?: Route } {
  const loops = link.to === levelId;
  const destination = link.to == null ? 'World Map' : link.label;
  const goesTo = loops ? `${destination} (this level)` : destination;
  const to = loops ? undefined : linkDestination(link, world);
  return { goesTo, ...(to && { to }) };
}

/** Builds a level's scene, in the order the layers are drawn. */
export function levelScene(
  level: Level,
  [terrain, collision]: Pictures,
  catalog: Catalog,
  sprites: Map<string, HTMLImageElement>,
  tags: Map<string, HTMLImageElement>,
): Scene {
  const world = worldOf(level.id);
  const layers: SceneLayer[] = [];
  const footprints: SceneLayer[] = [];
  const byDepth = Object.entries(level.objects).sort(
    ([a], [b]) => drawLast(catalog, a) - drawLast(catalog, b),
  );
  for (const [id, placements] of byDepth) {
    const type = catalog.types[id];
    if (!type) continue;
    const form = drawableIn(type, level.look);
    const image = sprites.get(form.sprite);
    if (!image) continue;
    const objects = placements.map((at) => {
      const link = level.links.find((entry) => entry.at[0] === at[0] && entry.at[1] === at[1]);
      const base = type.note ? { label: type.label, note: type.note } : { label: type.label };
      if (!link) return base;
      return { ...base, ...linkDestinationInfo(link, level.id, world) };
    });
    layers.push({ id, image, w: form.w, h: form.h, placements, objects });
    // The footprint is the same cell at the same anchor, so it shares the object's placements outright and
    // takes its facing from them.
    const shape = form.collider === undefined ? undefined : sprites.get(form.collider);
    if (shape) {
      footprints.push({
        id: colliderLayer(id),
        image: shape,
        w: form.w,
        h: form.h,
        placements,
        objects: [],
        hoverable: false,
      });
    }
  }
  const labels: SceneLayer[] = [];
  for (const tag of [...new Set(level.links.map((link) => link.tag))].sort()) {
    const entry = catalog.tags[tag];
    const image = entry && tags.get(entry.sprite);
    if (!entry || !image) continue;
    const carried = level.links.filter((link) => link.tag === tag);
    const tagLabel = entry.kind === 'bonus' ? 'Bonus Destination Info' : 'Exit Destination Info';
    labels.push({
      id: tagLayer(tag),
      image,
      w: entry.w,
      h: entry.h,
      placements: carried.map((link) => link.tagAt),
      objects: carried.map((link) => ({
        label: tagLabel,
        ...linkDestinationInfo(link, level.id, world),
      })),
      spatial: false,
      silent: true,
    });
  }

  return {
    size: { w: level.size[0], h: level.size[1] },
    terrain,
    // In front of the objects: a sprite drawn over the plane hides the collision it is there to show.
    overlays: [{ id: COLLISION_LAYER, image: collision, inFront: true }],
    // Every footprint after every object, so none is hidden under what it belongs to, labels between the two.
    layers: [...layers, ...labels, ...footprints],
  };
}

/** Builds a world map's scene, whose signposts are placed the way a level's objects are. */
function worldScene(
  world: WorldMap,
  [terrain, path]: Pictures,
  catalog: Catalog,
  sprites: Map<string, HTMLImageElement>,
): Scene {
  const layers: SceneLayer[] = [];
  for (const [id, sign] of Object.entries(catalog.signs)) {
    const file = sign.sprites[String(world.n)];
    const image = file ? sprites.get(file) : undefined;
    if (!image) continue;
    const nodes = world.nodes.filter((node) => node.sign === id);
    const placements = nodes.map((node): [number, number] => [node.at[0], node.at[1]]);
    const objects = nodes.map((node) => {
      const to = nodeDestination(node);
      return to ? { label: node.label, to } : { label: node.label };
    });
    if (placements.length > 0) layers.push({ id, image, w: sign.w, h: sign.h, placements, objects });
  }
  return {
    size: { w: world.size[0], h: world.size[1] },
    terrain,
    overlays: [{ id: PATH_LAYER, image: tint(path, themeColor('--accent')) }],
    layers,
  };
}

/** The game's own name for the level a map belongs to, or the map's id where it has no name. */
function levelTitle(index: LevelIndex, id: string): string {
  const node = index.nodes.find((entry) => nodeKey(entry) === nodeOf(id));
  return node ? node.name : id;
}

/** One map: the scene to draw, the name to show, and the layers it can turn on and off. */
export interface Opened {
  scene: Scene;
  title: string;
  layers: LayerNode[];
}

function sceneFrom(file: MapFile, pictures: Pictures, ready: Startup): Opened {
  if (file.kind === 'world') {
    return {
      scene: worldScene(file.world, pictures, ready.catalog, ready.sprites),
      title: file.world.name,
      layers: buildWorldLayers(file.world, ready.catalog),
    };
  }
  return {
    scene: levelScene(file.level, pictures, ready.catalog, ready.sprites, ready.tags),
    title: levelTitle(ready.index, file.level.id),
    layers: buildLevelLayers(file.level, ready.catalog),
  };
}

/** Loads one map, alongside the atlas's own files rather than after them. */
export async function sceneFor(route: Route): Promise<Fetched<Opened>> {
  // Nothing in the map's own file waits on the catalog or the index, so it is asked for in the same round as
  // both, and its two pictures then land in the round that brings the sprites.
  const file = fetchMapFile(route);
  const pictures = file.then((found) => (found.ok ? loadPictures(found.value) : found));
  const [ready, found, drawn] = await Promise.all([atlasFiles(), file, pictures]);
  if (!ready.ok) return ready;
  // The index says whether a map exists, rather than the status a server chose for a file it does not have,
  // which a development server does not send at all.
  if (!found.ok) {
    return carries(ready.value.index, route) ? found : { ok: false, trouble: 'missing' };
  }
  if (!drawn.ok) return drawn;
  return { ok: true, value: sceneFrom(found.value, drawn.value, ready.value) };
}
