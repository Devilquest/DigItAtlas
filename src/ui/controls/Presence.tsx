import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { panelMotionMs } from '../../engine/theme';

/** Which way a surface inside a Presence is moving. */
type Phase = 'opening' | 'closing';

const PhaseContext = createContext<Phase>('opening');

/** The phase the nearest Presence is in, or 'opening' for a surface that no Presence wraps. */
export function usePresencePhase(): Phase {
  return useContext(PhaseContext);
}

/** A frame's grace on top of the animation, so a closing surface is never dropped mid-motion. */
const GRACE_MS = 20;

/** How long a closing surface stays mounted, from the token the animation itself uses. */
function holdMs(): number {
  return panelMotionMs() + GRACE_MS;
}

interface PresenceProps {
  open: boolean;
  children: ReactNode;
}

/** Keeps its child mounted through its closing animation, then removes it. */
export default function Presence({ open, children }: PresenceProps) {
  const [rendered, setRendered] = useState(open);

  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), holdMs());
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!rendered) return null;

  return (
    <PhaseContext.Provider value={open ? 'opening' : 'closing'}>{children}</PhaseContext.Provider>
  );
}
