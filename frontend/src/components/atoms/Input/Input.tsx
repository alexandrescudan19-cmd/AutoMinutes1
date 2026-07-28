import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../cn.ts';
import { FieldWrapper } from '../FieldWrapper.tsx';
import { getFieldDescribedBy } from '../fieldDescribedBy.ts';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, required, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = getFieldDescribedBy(inputId, error, hint);

  return (
    <FieldWrapper label={label} required={required} id={inputId} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          'h-10 rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors ' +
            'focus-visible:outline-none focus-visible:ring-2 disabled:bg-gray-50 disabled:opacity-60 ' +
            'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-gray-800',
          error
            ? 'border-red-400 focus-visible:ring-red-400 dark:border-red-500'
            : 'border-gray-300 focus-visible:ring-brand dark:border-gray-700',
          className,
        )}
        {...props}
      />
    </FieldWrapper>
  );
});

export default Input;
