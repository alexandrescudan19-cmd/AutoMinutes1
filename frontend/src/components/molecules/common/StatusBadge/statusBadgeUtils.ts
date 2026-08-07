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
