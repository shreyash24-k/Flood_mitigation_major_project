import { useState } from 'react';
import {
  MapPin,
  LoaderCircle,
  TriangleAlert,
  CircleCheck,
  Send,
  Crosshair,
  ArrowLeft,
} from 'lucide-react';
import type { GeoPoint } from '@/lib/types';
import type { Credentials } from '@/pages/Login';

import { reverseGeocode } from '@/lib/geocode';

interface SentAlert {
  label: string;
  lat: number;
  lng: number;
  probability: number;
  riskLevel: string;
  distanceKm: number;
}

interface Props {
  credentials: Credentials;
  onContinue: (point: GeoPoint) => void;
  onBack?: () => void;
}

type Fix = { lat: number; lng: number; accuracy: number; label?: string };

const PRESET_JURISDICTIONS = [
  { name: 'Mumbai (Coastal)', lat: 19.076, lng: 72.8777 },
  { name: 'Guwahati (Brahmaputra)', lat: 26.1445, lng: 91.7362 },
  { name: 'Patna (Ganges Basin)', lat: 25.5941, lng: 85.1376 },
  { name: 'Kolkata (Hooghly Delta)', lat: 22.5726, lng: 88.3639 },
];

const RISK_TONE: Record<string, string> = {
  low: 'text-emerald-300',
  moderate: 'text-amber-300',
  high: 'text-orange-300',
  severe: 'text-rose-300',
  extreme: 'text-rose-400',
};

/**
 * Step two: ask the browser for a precise fix, then let the operator confirm
 * before anything is dispatched. Nothing is sent until they press the button.
 */
export default function LocationGate({ credentials, onContinue }: Props) {
  const [fix, setFix] = useState<Fix | null>(null);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentAlert[] | null>(null);

  function locate() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('This browser does not support location services.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Allow it in your browser to continue.'
            : `Could not get a location fix: ${err.message}`,
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  async function dispatch() {
    if (!fix || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, lat: fix.lat, lng: fix.lng }),
      });
      const data = (await res.json()) as { error?: string; assessments?: SentAlert[] };
      if (!res.ok) throw new Error(data.error ?? `Dispatch failed (${res.status})`);
      setSent(data.assessments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The alerts could not be sent.');
    } finally {
      setSending(false);
    }
  }

  const point: GeoPoint | null = fix
    ? { lat: fix.lat, lng: fix.lng, label: fix.label || `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}` }
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-aqua-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-water-grid opacity-40" />
      </div>

      {/* Top Left Return Button */}
      {onBack && (
        <div className="relative z-50 container-page pt-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-ink-200 backdrop-blur transition-colors hover:border-brand-400/40 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Assessment
          </button>
        </div>
      )}

      <div className="container-page relative flex min-h-[calc(100vh-80px)] items-center justify-center py-10">
        <div className="w-full max-w-lg animate-fade-up">
          <div className="mb-8 text-center">
            <span className="chip border border-brand-400/30 bg-brand-600/10 text-brand-200">
              <Crosshair className="h-3.5 w-3.5" />
              Step 2 of 2
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Confirm your location
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              The assessment is calculated for the exact point you confirm. Nothing is sent until
              you press dispatch.
            </p>
          </div>

          <div className="card-dark p-6 sm:p-7">
            {!fix ? (
              <>
                <button onClick={locate} disabled={locating} className="btn-primary w-full">
                  {locating ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Acquiring GPS fix…
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Use my current location
                    </>
                  )}
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Or select jurisdiction preset
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PRESET_JURISDICTIONS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setFix({
                          lat: p.lat,
                          lng: p.lng,
                          accuracy: 15,
                          label: p.name,
                        })
                      }
                      className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-left text-xs font-medium text-ink-200 transition-all hover:border-brand-400/40 hover:bg-white/10 hover:text-white"
                    >
                      <div className="font-semibold text-white">{p.name.split(' ')[0]}</div>
                      <div className="text-[10px] text-ink-400">{p.lat}, {p.lng}</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
                    <CircleCheck className="h-4 w-4" />
                    Location acquired
                  </div>
                  <div className="mt-3 font-mono text-lg font-semibold text-white">
                    {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)}
                  </div>
                  <div className="mt-1 text-xs text-ink-400">
                    Accurate to about {Math.round(fix.accuracy)} m
                  </div>
                </div>

                {!sent && (
                  <>
                    <button onClick={dispatch} disabled={sending} className="btn-primary mt-5 w-full">
                      {sending ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Sending bulletins…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Dispatch alerts to my email
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setFix(null)}
                      className="mt-3 w-full text-center text-xs text-ink-400 transition hover:text-brand-200"
                    >
                      Use a different location
                    </button>
                  </>
                )}
              </>
            )}

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {sent && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <CircleCheck className="h-4 w-4" />
                  {sent.length} alert{sent.length === 1 ? '' : 's'} sent to {credentials.email}
                </div>
                <ul className="mt-4 space-y-2">
                  {sent.map((a) => (
                    <li
                      key={`${a.lat},${a.lng}`}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{a.label}</span>
                        <span
                          className={`shrink-0 text-sm font-bold ${RISK_TONE[a.riskLevel] ?? 'text-ink-200'}`}
                        >
                          {a.probability}%
                        </span>
                      </div>
                      <div className="mt-1 text-xs capitalize text-ink-400">
                        {a.riskLevel}
                        {a.distanceKm > 0 ? ` · ${a.distanceKm} km away` : ' · your location'}
                      </div>
                    </li>
                  ))}
                </ul>
                <button onClick={() => point && onContinue(point)} className="btn-primary mt-5 w-full">
                  Open the dashboard
                </button>
              </div>
            )}
          </div>

          {!sent && point && (
            <button
              onClick={() => onContinue(point)}
              className="mt-6 block w-full text-center text-xs text-ink-500 transition hover:text-brand-200"
            >
              Skip and go straight to the dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
