import { Listbox, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';

export interface Option {
  value: number;
  label: string;
}

interface Props {
  options: Option[];
  selected: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  className?: string;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = '選択...',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  return (
    <Listbox value={selected} onChange={onChange} multiple>
      {() => (
        <div className={`relative ${className}`}>
          <Listbox.Button
            onClick={() => setOpen((o) => !o)}
            className="w-full border rounded px-2 py-1 text-left"
          >
            {selectedLabels.length ? (
              <div className="flex flex-wrap gap-1">
                {selectedLabels.map((label) => (
                  <span
                    key={label}
                    className="bg-blue-100 text-blue-800 px-1 rounded text-sm"
                  >
                    {label}
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
