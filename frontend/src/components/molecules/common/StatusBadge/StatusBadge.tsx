import Badge, { type BadgeVariant } from '../../../atoms/Badge/Badge.tsx';

// Harta: fiecare status cunoscut -> ce culoare (varianta de Badge) + ce text afisam
// Cheile sunt scrise cu litere mici, ca sa nu conteze daca backend-ul trimite

const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {
  upcoming:      { variant: 'info',    label: 'Upcoming' },
  cancelled:     { variant: 'neutral', label: 'Cancelled' },

  idle:          { variant: 'neutral', label: 'Idle' },
  processing:    { variant: 'warning', label: 'Processing' },
  failed:        { variant: 'danger',  label: 'Failed' },

  pending:       { variant: 'info',    label: 'Pending' },

  'in progress': { variant: 'warning', label: 'In Progress' },
  completed:     { variant: 'success', label: 'Completed' },
};

const STATUS_DOT_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-500',
  cancelled: 'bg-gray-400',
  idle: 'bg-gray-400',
  processing: 'bg-amber-500',
  failed: 'bg-red-500',
  pending: 'bg-blue-500',
  'in progress': 'bg-amber-500',
  completed: 'bg-green-500',
};

export function getStatusDotColor(status: string): string {
  return STATUS_DOT_COLORS[status.trim().toLowerCase()] ?? 'bg-gray-400';
}

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {

  const key = status.trim().toLowerCase();
  const config = STATUS_MAP[key];

  // daca statusul e cunoscut -> folosim culoarea si textul din harta
  // daca NU e cunoscut -> badge neutru, cu textul brut (nu crapa)
  if (!config) {
    return <Badge variant="neutral" className={className}>{status}</Badge>;
  }

  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}