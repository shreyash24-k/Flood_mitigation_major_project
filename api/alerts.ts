import { assessFloodRisk } from '../src/lib/floodPredictor';
import type { GeoPoint } from '../src/lib/types';
import { isOperator, missingConfig, OPERATOR } from './_internal/config';
import type { Bulletin } from './_internal/bulletin';
import { sendBulletins } from './_internal/send';

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

/** Great-circle distance, good enough at these scales. */
function km(a: GeoPoint, b: GeoPoint): number {
  return Math.hypot(
    (a.lat - b.lat) * 111.32,
    (a.lng - b.lng) * 111.32 * Math.cos((a.lat * Math.PI) / 180),
  );
}

/**
 * The model is a deterministic hash of lat/lng, so risk varies sharply between
 * nearby points. Sweep a coarse grid around the confirmed location and keep the
 * two worst points that are far enough apart to be distinct places.
 */
function nearbyHotspots(origin: GeoPoint, count = 2): GeoPoint[] {
  const candidates: { point: GeoPoint; probability: number }[] = [];
  for (let i = -18; i <= 18; i += 1) {
    for (let j = -18; j <= 18; j += 1) {
      if (i === 0 && j === 0) continue;
      const point: GeoPoint = {
        lat: origin.lat + i * 0.01,
        lng: origin.lng + j * 0.01,
        label: '',
      };
      if (km(origin, point) > 32) continue;
      candidates.push({ point, probability: assessFloodRisk(point).probability });
    }
  }
  candidates.sort((a, b) => b.probability - a.probability);

  const picked: GeoPoint[] = [];
  for (const { point } of candidates) {
    if (picked.every((p) => km(p, point) > 7)) picked.push(point);
    if (picked.length === count) break;
  }
  return picked;
}

/** Nominatim reverse geocode, with the raw coordinates as a fallback. */
async function labelFor(point: GeoPoint): Promise<string> {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14` +
    `&lat=${point.lat}&lon=${point.lng}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FloodMitigationAlerts/1.0 (major project)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { name?: string; display_name?: string };
    if (data.name) return data.name;
    if (data.display_name) {
      const parts = data.display_name.split(',').map((s) => s.trim());
      return parts.length <= 2 ? data.display_name : [parts[0], parts.at(-2)].join(', ');
    }
  } catch {
    // Offline, rate-limited, or the sea — coordinates will do.
  }
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const missing = missingConfig();
  if (missing.length) {
    return res.status(500).json({ error: `Server not configured. Missing: ${missing.join(', ')}` });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    | { email?: unknown; password?: unknown; lat?: unknown; lng?: unknown }
    | undefined;

  // Re-verify on every send. The alerts only ever go to the operator address,
  // never to an address supplied by the caller, so this cannot be used as a
  // relay to arbitrary recipients.
  if (!isOperator(body?.email, body?.password)) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'A valid latitude and longitude are required.' });
  }

  const origin: GeoPoint = { lat, lng, label: '' };
  const targets: GeoPoint[] = [origin, ...nearbyHotspots(origin)];

  // Sequential, so Nominatim's 1 req/sec policy is respected.
  for (const target of targets) {
    target.label = await labelFor(target);
  }
  targets[0].label = `${targets[0].label} (your location)`;

  const bulletins: Bulletin[] = targets.map((point, i) => ({
    assessment: assessFloodRisk(point),
    rank: i + 1,
    total: targets.length,
    distanceKm: i === 0 ? 0 : km(origin, point),
  }));

  try {
    const sent = await sendBulletins(OPERATOR.email, bulletins);
    return res.status(200).json({
      ok: true,
      to: OPERATOR.email,
      sent,
      assessments: bulletins.map((b) => ({
        label: b.assessment.location.label,
        lat: b.assessment.location.lat,
        lng: b.assessment.location.lng,
        probability: b.assessment.probability,
        riskLevel: b.assessment.riskLevel,
        distanceKm: Number(b.distanceKm.toFixed(1)),
      })),
    });
  } catch (err) {
    return res.status(502).json({
      error: 'The alerts could not be sent.',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
