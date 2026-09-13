import { useEffect, useMemo, useRef, useState } from 'react';

import type { WorldBranch } from '../../domain/levels';
import { routeToHash } from '../../domain/route';
import type { Route } from '../../domain/route';
import { findMaps } from '../../domain/search';
import Marked from '../controls/Marked';
import { CloseMark } from '../controls/icons';
import './GoTo.css';

interface GoToProps {
  open: boolean;
  tree: WorldBranch[];
  onOpen: (route: Route) => void;
  onClose: () => void;
}

interface Row {
  route: Route;
  /** The world and the map together, since a flat list has no heading to carry the world alone. */
  label: string;
}

/** Every map in tree order, each row naming its own world since nothing else here does. */
function rowsFor(tree: WorldBranch[], text: string): Row[] {
  return findMaps(tree, text).flatMap((group) =>
    group.hits.map((hit) => ({ route: hit.route, label: `${group.name} · ${hit.label}` })),
  );
}

/** The overlay that travels to any map by name, leaving every panel and every layer exactly as it was. */
export default function GoTo({ open, tree, onOpen, onClose }: GoToProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [selected, setSelected] = useState(0);

  const rows = useMemo(() => rowsFor(tree, text), [tree, text]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setText('');
      setSelected(0);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => setSelected(0), [text]);

  useEffect(() => {
    const at = listRef.current?.children[selected];
    if (at instanceof HTMLElement) at.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const choose = (route: Route) => {
    onOpen(route);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="goto glass"
      aria-label="Go to map"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="goto-search-pad">
        <input
          ref={inputRef}
          type="text"
          className="goto-input"
          placeholder="Go to a map"
          aria-label="Go to a map"
          role="combobox"
          aria-expanded
          aria-controls="goto-results"
          aria-autocomplete="list"
          {...(rows[selected] && { 'aria-activedescendant': `goto-row-${selected}` })}
          autoComplete="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSelected((was) => Math.min(was + 1, rows.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((was) => Math.max(was - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              const row = rows[selected];
              if (row) choose(row.route);
            }
          }}
        />
        {text !== '' && (
          <button
            type="button"
            className="clear-button goto-clear"
            aria-label="Clear the search"
            onClick={() => {
              setText('');
              setSelected(0);
              inputRef.current?.focus();
            }}
          >
            <CloseMark />
          </button>
        )}
      </div>
      <ul className="goto-results" id="goto-results" role="listbox" aria-label="Matching maps" ref={listRef}>
        {rows.map((row, at) => (
          <li key={routeToHash(row.route)} role="presentation">
            <button
              type="button"
              id={`goto-row-${at}`}
              role="option"
              aria-selected={at === selected}
              className={at === selected ? 'rowbutton goto-row rowbutton-current' : 'rowbutton goto-row'}
              onMouseEnter={() => setSelected(at)}
              onClick={() => choose(row.route)}
            >
              <Marked label={row.label} text={text} />
            </button>
          </li>
        ))}
        {rows.length === 0 && <li className="goto-empty">No matching maps</li>}
      </ul>
    </dialog>
  );
}
