import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn.ts";
import Loader from "../Loader/Loader.tsx";

// stilurile si marimile posibile ale butonului
type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

// Props: pe langa ale noastre, mostenim toate atributele normale ale unui <button>
// (onClick, disabled, type, etc.) prin "extends ButtonHTMLAttributes"
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean; // cand e true, arata spinner si dezactiveaza butonul
  fullWidth?: boolean; // ocupa toata latimea disponibila
  leftIcon?: ReactNode; // iconita optionala in stanga textului
  rightIcon?: ReactNode; // iconita optionala in dreapta textului
}

// Clase comune tuturor butoanelor: forma, focus, comportament cand e dezactivat
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
};

// Dimensiunile
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// forwardRef: lasa componenta parinte sa acceseze butonul real din DOM daca are nevoie.
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
      // butonul e dezactivat daca e "disabled" SAU daca se incarca
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
      {/* Cand se incarca, aratam Loader-ul (refolosit!) in loc de iconita din stanga */}
      {isLoading ? <Loader size="sm" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

export default Button;
