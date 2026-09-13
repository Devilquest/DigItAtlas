import { useRef } from 'react';
import type { ReactNode } from 'react';

import { usePresencePhase } from './Presence';
import useAnimatedHeight from './useAnimatedHeight';
import './Panel.css';

/** Where a panel is anchored, which is fixed per panel. */
export type PanelHome = 'top-left' | 'top-left-beside' | 'rail';

interface PanelProps {
  title: string;
  home: PanelHome;
  /** The panel's own class, which is where its width lives. */
  className: string;
  /** True for a panel whose content is the whole panel, with no header of its own. */
  hideTitle?: boolean;
  /** False for a panel whose content moves its own height, which the panel then follows frame by frame. */
  animateHeight?: boolean;
  /** What sits in the header beside the title, where the panel offers something there. */
  action?: ReactNode;
  children: ReactNode;
}

/** A panel floating over the map, titled unless the content speaks for itself. */
export default function Panel({
  title,
  home,
  className,
  hideTitle,
  animateHeight,
  action,
  children,
}: PanelProps) {
  const phase = usePresencePhase();
  const panel = useRef<HTMLElement>(null);
  useAnimatedHeight(panel, animateHeight !== false);
  return (
    <section
      ref={panel}
      className={`panel glass panel-${home} ${className}`}
      data-phase={phase}
      aria-label={title}
    >
      {!hideTitle && (
        <div className="panel-head">
          <h2 className="surface-title panel-title">{title}</h2>
          {action}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </section>
  );
}
