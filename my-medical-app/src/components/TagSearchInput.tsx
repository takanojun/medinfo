import { useEffect, useRef, useState } from 'react';

export interface Option {
  value: number;
  label: string;
  color?: string;
}

interface Props {
  options: Option[];
  selected: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function TagSearchInput({
  options,
  selected,
  onChange,
  placeholder = '選択...',
  className = '',
  disabled = false,
}: Props) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = input.trim().toLowerCase();
  const filtered = options.filter(
    (o) => o.label.toLowerCase().includes(query) && !selected.includes(o.value),
  );

  const selectedOptions = selected
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as Option[];

  const addValue = (value: number) => {
    if (disabled) return;
    if (!selected.includes(value)) onChange([...selected, value]);
  };

  const removeValue = (value: number) => {
    if (disabled) return;
    onChange(selected.filter((v) => v !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input) {
      e.preventDefault();
      if (filtered.length) addValue(filtered[0].value);
      setInput('');
    } else if (e.key === 'Backspace' && input === '' && selected.length) {
      removeValue(selected[selected.length - 1]);
    }
  };

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const container = containerRef.current;
      const list = listRef.current;
      const inputEl = inputRef.current;
      if (!container) return;
      if (!container.contains(e.target as Node)) {
        setOpen(false);
        return;
      }
      if (
        openRef.current &&
        list &&
        !list.contains(e.target as Node) &&
        (!inputEl || !inputEl.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, []);

  const getContrast = (hex?: string) => {
    if (!hex) return '#000';
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000' : '#fff';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        className={`flex flex-wrap gap-1 border rounded px-1 py-1 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
        onMouseDown={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        {selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="flex items-center px-1 rounded text-sm"
            style={{
              backgroundColor: opt.color || '#bfdbfe',
              color: getContrast(opt.color),
            }}
          >
            {opt.label}
            {!disabled && (
              <button
                className="ml-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  removeValue(opt.value);
                }}
              >
                ×
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedOptions.length ? '' : placeholder}
          className="flex-1 min-w-16 outline-none"
          disabled={disabled}
        />
      </div>
      {open && filtered.length > 0 && !disabled && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white border shadow"
        >
          {filtered.map((opt) => (
            <li
              key={opt.value}
              className="cursor-pointer select-none py-1 pl-2 pr-4 flex items-center gap-2 hover:bg-blue-100"
              onClick={() => {
                addValue(opt.value);
                setInput('');
                setOpen(true);
              }}
            >
              {opt.color && (
                <span
                  className="w-3 h-3 inline-block rounded"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              <span>{opt.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
