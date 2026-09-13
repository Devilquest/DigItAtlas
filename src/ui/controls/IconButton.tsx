import type { ReactNode } from 'react';

import './IconButton.css';

interface IconButtonProps {
  /** Names the button for both the tooltip and the screen reader, since it carries no words. */
  title: string;
  disabled?: boolean;
  onClick: () => void;
  /** The icon's shapes, drawn in a 14 by 14 box. */
  children: ReactNode;
}

/** How every icon in one of these buttons is drawn, so that a header's icons all weigh the same. */
export const iconStroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A square button carrying an icon and no words, of the size a panel header takes. */
export default function IconButton({ title, disabled, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className="icon-button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
    >
      <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true" focusable="false">
        {children}
      </svg>
    </button>
  );
}
