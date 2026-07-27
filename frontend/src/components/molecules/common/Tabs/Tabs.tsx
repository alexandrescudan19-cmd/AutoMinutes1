import { type ReactNode } from 'react';
import { cn } from '../../../atoms/cn.ts';

export interface TabItem {
  id: string;       
  label: string;    
  badge?: ReactNode; 
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;            
  onChange: (id: string) => void;   
  className?: string;
}

export default function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-gray-200 dark:border-gray-800', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-brand text-brand'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {tab.label}
            {tab.badge != null && (
              <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}