import { type ReactNode } from 'react';
import Modal from '../Modal/Modal.tsx';
import Button from '../../../atoms/Button/Button.tsx';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: ReactNode;                    // intrebarea (ex: "Sigur stergi aceasta intalnire?")
  confirmLabel?: string;                
  cancelLabel?: string;                 
  variant?: 'primary' | 'danger';        // culoarea butonului de confirmare
  isLoading?: boolean;                  
  onConfirm: () => void;               
  onCancel: () => void;                 
}

export default function ConfirmDialog({
  isOpen,
  title = 'Ești sigur?',
  message,
  confirmLabel = 'Confirmă',
  cancelLabel = 'Anulează',
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
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}