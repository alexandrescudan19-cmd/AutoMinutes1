import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn.ts";
import Loader from "../Loader/Loader.tsx";

// the button's possible styles and sizes
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

// Props: besides our own, we inherit all the normal <button> attributes
// (onClick, disabled, type, etc.) via "extends ButtonHTMLAttributes"
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean; // when true, shows a spinner and disables the button
  fullWidth?: boolean; // takes up all available width
  leftIcon?: ReactNode; // optional icon to the left of the text
  rightIcon?: ReactNode; // optional icon to the right of the text
}

// Classes shared by all buttons: shape, focus, disabled behavior
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
};

// Sizes
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// forwardRef: lets the parent component access the real DOM button if it needs to.
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      // the button is disabled if "disabled" is set OR while it's loading
      disabled={disabled || isLoading}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {/* While loading, show the Loader (reused!) instead of the left icon */}
      {isLoading ? <Loader size="sm" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

export default Button;
