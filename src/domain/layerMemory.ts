/** What the visitor has said about the layers, and which of it governs one the next map is about to draw. */
import { leavesOf } from './layerTree';
import type { LayerNode } from './layerTree';

/** The key covering every layer there is, which only a command acting on all of them speaks about. */
export const ALL_LAYERS = '*';

/** One thing said about a key, and when it was said. */
export interface Statement {
  on: boolean;
  at: number;
}

/** Everything said so far, by the key it was said about. */
export type LayerMemory = Record<string, Statement>;

/** A key, then every key that covers it, from the nearest group out to everything. */
function ancestry(key: string): string[] {
  const parts = key.split('/');
  const keys = parts.map((_, at) => parts.slice(0, parts.length - at).join('/'));
  return [...keys, ALL_LAYERS];
}

/** The statement that governs one key: the most recent of its own and of those covering it. */
function governing(key: string, memory: LayerMemory): Statement | undefined {
  let latest: Statement | undefined;
  for (const held of ancestry(key)) {
    const said = memory[held];
    if (said && (latest === undefined || said.at > latest.at)) latest = said;
  }
  return latest;
}

/** The next number a statement takes, which orders statements without reading a clock. */
function nextAt(memory: LayerMemory): number {
  return Object.values(memory).reduce((last, said) => Math.max(last, said.at), 0) + 1;
}

/** One action's statement about each of the keys it spoke for, all of them equally recent. */
export function record(memory: LayerMemory, keys: readonly string[], on: boolean): LayerMemory {
  if (keys.length === 0) return memory;
  const at = nextAt(memory);
  const next = { ...memory };
  for (const key of keys) next[key] = { on, at };
  return next;
}

/** Which leaves a map opens with: what was said most recently about each, or its own default. */
export function resolve(nodes: readonly LayerNode[], memory: LayerMemory): Set<string> {
  const on = new Set<string>();
  for (const leaf of leavesOf(nodes)) {
    const said = governing(leaf.key, memory);
    if (said ? said.on : leaf.on) on.add(leaf.key);
  }
  return on;
}

/**
 * The outermost keys a command may speak for: a node whose every leaf it reached, and `ALL_LAYERS` where
 * that is the whole map.
 *
 * @param covered - The leaf keys the command acted on, which a search narrows.
 */
export function spokenFor(nodes: readonly LayerNode[], covered: ReadonlySet<string>): string[] {
  if (covered.size === 0) return [];
  const whole = (node: LayerNode) => leavesOf([node]).every((leaf) => covered.has(leaf.key));
  if (nodes.every(whole)) return [ALL_LAYERS];
  const keys: string[] = [];
  const walk = (node: LayerNode) => {
    if (whole(node)) keys.push(node.key);
    else if (node.kind === 'group') node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return keys;
}
