import type { EnvironmentalFactor, DataSourceLayer } from '@/lib/types';
import { CloudRain, Mountain, Droplets, TrendingUp, Waves, Database, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FACTOR_ICONS: Record<string, LucideIcon> = {
  'Rainfall intensity': CloudRain,
  Elevation: Mountain,
  'Soil moisture': Droplets,
  'Slope gradient': TrendingUp,
  'Water-body proximity': Waves,
};

interface EnvironmentalFactorsProps {
  factors: EnvironmentalFactor[];
  dark?: boolean;
}

export function EnvironmentalFactors({ factors, dark = false }: EnvironmentalFactorsProps) {
  return (
    <div className={dark ? 'card-dark p-5' : 'card p-5'}>
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-5 w-5 text-brand-600" />
        <h3 className={`font-display text-base font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>Environmental factors</h3>
      </div>
      <ul className="space-y-4">
        {factors.map((f) => {
          const Icon = FACTOR_ICONS[f.name] ?? Droplets;
          const pct = Math.round(f.contribution * 100);
          return (
            <li key={f.name} className="group">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-sm font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{f.name}</p>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-brand-700">{f.value}</p>
                  </div>
                  <p className={`mt-0.5 text-xs leading-relaxed ${dark ? 'text-ink-400' : 'text-ink-500'}`}>{f.detail}</p>
                </div>
              </div>
              <div className={`mt-2 ml-12 h-1.5 w-[calc(100%-3rem)] overflow-hidden rounded-full ${dark ? 'bg-white/10' : 'bg-ink-100'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const STATUS_STYLE: Record<DataSourceLayer['status'], { label: string; dot: string }> = {
  synced: { label: 'Synced', dot: 'bg-brand-500' },
  live: { label: 'Live', dot: 'bg-risk-low animate-pulse' },
  historical: { label: 'Historical', dot: 'bg-ink-400' },
};

interface DataSourcesProps {
  sources: DataSourceLayer[];
  dark?: boolean;
}

export function DataSources({ sources, dark = false }: DataSourcesProps) {
  return (
    <div className={dark ? 'card-dark p-5' : 'card p-5'}>
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-5 w-5 text-brand-600" />
        <h3 className={`font-display text-base font-bold ${dark ? 'text-white' : 'text-ink-900'}`}>Data sources & pipeline</h3>
      </div>
      <ul className="space-y-3">
        {sources.map((s) => {
          const st = STATUS_STYLE[s.status];
          return (
            <li key={s.name} className="flex items-start gap-3">
              <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-brand-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-ink-900'}`}>{s.name}</p>
                  <span className={`flex items-center gap-1.5 text-[11px] font-medium ${dark ? 'text-ink-400' : 'text-ink-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>
                <p className={`text-xs ${dark ? 'text-ink-400' : 'text-ink-500'}`}>{s.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
