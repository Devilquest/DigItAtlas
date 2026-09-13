/** The shapes drawn in more than one place, so that one picture never becomes two drawings. */

/** The X of a button that clears a search or removes a row. */
export function CloseMark() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path d="M2 2 L10 10 M10 2 L2 10" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * The triangle a branch turns to show it is open.
 *
 * @param open - Absent for a leaf, which keeps the empty box so that its label lines up with a branch's.
 */
export function CaretMark({ open }: { open: boolean | undefined }) {
  return (
    <svg className={open ? 'caret caret-open' : 'caret'} viewBox="0 0 12 12" aria-hidden="true">
      {open === undefined ? null : <path d="M4 2 L9 6 L4 10 Z" fill="currentColor" />}
    </svg>
  );
}

/** The chevron of something that opens downward: a drop-down, the product menu. */
export function ChevronMark() {
  return (
    <svg className="chevron" viewBox="0 0 12 8" aria-hidden="true">
      <path d="M1 1 L6 7 L11 1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
