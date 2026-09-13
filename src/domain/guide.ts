/** What the user guide says, so that the dialog showing it holds no words of its own. */
import { GO_TO_KEYS, KEYS } from './shortcuts';

/** One part of the guide: a heading of two or three words, and the paragraph under it. */
export interface GuideBlock {
  heading: string;
  body: string;
}

/** One row of the destination labels table: the example shown, the color's name, and what it means. */
export interface GuideColor {
  /** The catalog tag whose picture the row shows. */
  tag: string;
  color: string;
  means: string;
}

/** One piece of a paragraph: words to read, a key to press, or a word that opens something. */
export interface GuidePart {
  text: string;
  kind: 'words' | 'key' | 'link';
}

/** What a paragraph marks: a key in backticks, and the one link the guide has in square brackets. */
const MARKED = /`([^`]+)`|\[([^\]]+)\]/g;

/** A paragraph split into what is read, what is pressed, and what is clicked. */
export function guideParts(body: string): GuidePart[] {
  const parts: GuidePart[] = [];
  let read = 0;

  for (const match of body.matchAll(MARKED)) {
    const at = match.index ?? 0;
    if (at > read) parts.push({ text: body.slice(read, at), kind: 'words' });
    parts.push({ text: match[1] ?? match[2] ?? '', kind: match[1] ? 'key' : 'link' });
    read = at + match[0].length;
  }

  if (read < body.length) parts.push({ text: body.slice(read), kind: 'words' });
  return parts;
}

/** The guide, in the order a visit happens in. */
export const GUIDE_BLOCKS: readonly GuideBlock[] = [
  {
    heading: 'Open a map',
    body:
      `The Levels panel \`${KEYS.levels}\` lists all worlds and levels. Click an entry to open it. ` +
      `Go to map \`${GO_TO_KEYS}\` lets you search maps by name.`,
  },
  {
    heading: 'Pan and zoom',
    body:
      `Drag to pan and scroll to zoom. Fit to view \`${KEYS.fit}\` fits the map to the screen. ` +
      `1:1 \`${KEYS.actualSize}\` resets zoom to 100%. The Minimap \`${KEYS.minimap}\` provides ` +
      `an overview: click or drag to pan, or scroll over it to zoom.`,
  },
  {
    heading: 'Inspect objects',
    body:
      'Hover over an object to highlight it and view its name, position, size, and destination.',
  },
  {
    heading: 'Navigate exits',
    body:
      'Click a dig spot or drain to navigate to its destination: another section of the level, a ' +
      'bonus zone, or the world map. On a world map, click a signpost to open that level.',
  },
  {
    heading: 'Toggle layers',
    body:
      `The Layers panel \`${KEYS.layers}\` controls the visibility of layers and groups, with shortcuts for Enemies ` +
      `\`${KEYS.enemies}\`, Goodies \`${KEYS.goodies}\`, and Collision \`${KEYS.collision}\`.`,
  },
  {
    heading: 'Filter maps',
    body:
      `The Filters panel \`${KEYS.filters}\` filters maps by content (such as enemies or goodies). ` +
      'Combine multiple filters to narrow results.',
  },
  {
    heading: 'Share a map',
    body: 'Every map has its own URL. Bookmark or share the link to open that exact map.',
  },
];

/** The destination labels: what that section of the guide is called, and the sentence that opens it. */
export const LABELS_HEADING = 'Info Overlays';
export const LABELS_LEAD =
  'Enable Info Overlays in the Layers panel to show destination labels on every exit. ' +
  'Each label color indicates the type of exit.';

/** The line the guide ends on, whose marked words open the dialog they name. */
export const GUIDE_CLOSING = 'All keyboard shortcuts are listed under [Keyboard shortcuts].';

/** One row per color the exported labels come in, each shown as one of the pictures the map draws. */
export const LABEL_COLORS: readonly GuideColor[] = [
  { tag: 'bonus-1-green', color: 'Green', means: 'Enters a bonus zone.' },
  {
    tag: 'substage-2-amber',
    color: 'Amber',
    means: 'Leads to another section of the level, including bonus zone returns.',
  },
  { tag: 'level-complete-red', color: 'Red', means: 'Ends the level and returns to the world map.' },
  {
    tag: 'substage-2-gray',
    color: 'Gray',
    means: 'Loops back to the current map. Only appears in the Spookstone mazes.',
  },
];
