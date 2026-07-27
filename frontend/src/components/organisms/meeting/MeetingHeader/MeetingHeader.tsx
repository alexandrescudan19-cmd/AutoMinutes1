import StatCard from '../../../molecules/meeting/StatCard/StatCard.tsx';

export interface MeetingsStats {
  total: number;
  processing: number;
  completed: number;
  openActionItems: number;
}

export interface MeetingsHeaderProps {
  stats: MeetingsStats;
}

export default function MeetingsHeader({ stats }: MeetingsHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Meetings</h1>

      <div className="flex flex-wrap gap-4">
        <StatCard label="Total meetings" value={stats.total} accent="blue" />
        <StatCard label="Processing" value={stats.processing} accent="amber" />
        <StatCard label="Completed" value={stats.completed} accent="green" />
        <StatCard label="Open action items" value={stats.openActionItems} accent="amber" />
      </div>
    </div>
  );
}