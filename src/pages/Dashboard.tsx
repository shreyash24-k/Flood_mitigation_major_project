import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Mountain,
  CloudRain,
  Droplets,
  TrendingUp,
  Waves,
  Thermometer,
  Wind,
  Gauge,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MapView from '@/components/MapView';
import RiskGauge from '@/components/RiskGauge';
import StatCard from '@/components/StatCard';
import EmergencyContacts from '@/components/EmergencyContacts';
import { EnvironmentalFactors, DataSources } from '@/components/EnvironmentalFactors';
import { assessFloodRisk, defaultEmergencyContacts } from '@/lib/floodPredictor';
import type { GeoPoint, RiskLevel } from '@/lib/types';

interface DashboardProps {
  point: GeoPoint;
  onBack: () => void;
}

const RISK_RADIUS: Record<RiskLevel, { km: number; color: string }> = {
  low: { km: 1.5, color: '#10B981' },
  moderate: { km: 3, color: '#F59E0B' },
  high: { km: 5, color: '#F97316' },
  severe: { km: 8, color: '#DC2626' },
  extreme: { km: 12, color: '#7F1D1D' },
};

const WARNING_BANNER: Record<RiskLevel, { text: string; bg: string; border: string }> = {
  low: {
    text: 'No active flood warning for this area. Conditions are stable.',
    bg: 'bg-risk-low/10',
    border: 'border-risk-low/30',
  },
  moderate: {
    text: 'Advisory: monitor conditions. Minor flooding is possible over the next 48 hours.',
    bg: 'bg-risk-moderate/10',
    border: 'border-risk-moderate/30',
  },
  high: {
    text: 'Flood watch issued. Prepare to move to higher ground and secure belongings.',
    bg: 'bg-risk-high/10',
    border: 'border-risk-high/30',
  },
  severe: {
    text: 'Flood warning issued. Evacuation of low-lying areas is strongly advised.',
    bg: 'bg-risk-severe/10',
    border: 'border-risk-severe/40',
  },
  extreme: {
    text: 'CRITICAL flood alert. Life-threatening conditions — evacuate immediately.',
    bg: 'bg-risk-extreme/15',
    border: 'border-risk-extreme/50',
  },
};

export default function Dashboard({ point, onBack }: DashboardProps) {
  const [version, setVersion] = useState(0);
  const assessment = useMemo(() => assessFloodRisk(point), [point, version]);
  const contacts = useMemo(() => defaultEmergencyContacts(), []);
  const warn = WARNING_BANNER[assessment.riskLevel];
  const zone = RISK_RADIUS[assessment.riskLevel];

  const assessedDate = new Date(assessment.assessedAt);

  return (
    <div className="min-h-screen bg-ink-950">
      <Header onHome={onBack} compact />

      {/* Back + title bar */}
      <div className="border-b border-white/10 bg-ink-900/40">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-ink-200 transition-colors hover:border-brand-400/40 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> New location
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                <MapPin className="h-3.5 w-3.5 text-brand-400" /> Assessment
              </div>
              <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
                {assessment.location.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVersion((v) => v + 1)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:border-brand-400/40 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-assess
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:border-brand-400/40 hover:text-white"
            >
              <Printer className="h-3.5 w-3.5" /> Report
            </button>
          </div>
        </div>
      </div>

      <div className="container-page space-y-6 py-6">
        {/* Warning banner */}
        <div className={`flex items-start gap-3 rounded-2xl border ${warn.border} ${warn.bg} px-5 py-4 animate-fade-in`}>
          {assessment.riskLevel === 'low' ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-risk-low" />
          ) : assessment.riskLevel === 'extreme' ? (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-risk-extreme" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-risk-high" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{warn.text}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
              <CalendarClock className="h-3.5 w-3.5" />
              Assessed {assessedDate.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Top: gauge + key stats */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Gauge */}
          <div className="card-dark flex flex-col items-center justify-center p-6 animate-scale-in">
            <RiskGauge
              probability={assessment.probability}
              riskLevel={assessment.riskLevel}
              impact={assessment.impact}
            />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4 lg:col-span-2">
            <StatCard
              dark
              icon={Mountain}
              label="Elevation"
              value={assessment.elevation.meters}
              unit="m"
              sub={`${assessment.elevation.feet} ft above sea level`}
              accent="#1E7BAE"
            />
            <StatCard
              dark
              icon={CloudRain}
              label="Rainfall (24h)"
              value={assessment.rainfall.mm24h}
              unit="mm"
              sub={`7-day forecast: ${assessment.rainfall.mmForecast7d} mm`}
              accent="#3898C9"
            />
            <StatCard
              dark
              icon={Droplets}
              label="Soil moisture"
              value={assessment.soilMoisture}
              unit="%"
              sub={assessment.soilMoisture > 75 ? 'Near saturation' : 'Normal range'}
              accent="#22D3EE"
              progress={assessment.soilMoisture}
            />
            <StatCard
              dark
              icon={Waves}
              label="Nearest water"
              value={assessment.riverProximityKm}
              unit="km"
              sub={assessment.nearestWaterBody}
              accent="#0891B2"
            />
            <StatCard
              dark
              icon={TrendingUp}
              label="Slope gradient"
              value={assessment.slope}
              unit="°"
              sub={assessment.slope < 3 ? 'Nearly flat' : 'Moderate grade'}
              accent="#6BBADE"
            />
            <StatCard
              dark
              icon={Gauge}
              label="Risk level"
              value={assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)}
              sub={`Impact: ${assessment.impact}`}
              accent={
                assessment.riskLevel === 'low' ? '#10B981' :
                assessment.riskLevel === 'moderate' ? '#F59E0B' :
                assessment.riskLevel === 'high' ? '#F97316' : '#DC2626'
              }
            />
          </div>
        </div>

        {/* Map + conditions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card-dark overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4.5 w-4.5 text-brand-400" />
                  <h3 className="font-display text-sm font-bold text-white">Location map</h3>
                </div>
                <span className="text-xs text-ink-400">
                  Risk zone radius: {zone.km} km
                </span>
              </div>
              <MapView
                point={point}
                riskRadiusKm={zone.km}
                riskColor={zone.color}
                className="h-[360px] w-full border-0"
              />
            </div>
          </div>

          {/* Current conditions */}
          <div className="card-dark p-5">
            <h3 className="font-display text-base font-bold text-white">Current conditions</h3>
            <p className="text-xs text-ink-400">Live meteorological snapshot</p>
            <div className="mt-4 space-y-4">
              <ConditionRow icon={Thermometer} label="Temperature" value={`${assessment.temperatureC} °C`} accent="#F97316" />
              <ConditionRow icon={Droplets} label="Humidity" value={`${assessment.humidity}%`} accent="#0891B2" />
              <ConditionRow icon={Wind} label="Wind speed" value={`${assessment.windKph} km/h`} accent="#6BBADE" />
              <ConditionRow icon={CloudRain} label="7-day rain forecast" value={`${assessment.rainfall.mmForecast7d} mm`} accent="#1E7BAE" />
            </div>
          </div>
        </div>

        {/* Factors + recommended actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EnvironmentalFactors dark factors={assessment.factors} />
          </div>
          <div className="card-dark p-5">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-risk-low" />
              <h3 className="font-display text-base font-bold text-white">Recommended actions</h3>
            </div>
            <ul className="space-y-3">
              {assessment.recommendedActions.map((action, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-200">{action}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Emergency + data sources */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EmergencyContacts dark contacts={contacts} />
          <DataSources dark sources={assessment.dataSources} />
        </div>

        <Footer />
      </div>
    </div>
  );
}

function ConditionRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}1A`, color: accent }}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="flex-1 text-sm text-ink-300">{label}</span>
      <span className="font-display text-sm font-bold tabular-nums text-white">{value}</span>
    </div>
  );
}
