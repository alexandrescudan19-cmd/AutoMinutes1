import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export interface FilterPillOption {
  value: string;
  label: string;
}

export interface FilterPillProps {
  label: string;
  value: string;
  defaultValue: string;
  options: FilterPillOption[];
  onChange: (value: string) => void;
  width?: string;
}

export default function FilterPill({
  label,
  value,
  defaultValue,
  options,
  onChange,
  width = "w-48",
}: FilterPillProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);
  const displayText =
    value === defaultValue ? label : `${label}: ${selected?.label ?? value}`;

  return (
    <div className={`relative w-full min-w-0 min-[420px]:w-auto min-[420px]:shrink-0 ${width}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        title={displayText}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-full border border-gray-200 bg-white pl-3.5 pr-3 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600"
      >
        <span className="truncate">{displayText}</span>
        <FiChevronDown
          className={`shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                opt.value === value
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <FiCheck className="shrink-0" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
