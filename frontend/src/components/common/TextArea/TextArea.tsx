import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../cn.ts';

// Asemanator cuInput, dar mostenim atributele <TextArea> (nu <input>).
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, error, hint, id, className, required, rows = 4, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors ' +
            'focus-visible:outline-none focus-visible:ring-2 disabled:bg-gray-50 disabled:opacity-60 resize-y',
          error ? 'border-red-400 focus-visible:ring-red-400' : 'border-gray-300 focus-visible:ring-brand',
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default TextArea;