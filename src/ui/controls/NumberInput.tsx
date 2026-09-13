import { useEffect, useState } from 'react';

import './NumberInput.css';

interface NumberInputProps {
  value: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}

/** A whole number of something, never negative and never fractional. */
export default function NumberInput({ value, ariaLabel, onChange }: NumberInputProps) {
  // Held as text so that clearing the field to retype it does not read as a zero.
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const step = (by: number) => onChange(Math.max(0, value + by));

  return (
    <div className="number">
      <input
        type="text"
        inputMode="numeric"
        className="number-field"
        aria-label={ariaLabel}
        autoComplete="off"
        value={text}
        onChange={(event) => {
          const typed = event.target.value.replace(/[^\d]/g, '');
          setText(typed);
          if (typed !== '') onChange(Number(typed));
        }}
        onBlur={() => setText(String(value))}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          step(event.key === 'ArrowUp' ? 1 : -1);
        }}
      />
      <span className="number-steps">
        <button type="button" aria-label={`${ariaLabel}: increase`} onClick={() => step(1)}>
          <svg viewBox="0 0 8 5" aria-hidden="true">
            <path d="M1 4 L4 1 L7 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`${ariaLabel}: decrease`}
          disabled={value === 0}
          onClick={() => step(-1)}
        >
          <svg viewBox="0 0 8 5" aria-hidden="true">
            <path d="M1 1 L4 4 L7 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </span>
    </div>
  );
}
