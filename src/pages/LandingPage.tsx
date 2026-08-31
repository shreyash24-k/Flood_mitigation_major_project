import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  Navigation2,
  Crosshair,
  ArrowRight,
  Satellite,
  CloudRain,
  Mountain,
  Brain,
  AlertTriangle,
  LifeBuoy,
  Sparkles,
  Loader2,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MapView from '@/components/MapView';
import {
  searchPlaces,
  reverseGeocode,
  parseCoordinates,
  type GeocodeResult,
} from '@/lib/geocode';
import type { GeoPoint } from '@/lib/types';

interface LandingPageProps {
  onAssess: (point: GeoPoint) => void;
}

const QUICK_PLACES = [
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Guwahati', lat: 26.1445, lng: 91.7362 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Patna', lat: 25.5941, lng: 85.1376 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
];

export default function LandingPage({ onAssess }: LandingPageProps) {
  const [query, setQuery] = useState('');
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [openList, setOpenList] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  /** Set when a suggestion is chosen, so the effect below does not re-query it. */
  const skipNextLookup = useRef(false);

  // Debounced autocomplete against Nominatim (its policy asks for <= 1 req/sec).
  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 3 || parseCoordinates(q)) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setSearching(true);
      try {
        const found = await searchPlaces(q, ctrl.signal);
        setSuggestions(found);
        setOpenList(found.length > 0);
        if (found.length === 0) setError('No place matched that search.');
        else setError('');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError('Could not reach the location service. Check your connection.');
        }
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query]);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpenList(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = useCallback((p: GeoPoint, text?: string) => {
    skipNextLookup.current = true;
    setPoint(p);
    setQuery(text ?? p.label);
    setSuggestions([]);
    setOpenList(false);
    setError('');
  }, []);

  async function handleSearch() {
    setError('');
    const q = query.trim();
    if (!q) {
      setError('Enter a place name or latitude, longitude to continue.');
      return;
    }

    const coords = parseCoordinates(q);
    if (coords) {
      const name = await reverseGeocode(coords.lat, coords.lng);
      choose({ ...coords, label: name }, q);
      return;
    }

    // Prefer an already-loaded suggestion; otherwise query now.
    if (suggestions.length > 0) {
      choose(suggestions[0]);
      return;
    }
    setSearching(true);
    try {
      const found = await searchPlaces(q);
      if (found.length === 0) {
        setError('No place matched that search. Try adding a state or country.');
        return;
      }
      choose(found[0]);
    } catch {
      setError('Could not reach the location service. Check your connection.');
    } finally {
      setSearching(false);
    }
  }

  async function handleMapPick(lat: number, lng: number) {
    setError('');
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    choose({ lat, lng, label: fallback }, fallback);
    const name = await reverseGeocode(lat, lng);
    setPoint((prev) =>
      prev && prev.lat === lat && prev.lng === lng ? { ...prev, label: name } : prev,
    );
  }

  function useMyLocation() {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        setLoading(false);
        choose(
          { lat: latitude, lng: longitude, label: name },
          `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        );
      },
      () => {
        setLoading(false);
        setError('Could not access your location. Enter it manually instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void handleSearch();
  }

  function proceed() {
    if (!point) {
      void handleSearch();
      return;
    }
    onAssess(point);
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Header onHome={() => setPoint(null)} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* backdrop */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-aqua-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-water-grid opacity-40" />
        </div>

        <div className="container-page relative grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-20">
          {/* Left: copy + input */}
          <div className="animate-fade-up">
            <span className="chip border border-brand-400/30 bg-brand-600/10 text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> ML-powered flood forecasting
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Know your flood risk
              <span className="block bg-gradient-to-r from-brand-300 via-aqua-400 to-brand-400 bg-clip-text text-transparent">
                before the water rises.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300">
              Floodmate blends satellite imagery, rainfall telemetry, elevation models
              and a trained machine-learning model to predict flood probability for
              any location — then tells you exactly what to do next.
            </p>

            {/* Input card */}
            <form onSubmit={handleSubmit} className="mt-8 max-w-xl">
              <div ref={boxRef} className="relative">
                <div className="card bg-white/95 p-2 backdrop-blur">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => suggestions.length > 0 && setOpenList(true)}
                        autoComplete="off"
                        placeholder="Search any place, address, or lat, lng"
                        className="w-full rounded-xl border-0 bg-transparent py-3 pl-10 pr-9 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500" />
                      )}
                    </div>
                    <button type="submit" className="btn-primary !rounded-xl">
                      <Search className="h-4 w-4" /> Locate
                    </button>
                  </div>
                </div>

                {/* Live suggestions from OpenStreetMap */}
                {openList && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-[1100] mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-ink-900 py-1.5 shadow-card-lg">
                    {suggestions.map((s) => (
                      <li key={`${s.lat},${s.lng},${s.displayName}`}>
                        <button
                          type="button"
                          onClick={() => choose(s)}
                          className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/5"
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-white">
                              {s.label}
                            </span>
                            <span className="block truncate text-xs text-ink-400">
                              {s.displayName}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-400">
                            {s.kind}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:bg-white/10"
                >
                  <Crosshair className="h-3.5 w-3.5 text-aqua-400" />
                  {loading ? 'Locating…' : 'Use my current location'}
                </button>
                {QUICK_PLACES.slice(0, 3).map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      choose({ lat: p.lat, lng: p.lng, label: p.name });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:bg-white/10"
                  >
                    <MapPin className="h-3.5 w-3.5 text-brand-300" />
                    {p.name}
                  </button>
                ))}
              </div>

              {error && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-risk-moderate">
                  <AlertTriangle className="h-4 w-4" /> {error}
                </p>
              )}

              {point && (
                <div className="mt-5 animate-scale-in">
                  <div className="flex items-center gap-2 text-sm text-ink-200">
                    <Navigation2 className="h-4 w-4 text-aqua-400" />
                    <span className="font-medium">Pinned:</span>
                    <span className="text-white">{point.label}</span>
                    <span className="text-ink-400">
                      ({point.lat.toFixed(4)}°, {point.lng.toFixed(4)}°)
                    </span>
                  </div>
                  <button onClick={proceed} className="btn-primary mt-4 w-full sm:w-auto">
                    Assess flood risk
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right: map */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-brand-500/20 to-aqua-500/10 blur-2xl" />
              <MapView
                point={point}
                interactive
                onPick={handleMapPick}
                className="relative h-[380px] w-full border border-white/10 shadow-card-lg lg:h-[460px]"
              />
              <p className="mt-3 text-center text-xs text-ink-400">
                Live satellite imagery — click anywhere to pin a location, or switch
                to street and terrain layers using the control on the map.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/10 bg-ink-900/50">
        <div className="container-page py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold text-white">
              From raw signals to a clear warning
            </h2>
            <p className="mt-3 text-ink-400">
              Five layers work together in real time so you get a single, actionable
              flood probability — not a wall of raw data.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { icon: Satellite, title: 'Data sources', text: 'Sentinel-1 SAR, rainfall gauges, DEM elevation, soil moisture & hydrography.', color: '#3898C9' },
              { icon: Brain, title: 'ML model', text: 'A Random Forest / XGBoost model fuses features into a probability score.', color: '#22D3EE' },
              { icon: Mountain, title: 'Terrain', text: 'Elevation, slope and water-body proximity quantify exposure.', color: '#6BBADE' },
              { icon: CloudRain, title: 'Rainfall', text: '24h observations and 7-day forecasts weight imminent flooding.', color: '#1E7BAE' },
              { icon: LifeBuoy, title: 'Action', text: 'Risk level, impact rating and emergency contacts you can tap to call.', color: '#F59E0B' },
            ].map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:border-brand-400/40 hover:bg-white/[0.07]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${step.color}1A`, color: step.color }}
                >
                  <step.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">{step.text}</p>
                <span className="absolute right-4 top-4 font-display text-3xl font-extrabold text-white/5">
                  0{i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources / about */}
      <section id="sources" className="border-t border-white/10">
        <div id="about" className="container-page grid gap-12 py-16 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold text-white">
              Built on trusted Earth-observation data
            </h2>
            <p className="mt-4 text-ink-400">
              Floodmate's assessment engine pulls from the same satellite and
              meteorological sources used by national disaster agencies. The model
              is retrained as fresh imagery and rainfall data arrive.
            </p>
            <div className="mt-6 space-y-3">
              {[
                'Sentinel-1 synthetic-aperture radar for surface-water detection',
                'Copernicus DEM for elevation & slope at 30 m resolution',
                'Real-time rainfall telemetry from regional gauge networks',
                'Surface soil-moisture grids from microwave remote sensing',
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-aqua-400" />
                  <p className="text-sm text-ink-300">{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-900/40 to-ink-950 p-8">
            <h3 className="font-display text-xl font-bold text-white">A note on scope</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              This demonstration runs on a prototype predictor so you can explore the
              full experience end-to-end. In production, the same UI connects to a
              FastAPI backend running the trained model against live data — no
              front-end changes required.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-risk-moderate/30 bg-risk-moderate/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-risk-moderate" />
              <p className="text-xs text-risk-moderate">
                Always follow official evacuation orders from local authorities.
                Floodmate supports preparedness — it does not replace emergency broadcasts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
