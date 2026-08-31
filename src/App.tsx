import { useState } from 'react';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import type { GeoPoint } from '@/lib/types';

type View = { name: 'landing' } | { name: 'dashboard'; point: GeoPoint };

export default function App() {
  const [view, setView] = useState<View>({ name: 'landing' });

  return (
    <>
      {view.name === 'landing' ? (
        <LandingPage onAssess={(point) => setView({ name: 'dashboard', point })} />
      ) : (
        <Dashboard
          point={view.point}
          onBack={() => setView({ name: 'landing' })}
        />
      )}
    </>
  );
}
