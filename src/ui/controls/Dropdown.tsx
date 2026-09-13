import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ChevronMark, CloseMark } from './icons';
import './Dropdown.css';

/** One entry of a drop-down, filed under a heading where the list is grouped. */
export interface DropdownOption {
  value: string;
  label: string;
  group?: string;
}

interface DropdownProps {
  /** What the closed control reads, which is the chosen option or a word standing in for none. */
  label: string;
  value?: string;
  options: DropdownOption[];
  /** The headings the options are filed under, in the order they are listed. */
  groups?: Array<{ id: string; label: string }>;
  ariaLabel: string;
  className?: string;
  onPick: (value: string) => void;
}

// Below this a search box is one more thing to look at; above it the list is one more thing to scroll.
const SEARCH_FROM = 10;
const POPUP_MAX = 320;
const GAP = 4;

/** Where the open list is drawn, in the viewport's own coordinates. */
interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

function placeUnder(box: DOMRect): Placement {
  const below = window.innerHeight - box.bottom - GAP * 2;
  const above = box.top - GAP * 2;
  const flip = below < Math.min(POPUP_MAX, above);
  return flip
    ? {
        left: box.left,
        width: box.width,
        bottom: window.innerHeight - box.top + GAP,
        maxHeight: Math.min(POPUP_MAX, above),
      }
    : { left: box.left, width: box.width, top: box.bottom + GAP, maxHeight: Math.min(POPUP_MAX, below) };
}

/** A closed list, opened by a button and never typed into except to search it. */
export default function Dropdown({
  label,
  value,
  options,
  groups,
  ariaLabel,
  className,
  onPick,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const searchable = options.length > SEARCH_FROM;

  const sections = useMemo(() => {
    const wanted = text.trim().toLowerCase();
    const kept = wanted === '' ? options : options.filter((o) => o.label.toLowerCase().includes(wanted));
    if (!groups) return [{ heading: null, options: kept }];
    return groups
      .map((group) => ({ heading: group.label, options: kept.filter((o) => o.group === group.id) }))
      .filter((section) => section.options.length > 0);
  }, [options, groups, text]);

  const flat = useMemo(() => sections.flatMap((section) => section.options), [sections]);

  const openedRef = useRef(false);

  // The list is drawn outside the panel, which clips anything inside it, so its position is measured off
  // the button rather than inherited from it.
  const place = useCallback(() => {
    const box = trigger.current?.getBoundingClientRect();
    if (box) setPlacement(placeUnder(box));
  }, []);

  // Deliberately keyed on opening alone: moving the highlight afterwards must not be undone by the value
  // the list opened on.
  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      return;
    }
    const chosen = flat.findIndex((option) => option.value === value);
    setActive(chosen === -1 ? 0 : chosen);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !popup.current?.contains(target)) setOpen(false);
    };
    const follow = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) place();
    };
    document.addEventListener('mousedown', dismiss);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', follow, true);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', follow, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open || !placement) return;
    if (!openedRef.current) {
      openedRef.current = true;
      (searchable ? search : popup).current?.focus();
      popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'center' });
    } else {
      popup.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, placement, active, sections]);

  const close = () => {
    setOpen(false);
    setText('');
    trigger.current?.focus();
  };

  const pick = (picked: string) => {
    onPick(picked);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((was) => (flat.length === 0 ? 0 : (was + step + flat.length) % flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = flat[active];
      if (chosen) pick(chosen.value);
    }
  };

  const highlighted = flat[active] ? `${listId}-${flat[active].value}` : undefined;

  return (
    <div className={className ? `drop ${className}` : 'drop'}>
      <button
        type="button"
        className="drop-trigger"
        ref={trigger}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          if (!open) {
            place();
            setOpen(true);
          } else {
            close();
          }
        }}
      >
        <span className="drop-label">{label}</span>
        <ChevronMark />
      </button>

      {open &&
        placement &&
        createPortal(
          <div
            className="drop-popup glass"
            ref={popup}
            tabIndex={-1}
            style={{
              left: placement.left,
              top: placement.top,
              bottom: placement.bottom,
              minWidth: placement.width,
              maxHeight: placement.maxHeight,
            }}
            aria-activedescendant={highlighted}
            onKeyDown={onKeyDown}
          >
            {searchable && (
              <div className="drop-search-pad">
                <input
                  ref={search}
                  type="text"
                  className="field drop-search"
                  placeholder="Search"
                  aria-label={`Search ${ariaLabel}`}
                  aria-controls={listId}
                  aria-activedescendant={highlighted}
                  autoComplete="off"
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setActive(0);
                  }}
                />
                {text !== '' && (
                  <button
                    type="button"
                    className="clear-button drop-search-clear"
                    aria-label="Clear the search"
                    onClick={() => {
                      setText('');
                      setActive(0);
                      search.current?.focus();
                    }}
                  >
                    <CloseMark />
                  </button>
                )}
              </div>
            )}
            <ul className="drop-list" id={listId} role="listbox" aria-label={ariaLabel}>
              {sections.map((section) => (
                <li key={section.heading ?? ''} role="none">
                  {section.heading && <p className="group-heading">{section.heading}</p>}
                  <ul role="none">
                    {section.options.map((option) => (
                      <li key={option.value} role="none">
                        <button
                          type="button"
                          role="option"
                          id={`${listId}-${option.value}`}
                          className="rowbutton drop-option"
                          data-active={flat[active]?.value === option.value}
                          aria-selected={option.value === value}
                          tabIndex={-1}
                          onMouseEnter={() => setActive(flat.indexOf(option))}
                          onClick={() => pick(option.value)}
                        >
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {flat.length === 0 && <p className="drop-empty">No matching fields</p>}
          </div>,
          document.body,
        )}
    </div>
  );
}
