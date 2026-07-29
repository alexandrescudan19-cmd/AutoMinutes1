import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../cn.ts';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
}

export default function Card({ title, actions, footer, padded = true, className, children, ...props }: CardProps) {
  const hasHeader = title != null || actions != null;

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900',
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          {typeof title === 'string' ? (
            <h3 className="min-w-0 break-words font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          ) : (
            title
          )}
          {actions}
        </div>
      )}
      <div className={cn(padded && 'p-5')}>{children}</div>
      {footer && <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">{footer}</div>}
    </div>
  );
}
