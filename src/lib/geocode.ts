import type { GeoPoint } from '@/lib/types';

/**
 * Real geocoding via OpenStreetMap Nominatim.
 * Free and keyless. Nominatim's usage policy asks for <= 1 request/second,
 * so every caller here is debounced and results are cached in-memory.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org';

export interface GeocodeResult extends GeoPoint {
  /** Full human-readable address returned by the geocoder */
  displayName: string;
  /** e.g. "city", "river", "suburb" — useful context for flood assessment */
  kind: string;
  /** [south, north, west, east] — lets the map fit the place, not just centre it */
  boundingBox?: [number, number, number, number];
}

const cache = new Map<string, GeocodeResult[]>();

/** Parses a bare "lat, lng" / "lat lng" pair. Returns null if the text isn't coordinates. */
export function parseCoordinates(query: string): GeoPoint | null {
  const m = query
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
}

/** Shortens Nominatim's very long display names to something a header can hold. */
function shortLabel(displayName: string): string {
  const parts = displayName.split(',').map((s) => s.trim());
  if (parts.length <= 2) return displayName;
  return [parts[0], parts[parts.length - 2], parts[parts.length - 1]]
    .filter(Boolean)
    .join(', ');
}

/** Forward geocode: place name or address -> ranked candidate locations. */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const cached = cache.get(q.toLowerCase());
  if (cached) return cached;

  const url =
    `${NOMINATIM}/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;

  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);

  const raw = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    name?: string;
    type?: string;
    category?: string;
    boundingbox?: [string, string, string, string];
  }>;

  const results: GeocodeResult[] = raw.map((r) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: r.name || shortLabel(r.display_name),
    displayName: r.display_name,
    kind: r.type || r.category || 'place',
    boundingBox: r.boundingbox
      ? (r.boundingbox.map(Number) as [number, number, number, number])
      : undefined,
  }));

  cache.set(q.toLowerCase(), results);
  return results;
}

/** Reverse geocode: coordinates -> the name of the place that was clicked. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string> {
  const url =
    `${NOMINATIM}/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { display_name?: string; name?: string };
    if (data.name) return data.name;
    if (data.display_name) return shortLabel(data.display_name);
  } catch {
    // Ocean, Antarctica, or the network is down — fall back to raw coordinates.
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Resolves free-form input to a single point: coordinates are parsed locally,
 * anything else goes to the geocoder and takes the top-ranked match.
 */
export async function resolveLocation(
  query: string,
  signal?: AbortSignal,
): Promise<GeoPoint | null> {
  const coords = parseCoordinates(query);
  if (coords) return coords;
  const [top] = await searchPlaces(query, signal);
  return top ?? null;
}
