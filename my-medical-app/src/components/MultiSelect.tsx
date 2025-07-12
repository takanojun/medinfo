import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

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

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = '選択...',
  className = '',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: number) => {
    if (disabled) return;
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedOptions = selected
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as Option[];

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
    <Listbox value={selected} onChange={onChange} multiple disabled={disabled}>
      {() => (
        <div className={`relative ${className}`}>
          <Listbox.Button
            onClick={() => !disabled && setOpen((o) => !o)}
            className={`w-full border rounded px-2 py-1 text-left ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            {selectedOptions.length ? (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className="px-1 rounded text-sm"
                    style={{
                      backgroundColor: opt.color || '#bfdbfe',
                      color: getContrast(opt.color),
                    }}
                  >
                    {opt.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </Listbox.Button>
          <Transition
            show={open}
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-white border shadow">
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  as={Fragment}
                >
                  {({ active }) => (
                    <li
                      className={`cursor-pointer select-none py-1 pl-2 pr-4 flex items-center gap-2 ${active ? 'bg-blue-100' : ''}`}
                      onClick={() => toggleValue(opt.value)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        readOnly
                      />
                      {opt.color && (
                        <span
                          className="w-3 h-3 inline-block rounded"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span>{opt.label}</span>
                    </li>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
