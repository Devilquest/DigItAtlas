/** Narrowing the maps down to the ones asked for, and the shape the results are listed in. */
import type { WorldBranch } from './levels';
import type { Route } from './route';
import type { MapId } from './types';

/** One map, or one world's own screen, that a query kept, named as the results list shows it. */
export interface SearchHit {
  route: Route;
  label: string;
}

/** The results of one world, which the list keeps grouped. */
export interface SearchGroup {
  n: number;
  name: string;
  hits: SearchHit[];
}

/** What a world's own screen is named, since it carries no name of its own to search by otherwise. */
const WORLD_MAP_LABEL = 'World Map';

/**
 * Every map the text and the filters keep, plus the world maps the text names, grouped by world.
 *
 * @param text - Matched against a level's name, or a world's for its own screen; empty text excludes nothing.
 * @param keep - Answers whether one map survives the filters; every map does where there are none.
 * @param includeWorldMaps - False while filters narrow the results, since a level-select screen answers
 *   none of the counts a filter asks about.
 */
export function findMaps(
  tree: WorldBranch[],
  text: string,
  keep: (id: MapId) => boolean = () => true,
  includeWorldMaps = true,
): SearchGroup[] {
  const wanted = text.trim().toLowerCase();
  const namesTheRow = WORLD_MAP_LABEL.toLowerCase().includes(wanted);

  const groups: SearchGroup[] = [];
  for (const world of tree) {
    const hits: SearchHit[] = [];
    const worldMatches = wanted !== '' && world.name.toLowerCase().includes(wanted);
    if (includeWorldMaps && (wanted === '' || worldMatches || namesTheRow)) {
      hits.push({ route: { kind: 'world', n: world.n }, label: WORLD_MAP_LABEL });
    }
    for (const level of world.levels) {
      if (wanted !== '' && !worldMatches && !level.name.toLowerCase().includes(wanted)) continue;
      for (const map of level.maps) {
        if (!keep(map.id)) continue;
        const label = level.maps.length === 1 ? level.name : `${level.name} · ${map.label}`;
        hits.push({ route: { kind: 'level', id: map.id }, label });
      }
    }
    if (hits.length > 0) groups.push({ n: world.n, name: world.name, hits });
  }
  return groups;
}

/** How many maps a set of groups holds, which is what the results header counts. */
export function countHits(groups: SearchGroup[]): number {
  return groups.reduce((total, group) => total + group.hits.length, 0);
}
