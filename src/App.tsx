import { useState } from 'react';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import type { GeoPoint } from '@/lib/types';

type View = { name: 'landing' } | { name: 'dashboard'; point: GeoPoint };

/**
 * Alert emails and SMS link straight to a location, e.g.
 *   /?lat=18.5204&lng=73.8567&label=Pune
 * so a recipient lands on that assessment instead of the search box.
 */
function viewFromUrl(): View {
  const q = new URLSearchParams(window.location.search);
  const lat = parseFloat(q.get('lat') ?? '');
  const lng = parseFloat(q.get('lng') ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { name: 'landing' };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { name: 'landing' };
  const label = q.get('label')?.trim();
  return {
    name: 'dashboard',
    point: { lat, lng, label: label || `${lat.toFixed(4)}, ${lng.toFixed(4)}` },
  };
}

export default function App() {
  const [view, setView] = useState<View>(viewFromUrl);

  return (
    <>
      {view.name === 'landing' ? (
        <LandingPage onAssess={(point) => setView({ name: 'dashboard', point })} />
      ) : (
        <Dashboard
          point={view.point}
          onBack={() => {
            // Drop the deep-link params so Back doesn't bounce into the dashboard again.
            window.history.replaceState(null, '', window.location.pathname);
            setView({ name: 'landing' });
          }}
        />
      )}
    </>
  );
}
