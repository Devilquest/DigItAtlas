import { useEffect, useState } from 'react';

import { identityParts } from './domain/format';
import { groupKeys, nodeByKey } from './domain/layerTree';
import { branchKeys } from './domain/levels';
import { goTo } from './domain/route';
import { useShortcuts } from './state/shortcuts';
import { useAtlas } from './state/useAtlas';
import { useLevelSearch } from './state/useLevelSearch';
import { usePanels } from './state/usePanels';
import { usePreferences } from './state/usePreferences';
import Bar from './ui/Bar/Bar';
import FiltersPanel from './ui/FiltersPanel/FiltersPanel';
import GoTo from './ui/GoTo/GoTo';
import LayersPanel from './ui/LayersPanel/LayersPanel';
import LevelsPanel from './ui/LevelsPanel/LevelsPanel';
import MapView from './ui/MapView/MapView';
import { useMapCommands } from './ui/MapView/useMapCommands';
import Minimap from './ui/Minimap/Minimap';
import Presence from './ui/controls/Presence';

/** The application shell: the map the address names, with the panels floating over it. */
export default function App() {
  const [goToOpen, setGoToOpen] = useState(false);

  const { map, readouts, commands, openAtActualSize } = useMapCommands();
  const stored = usePreferences();
  const panels = usePanels(stored);
  const {
    ready,
    route,
    showing,
    busy,
    tree,
    layers,
    visible,
    shownLayers,
    ticked,
    layerText,
    setLayerText,
    hiddenGroups,
    toggleLayer,
    setEveryShown,
  } = useAtlas(stored, panels.collapsedGroups, readouts.cursor);
  const search = useLevelSearch(ready, tree);

  useShortcuts({
    onTogglePanel: panels.togglePanel,
    onToggleFilters: panels.toggleFilters,
    onToggleLayerGroup: (key) => {
      const node = nodeByKey(layers, key);
      if (node) toggleLayer(node);
    },
    onFit: commands.fit,
    onActualSize: commands.actualSize,
    onToggleGoTo: () => setGoToOpen((was) => !was),
  });

  useEffect(() => {
    document.title = showing.state === 'map' ? `${showing.title} | Dig It! Atlas` : 'Dig It! Atlas';
  }, [showing]);

  // One wait covers the atlas's own files and the first map both, and it ends when that map settles, drawn
  // or failed. The screen it holds up is `index.html`'s, which paints before any of this is fetched, so
  // while this is true there is nothing to draw and the window already has something on it.
  const opening =
    showing.state !== 'failed' && (!ready || (showing.state === 'loading' && showing.opening));

  useEffect(() => {
    // Taken down rather than covered, so the window it leaves is the shell's own and nothing lingers behind
    // it. Nothing later puts it back: after the first map, the loading screen never returns.
    if (!opening) document.getElementById('splash')?.remove();
  }, [opening]);

  if (opening) return null;

  if (!ready) {
    return (
      <main className="notice">
        <p>The atlas could not be loaded.</p>
        <p className="notice-detail">Its data could not be retrieved. Try reloading the page.</p>
      </main>
    );
  }

  // The map's own route, not the address, so the identity line names what is drawn while the next one loads.
  const identity = showing.state === 'map' ? identityParts(tree, showing.route, showing.scene.size) : [];

  return (
    <div className="app">
      <Bar
        identity={identity}
        readouts={readouts}
        tags={ready.catalog.tags}
        panels={panels.open}
        onTogglePanel={panels.togglePanel}
        commands={commands}
        onOpenGoTo={() => setGoToOpen(true)}
      />
      <GoTo open={goToOpen} tree={tree} onOpen={goTo} onClose={() => setGoToOpen(false)} />
      <main className="app-map">
        {showing.state === 'map' && (
          <MapView
            ref={map}
            scene={showing.scene}
            block={{ w: ready.catalog.block[0], h: ready.catalog.block[1] }}
            visible={visible}
            readouts={readouts}
            openAtActualSize={openAtActualSize}
            onNavigate={goTo}
          />
        )}
        {showing.state === 'map' && busy && (
          <div className="busy" role="progressbar" aria-label="Loading map" />
        )}
        {showing.state === 'map' && visible.size === 0 && (
          <p className="notice notice-over">No layers visible</p>
        )}
        {showing.state === 'loading' && <div className="notice">Loading…</div>}
        {showing.state === 'failed' && (
          <div className="notice">
            {showing.trouble === 'missing' ? (
              <>
                <p>There is no map at this URL.</p>
                <p className="notice-detail">Open a map from the Levels panel, or use Go to map to search for it.</p>
              </>
            ) : (
              <>
                <p>This map could not be opened.</p>
                <p className="notice-detail">Its data could not be retrieved. Try reloading the page.</p>
              </>
            )}
          </div>
        )}
      </main>
      <Presence open={panels.open.levels}>
        <LevelsPanel
          tree={tree}
          route={route}
          open={panels.branches}
          text={search.text}
          results={search.results}
          filterCount={search.filters.length}
          filtersOpen={panels.filtersOpen}
          onText={search.setText}
          onOpen={goTo}
          onToggleBranch={panels.toggleBranch}
          onRevealBranches={panels.revealBranches}
          onExpandAll={() => panels.setBranches(branchKeys(tree))}
          onCollapseAll={() => panels.setBranches([])}
          onToggleFilters={panels.toggleFilters}
        />
      </Presence>
      <Presence open={panels.open.levels && panels.filtersOpen}>
        <FiltersPanel
          fields={search.fields}
          groups={search.groups}
          filters={search.filters}
          onChange={search.setFilters}
        />
      </Presence>
      <div className="rail-right">
        <Presence open={panels.open.layers && showing.state === 'map'}>
          <LayersPanel
            layers={shownLayers}
            text={layerText}
            on={ticked}
            collapsed={hiddenGroups}
            onText={setLayerText}
            onToggle={toggleLayer}
            onCollapse={panels.toggleGroup}
            // Selecting follows the search, so that every effect of the command is on screen when it
            // runs; expanding cannot run at all while one does, which the panel itself enforces.
            onExpandAll={() => panels.collapseGroups([])}
            onCollapseAll={() => panels.collapseGroups(groupKeys(layers))}
            onSelectAll={() => setEveryShown(true)}
            onDeselectAll={() => setEveryShown(false)}
          />
        </Presence>
        <Presence open={panels.open.minimap && showing.state === 'map'}>
          {showing.state === 'map' && (
            <Minimap
              scene={showing.scene}
              viewport={readouts.viewport}
              onCenter={commands.centerOn}
              onZoom={commands.zoomCenteredOn}
            />
          )}
        </Presence>
      </div>
    </div>
  );
}
