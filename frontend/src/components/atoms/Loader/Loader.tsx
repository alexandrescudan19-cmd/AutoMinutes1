import { cn } from "../cn.ts";

export interface LoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const sizes: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export default function Loader({ size = "md", label, className }: LoaderProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-2", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block animate-spin rounded-full border-current border-t-transparent",
          sizes[size],
        )}
      />

      {label ? (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}
