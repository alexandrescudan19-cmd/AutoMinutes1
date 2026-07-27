import { type ReactNode } from 'react';
import Modal from '../Modal/Modal.tsx';
import Button from '../../../atoms/Button/Button.tsx';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: ReactNode;                    // the question (e.g. "Delete this meeting?")
  confirmLabel?: string;                
  cancelLabel?: string;                 
  variant?: 'primary' | 'danger';        // confirm button color
  isLoading?: boolean;                  
  onConfirm: () => void;               
  onCancel: () => void;                 
}

export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </Modal>
  );
}