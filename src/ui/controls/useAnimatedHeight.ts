/** Moving a surface between the heights its content gives it, rather than cutting from one to the next. */
import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

import { panelMotionMs } from '../../engine/theme';

/** Whether the visitor asked for no motion, which nothing here overrides. */
function stillness(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates an element from the height it had to whatever height it is next laid out at.
 *
 * @param enabled - False for an element whose own content is already moving, which it then follows instead.
 */
export default function useAnimatedHeight(ref: RefObject<HTMLElement | null>, enabled = true): void {
  const last = useRef<number | null>(null);
  const moving = useRef<Animation | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled || typeof ResizeObserver === 'undefined') return;

    const reconcile = () => {
      // The height belongs to the animation while it runs, and every frame of it is a resize of its own.
      if (moving.current?.playState === 'running') return;
      // offsetHeight rather than the bounding rectangle, which would read the opening animation's scale as a height.
      const now = element.offsetHeight;
      const was = last.current;
      last.current = now;
      if (was === null || was === now || stillness()) return;
      element.dataset.moving = 'true';
      const animation = element.animate([{ height: `${was}px` }, { height: `${now}px` }], {
        duration: panelMotionMs(),
        easing: 'ease',
      });
      const settle = () => {
        if (moving.current === animation) delete element.dataset.moving;
      };
      animation.onfinish = settle;
      animation.oncancel = settle;
      moving.current = animation;
    };

    // A baseline before the observer's first callback, so a change in the same frame still has one to move from.
    last.current = element.offsetHeight;
    // Observed rather than measured per render, so a height that changes because a sibling left the same
    // flex column, with no render here, is moved to as well.
    const observer = new ResizeObserver(reconcile);
    observer.observe(element);
    return () => {
      observer.disconnect();
      moving.current?.cancel();
    };
  }, [ref, enabled]);
}
