import { panelToggleTitle, zoomLabel } from '../../domain/format';
import type { IdentityPart } from '../../domain/format';
import { GO_TO_KEYS, KEYS } from '../../domain/shortcuts';
import type { Panel } from '../../domain/shortcuts';
import type { Tag } from '../../domain/types';
import { canZoom } from '../../engine/viewport';
import { useSignal } from '../../state/hooks';
import type { MapCommands, Readouts } from '../MapView/MapView';
import ProductMenu from './ProductMenu';
import './Bar.css';

interface BarProps {
  identity: IdentityPart[];
  readouts: Readouts;
  /** The catalog's labels, which the bar carries only as far as the guide behind the product name. */
  tags: Record<string, Tag>;
  /** Which panels are open, which the buttons wear and say. */
  panels: Record<Panel, boolean>;
  onTogglePanel: (panel: Panel) => void;
  commands: MapCommands;
  onOpenGoTo: () => void;
}

/** The panels the bar toggles, in the order it lists them, each with the key that also toggles it. */
const PANEL_BUTTONS: ReadonlyArray<readonly [Panel, string, string]> = [
  ['levels', 'Levels', KEYS.levels],
  ['layers', 'Layers', KEYS.layers],
  ['minimap', 'Minimap', KEYS.minimap],
];

function CursorReadout({ readouts }: { readouts: Readouts }) {
  const cursor = useSignal(readouts.cursor);
  if (!cursor) return null;
  return (
    <>
      {' · '}
      <span className="bar-readout">{cursor}</span>
    </>
  );
}

function ZoomControls({ readouts, commands }: { readouts: Readouts; commands: MapCommands }) {
  const zoom = useSignal(readouts.zoom);
  return (
    <div className="bar-group">
      <button
        type="button"
        className="bar-button"
        title="Zoom out"
        aria-label="Zoom out"
        disabled={!canZoom(zoom, -1)}
        onClick={() => commands.zoomBy(-1)}
      >
        −
      </button>
      <span className="bar-zoom-value">{zoomLabel(zoom)}</span>
      <button
        type="button"
        className="bar-button"
        title="Zoom in"
        aria-label="Zoom in"
        disabled={!canZoom(zoom, 1)}
        onClick={() => commands.zoomBy(1)}
      >
        +
      </button>
      <button
        type="button"
        className="bar-button"
        title="Fit to view (0)"
        aria-label="Fit to view"
        onClick={commands.fit}
      >
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
          <path
            d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        className="bar-button"
        title="Original size, 100% (1)"
        onClick={commands.actualSize}
      >
        1:1
      </button>
    </div>
  );
}

/** The one permanent surface: what is on screen, where the pointer is, and the controls for both. */
export default function Bar({
  identity,
  readouts,
  tags,
  panels,
  onTogglePanel,
  commands,
  onOpenGoTo,
}: BarProps) {
  return (
    <header className="bar glass">
      <ProductMenu tags={tags} />
      <span className="bar-identity">
        {identity.map((part, at) => (
          <span key={part.text}>
            {at > 0 && ' · '}
            {part.strong ? <strong>{part.text}</strong> : part.text}
          </span>
        ))}
        <CursorReadout readouts={readouts} />
      </span>
      <span className="bar-gap" />
      <div className="bar-group">
        <button
          type="button"
          className="bar-button"
          title={`Go to a map (${GO_TO_KEYS})`}
          onClick={onOpenGoTo}
        >
          Go to map
        </button>
      </div>
      <div className="bar-group">
        {PANEL_BUTTONS.map(([panel, label, shortcut]) => (
          <button
            key={panel}
            type="button"
            className="bar-button"
            title={panelToggleTitle(label, shortcut, panels[panel])}
            aria-pressed={panels[panel]}
            onClick={() => onTogglePanel(panel)}
          >
            {label}
          </button>
        ))}
      </div>
      <ZoomControls readouts={readouts} commands={commands} />
    </header>
  );
}
