/**
 * Alert bulletin rendering.
 *
 * Satellite frames are referenced as remote <img> tags pointing straight at
 * NASA GIBS tiles rather than being stitched and attached. That keeps the
 * serverless function fast (no image decoding, no extra dependency) and Gmail
 * displays proxied remote images by default, which is where these land.
 */
import { defaultEmergencyContacts } from '../../src/lib/floodPredictor.js';
import type { FloodAssessment, RiskLevel } from '../../src/lib/types.js';
import { APP_URL, IMAGERY } from './config.js';

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const LAYER_FLOOD = 'VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1';
const LAYER_TRUE = 'VIIRS_SNPP_CorrectedReflectance_TrueColor';
const ZOOM = 9;

const ACCENT: Record<RiskLevel, [string, string]> = {
  low: ['#2fa36b', '#0d2a1d'],
  moderate: ['#d9a21b', '#2c2409'],
  high: ['#e8762c', '#2e1a0c'],
  severe: ['#e8413c', '#2e1010'],
  extreme: ['#ff2d55', '#330a16'],
};

export const BANNER: Record<RiskLevel, string> = {
  low: 'ADVISORY',
  moderate: 'ADVISORY',
  high: 'WATCH',
  severe: 'WARNING',
  extreme: 'EVACUATION WARNING',
};

function esc(s: unknown): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Web-mercator tile indices for a point, as floats. */
function tileXY(lat: number, lng: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = ((lng + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n;
  return [x, y];
}

/**
 * A 2x2 tile block laid out as a table. The block is chosen so the point falls
 * near the junction of the four tiles, i.e. near the centre of the image.
 */
function tileGrid(lat: number, lng: number, z: number, url: (x: number, y: number) => string) {
  const [fx, fy] = tileXY(lat, lng, z);
  const x0 = Math.floor(fx - 0.5);
  const y0 = Math.floor(fy - 0.5);
  const cell = (x: number, y: number) =>
    `<td style="padding:0;font-size:0;line-height:0"><img src="${url(x, y)}" width="256" height="256" style="display:block;width:100%;height:auto" alt=""></td>`;
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="512" ` +
    `style="width:100%;max-width:512px;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #1e2b45">` +
    `<tr>${cell(x0, y0)}${cell(x0 + 1, y0)}</tr>` +
    `<tr>${cell(x0, y0 + 1)}${cell(x0 + 1, y0 + 1)}</tr>` +
    `</table>`
  );
}

const gibs = (layer: string, date: string) => (x: number, y: number) =>
  `${GIBS}/${layer}/default/${date}/GoogleMapsCompatible_Level9/${ZOOM}/${y}/${x}.jpg`;

const osm = (x: number, y: number) => `https://tile.openstreetmap.org/13/${x}/${y}.png`;

function frame(label: string, sub: string, grid: string, accent: string) {
  return (
    `<div style="color:${accent};font-size:11px;letter-spacing:2px;font-weight:700;padding:0 0 6px">${esc(label)}</div>` +
    `<div style="color:#8da0bd;font-size:11px;padding:0 0 8px">${esc(sub)}</div>${grid}`
  );
}

function bar(frac: number, color: string) {
  const pct = Math.max(2, Math.min(100, Math.round(frac * 100)));
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#1b2740;border-radius:3px">` +
    `<tr><td style="height:6px;width:${pct}%;background:${color};border-radius:3px;font-size:0"></td><td style="font-size:0"></td></tr></table>`
  );
}

export interface Bulletin {
  assessment: FloodAssessment;
  rank: number;
  total: number;
  distanceKm: number;
}

export function renderHtml({ assessment: a, rank, total, distanceKm }: Bulletin): string {
  const risk = a.riskLevel;
  const [accent, tint] = ACCENT[risk];
  const { lat, lng } = a.location;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=13/${lat.toFixed(4)}/${lng.toFixed(4)}`;
  const deep = `${APP_URL}/?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}&label=${encodeURIComponent(a.location.label)}`;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const where = distanceKm === 0 ? 'YOUR CONFIRMED LOCATION' : `${distanceKm.toFixed(1)} KM FROM YOUR LOCATION`;

  const factors = a.factors
    .map(
      (f) =>
        `<tr><td style="padding:10px 0 4px;border-top:1px solid #1e2b45"><span style="color:#e6edf7;font-size:14px;font-weight:600">${esc(f.name)}</span><span style="float:right;color:${accent};font-size:14px;font-weight:700">${esc(f.value)}</span></td></tr>` +
        `<tr><td style="padding:0 0 4px">${bar(f.contribution, accent)}</td></tr>` +
        `<tr><td style="padding:0 0 10px;color:#8da0bd;font-size:12px;line-height:1.5">${esc(f.detail)}</td></tr>`,
    )
    .join('');

  const env: [string, string][] = [
    ['Temperature', `${a.temperatureC} °C`],
    ['Humidity', `${a.humidity}%`],
    ['Wind', `${a.windKph} km/h`],
    ['Elevation', `${a.elevation.meters} m / ${a.elevation.feet} ft`],
    ['Rain 24 h', `${a.rainfall.mm24h} mm`],
    ['Rain 7-day fc.', `${a.rainfall.mmForecast7d} mm`],
    ['Soil moisture', `${a.soilMoisture}%`],
    ['Slope', `${a.slope}°`],
    ['Nearest water', a.nearestWaterBody],
    ['Water distance', `${a.riverProximityKm} km`],
  ];
  const envHtml = env
    .map(
      ([k, v], i) =>
        `<td width="50%" style="padding:7px 0;color:#8da0bd;font-size:12px">${esc(k)}<div style="color:#e6edf7;font-size:14px;font-weight:600;padding-top:2px">${esc(v)}</div></td>` +
        (i % 2 ? '</tr><tr>' : ''),
    )
    .join('');

  const actions = a.recommendedActions
    .map(
      (x, i) =>
        `<tr><td style="padding:7px 0;color:#e6edf7;font-size:14px;line-height:1.55"><span style="color:${accent};font-weight:700">${i + 1}.</span> ${esc(x)}</td></tr>`,
    )
    .join('');

  const contacts = defaultEmergencyContacts()
    .map(
      (c, i) =>
        `<td width="33%" style="padding:8px 4px;text-align:center;background:#111a2d;border-radius:6px"><div style="color:#8da0bd;font-size:11px">${esc(c.name)}</div><a href="tel:${esc(c.phone)}" style="color:${accent};font-size:17px;font-weight:700;text-decoration:none">${esc(c.phone)}</a></td>` +
        (i % 3 === 2 ? '</tr><tr>' : '<td width="8" style="font-size:0"></td>'),
    )
    .join('');

  const sources = a.dataSources
    .concat([
      { name: 'VIIRS / SNPP', description: 'NASA EOSDIS GIBS daily composites, 250 m per pixel', status: 'live' },
      { name: 'OpenStreetMap', description: 'Basemap tiles & reverse geocoding', status: 'live' },
    ])
    .map(
      (s) =>
        `<tr><td style="padding:5px 0;color:#8da0bd;font-size:12px"><span style="color:#e6edf7">${esc(s.name)}</span> — ${esc(s.description)} <span style="color:${accent}">[${esc(s.status)}]</span></td></tr>`,
    )
    .join('');

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<td style="padding:0 5px"><a href="${href}" style="display:block;background:${bg};color:${fg};text-decoration:none;padding:13px 10px;border-radius:8px;font-size:13px;font-weight:700;text-align:center">${label}</a></td>`;

  const section = (t: string) =>
    `<tr><td style="padding:0 22px 6px"><div style="color:#fff;font-size:15px;font-weight:700;border-left:3px solid ${accent};padding-left:10px">${t}</div></td></tr>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:#070c16">
<div style="display:none;max-height:0;overflow:hidden">${esc(BANNER[risk])} &middot; ${a.probability}% flood probability &middot; ${esc(a.location.label)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#070c16;padding:20px 12px"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#0b1220;border-radius:14px;overflow:hidden;border:1px solid #1e2b45;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">

<tr><td style="background:${tint};border-bottom:2px solid ${accent};padding:20px 22px">
 <div style="color:${accent};font-size:11px;letter-spacing:2.5px;font-weight:700">ALERT ${rank} OF ${total} &middot; ${esc(BANNER[risk])}</div>
 <div style="color:#fff;font-size:25px;font-weight:800;padding-top:7px;line-height:1.25">${esc(a.location.label)}</div>
 <div style="color:#8da0bd;font-size:12px;padding-top:6px">${esc(where)} &middot; ${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
</td></tr>

<tr><td style="padding:22px">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td><div style="color:#8da0bd;font-size:11px;letter-spacing:1.5px">FLOOD PROBABILITY</div>
      <div style="color:${accent};font-size:46px;font-weight:800;line-height:1.05">${a.probability}%</div></td>
  <td align="right" valign="bottom"><div style="color:#8da0bd;font-size:11px;letter-spacing:1.5px">RISK LEVEL</div>
      <div style="color:${accent};font-size:21px;font-weight:800;text-transform:uppercase">${esc(risk)}</div>
      <div style="color:#8da0bd;font-size:12px;padding-top:3px">Impact: ${esc(a.impact)}</div></td>
 </tr></table>
 <div style="padding-top:12px">${bar(a.probability / 100, accent)}</div>
 <div style="color:#8da0bd;font-size:12px;padding-top:12px;line-height:1.6">Assessed ${esc(now)} IST from the live model at the coordinates above. Thresholds: low &lt;20% &middot; moderate &lt;45% &middot; high &lt;70% &middot; severe &lt;88% &middot; extreme &ge;88%.</div>
</td></tr>

${section('Location')}
<tr><td style="padding:12px 22px 4px">${frame('LOCATION', `OpenStreetMap · zoom 13 · ${lat.toFixed(5)}, ${lng.toFixed(5)}`, tileGrid(lat, lng, 13, osm), accent)}</td></tr>
<tr><td style="padding:12px 22px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${btn(gmaps, 'Open in Google Maps', '#1b2740', '#cfe0ff')}${btn(osmLink, 'Open in OpenStreetMap', '#1b2740', '#cfe0ff')}</tr></table></td></tr>

${section('Satellite change detection')}
<tr><td style="padding:10px 22px 0"><div style="color:#8da0bd;font-size:12px;line-height:1.6">Water-highlight false colour (VIIRS bands M11-I2-I1) is the combination flood analysts use to trace inundation: <b style="color:#e6edf7">standing water reads near-black</b>, saturated vegetation bright green. Widening dark channels between the two passes are standing water that was not there before.</div></td></tr>
<tr><td style="padding:14px 22px 4px">${frame('BEFORE · ' + IMAGERY.before, 'VIIRS/SNPP · water-highlight · pre-monsoon baseline', tileGrid(lat, lng, ZOOM, gibs(LAYER_FLOOD, IMAGERY.before)), accent)}</td></tr>
<tr><td style="padding:14px 22px 4px">${frame('AFTER · ' + IMAGERY.after, 'VIIRS/SNPP · water-highlight · latest pass', tileGrid(lat, lng, ZOOM, gibs(LAYER_FLOOD, IMAGERY.after)), accent)}</td></tr>
<tr><td style="padding:14px 22px 4px">${frame('AFTER · ' + IMAGERY.after, 'VIIRS/SNPP · true colour, as the eye would see it', tileGrid(lat, lng, ZOOM, gibs(LAYER_TRUE, IMAGERY.after)), accent)}</td></tr>

${section('Contributing factors')}
<tr><td style="padding:4px 22px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${factors}</table></td></tr>

${section('Observed conditions')}
<tr><td style="padding:6px 22px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${envHtml}</tr></table></td></tr>

${section('Recommended actions')}
<tr><td style="padding:6px 22px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${actions}</table></td></tr>

${section('Emergency contacts')}
<tr><td style="padding:8px 22px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${contacts}</tr></table></td></tr>

${section('Data sources')}
<tr><td style="padding:6px 22px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sources}</table></td></tr>

<tr><td style="padding:0 22px 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${btn(deep, 'Open this assessment in the app', accent, '#0b1220')}</tr></table></td></tr>

<tr><td style="background:#070c16;border-top:1px solid #1e2b45;padding:18px 22px"><div style="color:#6d7f9c;font-size:11px;line-height:1.7">
 Flood Mitigation &amp; Early Warning System &middot; automated bulletin ${rank}/${total}, generated ${esc(now)} IST.<br>
 Imagery: NASA EOSDIS GIBS (VIIRS/SNPP) &middot; Basemap &copy; OpenStreetMap contributors.<br>
 Risk figures come from the project's own prediction model and are decision support, not an official government warning. For a live emergency call 1070 or 1077.
</div></td></tr>

</table></td></tr></table></body></html>`;
}

export function renderText({ assessment: a, rank, total, distanceKm }: Bulletin): string {
  const { lat, lng } = a.location;
  return [
    `ALERT ${rank} OF ${total} — ${BANNER[a.riskLevel]}`,
    '='.repeat(56),
    `Location : ${a.location.label}  (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    `Distance : ${distanceKm === 0 ? 'your confirmed location' : `${distanceKm.toFixed(1)} km from your location`}`,
    `Risk     : ${a.riskLevel.toUpperCase()}  —  ${a.probability}% flood probability`,
    `Impact   : ${a.impact}`,
    '',
    'CONTRIBUTING FACTORS (ranked)',
    ...a.factors.map((f) => `  ${(f.contribution * 100).toFixed(1).padStart(5)}%  ${f.name}: ${f.value}\n         ${f.detail}`),
    '',
    'OBSERVED CONDITIONS',
    `  Rainfall 24h ${a.rainfall.mm24h} mm | 7-day forecast ${a.rainfall.mmForecast7d} mm`,
    `  Elevation ${a.elevation.meters} m (${a.elevation.feet} ft) | Slope ${a.slope} deg`,
    `  Soil moisture ${a.soilMoisture}% | Temp ${a.temperatureC}C | Humidity ${a.humidity}% | Wind ${a.windKph} km/h`,
    `  Nearest water body: ${a.nearestWaterBody} at ${a.riverProximityKm} km`,
    '',
    'RECOMMENDED ACTIONS',
    ...a.recommendedActions.map((x, i) => `  ${i + 1}. ${x}`),
    '',
    'EMERGENCY CONTACTS',
    ...defaultEmergencyContacts().map((c) => `  ${c.name}: ${c.phone}`),
    '',
    'LINKS',
    `  Open in app   : ${APP_URL}/?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`,
    `  Google Maps   : https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`,
    `  OpenStreetMap : https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}`,
    '',
    `Satellite comparison: ${IMAGERY.before} (pre-monsoon baseline) vs ${IMAGERY.after} (latest pass),`,
    'NASA EOSDIS GIBS VIIRS/SNPP at 250 m per pixel.',
    '',
    "Decision support from the project's prediction model — not an official",
    'government warning. In a live emergency call 1070 or 1077.',
  ].join('\n');
}

export function subjectFor(b: Bulletin): string {
  const a = b.assessment;
  return `[${BANNER[a.riskLevel]}] ${a.riskLevel.toUpperCase()} flood risk ${a.probability}% — ${a.location.label} (alert ${b.rank} of ${b.total})`;
}
