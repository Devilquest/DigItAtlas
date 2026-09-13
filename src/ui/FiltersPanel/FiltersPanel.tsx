import { useMemo } from 'react';

import { MAX_FILTERS, OPERATOR_LABELS, addFilter, operatorsFor, refield, takesValue } from '../../domain/filters';
import type { Field, Filter, Operator } from '../../domain/filters';
import Dropdown from '../controls/Dropdown';
import type { DropdownOption } from '../controls/Dropdown';
import NumberInput from '../controls/NumberInput';
import Panel from '../controls/Panel';
import { CloseMark } from '../controls/icons';
import './FiltersPanel.css';

interface FiltersPanelProps {
  fields: Field[];
  /** The headings the field list is divided into, in the order it lists them. */
  groups: Array<{ id: string; label: string }>;
  filters: readonly Filter[];
  onChange: (filters: Filter[]) => void;
}

interface RowProps {
  filter: Filter;
  field: Field;
  fields: Field[];
  options: DropdownOption[];
  groups: Array<{ id: string; label: string }>;
  onChange: (filter: Filter) => void;
  onRemove: () => void;
}

function Row({ filter, field, fields, options, groups, onChange, onRemove }: RowProps) {
  const sentence = `${field.label} ${OPERATOR_LABELS[filter.op]}`;

  return (
    <li className="filter-row">
      <Dropdown
        label={field.label}
        value={field.id}
        options={options}
        groups={groups}
        ariaLabel="Filter by"
        onPick={(picked) => {
          const now = fields.find((entry) => entry.id === picked);
          if (now) onChange(refield(filter, field, now));
        }}
      />
      <Dropdown
        label={OPERATOR_LABELS[filter.op]}
        value={filter.op}
        options={operatorsFor(field.kind).map((op) => ({ value: op, label: OPERATOR_LABELS[op] }))}
        ariaLabel={`${field.label}: filter condition`}
        onPick={(picked) => onChange({ ...filter, op: picked as Operator })}
      />
      {!takesValue(field.kind, filter.op) ? (
        <span />
      ) : field.kind === 'choice' ? (
        <Dropdown
          label={field.choices?.find((choice) => choice.value === filter.value)?.label ?? ''}
          value={String(filter.value)}
          options={field.choices ?? []}
          ariaLabel={sentence}
          onPick={(picked) => onChange({ ...filter, value: picked })}
        />
      ) : (
        <NumberInput
          value={Number(filter.value)}
          ariaLabel={sentence}
          onChange={(value) => onChange({ ...filter, value })}
        />
      )}
      <button type="button" className="clear-button" aria-label={`Remove: ${sentence}`} onClick={onRemove}>
        <CloseMark />
      </button>
    </li>
  );
}

/** The stack of conditions the levels are narrowed by, and the field list they are built from. */
export default function FiltersPanel({ fields, groups, filters, onChange }: FiltersPanelProps) {
  const byId = useMemo(() => new Map(fields.map((field) => [field.id, field])), [fields]);
  const options = useMemo(
    () => fields.map((field) => ({ value: field.id, label: field.label, group: field.group })),
    [fields],
  );

  // A new row opens on the first field there is, which is then changed like any other. Asking which field
  // before there is a row to put it in makes adding one a two-step act.
  const add = () => {
    const first = fields[0];
    if (first) onChange(addFilter(filters, first));
  };

  const replace = (filter: Filter) =>
    onChange(filters.map((held) => (held.id === filter.id ? filter : held)));

  const full = filters.length >= MAX_FILTERS;

  return (
    <Panel
      title="Filters"
      home="top-left-beside"
      className="filters-panel"
      action={
        // Kept in the layout with nothing filtered, so that the title does not move when it appears.
        <button
          type="button"
          className={filters.length > 0 ? 'filters-clear' : 'filters-clear filters-clear-idle'}
          onClick={() => onChange([])}
        >
          Clear
        </button>
      }
    >
      <ul className="filters-rows">
        {filters.map((filter) => {
          const field = byId.get(filter.field);
          return field ? (
            <Row
              key={filter.id}
              filter={filter}
              field={field}
              fields={fields}
              options={options}
              groups={groups}
              onChange={replace}
              onRemove={() => onChange(filters.filter((held) => held.id !== filter.id))}
            />
          ) : null;
        })}
      </ul>
      <div className="filters-foot">
        {full ? (
          <p className="filters-full">{MAX_FILTERS} conditions is the maximum allowed.</p>
        ) : (
          <button type="button" className="filters-add" onClick={add}>
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M6 1 L6 11 M1 6 L11 6" stroke="currentColor" strokeWidth="1.6" fill="none" />
            </svg>
            Add filter
          </button>
        )}
      </div>
    </Panel>
  );
}
