import Badge, { type BadgeVariant } from '../../../atoms/Badge/Badge.tsx';

// Harta: fiecare status cunoscut -> ce culoare (varianta de Badge) + ce text afisam
// Cheile sunt scrise cu litere mici, ca sa nu conteze daca backend-ul trimite

const STATUS_MAP: Record<string, { variant: BadgeVariant; label: string }> = {

  pending:     { variant: 'info',    label: 'Pending' },
  processing:  { variant: 'warning', label: 'Processing' },
  completed:   { variant: 'success', label: 'Completed' },
  failed:      { variant: 'danger',  label: 'Failed' },
  cancelled:   { variant: 'neutral', label: 'Cancelled' },
  idle:        { variant: 'neutral', label: 'Idle' },


  open:        { variant: 'info',    label: 'Open' },
  'in progress': { variant: 'warning', label: 'In progress' },
  'in_progress': { variant: 'warning', label: 'In progress' },
  done:        { variant: 'success', label: 'Done' },
};

export interface StatusBadgeProps {
  status: string;       // valoarea bruta primita de la backend
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