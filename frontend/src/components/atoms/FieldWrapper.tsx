import type { ReactNode } from 'react';

interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  id?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, required, id, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
