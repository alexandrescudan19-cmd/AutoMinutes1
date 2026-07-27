import {
  forwardRef,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "../cn.ts";
import { FieldWrapper } from "../FieldWrapper.tsx";
import { getFieldDescribedBy } from "../fieldDescribedBy.ts";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    error,
    hint,
    id,
    className,
    required,
    options,
    placeholder,
    children,
    ...props
  },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = getFieldDescribedBy(selectId, error, hint);

  return (
    <FieldWrapper
      label={label}
      required={required}
      id={selectId}
      error={error}
      hint={hint}
    >
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={cn(
          "h-10 rounded-lg border bg-white px-3 text-sm text-gray-900 transition-colors " +
            "focus-visible:outline-none focus-visible:ring-2 disabled:bg-gray-50 disabled:opacity-60 " +
            "dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800",
          error
            ? "border-red-400 focus-visible:ring-red-400 dark:border-red-500"
            : "border-gray-300 focus-visible:ring-brand dark:border-gray-700",
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        {children}
      </select>
    </FieldWrapper>
  );
});

export default Select;
