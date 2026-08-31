import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Satellite, Map as MapIcon, Mountain } from 'lucide-react';
import type { GeoPoint } from '@/lib/types';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

/** Leaflet's default icon paths break under Vite's bundler — rebind them once. */
const markerIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type BaseLayerId = 'satellite' | 'streets' | 'terrain';

const BASE_LAYERS: Record<
  BaseLayerId,
  { label: string; icon: typeof Satellite; url: string; attribution: string; maxZoom: number }
> = {
  satellite: {
    label: 'Satellite',
    icon: Satellite,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Imagery &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom: 19,
  },
  streets: {
    label: 'Streets',
    icon: MapIcon,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  terrain: {
    label: 'Terrain',
    icon: Mountain,
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
};

interface MapViewProps {
  point: GeoPoint | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  interactive?: boolean;
  /** Visual radius (km) of the flood-risk zone shown around the pin */
  riskRadiusKm?: number;
  riskColor?: string;
  /** Which base map to show first. Satellite by default. */
  defaultLayer?: BaseLayerId;
}

/** Recentres the map whenever the selected point changes. */
function Recenter({ point, zoom }: { point: GeoPoint | null; zoom: number }) {
  const map = useMap();
  const lat = point?.lat;
  const lng = point?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], zoom, { duration: 0.9 });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

/** Turns a map click into a picked coordinate. */
function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(+e.latlng.lat.toFixed(6), +e.latlng.wrap().lng.toFixed(6));
    },
  });
  return null;
}

/** Keeps Leaflet's canvas sized correctly when its container resizes. */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

/**
 * Real slippy map (Leaflet + OpenStreetMap / Esri imagery).
 *
 * No API key is required for any of the three base layers.
 * The props surface is unchanged from the earlier prototype, so callers
 * did not need to change.
 */
export default function MapView({
  point,
  onPick,
  className = '',
  interactive = false,
  riskRadiusKm = 0,
  riskColor = '#3898C9',
  defaultLayer = 'satellite',
}: MapViewProps) {
  const [layer, setLayer] = useState<BaseLayerId>(defaultLayer);
  const base = BASE_LAYERS[layer];

  // Wider view when the user is still choosing; tight view once a risk zone is known.
  const zoom = riskRadiusKm > 0 ? zoomForRadius(riskRadiusKm) : point ? 11 : 4;
  // India-wide default view until the user picks somewhere.
  const lat = point?.lat;
  const lng = point?.lng;
  const center = useMemo<[number, number]>(
    () => (lat !== undefined && lng !== undefined ? [lat, lng] : [20.5937, 78.9629]),
    [lat, lng],
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-ink-900 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        worldCopyJump
        className="h-full w-full"
        style={{ background: '#072A44' }}
      >
        <TileLayer
          key={layer}
          url={base.url}
          attribution={base.attribution}
          maxZoom={base.maxZoom}
        />

        {/* Place labels + roads on top of imagery, which has none of its own */}
        {layer === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}

        <ResizeHandler />
        <Recenter point={point} zoom={zoom} />
        {interactive && onPick && <ClickPicker onPick={onPick} />}

        {point && riskRadiusKm > 0 && (
          <Circle
            center={[point.lat, point.lng]}
            radius={riskRadiusKm * 1000}
            pathOptions={{
              color: riskColor,
              weight: 1.5,
              fillColor: riskColor,
              fillOpacity: 0.18,
            }}
          />
        )}

        {point && (
          <Marker position={[point.lat, point.lng]} icon={markerIcon}>
            <Popup>
              <span className="font-semibold">{point.label}</span>
              <br />
              {point.lat.toFixed(4)}°, {point.lng.toFixed(4)}°
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Base-layer switcher */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-1 rounded-xl bg-ink-950/80 p-1 backdrop-blur">
        <span className="flex items-center gap-1.5 px-2.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          <Layers className="h-3 w-3 text-brand-400" /> Layer
        </span>
        {(Object.keys(BASE_LAYERS) as BaseLayerId[]).map((id) => {
          const opt = BASE_LAYERS[id];
          const active = id === layer;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setLayer(id)}
              title={opt.label}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-brand-600 text-white' : 'text-ink-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Coordinate readout */}
      {point && (
        <div className="pointer-events-none absolute bottom-8 left-3 z-[1000] rounded-lg bg-ink-950/70 px-2.5 py-1.5 text-[11px] font-medium text-ink-200 backdrop-blur">
          {point.lat.toFixed(4)}°, {point.lng.toFixed(4)}°
        </div>
      )}

      {interactive && !point && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-[1000] flex justify-center">
          <div className="rounded-xl bg-ink-950/75 px-4 py-2.5 text-sm font-medium text-ink-200 backdrop-blur">
            Click anywhere on the map to drop a pin
          </div>
        </div>
      )}
    </div>
  );
}

/** Pick a zoom level that fits the risk circle comfortably in the frame. */
function zoomForRadius(km: number): number {
  if (km <= 2) return 13;
  if (km <= 4) return 12;
  if (km <= 6) return 12;
  if (km <= 9) return 11;
  return 10;
}
