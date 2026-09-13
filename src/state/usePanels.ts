/** What is open and what is closed: the panels, the filters drawer, and the branches of both trees. */
import { useCallback, useMemo, useState } from 'react';

import type { Panel } from '../domain/shortcuts';
import type { Stored } from './usePreferences';

/** One key in or out of a remembered list, which is what both trees do to theirs. */
const withKey = (keys: readonly string[], key: string): string[] =>
  keys.includes(key) ? keys.filter((held) => held !== key) : [...keys, key];

/** Every surface that opens and closes, and the one action that opens or closes each. */
export interface Panels {
  /** Which of the three panels are open, under the name a key toggles each of them by. */
  open: Record<Panel, boolean>;
  togglePanel: (panel: Panel) => void;
  filtersOpen: boolean;
  toggleFilters: () => void;
  /** The branches of the Levels tree that are open. */
  branches: string[];
  toggleBranch: (key: string) => void;
  revealBranches: (keys: string[]) => void;
  setBranches: (keys: string[]) => void;
  collapsedGroups: ReadonlySet<string>;
  toggleGroup: (key: string) => void;
  collapseGroups: (keys: string[]) => void;
}

/** Opens and closes everything that stays open across visits, plus the filters drawer, which does not. */
export function usePanels({ preferences, update }: Stored): Panels {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const togglePanel = useCallback(
    (panel: Panel) => {
      update((was) => ({ ...was, panels: { ...was.panels, [panel]: !was.panels[panel] } }));
      // Filters filter levels, so a state where they are visible and the levels are not is not reachable.
      if (panel === 'levels') setFiltersOpen(false);
    },
    [update],
  );

  const toggleFilters = useCallback(() => {
    setFiltersOpen((was) => {
      const opening = !was;
      // Filters is a drawer of Levels, so opening it with Levels closed opens Levels too; the button this
      // also drives can only be reached while Levels already is, so this is a no-op there.
      if (opening) {
        update((wasPrefs) =>
          wasPrefs.panels.levels ? wasPrefs : { ...wasPrefs, panels: { ...wasPrefs.panels, levels: true } },
        );
      }
      return opening;
    });
  }, [update]);

  const toggleBranch = useCallback((key: string) => {
    update((was) => ({ ...was, open: withKey(was.open, key) }));
  }, [update]);

  const revealBranches = useCallback((keys: string[]) => {
    update((was) => {
      const missing = keys.filter((key) => !was.open.includes(key));
      return missing.length === 0 ? was : { ...was, open: [...was.open, ...missing] };
    });
  }, [update]);

  const setBranches = useCallback((keys: string[]) => {
    update((was) => ({ ...was, open: keys }));
  }, [update]);

  const toggleGroup = useCallback((key: string) => {
    update((was) => ({ ...was, collapsed: withKey(was.collapsed, key) }));
  }, [update]);

  const collapseGroups = useCallback((keys: string[]) => {
    update((was) => ({ ...was, collapsed: keys }));
  }, [update]);

  const collapsedGroups = useMemo(() => new Set(preferences.collapsed), [preferences.collapsed]);

  return {
    open: preferences.panels,
    togglePanel,
    filtersOpen,
    toggleFilters,
    branches: preferences.open,
    toggleBranch,
    revealBranches,
    setBranches,
    collapsedGroups,
    toggleGroup,
    collapseGroups,
  };
}
