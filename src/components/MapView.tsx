import { useEffect, useRef } from 'react';
import { MapPin, Layers } from 'lucide-react';
import type { GeoPoint } from '@/lib/types';

interface MapViewProps {
  point: GeoPoint | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
  /** Visual radius (km) of the flood-risk zone shown around the pin */
  riskRadiusKm?: number;
  riskColor?: string;
}

/**
 * Prototype map view — an abstracted, stylized world grid.
 *
 * To swap in a real map later, replace the <canvas>/<svg> body of this
 * component with a <GoogleMap> or <MapContainer> (Leaflet) element and
 * keep the same props surface. The rest of the app does not need changes.
 */
export default function MapView({
  point,
  onPick,
  className = '',
  interactive = false,
  riskRadiusKm = 0,
  riskColor = '#3898C9',
}: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw a stylized topographic grid + water bodies
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // Ocean gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0A3B5C');
    bg.addColorStop(1, '#072A44');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (lat/lng abstraction)
    ctx.strokeStyle = 'rgba(155, 176, 201, 0.12)';
    ctx.lineWidth = 1;
    const grid = 44;
    for (let x = 0; x <= W; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Faux landmasses (deterministic blobs)
    const blobs = [
      { x: W * 0.22, y: H * 0.3, r: W * 0.16 },
      { x: W * 0.68, y: H * 0.4, r: W * 0.2 },
      { x: W * 0.45, y: H * 0.72, r: W * 0.14 },
      { x: W * 0.85, y: H * 0.78, r: W * 0.1 },
    ];
    blobs.forEach((b) => {
      const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.2, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(45, 82, 120, 0.85)');
      g.addColorStop(0.7, 'rgba(36, 61, 92, 0.55)');
      g.addColorStop(1, 'rgba(36, 61, 92, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rivers / water lines
    ctx.strokeStyle = 'rgba(56, 152, 201, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    ctx.bezierCurveTo(W * 0.3, H * 0.4, W * 0.5, H * 0.7, W, H * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.2);
    ctx.bezierCurveTo(W * 0.35, H * 0.35, W * 0.4, H * 0.6, W * 0.6, H * 0.85);
    ctx.stroke();
  }, []);

  // Map lat/lng → canvas x/y (equirectangular)
  function project(lat: number, lng: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = ((lng + 180) / 360) * rect.width;
    const y = ((90 - lat) / 180) * rect.height;
    return { x, y };
  }

  const pin = point ? project(point.lat, point.lng) : null;

  // risk radius in pixels ~ km/100 of map width (abstract)
  const radiusPx = riskRadiusKm
    ? Math.max(18, (riskRadiusKm / 120) * (canvasRef.current?.getBoundingClientRect().width ?? 600))
    : 0;

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!interactive || !onPick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = (x / rect.width) * 360 - 180;
    const lat = 90 - (y / rect.height) * 180;
    onPick(lat, lng);
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink-900 ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`block h-full w-full ${interactive ? 'cursor-crosshair' : ''}`}
      />

      {/* Overlay: layer badge */}
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 backdrop-blur">
        <Layers className="h-3.5 w-3.5 text-brand-400" />
        Prototype map · swap-ready
      </div>

      {/* Overlay: coords */}
      {point && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 backdrop-blur">
          {point.lat.toFixed(4)}°, {point.lng.toFixed(4)}°
        </div>
      )}

      {/* Risk zone */}
      {pin && radiusPx > 0 && (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{
            left: pin.x,
            top: pin.y,
            width: radiusPx * 2,
            height: radiusPx * 2,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${riskColor}55 0%, ${riskColor}22 50%, transparent 70%)`,
            border: `1.5px solid ${riskColor}88`,
            animation: 'pulse-ring 2.5s ease-out infinite',
          }}
        />
      )}

      {/* Pin */}
      {pin && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className="relative flex flex-col items-center">
            <span className="absolute -top-1 h-3 w-3 animate-ripple rounded-full bg-brand-400" />
            <span className="absolute -top-1 h-3 w-3 animate-ripple rounded-full bg-brand-400" style={{ animationDelay: '0.7s' }} />
            <MapPin className="h-8 w-8 fill-brand-500 text-brand-700 drop-shadow-[0_4px_8px_rgba(3,105,161,0.6)]" strokeWidth={1.5} />
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-brand-700 ring-2 ring-white/60" />
          </div>
        </div>
      )}

      {interactive && !point && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl bg-ink-950/70 px-4 py-2.5 text-sm font-medium text-ink-200 backdrop-blur">
            Click anywhere to drop a pin
          </div>
        </div>
      )}
    </div>
  );
}
