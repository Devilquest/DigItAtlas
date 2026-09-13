import { useRef } from 'react';

import { CloseMark } from './icons';

interface SearchFieldProps {
  /** Names the field for the placeholder and the screen reader alike. */
  label: string;
  value: string;
  onChange: (text: string) => void;
}

/** A panel's search box, with the button that empties it. */
export default function SearchField({ label, value, onChange }: SearchFieldProps) {
  const field = useRef<HTMLInputElement>(null);

  return (
    <div className="search-pad">
      <input
        ref={field}
        type="search"
        className="field search"
        placeholder={label}
        aria-label={label}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('');
        }}
      />
      {value !== '' && (
        <button
          type="button"
          className="clear-button search-clear"
          aria-label="Clear the search"
          // The field keeps the focus it had, so that clearing it is one step of typing rather than the end
          // of it.
          onClick={() => {
            onChange('');
            field.current?.focus();
          }}
        >
          <CloseMark />
        </button>
      )}
    </div>
  );
}
