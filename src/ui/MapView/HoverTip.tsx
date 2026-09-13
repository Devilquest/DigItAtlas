import type { Rect, Size } from '../../engine/geometry';
import './HoverTip.css';

/** What the tooltip says about the object the pointer is over. */
export interface HoverTipInfo {
  label: string;
  position: string;
  size: string;
  note?: string;
  goesTo?: string;
}

/** An assumed size to clamp against, since measuring the rendered tooltip would cost an extra frame. */
const ASSUMED_SIZE = { w: 200, h: 72 };
/** The same, when a curated note is present: it wraps, so the box is taller and about as wide as its cap. */
const ASSUMED_SIZE_WITH_NOTE = { w: 260, h: 160 };
const GAP = 8;

/** Names whatever the map's pointer is over, beside the object rather than the cursor. */
export default function HoverTip({
  info,
  anchor,
  bounds,
}: {
  info: HoverTipInfo | null;
  anchor: Rect | null;
  bounds: Size;
}) {
  if (!info || !anchor) return null;

  const assumed = info.note ? ASSUMED_SIZE_WITH_NOTE : ASSUMED_SIZE;
  const right = anchor.x + anchor.w + GAP;
  const fitsRight = right + assumed.w <= bounds.w;
  const top = Math.min(anchor.y, Math.max(GAP, bounds.h - assumed.h - GAP));

  // `right` (not `left`) so the tooltip's edge stays flush against the object at its real width, not the assumed one.
  const horizontal = fitsRight
    ? { left: right }
    : { right: Math.max(GAP, bounds.w - anchor.x + GAP) };

  return (
    <div className="hover-tip glass" style={{ ...horizontal, top }}>
      <strong>{info.label}</strong>
      <span className="hover-tip-position">{info.position}</span>
      <span className="hover-tip-size">{info.size}</span>
      {info.note && (
        <span className="hover-tip-note">
          <span className="hover-tip-note-mark" aria-hidden="true">
            i
          </span>
          {info.note}
        </span>
      )}
      {info.goesTo && <span className="hover-tip-goesto">{`→ ${info.goesTo}`}</span>}
    </div>
  );
}
