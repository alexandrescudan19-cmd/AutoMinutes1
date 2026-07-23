import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { cn } from '../../../atoms/cn.ts';

export interface ModalProps {
  isOpen: boolean;            // controlat de parinte: e deschis sau nu
  onClose: () => void;       
  title?: ReactNode;
  children: ReactNode;        // continutul modalului
  footer?: ReactNode;         // zona de jos (ex: butoane)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;  // daca click pe fundalul intunecat inchide (implicit true)
}

const sizes: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', closeOnBackdrop = true }: ModalProps) {
  // Cand modalul e deschis: asculta tasta Escape si blocheaza scroll-ul paginii din spate.
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // curatenie: cand modalul se inchide, oprim ascultarea si redam scroll-ul
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // createPortal: randam modalul direct in <body>, peste tot restul paginii
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
        className={cn('flex max-h-[85vh] w-full flex-col rounded-xl bg-white shadow-xl', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          {typeof title === 'string' ? <h3 className="font-medium text-gray-900">{title}</h3> : title}
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}