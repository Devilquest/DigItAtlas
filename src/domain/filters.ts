/** What a map can be asked about, and whether one answers yes. */
import { nodeKey, nodeOf, worldOf } from './mapId';
import type { Catalog, LevelIndex, MapId } from './types';

/** What a field holds, which decides both its operators and the control its value is picked with. */
export type FieldKind = 'count' | 'choice' | 'flag';

/** What a condition asks of its field's value. */
export type Operator = 'at-least' | 'at-most' | 'exactly' | 'none' | 'is' | 'is-not';

/** One map, reduced to what a filter can read off it. */
export interface Subject {
  /** The world the map is shown under, which is not always the world its id numbers it in. */
  world: number;
  bonus: boolean;
  size: [number, number];
  /** How many playable maps the level this one belongs to holds, its bonus zones excluded. */
  substages: number;
  /** How many distinct bonus zones this map's own exits lead to. */
  bonuses: number;
  counts: Record<string, number>;
}

/** One value a closed-choice field offers. */
export interface Choice {
  value: string;
  label: string;
}

/** One thing a filter can ask about, and how to read it off a map. */
export interface Field {
  id: string;
  label: string;
  /** The group id the field list files it under. */
  group: string;
  kind: FieldKind;
  choices?: Choice[];
  read: (subject: Subject) => number | string | boolean;
  /** Whether the field is one this map is asked at all; a map it is not about never matches. */
  asks?: (subject: Subject) => boolean;
}

/** One condition: a field, an operator, and a value where the operator takes one. */
export interface Filter {
  /** This row's own identity, which survives every edit to it and which removal names. */
  id: number;
  field: string;
  op: Operator;
  value: number | string;
}

const OPERATORS: Record<FieldKind, Operator[]> = {
  count: ['at-least', 'at-most', 'exactly', 'none'],
  choice: ['is', 'is-not'],
  flag: ['is', 'is-not'],
};

/** How each operator reads in a filter row. */
export const OPERATOR_LABELS: Record<Operator, string> = {
  'at-least': 'at least',
  'at-most': 'at most',
  exactly: 'exactly',
  none: 'none',
  is: 'is',
  'is-not': 'is not',
};

/** The group the level's own properties are listed under, which is not one of the catalog's. */
export const LEVEL_GROUP = { id: 'level', label: 'Level / Map' };

/** The groups offering a field that counts the whole group, under the name that field carries. */
const GROUP_TOTALS: Record<string, string> = { enemies: 'Any enemy' };

/** The catalog groups the field list offers nothing for, drawn and layered like any other. */
const UNFILTERABLE = new Set(['markers', 'decor']);

/** The most conditions one query may hold, past which a stack stops being a question anyone can read. */
export const MAX_FILTERS = 20;

/** The operators a field of that kind offers, which is never a global list. */
export function operatorsFor(kind: FieldKind): Operator[] {
  return OPERATORS[kind];
}

/** Whether an operator asks for a value beside it, which absence and the yes-or-no operators do not. */
export function takesValue(kind: FieldKind, op: Operator): boolean {
  return kind !== 'flag' && op !== 'none';
}

const total = (ids: string[]) => (subject: Subject) =>
  ids.reduce((sum, id) => sum + (subject.counts[id] ?? 0), 0);

/** The heading a divided group's subgroup is listed under, where the subgroup's own label is not it. */
const SUB_HEADINGS: Record<string, string> = {
  gold: 'Gold Goodies',
  silver: 'Silver Goodies',
  gem: 'Gems',
};

/** The headings the field list is divided into, the level's own first and the catalog's in its order. */
export function fieldGroups(catalog: Catalog): Array<{ id: string; label: string }> {
  const headings = [LEVEL_GROUP];
  for (const group of catalog.groups) {
    if (UNFILTERABLE.has(group.id)) continue;
    const subs = catalog.subs.filter((sub) => sub.group === group.id);
    if (subs.length === 0) headings.push(group);
    else headings.push(...subs.map((sub) => ({ id: sub.id, label: SUB_HEADINGS[sub.id] ?? sub.label })));
  }
  return headings;
}

function levelFields(index: LevelIndex): Field[] {
  // Not alphabetical, unlike the catalog groups below: what a map is comes before how big it is.
  return [
    {
      id: 'world',
      label: 'World',
      group: LEVEL_GROUP.id,
      kind: 'choice',
      choices: index.worlds.map((world) => ({ value: String(world.n), label: world.name })),
      read: (subject) => String(subject.world),
    },
    {
      id: 'bonus',
      label: 'Is a bonus zone',
      group: LEVEL_GROUP.id,
      kind: 'flag',
      read: (subject) => subject.bonus,
    },
    { id: 'width', label: 'Width', group: LEVEL_GROUP.id, kind: 'count', read: (s) => s.size[0] },
    { id: 'height', label: 'Height', group: LEVEL_GROUP.id, kind: 'count', read: (s) => s.size[1] },
    // A bonus zone has no substages of its own and leads to no further bonus zone, so it is not a map
    // either of these two is about and never answers one, whatever the operator.
    {
      id: 'substages',
      label: 'Substages in the level',
      group: LEVEL_GROUP.id,
      kind: 'count',
      read: (subject) => subject.substages,
      asks: (subject) => !subject.bonus,
    },
    {
      id: 'bonuses',
      label: 'Bonus zones it leads to',
      group: LEVEL_GROUP.id,
      kind: 'count',
      read: (subject) => subject.bonuses,
      asks: (subject) => !subject.bonus,
    },
  ];
}

function countField(id: string, label: string, group: string, ids: string[]): Field {
  return { id, label, group, kind: 'count', read: total(ids) };
}

function groupFields(catalog: Catalog, group: string): Field[] {
  const ids = Object.keys(catalog.types).filter((id) => catalog.types[id]!.group === group);
  const fields: Field[] = [];

  // A type's subgroup is its heading where it has one, since the whole group is listed as its divisions.
  for (const sub of catalog.subs.filter((entry) => entry.group === group)) {
    const under = ids.filter((id) => catalog.types[id]!.sub === sub.id);
    const labels = new Set(under.map((id) => catalog.types[id]!.label));
    if (labels.size === 1) {
      // A subgroup whose types all carry one name is one thing, however many pictures it has.
      fields.push(countField(`sub:${sub.id}`, sub.label, sub.id, under));
    } else {
      fields.push(countField(`sub:${sub.id}`, `Any ${sub.label.toLowerCase()}`, sub.id, under));
      for (const id of under) fields.push(countField(id, catalog.types[id]!.label, sub.id, [id]));
    }
  }

  const totalLabel = GROUP_TOTALS[group];
  if (totalLabel) fields.push(countField(`group:${group}`, totalLabel, group, ids));
  for (const id of ids.filter((id) => catalog.types[id]!.sub === undefined)) {
    fields.push(countField(id, catalog.types[id]!.label, group, [id]));
  }

  return fields.sort((a, b) => a.label.localeCompare(b.label));
}

/** Every field there is to filter on, built from the data so that nothing unplaced is ever offered. */
export function buildFields(catalog: Catalog, index: LevelIndex): Field[] {
  return [
    ...levelFields(index),
    ...catalog.groups
      .filter((group) => !UNFILTERABLE.has(group.id))
      .flatMap((group) => groupFields(catalog, group.id)),
  ];
}

/** Every map reduced to what a filter reads, keyed by the map's id. */
export function subjectsOf(index: LevelIndex): Map<MapId, Subject> {
  const shown = new Map(index.nodes.map((node) => [nodeKey(node), node.show ?? node.w]));
  const substages = new Map<string, number>();
  for (const map of index.maps) {
    if (!map.bonus) substages.set(nodeOf(map.id), (substages.get(nodeOf(map.id)) ?? 0) + 1);
  }
  return new Map(
    index.maps.map((map) => [
      map.id,
      {
        world: shown.get(nodeOf(map.id)) ?? worldOf(map.id),
        bonus: map.bonus,
        size: map.size,
        substages: substages.get(nodeOf(map.id)) ?? 0,
        // Counted per map by the exporter, since a level's bonus zones are reached from one substage each.
        bonuses: map.bonuses ?? 0,
        counts: map.counts,
      },
    ]),
  );
}

/**
 * One more condition on the end of a stack.
 *
 * @returns The stack unchanged where it already holds as many conditions as a query may.
 */
export function addFilter(filters: readonly Filter[], field: Field): Filter[] {
  if (filters.length >= MAX_FILTERS) return [...filters];
  // Taken from the rows rather than counted up, so that a row's identity survives the panel being closed.
  const id = filters.reduce((highest, filter) => Math.max(highest, filter.id), 0) + 1;
  return [...filters, newFilter(field, id)];
}

/** A condition on a freshly picked field, opened at the reading that is asked for most. */
export function newFilter(field: Field, id: number): Filter {
  if (field.kind === 'count') return { id, field: field.id, op: 'at-least', value: 1 };
  if (field.kind === 'choice') return { id, field: field.id, op: 'is', value: field.choices?.[0]?.value ?? '' };
  return { id, field: field.id, op: 'is', value: '' };
}

/** The same row aimed at another field, keeping the reading only where it still means the same thing. */
export function refield(filter: Filter, was: Field, now: Field): Filter {
  const fresh = newFilter(now, filter.id);
  return was.kind === 'count' && now.kind === 'count'
    ? { ...fresh, op: filter.op, value: filter.value }
    : fresh;
}

/** Whether one map answers yes to one condition. */
export function passes(filter: Filter, field: Field, subject: Subject): boolean {
  if (field.asks && !field.asks(subject)) return false;
  const got = field.read(subject);
  switch (filter.op) {
    case 'at-least':
      return typeof got === 'number' && got >= Number(filter.value);
    case 'at-most':
      return typeof got === 'number' && got <= Number(filter.value);
    case 'exactly':
      return typeof got === 'number' && got === Number(filter.value);
    case 'none':
      return got === 0;
    case 'is':
      return typeof got === 'boolean' ? got : got === filter.value;
    case 'is-not':
      return typeof got === 'boolean' ? !got : got !== filter.value;
  }
}

/**
 * Whether one map answers yes to every condition.
 *
 * @returns False for a condition naming a field that does not exist, which no map can answer.
 */
export function matches(filters: readonly Filter[], fields: Map<string, Field>, subject: Subject): boolean {
  return filters.every((filter) => {
    const field = fields.get(filter.field);
    return field !== undefined && passes(filter, field, subject);
  });
}
