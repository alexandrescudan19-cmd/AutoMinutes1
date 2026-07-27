import { cn } from '../cn.ts';

// All the options we can pass to this component (props).
export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

// The matching Tailwind classes for each size.
// If you add a new size above, add it here too.
const sizes: Record<NonNullable<LoaderProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

// Loader component. If you don't pass "size", it defaults to "md" (medium).
export default function Loader({ size = 'md', label, className }: LoaderProps) {
  return (
    // role="status" tells screen readers that something is loading.
    // cn() merges our classes with the ones passed in from outside (className).
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-2', className)}>

        {/* The spinning circle. Made purely with CSS: */}

      <span

        aria-hidden="true"
        className={cn('inline-block animate-spin rounded-full border-current border-t-transparent', sizes[size])}
      />
      {/* If we have a "label", show it. If not, add hidden text
          "Loading" just for screen readers. */}

      {label ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      ) : (
        <span className="sr-only">Loading</span>
      )}

    </span>
  );
}