import type { ReactNode } from 'react';

import './Checkbox.css';

/** A checkbox that is on, off, or on for only part of what it covers. */
export type CheckState = 'on' | 'off' | 'mixed';

interface CheckboxProps {
  state: CheckState;
  label: ReactNode;
  /** Shown as a tooltip, for the few groups a keyboard shortcut also toggles. */
  title?: string;
  onToggle: () => void;
}

/** A labeled checkbox, ticked, cleared, or half-ticked. */
export default function Checkbox({ state, label, title, onToggle }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
      className="checkbox"
      title={title}
      onClick={onToggle}
    >
      <span className="checkbox-box" data-state={state}>
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
          {state === 'mixed' ? (
            <path d="M3 6 H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path
              d="M2.5 6.2 L5 8.7 L9.5 3.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </span>
      <span className="checkbox-label">{label}</span>
    </button>
  );
}
