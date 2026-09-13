import { useEffect, useMemo } from 'react';

import { panelToggleTitle, resultsHeader } from '../../domain/format';
import { branchesTo, levelKey, worldKey } from '../../domain/levels';
import type { LevelBranch, WorldBranch } from '../../domain/levels';
import { routeToHash, sameRoute } from '../../domain/route';
import type { Route } from '../../domain/route';
import { countHits } from '../../domain/search';
import type { SearchGroup } from '../../domain/search';
import Marked from '../controls/Marked';
import Panel from '../controls/Panel';
import SearchField from '../controls/SearchField';
import TreeCommands from '../controls/TreeCommands';
import { CaretMark } from '../controls/icons';
import './LevelsPanel.css';

interface LevelsPanelProps {
  tree: WorldBranch[];
  route: Route;
  open: readonly string[];
  text: string;
  /** What the query kept, or null where nothing narrows the levels and the tree is what is shown. */
  results: SearchGroup[] | null;
  /** How many conditions are stacked, which the header names and the toggle wears. */
  filterCount: number;
  filtersOpen: boolean;
  onText: (text: string) => void;
  onOpen: (route: Route) => void;
  onToggleBranch: (key: string) => void;
  onRevealBranches: (keys: string[]) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleFilters: () => void;
}

interface RowProps {
  depth: number;
  label: string;
  /** What the search matched the row on, which the label marks; blank in the tree, which no search shows. */
  mark?: string;
  /** Present on a branch, absent on a leaf. */
  open?: boolean;
  current?: boolean;
  onClick: () => void;
}

function Row({ depth, label, mark, open, current, onClick }: RowProps) {
  return (
    <button
      type="button"
      className={current ? 'rowbutton row rowbutton-current row-current' : 'rowbutton row'}
      style={{ paddingLeft: `calc(var(--space-2) + ${depth} * var(--space-4))` }}
      aria-expanded={open}
      aria-current={current ? true : undefined}
      onClick={onClick}
    >
      <CaretMark open={open} />
      <span className="row-label">
        <Marked label={label} text={mark ?? ''} />
      </span>
    </button>
  );
}

interface LevelItemProps {
  level: LevelBranch;
  open: boolean;
  route: Route;
  onToggle: () => void;
  onOpen: (route: Route) => void;
}

function LevelItem({ level, open, route, onToggle, onOpen }: LevelItemProps) {
  const current = (id: string) => route.kind === 'level' && route.id === id;

  const only = level.maps.length === 1 ? level.maps[0] : undefined;
  if (only) {
    return (
      <li>
        <Row
          depth={1}
          label={level.name}
          current={current(only.id)}
          onClick={() => onOpen({ kind: 'level', id: only.id })}
        />
      </li>
    );
  }

  return (
    <li>
      <Row depth={1} label={level.name} open={open} onClick={onToggle} />
      {open && (
        <ul>
          {level.maps.map((map) => (
            <li key={map.id}>
              <Row
                depth={2}
                label={map.label}
                current={current(map.id)}
                onClick={() => onOpen({ kind: 'level', id: map.id })}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** The tree of worlds, levels, and maps, the search over it, and the panel both sit in. */
export default function LevelsPanel({
  tree,
  route,
  open,
  text,
  results,
  filterCount,
  filtersOpen,
  onText,
  onOpen,
  onToggleBranch,
  onRevealBranches,
  onExpandAll,
  onCollapseAll,
  onToggleFilters,
}: LevelsPanelProps) {
  const expanded = useMemo(() => new Set(open), [open]);

  useEffect(() => {
    const reveal =
      route.kind === 'level'
        ? branchesTo(tree, route.id)
        : route.kind === 'world'
          ? [worldKey(route.n)]
          : [];
    if (reveal.length > 0) onRevealBranches(reveal);
  }, [tree, route, onRevealBranches]);

  return (
    <Panel
      title="Levels"
      home="top-left"
      className="levels-panel"
      action={
        <div className="icon-buttons">
          <TreeCommands
            // The results list has nothing to open, and a tree nobody can see would change under them.
            disabled={results !== null}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
          <span className="icon-buttons-split" />
          <button
            type="button"
            className="levels-filters"
            data-filtered={filterCount > 0}
            title={panelToggleTitle('Filters', 'F', filtersOpen)}
            aria-pressed={filtersOpen}
            onClick={onToggleFilters}
          >
            Filters
            {filterCount > 0 && <span className="levels-filters-count">{filterCount}</span>}
          </button>
        </div>
      }
    >
      <SearchField label="Search levels" value={text} onChange={onText} />

      {results === null ? (
        <ul className="tree">
          {tree.map((world) => (
            <li key={worldKey(world.n)}>
              <Row
                depth={0}
                label={world.name}
                open={expanded.has(worldKey(world.n))}
                onClick={() => onToggleBranch(worldKey(world.n))}
              />
              {expanded.has(worldKey(world.n)) && (
                <ul>
                  <li>
                    <Row
                      depth={1}
                      label="World Map"
                      current={route.kind === 'world' && route.n === world.n}
                      onClick={() => onOpen({ kind: 'world', n: world.n })}
                    />
                  </li>
                  {world.levels.map((level) => (
                    <LevelItem
                      key={levelKey(level)}
                      level={level}
                      open={expanded.has(levelKey(level))}
                      route={route}
                      onToggle={() => onToggleBranch(levelKey(level))}
                      onOpen={onOpen}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="results-count">{resultsHeader(countHits(results), filterCount)}</p>
          {results.length > 0 && (
            <ul className="tree">
              {results.map((group) => (
                <li key={group.n}>
                  <p className="group-heading">{group.name}</p>
                  <ul>
                    {group.hits.map((hit) => (
                      <li key={routeToHash(hit.route)}>
                        <Row
                          depth={0}
                          label={hit.label}
                          mark={text}
                          current={sameRoute(route, hit.route)}
                          onClick={() => onOpen(hit.route)}
                        />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
