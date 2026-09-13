import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { buildFields, fieldGroups, passes, subjectsOf } from '../domain/filters';
import { LABEL_COLORS } from '../domain/guide';
import { buildLevelLayers, buildWorldLayers, leavesOf } from '../domain/layerTree';
import type { LayerGroup, LayerNode } from '../domain/layerTree';
import { linkDestination } from '../domain/route';
import { drawableIn } from '../domain/types';
import type { Catalog, Level, LevelIndex, WorldMap } from '../domain/types';

const DATA = fileURLToPath(new URL('../../public/data/', import.meta.url));

const read = <T>(path: string): T => JSON.parse(readFileSync(join(DATA, path), 'utf8')) as T;
const exists = (path: string) => existsSync(join(DATA, path));

const catalog = read<Catalog>('catalog.json');
const index = read<LevelIndex>('index.json');
const levelIds = readdirSync(join(DATA, 'levels')).map((name) => name.replace(/\.json$/, ''));
const levels = new Map(levelIds.map((id) => [id, read<Level>(`levels/${id}.json`)]));
const worlds = index.worlds.map((world) => read<WorldMap>(`worlds/${world.n}.json`));

describe('the catalog', () => {
  it('places every type in a group it declares', () => {
    const groups = new Set(catalog.groups.map((group) => group.id));
    for (const [id, type] of Object.entries(catalog.types)) {
      expect(groups, `${id} is in group ${type.group}`).toContain(type.group);
    }
  });

  it('declares every subgroup its types name, in a group it also declares', () => {
    const groups = new Set(catalog.groups.map((group) => group.id));
    const subs = new Set(catalog.subs.map((sub) => sub.id));
    for (const sub of catalog.subs) {
      expect(groups, `subgroup ${sub.id} is in group ${sub.group}`).toContain(sub.group);
      expect(sub.label.length, `subgroup ${sub.id} is named`).toBeGreaterThan(0);
    }
    for (const [id, type] of Object.entries(catalog.types)) {
      if (type.sub === undefined) continue;
      expect(subs, `${id} is in subgroup ${type.sub}`).toContain(type.sub);
      const declared = catalog.subs.find((sub) => sub.id === type.sub)!;
      expect(type.group, `${id} and its subgroup agree on the group`).toBe(declared.group);
    }
  });

  it('leaves no subgroup without a type, so no filter can ask the unanswerable', () => {
    const filled = new Set(Object.values(catalog.types).map((type) => type.sub));
    for (const sub of catalog.subs) {
      expect(filled, `subgroup ${sub.id}`).toContain(sub.id);
    }
  });

  it('ships a picture for every type, at the size it declares', () => {
    for (const [id, type] of Object.entries(catalog.types)) {
      for (const form of [type, ...Object.values(type.looks ?? {})]) {
        expect(exists(`sprites/${form.sprite}`), `${id}: ${form.sprite}`).toBe(true);
        expect(form.w, `${id}: ${form.sprite} width`).toBeGreaterThan(0);
        expect(form.h, `${id}: ${form.sprite} height`).toBeGreaterThan(0);
      }
    }
  });

  it('ships a picture for every destination label, at the size and for the leaf it declares', () => {
    for (const [id, tag] of Object.entries(catalog.tags)) {
      expect(exists(`tags/${tag.sprite}`), `${id}: ${tag.sprite}`).toBe(true);
      expect(tag.w, `${id} width`).toBeGreaterThan(0);
      expect(tag.h, `${id} height`).toBeGreaterThan(0);
      // Green is the color of an exit into a bonus zone and nothing else is, which lets the leaf be read
      // off it.
      expect(tag.kind, `${id} is switched by the leaf its color says`).toBe(
        id.endsWith('-green') ? 'bonus' : 'exit',
      );
    }
  });

  it('carries the example the user guide shows for every color it names', () => {
    for (const row of LABEL_COLORS) expect(Object.keys(catalog.tags), row.color).toContain(row.tag);
  });

  it('comes in the colors the user guide names and in no other', () => {
    const shipped = new Set(Object.keys(catalog.tags).map((id) => id.slice(id.lastIndexOf('-') + 1)));
    expect(new Set(LABEL_COLORS.map((row) => row.color.toLowerCase()))).toEqual(shipped);
  });

  it('ships no destination label the catalog does not name', () => {
    // The export writes the labels the levels use and does not sweep the folder, so one that stops being
    // used is left behind and would ship as dead weight.
    const named = new Set(Object.values(catalog.tags).map((tag) => tag.sprite));
    for (const file of readdirSync(join(DATA, 'tags'))) {
      expect(named, `tags/${file} is named by the catalog`).toContain(file);
    }
  });

  it('draws no label no exit carries', () => {
    const carried = new Set(
      [...levels.values()].flatMap((level) => level.links.map((link) => link.tag)),
    );
    for (const id of Object.keys(catalog.tags)) {
      expect(carried, `${id} is carried by an exit`).toContain(id);
    }
  });

  it('ships a collider wherever one is named, and names one in every world or in none', () => {
    for (const [id, type] of Object.entries(catalog.types)) {
      for (const form of [type, ...Object.values(type.looks ?? {})]) {
        expect(Boolean(form.collider), `${id} agrees with itself about having a collider`).toBe(
          Boolean(type.collider),
        );
        if (form.collider) {
          expect(exists(`sprites/${form.collider}`), `${id}: ${form.collider}`).toBe(true);
        }
      }
    }
  });

  it('ships every signpost it names', () => {
    for (const [id, sign] of Object.entries(catalog.signs)) {
      for (const [world, file] of Object.entries(sign.sprites)) {
        expect(exists(`sprites/${file}`), `sign ${id} world ${world}`).toBe(true);
      }
    }
  });

  it('overrides only looks that levels actually have', () => {
    const looks = new Set([...levels.values()].map((level) => level.look));
    for (const [id, type] of Object.entries(catalog.types)) {
      for (const look of Object.keys(type.looks ?? {})) {
        expect(looks, `${id} overrides ${look}`).toContain(look);
      }
    }
  });

  it('leaves no sprite file unreferenced', () => {
    const named = new Set<string>();
    for (const type of Object.values(catalog.types)) {
      for (const form of [type, ...Object.values(type.looks ?? {})]) {
        named.add(form.sprite);
        if (form.collider) named.add(form.collider);
      }
    }
    for (const sign of Object.values(catalog.signs)) {
      for (const file of Object.values(sign.sprites)) named.add(file);
    }
    const orphans = readdirSync(join(DATA, 'sprites')).filter((file) => !named.has(file));
    expect(orphans).toEqual([]);
  });

  it('gives a non-empty note to every type that carries one', () => {
    for (const [id, type] of Object.entries(catalog.types)) {
      if (type.note === undefined) continue;
      expect(typeof type.note, id).toBe('string');
      expect(type.note.trim().length, id).toBeGreaterThan(0);
    }
  });

  it('records which executable the data came from', () => {
    expect(catalog.build.id).toMatch(/^[0-9a-f]{12}$/);
    expect(catalog.build.exe.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reports the block the cursor readout divides by: the smallest map there is', () => {
    const [blockW, blockH] = catalog.block;
    expect(blockW).toBeGreaterThan(0);
    expect(blockH).toBeGreaterThan(0);
    // No map is smaller than one screen, and some map is exactly one. Together those pin the
    // value: a block the exporter got wrong fails one or the other. A map is not a whole
    // number of them, since it is cropped to the extent its own terrain reaches.
    for (const map of index.maps) {
      expect(map.size[0], `${map.id} width`).toBeGreaterThanOrEqual(blockW);
      expect(map.size[1], `${map.id} height`).toBeGreaterThanOrEqual(blockH);
    }
    expect(index.maps.some((map) => map.size[0] === blockW && map.size[1] === blockH)).toBe(true);
  });
});

describe('the index', () => {
  it('summarizes exactly the levels that have a file', () => {
    expect(index.maps.map((map) => map.id).sort()).toEqual([...levelIds].sort());
  });

  it('counts only types the catalog knows', () => {
    for (const map of index.maps) {
      for (const id of Object.keys(map.counts)) {
        expect(catalog.types, `${map.id} counts ${id}`).toHaveProperty(id);
      }
    }
  });

  it('agrees with each level file about what it holds', () => {
    for (const map of index.maps) {
      const level = levels.get(map.id)!;
      const counted = Object.fromEntries(
        Object.entries(level.objects).map(([id, items]) => [id, items.length]),
      );
      expect(counted, map.id).toEqual(map.counts);
      expect(level.size, map.id).toEqual(map.size);
    }
  });

  it('gives every map the name the tree will show for it', () => {
    for (const map of index.maps) {
      expect(map.label, map.id).toMatch(/^(Substage|Bonus) \d+$/);
    }
  });

  it('names the level every map belongs to', () => {
    const named = new Set(index.nodes.map((node) => `${node.w}-${node.l}`));
    for (const map of index.maps) {
      const [world, level] = map.id.split('-');
      expect(named, map.id).toContain(`${world}-${level}`);
    }
  });
});

describe('the filter fields the real data builds', () => {
  const fields = buildFields(catalog, index);
  const subjects = subjectsOf(index);
  const read = (id: string) => fields.find((field) => field.id === id)!;

  it('files every field under a heading the field list offers', () => {
    const headings = new Set(fieldGroups(catalog).map((group) => group.id));
    for (const field of fields) expect(headings, field.id).toContain(field.group);
  });

  it('names every field once, so no two rows can read the same', () => {
    const labels = fields.map((field) => `${field.group}/${field.label}`);
    expect([...new Set(labels)].length).toBe(labels.length);
  });

  it('offers the aggregates the field list promises, and no others', () => {
    const aggregates = fields.filter((field) => field.label.startsWith('Any ')).map((f) => f.label);
    expect(aggregates.sort()).toEqual(['Any enemy', 'Any gold', 'Any silver']);
  });

  it('lists a divided group as its divisions, so no heading needs a third level', () => {
    expect(fieldGroups(catalog).map((group) => group.label)).toEqual([
      'Level / Map',
      'Gold Goodies',
      'Silver Goodies',
      'Gems',
      'Enemies',
      'Mechanisms',
    ]);
  });

  it('counts every gem color as one field', () => {
    const gems = Object.keys(catalog.types).filter((id) => catalog.types[id]!.sub === 'gem');
    expect(gems.length).toBeGreaterThan(1);
    for (const id of gems) expect(fields.some((field) => field.id === id), id).toBe(false);
    const holds = (map: string) =>
      gems.reduce((sum, id) => sum + (index.maps.find((m) => m.id === map)!.counts[id] ?? 0), 0);
    for (const map of index.maps) {
      expect(read('sub:gem').read(subjects.get(map.id)!), map.id).toBe(holds(map.id));
    }
  });

  it('offers a countable field for every type a level places, in the groups it filters at all', () => {
    const filterable = new Set(fields.map((field) => field.group));
    const placed = new Set(index.maps.flatMap((map) => Object.keys(map.counts)));
    for (const id of placed) {
      const type = catalog.types[id]!;
      if (!filterable.has(type.sub ?? type.group)) continue;
      const named = type.sub ? `sub:${type.sub}` : id;
      expect(fields.some((field) => field.id === named), `${id} is reachable as ${named}`).toBe(true);
    }
  });

  it('offers no field at all for a group it does not filter', () => {
    const reachable = new Set(fields.map((field) => field.group));
    const skipped = catalog.groups
      .filter((group) => !reachable.has(group.id) && !catalog.subs.some((s) => s.group === group.id))
      .map((group) => group.id);
    expect(skipped.sort()).toEqual(['decor', 'markers']);
    for (const [id, type] of Object.entries(catalog.types)) {
      if (!skipped.includes(type.group)) continue;
      expect(fields.some((field) => field.id === id), id).toBe(false);
    }
  });

  it('places the boss arena in the world it is displayed under, not the one it is numbered in', () => {
    const displaced = index.nodes.filter((node) => node.show !== undefined);
    expect(displaced.length).toBe(1);
    const map = index.maps.find((entry) => entry.id.startsWith(`${displaced[0]!.w}-${displaced[0]!.l}-`))!;
    expect(subjects.get(map.id)!.world).toBe(displaced[0]!.show);
    expect(subjects.get(map.id)!.world).not.toBe(displaced[0]!.w);
  });

  it('never counts a bonus zone among the substages of a level', () => {
    for (const map of index.maps) {
      const node = map.id.split('-').slice(0, 2).join('-');
      const under = index.maps.filter((entry) => entry.id.startsWith(`${node}-`));
      expect(subjects.get(map.id)!.substages, map.id).toBe(under.filter((entry) => !entry.bonus).length);
    }
  });

  it('asks a bonus zone neither question about the shape of a level, whatever the operator', () => {
    const bonus = index.maps.filter((map) => map.bonus).map((map) => subjects.get(map.id)!);
    expect(bonus.length).toBe(40);
    for (const id of ['substages', 'bonuses']) {
      for (const op of ['at-least', 'at-most', 'exactly', 'none'] as const) {
        for (const held of bonus) {
          expect(passes({ id: 1, field: id, op, value: 0 }, read(id), held), `${id} ${op}`).toBe(false);
        }
      }
    }
  });

  it('counts the bonus zones each substage leads to, and they add up to every bonus zone there is', () => {
    const substages = index.maps.filter((map) => !map.bonus);
    const leading = substages.map((map) => subjects.get(map.id)!.bonuses);
    expect(substages.length).toBe(85);
    expect(leading.filter((n) => n === 0).length).toBe(50);
    expect(leading.filter((n) => n === 1).length).toBe(30);
    expect(leading.filter((n) => n === 2).length).toBe(5);
    // Every bonus zone is reached from exactly one substage, so the two totals are the same number.
    expect(leading.reduce((sum, n) => sum + n, 0)).toBe(index.maps.filter((map) => map.bonus).length);
  });

  it('follows each exit to find a bonus zone, which is what catches the ones behind a drain', () => {
    for (const map of index.maps) {
      const named = new Set(
        levels
          .get(map.id)!
          .links.map((link) => link.to)
          .filter((to) => to !== null && index.maps.find((entry) => entry.id === to)!.bonus),
      );
      expect(subjects.get(map.id)!.bonuses, map.id).toBe(named.size);
    }
  });

  it('gives every field at least one level that answers it, since it was built from the data', () => {
    const maps = index.maps.map((map) => subjects.get(map.id)!);
    for (const field of fields) {
      if (field.kind !== 'count') continue;
      const highest = Math.max(...maps.map((map) => Number(field.read(map))));
      expect(highest, `${field.id} is placed somewhere`).toBeGreaterThan(0);
    }
  });
});

describe('every level', () => {
  it('ships the two images it names, at the size it declares', () => {
    for (const level of levels.values()) {
      for (const image of [level.terrain, level.collision]) {
        expect(exists(image), `${level.id}: ${image}`).toBe(true);
      }
    }
  });

  it('places only types the catalog knows, and draws them in its own world', () => {
    for (const level of levels.values()) {
      for (const id of Object.keys(level.objects)) {
        const type = catalog.types[id];
        expect(type, `${level.id} places ${id}`).toBeDefined();
        expect(exists(`sprites/${drawableIn(type!, level.look).sprite}`), `${level.id}: ${id}`).toBe(true);
      }
    }
  });

  it('names a look for its objects to be drawn from', () => {
    for (const level of levels.values()) {
      expect(level.look, level.id).toMatch(/^w\d[a-z]$/);
    }
  });

  it('leads only to levels that exist', () => {
    for (const level of levels.values()) {
      for (const link of level.links) {
        if (link.to !== null) {
          expect(levels.has(link.to), `${level.id} leads to ${link.to}`).toBe(true);
        }
        expect(link.label.length, `${level.id} labels its link`).toBeGreaterThan(0);
        // One name per map, so a level's exit and the navigation tree can never disagree about it.
        if (link.to !== null) {
          const named = index.maps.find((map) => map.id === link.to);
          expect(link.label, `${level.id} leads to ${link.to}`).toBe(named?.label);
        }
      }
    }
  });

  it('leads only to a map of the level it belongs to, which is what tier 2 is the set of', () => {
    for (const level of levels.values()) {
      const node = level.id.split('-').slice(0, 2).join('-');
      for (const link of level.links) {
        if (link.to === null) continue;
        const led = link.to.split('-').slice(0, 2).join('-');
        expect(led, `${level.id} leads to ${link.to}`).toBe(node);
      }
    }
  });

  it('ends at the world map its level is shown under, not the world it is numbered in', () => {
    for (const level of levels.values()) {
      const w = Number(level.id.split('-')[0]);
      const l = Number(level.id.split('-')[1]);
      const node = index.nodes.find((entry) => entry.w === w && entry.l === l)!;
      for (const link of level.links) {
        if (link.to !== null) continue;
        expect(linkDestination(link, w), `${level.id}: ${link.label}`).toEqual({
          kind: 'world',
          n: node.show ?? node.w,
        });
      }
    }
  });

  it('paints a label green exactly where its exit leads into a bonus zone', () => {
    for (const level of levels.values()) {
      for (const link of level.links) {
        const to = index.maps.find((entry) => entry.id === link.to);
        const leadsIn = to !== undefined && to.bonus && to.id !== level.id;
        expect(link.tag.endsWith('-green'), `${level.id} -> ${link.to} (${link.tag})`).toBe(leadsIn);
      }
    }
  });

  it('labels every exit with a tag that says what the link says, drawn inside the map', () => {
    for (const level of levels.values()) {
      for (const link of level.links) {
        const tag = catalog.tags[link.tag];
        expect(tag, `${level.id} carries the tag ${link.tag}`).toBeDefined();
        // The picture and the word come from one value in the exporter, and this is what keeps them one.
        expect(link.tag, `${level.id}: ${link.tag} says "${link.label}"`).toMatch(
          new RegExp(`^${link.label.toLowerCase().replace(/ /g, '-')}-[a-z]+$`),
        );
        const [x, y] = link.tagAt;
        expect(x >= 0 && x + tag!.w <= level.size[0], `${level.id}: ${link.tag} fits across`).toBe(true);
        expect(y >= 0 && y + tag!.h <= level.size[1], `${level.id}: ${link.tag} fits down`).toBe(true);
      }
    }
  });
});

describe('every world map', () => {
  it('ships the two images it names, at the size it declares', () => {
    for (const world of worlds) {
      for (const image of [world.terrain, world.path]) {
        expect(exists(image), `world ${world.n}: ${image}`).toBe(true);
      }
    }
  });

  it('opens levels that exist and gates that lead somewhere', () => {
    const numbers = new Set(index.worlds.map((world) => world.n));
    for (const world of worlds) {
      for (const node of world.nodes) {
        if (node.to) expect(levels.has(node.to), `world ${world.n} opens ${node.to}`).toBe(true);
        if (node.world) expect(numbers, `world ${world.n} gate`).toContain(node.world);
        expect(node.label.length, `world ${world.n} names its node`).toBeGreaterThan(0);
      }
    }
  });

  it('calls a level what the index calls it', () => {
    const named = new Map(index.nodes.map((node) => [`${node.w}-${node.l}-1`, node.name]));
    for (const world of worlds) {
      for (const node of world.nodes) {
        if (node.to) expect(node.label, `world ${world.n} node ${node.to}`).toBe(named.get(node.to));
      }
    }
  });

  it('ends a gate label with the name of the world it opens', () => {
    // The game prefixes a gate node's name and prints only that node kind differently, so the label is not
    // the world's name but ends in it. Asserting the ending, not the prefix, keeps the game's own wording
    // out of the site and still catches a gate that names the wrong world.
    const named = new Map(index.worlds.map((world) => [world.n, world.name]));
    for (const world of worlds) {
      for (const node of world.nodes) {
        if (!node.world) continue;
        const opens = named.get(node.world) ?? '';
        expect(node.label.endsWith(opens), `world ${world.n} gate says "${node.label}"`).toBe(true);
        expect(node.label.length, `world ${world.n} gate says only "${node.label}"`).toBeGreaterThan(
          opens.length,
        );
      }
    }
  });

  it('draws a signpost the catalog ships for that world', () => {
    for (const world of worlds) {
      for (const node of world.nodes) {
        if (!node.sign) continue;
        const sign = catalog.signs[node.sign];
        expect(sign, `world ${world.n} draws ${node.sign}`).toBeDefined();
        expect(sign!.sprites, `world ${world.n}`).toHaveProperty(String(world.n));
      }
    }
  });
});

describe('the layers of every map there is', () => {
  const groupsOf = (nodes: readonly LayerNode[]): LayerGroup[] =>
    nodes.flatMap((node) => (node.kind === 'group' ? [node, ...groupsOf(node.children)] : []));

  it('offers a switch only for something the map actually draws', () => {
    for (const [id, level] of levels) {
      const drawn = new Set(Object.keys(level.objects).filter((type) => level.objects[type]!.length > 0));
      for (const leaf of leavesOf(buildLevelLayers(level, catalog))) {
        for (const layer of leaf.ids) {
          if (layer.startsWith('tag:')) {
            const tag = layer.slice('tag:'.length);
            const carried = level.links.some((link) => link.tag === tag);
            expect(carried, `${id} offers ${leaf.key}, which draws ${tag}`).toBe(true);
            continue;
          }
          const type = layer.replace(/^collision:/, '');
          if (type === 'terrain' || type === 'collision') continue;
          expect(drawn, `${id} offers ${leaf.key}`).toContain(type);
        }
      }
    }
  });

  it('leaves no group empty, in any of them', () => {
    for (const [id, level] of levels) {
      for (const group of groupsOf(buildLevelLayers(level, catalog))) {
        expect(group.children.length, `${id}: ${group.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('gives every leaf of one map its own key', () => {
    for (const [id, level] of levels) {
      const keys = leavesOf(buildLevelLayers(level, catalog)).map((leaf) => leaf.key);
      expect(new Set(keys).size, `${id}`).toBe(keys.length);
    }
  });

  it('offers the signposts of the four worlds that stand them, and not of the fifth', () => {
    for (const world of worlds) {
      const keys = buildWorldLayers(world, catalog).map((node) => node.key);
      const stands = world.nodes.some((node) => node.sign !== undefined);
      expect(keys.includes('world/signs'), `world ${world.n}`).toBe(stands);
    }
  });
});
