import Button from '../../../atoms/Button/Button.tsx';
import StatCard from '../../../molecules/meeting/StatCard/StatCard.tsx';

export interface MeetingsStats {
  total: number;
  processing: number;
  completed: number;
  openActionItems: number;
}

export interface MeetingsHeaderProps {
  stats: MeetingsStats;
  onNewMeeting: () => void;
}

export default function MeetingsHeader({ stats, onNewMeeting }: MeetingsHeaderProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Întâlniri</h1>
          <p className="text-sm text-gray-500">{stats.total} întâlniri în total</p>
        </div>
        <Button onClick={onNewMeeting}>+ Întâlnire nouă</Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard label="Total întâlniri" value={stats.total} accent="blue" />
        <StatCard label="În procesare" value={stats.processing} accent="amber" />
        <StatCard label="Finalizate" value={stats.completed} accent="green" />
        <StatCard label="Action items deschise" value={stats.openActionItems} accent="amber" />
      </div>
    </div>
  );
}