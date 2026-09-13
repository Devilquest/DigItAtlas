/** The only place the application fetches anything. */
import type { Catalog, Level, LevelIndex, WorldMap } from '../domain/types';

const ROOT = `${import.meta.env.BASE_URL}data/`;

/** The address one exported file is served from. */
export function dataUrl(path: string): string {
  return `${ROOT}${path}?v=${__DATA_BUILD__}`;
}

/** Why something could not be loaded: there is nothing at that address, or it could not be fetched. */
export type Trouble = 'missing' | 'unreachable';

/** A request that either produced the file or did not, without throwing at the caller. */
export type Fetched<T> = { ok: true; value: T } | { ok: false; trouble: Trouble };

/** Names the failure in the terms the window states it, and the cause in the terms a console needs. */
export function failed(cause: string, trouble: Trouble): { ok: false; trouble: Trouble } {
  console.error(cause);
  return { ok: false, trouble };
}

async function json<T>(path: string): Promise<Fetched<T>> {
  try {
    const response = await fetch(dataUrl(path));
    if (!response.ok) return failed(`${path} answered ${response.status}`, 'missing');
    return { ok: true, value: (await response.json()) as T };
  } catch (error) {
    // A body that is not the file asked for lands here too, since a development server answers a path it
    // does not serve with the page rather than with a status.
    return failed(`${path} could not be read: ${String(error)}`, 'unreachable');
  }
}

/** One per exported file, each answering with the file or with the reason it could not be served. */
export const fetchCatalog = (): Promise<Fetched<Catalog>> => json<Catalog>('catalog.json');
export const fetchIndex = (): Promise<Fetched<LevelIndex>> => json<LevelIndex>('index.json');
export const fetchLevel = (id: string): Promise<Fetched<Level>> => json<Level>(`levels/${id}.json`);
export const fetchWorld = (n: number): Promise<Fetched<WorldMap>> => json<WorldMap>(`worlds/${n}.json`);
