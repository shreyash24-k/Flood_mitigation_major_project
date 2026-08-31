import { useEffect, useState } from 'react';
import type { RiskLevel, RiskImpact } from '@/lib/types';

interface RiskGaugeProps {
  probability: number;
  riskLevel: RiskLevel;
  impact: RiskImpact;
}

const RISK_META: Record<RiskLevel, { color: string; label: string; ring: string }> = {
  low: { color: '#10B981', label: 'Low risk', ring: 'text-risk-low' },
  moderate: { color: '#F59E0B', label: 'Moderate risk', ring: 'text-risk-moderate' },
  high: { color: '#F97316', label: 'High risk', ring: 'text-risk-high' },
  severe: { color: '#DC2626', label: 'Severe risk', ring: 'text-risk-severe' },
  extreme: { color: '#7F1D1D', label: 'Extreme risk', ring: 'text-risk-extreme' },
};

const IMPACT_META: Record<RiskImpact, { label: string; color: string }> = {
  'not harmful': { label: 'Not harmful', color: 'text-risk-low bg-risk-low/10' },
  'less harmful': { label: 'Less harmful', color: 'text-risk-moderate bg-risk-moderate/10' },
  'harmful': { label: 'Harmful', color: 'text-risk-severe bg-risk-severe/10' },
};

export default function RiskGauge({ probability, riskLevel, impact }: RiskGaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  const meta = RISK_META[riskLevel];
  const impactMeta = IMPACT_META[impact];

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * probability));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [probability]);

  const radius = 88;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (displayed / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[220px] w-[220px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="rgba(155,176,201,0.15)" strokeWidth="14" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke={meta.color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.1s linear', filter: `drop-shadow(0 0 10px ${meta.color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl font-extrabold tabular-nums text-white">
            {displayed}<span className="text-2xl text-ink-300">%</span>
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-300">
            flood probability
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-2.5">
        <span
          className="px-4 py-1.5 rounded-full text-sm font-bold"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
        <span className={`chip ${impactMeta.color}`}>
          Impact: {impactMeta.label}
        </span>
      </div>
    </div>
  );
}
