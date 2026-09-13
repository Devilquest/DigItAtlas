/** The shapes the exporter writes and this application reads. */

/** A map's id: its world, its level, and its substage joined by hyphens, each counted from one. */
export type MapId = string;

/** Which executable the data was read from, and an identifier over everything the export states. */
export interface BuildStamp {
  exe: { name: string; size: number; sha256: string };
  exported: string;
  id: string;
}

/** One drawable form of an object type: its picture, that picture's size, and its footprint if it has one. */
export interface Drawable {
  sprite: string;
  w: number;
  h: number;
  collider?: string;
}

/** One kind of object, described once for the whole atlas. */
export interface ObjectType extends Drawable {
  label: string;
  group: string;
  /** The subgroup within that group, which only the goodies are divided into. */
  sub?: string;
  /** A curated sentence for the tooltip, on the types that carry one. */
  note?: string;
  /** Keyed by look, for the looks that do not draw this type the default way. */
  looks?: Record<string, Drawable>;
}

/** A division inside one group, shown apart in the layers panel and countable on its own in a filter. */
export interface SubGroup {
  id: string;
  label: string;
  group: string;
}

/** One kind of signpost, whose art differs in every world that has any. */
export interface SignType {
  w: number;
  h: number;
  /** Keyed by world number; a world absent here draws no signpost of this kind. */
  sprites: Record<string, string>;
}

/** One destination label, drawn ahead of time because a browser has no way to write in the game's font. */
export interface Tag {
  sprite: string;
  w: number;
  h: number;
  /** Which Info Overlays leaf switches it, which follows the marker rather than the destination. */
  kind: 'exit' | 'bonus';
}

export interface Catalog {
  build: BuildStamp;
  /** One screen of the game, in map pixels: every map's size is a whole number of these. */
  block: [number, number];
  groups: Array<{ id: string; label: string }>;
  subs: SubGroup[];
  types: Record<string, ObjectType>;
  signs: Record<string, SignType>;
  tags: Record<string, Tag>;
}

/** One level map, summarized well enough to search and filter without fetching anything else. */
export interface MapSummary {
  id: MapId;
  /** What the navigation tree and the maps' own exits both call this map. */
  label: string;
  bonus: boolean;
  /** How many distinct bonus zones this map's own exits lead to, absent where none. */
  bonuses?: number;
  size: [number, number];
  /** How many of each object type the map holds, absent where none. */
  counts: Record<string, number>;
}

/** A level, named once however many substages it has. */
export interface LevelNode {
  w: number;
  l: number;
  name: string;
  /** The world this level is displayed under, when that differs from the world it is numbered in. */
  show?: number;
}

export interface LevelIndex {
  worlds: Array<{ n: number; name: string }>;
  nodes: LevelNode[];
  maps: MapSummary[];
}

/** One placed object: its position, plus a facing of 1 or -1 for the objects that have one. */
export type Placement = [number, number] | [number, number, 1 | -1];

/** Where one exit leads, and the word the map and the navigation tree both use for it. */
export interface Link {
  at: [number, number];
  to: MapId | null;
  label: string;
  /** The label picture the map draws over this exit, keyed into the catalog's tags. */
  tag: string;
  /** Where that picture's top-left goes: above the marker, and inside the map. */
  tagAt: [number, number];
}

export interface Level {
  id: MapId;
  /** The game's own filename stem, which is the provenance of everything else here. */
  stem: string;
  /** Which of a type's pictures this level's objects are drawn from. */
  look: string;
  size: [number, number];
  terrain: string;
  collision: string;
  objects: Record<string, Placement[]>;
  links: Link[];
}

/** One stop on a world map's path: a level, a gate to another world, or a place that is neither. */
export interface WorldNode {
  /** The signpost's top-left, or the node's own pixel where the world draws no signposts. */
  at: [number, number];
  label: string;
  sign?: string;
  to?: MapId;
  world?: number;
}

export interface WorldMap {
  n: number;
  map: string;
  name: string;
  size: [number, number];
  terrain: string;
  path: string;
  nodes: WorldNode[];
}

/** The drawable form of a type in one look, falling back to the form that covers the rest. */
export function drawableIn(type: ObjectType, look: string): Drawable {
  return type.looks?.[look] ?? type;
}
