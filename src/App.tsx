import { useState } from 'react';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import Login, { type Credentials } from '@/pages/Login';
import LocationGate from '@/pages/LocationGate';
import type { GeoPoint } from '@/lib/types';

type View =
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'gate' }
  | { name: 'dashboard'; point: GeoPoint };

/**
 * Deep-linking from email alerts (from commit e644ad6):
 * Alert emails link straight to a location, e.g.
 *   /?lat=18.5204&lng=73.8567&label=Pune
 * so a recipient lands directly on that assessment dashboard.
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
  const [view, setView] = useState<View>(() => {
    const deepLinked = pointFromUrl();
    return deepLinked ? { name: 'dashboard', point: deepLinked } : { name: 'landing' };
  });

  // 1. Operator Login & Signup View
  if (view.name === 'login') {
    return (
      <Login
        onAuth={(creds) => {
          setCredentials(creds);
          const deepLinked = pointFromUrl();
          setView(deepLinked ? { name: 'dashboard', point: deepLinked } : { name: 'gate' });
        }}
        onBack={() => setView({ name: 'landing' })}
      />
    );
  }

  // 2. Location Confirmation & Email Dispatch Gate View
  if (view.name === 'gate' && credentials) {
    return (
      <LocationGate
        credentials={credentials}
        onContinue={(point) => setView({ name: 'dashboard', point })}
        onBack={() => setView({ name: 'landing' })}
      />
    );
  }

  // 3. Regular Public Landing Page
  if (view.name === 'landing') {
    return (
      <LandingPage
        onAssess={(point) => setView({ name: 'dashboard', point })}
        onOperatorLogin={() => setView({ name: 'login' })}
      />
    );
  }

  // 4. Flood Risk Assessment Dashboard
  return (
    <Dashboard
      point={view.point}
      onBack={() => {
        // Drop the deep-link params so Back doesn't bounce into the dashboard again
        window.history.replaceState(null, '', window.location.pathname);
        setView({ name: 'landing' });
      }}
    />
  );
}
