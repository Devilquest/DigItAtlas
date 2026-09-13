import { Fragment, useEffect, useRef, useState } from 'react';

import { SHORTCUT_HELP } from '../../domain/shortcuts';
import {
  AUTHOR,
  AUTHOR_PROFILE,
  DIGIT_TOOLS,
  HEADER_END,
  HEADER_LEAD,
  HERE_MARKER,
} from '../../domain/tools';
import type { Tag } from '../../domain/types';
import Dialog from '../controls/Dialog';
import { ChevronMark } from '../controls/icons';
import UserGuide from './UserGuide';
import './ProductMenu.css';

/** What the menu can have open, none of which is on screen at the same time as another. */
type Behind = 'guide' | 'about' | 'shortcuts' | 'tools';

interface ProductMenuProps {
  /** The catalog's labels, which only the guide reads. */
  tags: Record<string, Tag>;
}

/** The product name, and the handful of things behind it that nobody needs twice an hour. */
export default function ProductMenu({ tags }: ProductMenuProps) {
  const [open, setOpen] = useState(false);
  const [showing, setShowing] = useState<Behind | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', dismiss);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (which: Behind) => {
    setShowing(which);
    setOpen(false);
  };

  const hide = (which: Behind) => () => setShowing((was) => (was === which ? null : was));

  return (
    <div className="product" ref={menuRef}>
      <button
        type="button"
        className="product-name"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((was) => !was)}
      >
        <img
          src={`${import.meta.env.BASE_URL}favicon.ico`}
          alt=""
          className="product-icon"
          width="18"
          height="18"
        />
        Dig It! Atlas
        <ChevronMark />
      </button>
      {open && (
        <ul className="product-menu glass" role="menu">
          <li role="none">
            <button type="button" role="menuitem" className="rowbutton" onClick={() => choose('guide')}>
              User guide
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="rowbutton" onClick={() => choose('shortcuts')}>
              Keyboard shortcuts
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="rowbutton" onClick={() => choose('tools')}>
              Dig It! Toolset
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="rowbutton" onClick={() => choose('about')}>
              About
            </button>
          </li>
        </ul>
      )}

      <UserGuide
        tags={tags}
        open={showing === 'guide'}
        onShortcuts={() => setShowing('shortcuts')}
        onClose={hide('guide')}
      />

      <Dialog title="About" open={showing === 'about'} onClose={hide('about')}>
        <div className="about">
          <div className="about-head">
            <p className="about-name">Dig It! Atlas</p>
            <p className="about-version">Version {__APP_VERSION__}</p>
          </div>

          <p className="about-description">
            Maps every Dig It! level in the browser, with layers, entity positions, and interactive navigation.
          </p>

          <div className="about-credits">
            <p>
              Made with <span className="about-heart">♥</span> by{' '}
              <a className="about-author" href="https://github.com/Devilquest" target="_blank" rel="noreferrer">
                Devilquest
              </a>
            </p>
            <p>
              Source code:{' '}
              <a
                className="about-link"
                href="https://github.com/Devilquest/DigItAtlas"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </p>
          </div>

          <div className="about-fine">
            <p>
              Dig It! &copy; 1996 Pixel Painters Corp. This is an unofficial fan project, not affiliated with
              or endorsed by Pixel Painters Corp. or any publisher of the game. It redistributes no original
              game assets: all displayed maps and sprites are pre-rendered reference data.
            </p>
            <p>Released under the MIT license.</p>
          </div>
        </div>
      </Dialog>

      <Dialog title="Dig It! Toolset" open={showing === 'tools'} onClose={hide('tools')}>
        <div className="tools">
          <p className="tools-header">
            {HEADER_LEAD}
            <a className="tools-credit" href={AUTHOR_PROFILE} target="_blank" rel="noreferrer">
              {AUTHOR}
            </a>
            {HEADER_END}
          </p>

          {DIGIT_TOOLS.map((tool) => (
            <div className="tool" key={tool.name}>
              <p className="tool-head">
                {tool.isThisApp ? (
                  <span className="tool-name">{tool.name}</span>
                ) : (
                  <a className="tool-name tool-link" href={tool.url} target="_blank" rel="noreferrer">
                    {tool.name}
                  </a>
                )}
                <span className="tool-kind">{tool.kind}</span>
                {tool.isThisApp && <span className="tool-here">← {HERE_MARKER}</span>}
              </p>
              <p className="tool-summary">{tool.summary}</p>
            </div>
          ))}
        </div>
      </Dialog>

      <Dialog title="Keyboard shortcuts" open={showing === 'shortcuts'} onClose={hide('shortcuts')}>
        <dl className="shortcuts-list">
          {SHORTCUT_HELP.map((line) => (
            <Fragment key={line.keys}>
              <dt>{line.keys}</dt>
              <dd>{line.does}</dd>
            </Fragment>
          ))}
        </dl>
      </Dialog>
    </div>
  );
}
