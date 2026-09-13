/** Everything the bar puts into words: which map is on screen, where the pointer is, how far it is zoomed. */
import type { Point, Size } from '../engine/geometry';
import type { WorldBranch } from './levels';
import type { Route } from './route';

const measure = (size: Size): string => `${size.w}x${size.h}`;

/** One part of the identity line, and whether it is the part that names the map itself. */
export interface IdentityPart {
  text: string;
  strong?: boolean;
}

/** Says a repeated name once, keeping the emphasized of the two. */
function withoutEchoes(parts: IdentityPart[]): IdentityPart[] {
  const kept: IdentityPart[] = [];
  for (const part of parts) {
    const last = kept.at(-1);
    if (last?.text !== part.text) kept.push(part);
    else if (part.strong) kept[kept.length - 1] = part;
  }
  return kept;
}

/** The identity line's parts, in the order the bar shows them, or none where the address names no map. */
export function identityParts(tree: WorldBranch[], route: Route, size: Size): IdentityPart[] {
  if (route.kind === 'world') {
    const world = tree.find((branch) => branch.n === route.n);
    if (!world) return [];
    return withoutEchoes([
      { text: world.name },
      { text: 'World Map', strong: true },
      { text: measure(size) },
    ]);
  }
  if (route.kind === 'level') {
    for (const world of tree) {
      for (const level of world.levels) {
        const leaf = level.maps.find((map) => map.id === route.id);
        if (!leaf) continue;
        // A level with one map is that map, in the bar as in the tree, so naming it twice says nothing.
        return withoutEchoes([
          { text: world.name },
          { text: level.name, strong: true },
          ...(level.maps.length === 1 ? [] : [{ text: leaf.label }]),
          { text: measure(size) },
        ]);
      }
    }
  }
  return [];
}

/**
 * Where the pointer is, in the map's own pixels and in blocks, or blank wherever it is not on the map.
 *
 * @param block - One screen, from the catalog, which the column and row halves count in.
 */
export function cursorReadout(at: Point | null, size: Size, block: Size): string {
  if (!at) return '';
  const x = Math.floor(at.x);
  const y = Math.floor(at.y);
  if (x < 0 || y < 0 || x >= size.w || y >= size.h) return '';
  return `X ${x}  Y ${y} · C ${Math.floor(x / block.w)}  R ${Math.floor(y / block.h)}`;
}

/** Where one object sits, in the same X/Y words the cursor readout uses. */
export function objectPosition(x: number, y: number): string {
  return `X ${x}  Y ${y}`;
}

/** The size of a type's drawing box, and how much of it the map edge leaves visible. */
export function spriteSize(w: number, h: number, visible?: Size): string {
  const box = `${w} x ${h} px`;
  return visible && (visible.w < w || visible.h < h)
    ? `${box} (visible ${visible.w} x ${visible.h} px)`
    : box;
}

/** What a toggle that shows and hides a panel says it will do, and the key that does it too. */
export function panelToggleTitle(label: string, shortcut: string, open: boolean): string {
  return `${open ? 'Hide' : 'Show'} ${label} panel (${shortcut})`;
}

/** The zoom as the bar states it, in whole percent. */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/**
 * What the results header says, in one wording for a search, for the filters, and for both at once.
 *
 * @param filters - How many conditions are stacked, which the header names so that a shortened list says
 * where the shortening came from.
 */
export function resultsHeader(found: number, filters: number): string {
  const matched = found === 0 ? 'No matching levels' : found === 1 ? '1 match' : `${found} matches`;
  return filters === 0 ? matched : `${matched} · ${filters} ${filters === 1 ? 'filter' : 'filters'}`;
}

/** A label split around the searched-for text: what comes before it, the match itself, and the rest. */
export interface MarkedLabel {
  before: string;
  hit: string;
  after: string;
}

/**
 * Splits a label around the text a search matched it on, for the panels that mark what they found.
 *
 * @returns the first occurrence, with an empty `hit` where the search is blank or matched elsewhere.
 */
export function markedLabel(label: string, text: string): MarkedLabel {
  const wanted = text.trim();
  const at = wanted === '' ? -1 : label.toLowerCase().indexOf(wanted.toLowerCase());
  if (at < 0) return { before: label, hit: '', after: '' };
  return {
    before: label.slice(0, at),
    hit: label.slice(at, at + wanted.length),
    after: label.slice(at + wanted.length),
  };
}
