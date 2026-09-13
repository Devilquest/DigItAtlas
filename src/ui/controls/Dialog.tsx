import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { CloseMark } from './icons';
import './Dialog.css';

interface DialogProps {
  title: string;
  open: boolean;
  /** Wider than the rest, for a dialog holding paragraphs instead of a list. */
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** A modal panel over everything, closed by the mark in its corner, by Escape, or by clicking outside it. */
export default function Dialog({ title, open, wide, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal() is what gives the dialog its focus trap, its Escape key and its backdrop, none of which is
  // worth reimplementing; React only decides when it is called.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog dialog-wide glass' : 'dialog glass'}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="dialog-head">
        <h2 className="surface-title dialog-title">{title}</h2>
        <button type="button" className="clear-button" title="Close" aria-label="Close" onClick={onClose}>
          <CloseMark />
        </button>
      </div>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
