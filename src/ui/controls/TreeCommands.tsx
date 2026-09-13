import IconButton, { iconStroke } from './IconButton';

interface TreeCommandsProps {
  /** True while a search decides what is on screen, when neither command would show anything happening. */
  disabled: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/** Expand all and Collapse all, one pair for every panel that draws a tree. */
export default function TreeCommands({ disabled, onExpandAll, onCollapseAll }: TreeCommandsProps) {
  return (
    <>
      <IconButton title="Expand all" disabled={disabled} onClick={onExpandAll}>
        <path d="M4 5.5 L7 2.5 L10 5.5 M4 8.5 L7 11.5 L10 8.5" {...iconStroke} />
      </IconButton>
      <IconButton title="Collapse all" disabled={disabled} onClick={onCollapseAll}>
        <path d="M4 2.5 L7 5.5 L10 2.5 M4 11.5 L7 8.5 L10 11.5" {...iconStroke} />
      </IconButton>
    </>
  );
}
