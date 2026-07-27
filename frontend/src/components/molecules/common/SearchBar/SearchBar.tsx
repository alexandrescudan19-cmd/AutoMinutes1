import { type InputHTMLAttributes } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import { cn } from '../../../atoms/cn.ts';

// Mostenim atributele unui <input>, dar SCOATEM 'value' si 'onChange'

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;                      // textul curent (il tine parintele)
  onChange: (value: string) => void;  // se apeleaza cand utilizatorul scrie
  onClear?: () => void;               // optional: cand se apasa pe X
}

export default function SearchBar({ value, onChange, onClear, placeholder = 'Search…', className, ...props }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      {/* iconita de lupa, pozitionata in stanga, in interiorul campului */}
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        {...props}
      />

      {/* butonul X apare doar cand exista text scris */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <FiX aria-hidden="true" />
        </button>
      )}
    </div>
  );
}