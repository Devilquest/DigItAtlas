/** Wires the keyboard shortcuts to whatever already backs each button or checkbox. */
import { useEffect, useRef } from 'react';

import { resolveShortcut } from '../domain/shortcuts';
import type { LayerGroupKey, Panel, ShortcutAction } from '../domain/shortcuts';

export interface ShortcutHandlers {
  onTogglePanel: (panel: Panel) => void;
  onToggleFilters: () => void;
  onToggleLayerGroup: (key: LayerGroupKey) => void;
  onFit: () => void;
  onActualSize: () => void;
  onToggleGoTo: () => void;
}

/** Whether a single key should be suspended: a field is being typed in, or a dialog covers the screen. */
function isTyping(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  if (element) {
    const tag = element.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable) return true;
  }
  return document.querySelector('dialog[open]') !== null;
}

function dispatch(action: ShortcutAction, handlers: ShortcutHandlers): void {
  switch (action.kind) {
    case 'toggle-panel':
      handlers.onTogglePanel(action.panel);
      return;
    case 'toggle-filters':
      handlers.onToggleFilters();
      return;
    case 'toggle-layer-group':
      handlers.onToggleLayerGroup(action.key);
      return;
    case 'fit':
      handlers.onFit();
      return;
    case 'actual-size':
      handlers.onActualSize();
      return;
    case 'toggle-goto':
      handlers.onToggleGoTo();
      return;
  }
}

/** Listens for every shortcut in the table and dispatches to the handlers current as of the last render. */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const current = useRef(handlers);
  useEffect(() => {
    current.current = handlers;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const action = resolveShortcut(
        { key: event.key, code: event.code, ctrlKey: event.ctrlKey, metaKey: event.metaKey },
        isTyping(event.target),
      );
      if (!action) return;
      event.preventDefault();
      dispatch(action, current.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
