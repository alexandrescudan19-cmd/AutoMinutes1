import { cn } from "../cn.ts";

export interface AvatarProps {
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export default function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white",
        sizes[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}
