/** A map's id is its world, its level, and its substage, and these are the ways the application reads it. */
import type { LevelNode, MapId } from './types';

/** The world a map is numbered in, which is not always the world it is shown under. */
export const worldOf = (id: MapId): number => Number(id.split('-')[0]);

/** The substage's own number inside its level. */
export const substageOf = (id: MapId): number => Number(id.split('-')[2]);

/** The level a map belongs to, which is its id without the substage. */
export const nodeOf = (id: MapId): string => id.split('-').slice(0, 2).join('-');

/** The same key read off the level itself, which carries its world and its level as numbers. */
export const nodeKey = (node: Pick<LevelNode, 'w' | 'l'>): string => `${node.w}-${node.l}`;
