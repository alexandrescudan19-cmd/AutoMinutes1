import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { cn } from '../../../atoms/cn.ts';

export interface ModalProps {
  isOpen: boolean;            // controlled by the parent: open or not
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;        // the modal's content
  footer?: ReactNode;         // bottom area (e.g. buttons)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;  // whether clicking the dark backdrop closes it (default true)
}

const sizes: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', closeOnBackdrop = true }: ModalProps) {
  // While the modal is open: listen for the Escape key and block scrolling on the page behind it.
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // cleanup: when the modal closes, stop listening and restore scrolling
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // createPortal: render the modal directly into <body>, above the rest of the page
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      {/* fereastra propriu-zisa. stopPropagation = click pe ea NU inchide modalul */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'flex max-h-[85vh] w-full flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-gray-800',
          sizes[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          {typeof title === 'string' ? (
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          ) : (
            title
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}