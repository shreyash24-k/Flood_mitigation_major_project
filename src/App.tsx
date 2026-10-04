import { useState } from 'react';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import Login, { type Credentials } from '@/pages/Login';
import LocationGate from '@/pages/LocationGate';
import type { GeoPoint } from '@/lib/types';

type View =
  | { name: 'landing' }
  | { name: 'gate' }
  | { name: 'dashboard'; point: GeoPoint };

/**
 * Alert emails link straight to a location, e.g.
 *   /?lat=18.5204&lng=73.8567&label=Pune
 * so a recipient lands on that assessment instead of the location gate.
 */
function pointFromUrl(): GeoPoint | null {
  const q = new URLSearchParams(window.location.search);
  const lat = parseFloat(q.get('lat') ?? '');
  const lng = parseFloat(q.get('lng') ?? '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const label = q.get('label')?.trim();
  return { lat, lng, label: label || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

export default function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [view, setView] = useState<View>({ name: 'gate' });

  if (!credentials) {
    return (
      <Login
        onAuth={(creds) => {
          setCredentials(creds);
          const deepLinked = pointFromUrl();
          setView(deepLinked ? { name: 'dashboard', point: deepLinked } : { name: 'gate' });
        }}
      />
    );
  }

  if (view.name === 'gate') {
    return (
      <LocationGate
        credentials={credentials}
        onContinue={(point) => setView({ name: 'dashboard', point })}
      />
    );
  }

  if (view.name === 'landing') {
    return <LandingPage onAssess={(point) => setView({ name: 'dashboard', point })} />;
  }

  return (
    <Dashboard
      point={view.point}
      onBack={() => {
        // Drop the deep-link params so Back doesn't bounce into the dashboard again.
        window.history.replaceState(null, '', window.location.pathname);
        setView({ name: 'landing' });
      }}
    />
  );
}
