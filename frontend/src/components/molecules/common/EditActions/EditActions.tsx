import Button from "../../../atoms/Button/Button.tsx";

export interface EditActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export default function EditActions({
  onCancel,
  onConfirm,
  isLoading = false,
  confirmLabel = "Save",
  cancelLabel = "Cancel",
}: EditActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button type="button" size="sm" isLoading={isLoading} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}
