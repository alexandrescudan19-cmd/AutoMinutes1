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
    <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)} {...props}>
      {hasHeader && (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          {typeof title === 'string' ? <h3 className="font-medium text-gray-900">{title}</h3> : title}
          {actions}
        </div>
      )}
      <div className={cn(padded && 'p-5')}>{children}</div>
      {footer && <div className="border-t border-gray-100 px-5 py-3">{footer}</div>}
    </div>
  );
}