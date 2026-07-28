import { type ReactNode } from 'react';
import { cn } from '../../../atoms/cn.ts';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center dark:border-gray-700',
        className,
      )}
    >
      {icon && <div className="text-3xl text-gray-400 dark:text-gray-500" aria-hidden="true">{icon}</div>}

      <div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>

      {action}
    </div>
  );
}