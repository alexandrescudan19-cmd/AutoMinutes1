import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../cn.ts';
import { FieldWrapper, getFieldDescribedBy } from '../FieldWrapper.tsx';

// Mostenim toate atributele unui <input> normal (type, placeholder, value, onChange...)
// si adaugam ale noastre: label, error, hint
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;   // eticheta de deasupra campului
  error?: string;   // mesaj de eroare (rosu) sub camp
  hint?: string;    // text ajutator (gri) sub camp, cand nu e eroare
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, required, ...props },
  ref,
) {
  // useId genereaza un id unic, ca label-ul sa fie legat corect de input
  // (important pentru accesibilitate: click pe label = focus pe input)
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
            'focus-visible:outline-none focus-visible:ring-2 disabled:bg-gray-50 disabled:opacity-60',
          error ? 'border-red-400 focus-visible:ring-red-400' : 'border-gray-300 focus-visible:ring-brand',
          className,
        )}
        {...props}
      />
    </FieldWrapper>
  );
});

export default Input;
