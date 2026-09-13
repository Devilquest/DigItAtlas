/** What is being asked of the level list: the text typed, the filters stacked, and what answers both. */
import { useMemo, useState } from 'react';

import type { Startup } from '../data/loader';
import { buildFields, fieldGroups, matches, subjectsOf } from '../domain/filters';
import type { Field, Filter } from '../domain/filters';
import type { WorldBranch } from '../domain/levels';
import { findMaps } from '../domain/search';
import type { SearchGroup } from '../domain/search';

/** A question about the levels, the vocabulary it is asked in, and its answer. */
export interface LevelSearch {
  text: string;
  setText: (text: string) => void;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  fields: Field[];
  groups: Array<{ id: string; label: string }>;
  /** Null while nothing is being asked, which is not the same as an answer with nothing in it. */
  results: SearchGroup[] | null;
}

/** Answers the level list's search and filters, and holds the fields a filter can be built from. */
export function useLevelSearch(ready: Startup | null, tree: WorldBranch[]): LevelSearch {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [text, setText] = useState('');

  const fields = useMemo(
    () => (ready ? buildFields(ready.catalog, ready.index) : []),
    [ready],
  );
  const groups = useMemo(() => (ready ? fieldGroups(ready.catalog) : []), [ready]);
  const fieldsById = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const subjects = useMemo(() => (ready ? subjectsOf(ready.index) : new Map()), [ready]);

  const results = useMemo(() => {
    if (text.trim() === '' && filters.length === 0) return null;
    const subject = (id: string) => subjects.get(id);
    return findMaps(
      tree,
      text,
      (id) => {
        const held = subject(id);
        return held !== undefined && matches(filters, fieldsById, held);
      },
      // A level-select screen answers none of the counts a filter asks about, so a filter drops it out.
      filters.length === 0,
    );
  }, [tree, text, filters, fieldsById, subjects]);

  return { text, setText, filters, setFilters, fields, groups, results };
}
