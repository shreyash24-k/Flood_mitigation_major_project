import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent?: string; // hex
  progress?: number; // 0-100 bar
  dark?: boolean;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  accent = '#3898C9',
  progress,
  dark = false,
}: StatCardProps) {
  return (
    <div
      className={
        dark
          ? 'card-dark-hover group p-5'
          : 'card group p-5 transition-all duration-300 hover:shadow-card-lg hover:-translate-y-0.5'
      }
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        {typeof progress === 'number' && (
          <span className={`text-xs font-semibold tabular-nums ${dark ? 'text-ink-400' : 'text-ink-400'}`}>
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <p className={`mt-4 text-xs font-medium uppercase tracking-wider ${dark ? 'text-ink-400' : 'text-ink-400'}`}>
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${dark ? 'text-white' : 'text-ink-900'}`}>
        {value}
        {unit && <span className={`ml-1 text-sm font-medium ${dark ? 'text-ink-400' : 'text-ink-400'}`}>{unit}</span>}
      </p>

      {sub && <p className={`mt-1 text-xs ${dark ? 'text-ink-500' : 'text-ink-500'}`}>{sub}</p>}

      {typeof progress === 'number' && (
        <div className={`mt-3 h-1.5 w-full overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-ink-100'}`}>
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      )}
    </div>
  );
}
