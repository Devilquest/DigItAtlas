import { stateOf } from '../../domain/layerTree';
import type { LayerNode } from '../../domain/layerTree';
import Checkbox from '../controls/Checkbox';
import IconButton, { iconStroke } from '../controls/IconButton';
import Marked from '../controls/Marked';
import Panel from '../controls/Panel';
import SearchField from '../controls/SearchField';
import TreeCommands from '../controls/TreeCommands';
import { CaretMark } from '../controls/icons';
import './LayersPanel.css';

/** The groups that also carry a keyboard shortcut, by the key their checkbox names. */
const GROUP_SHORTCUTS: Readonly<Record<string, string>> = {
  'base/collision': 'C',
  enemies: 'E',
  goodies: 'G',
};

interface LayersPanelProps {
  /** The layers of the map on screen, already narrowed to what the search leaves visible. */
  layers: readonly LayerNode[];
  /** What was searched for, which the rows mark in their labels. */
  text: string;
  /** The leaves that are drawn, by key. */
  on: ReadonlySet<string>;
  /** The groups whose children are hidden, by key. */
  collapsed: ReadonlySet<string>;
  onText: (text: string) => void;
  onToggle: (node: LayerNode) => void;
  onCollapse: (key: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

interface NodeRowProps {
  node: LayerNode;
  depth: number;
  text: string;
  on: ReadonlySet<string>;
  collapsed: ReadonlySet<string>;
  onToggle: (node: LayerNode) => void;
  onCollapse: (key: string) => void;
}

function NodeRow({ node, depth, text, on, collapsed, onToggle, onCollapse }: NodeRowProps) {
  const open = node.kind === 'group' && !collapsed.has(node.key);
  return (
    <li>
      <div
        className="layer-row"
        style={{ paddingLeft: `calc(var(--space-2) + ${depth} * var(--space-3))` }}
      >
        {node.kind === 'group' ? (
          <button
            type="button"
            className="layer-caret"
            aria-expanded={open}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${node.label}`}
            onClick={() => onCollapse(node.key)}
          >
            <CaretMark open={open} />
          </button>
        ) : (
          <span className="layer-caret" />
        )}
        <Checkbox
          state={stateOf(node, on)}
          label={
            <>
              <Marked label={node.label} text={text} />
              {node.count !== undefined && ` (${node.count})`}
            </>
          }
          {...(GROUP_SHORTCUTS[node.key] && { title: `${node.label} (${GROUP_SHORTCUTS[node.key]})` })}
          onToggle={() => onToggle(node)}
        />
      </div>
      {open && node.kind === 'group' && (
        <ul>
          {node.children.map((child) => (
            <NodeRow
              key={child.key}
              node={child}
              depth={depth + 1}
              text={text}
              on={on}
              collapsed={collapsed}
              onToggle={onToggle}
              onCollapse={onCollapse}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The layers of the map on screen, the search over them, and the checkboxes deciding what is drawn. */
export default function LayersPanel({
  layers,
  text,
  on,
  collapsed,
  onText,
  onToggle,
  onCollapse,
  onExpandAll,
  onCollapseAll,
  onSelectAll,
  onDeselectAll,
}: LayersPanelProps) {
  const searching = text.trim() !== '';
  return (
    <Panel
      title="Layers"
      home="rail"
      className="layers-panel"
      action={
        <div className="icon-buttons">
          <TreeCommands
            disabled={searching}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
          />
          <span className="icon-buttons-split" />
          <IconButton title="Select all" onClick={onSelectAll}>
            <rect x="2" y="2" width="10" height="10" rx="2" {...iconStroke} />
            <path d="M4.5 7 L6.3 8.8 L9.5 5" {...iconStroke} />
          </IconButton>
          <IconButton title="Deselect all" onClick={onDeselectAll}>
            <rect x="2" y="2" width="10" height="10" rx="2" {...iconStroke} />
          </IconButton>
        </div>
      }
    >
      <SearchField label="Search layers" value={text} onChange={onText} />
      {layers.length === 0 ? (
        <p className="layer-empty">No matching layers</p>
      ) : (
        <ul className="tree">
          {layers.map((node) => (
            <NodeRow
              key={node.key}
              node={node}
              depth={0}
              text={text}
              on={on}
              collapsed={collapsed}
              onToggle={onToggle}
              onCollapse={onCollapse}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}
