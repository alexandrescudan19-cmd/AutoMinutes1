import { type ReactNode } from 'react';
import Card from '../../../atoms/Card/Card.tsx';

type Accent = 'blue' | 'amber' | 'green' | 'gray';

export interface StatCardProps {
  label: string;      // textul de sub cifra (ex: "Total meetings")
  value: number;      
  accent?: Accent;    
  icon?: ReactNode;  
}

const accents: Record<Accent, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  gray: 'bg-gray-400',
};

export default function StatCard({ label, value, accent = 'gray', icon }: StatCardProps) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center gap-3">
        {icon ?? <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accents[accent]}`} aria-hidden="true" />}
        <div className="min-w-0">
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
          <p className="break-words text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </Card>
  );
}
