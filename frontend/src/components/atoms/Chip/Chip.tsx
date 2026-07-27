import { FiX } from "react-icons/fi";

export interface ChipProps {
  label: string;
  onRemove: () => void;
  removeLabel?: string;
}

export default function Chip({ label, onRemove, removeLabel }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 py-1 pl-3 pr-1.5 text-xs font-medium text-brand">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel ?? `Remove ${label}`}
        className="rounded-full p-0.5 hover:bg-brand/20"
      >
        <FiX size={12} aria-hidden="true" />
      </button>
    </span>
  );
}
