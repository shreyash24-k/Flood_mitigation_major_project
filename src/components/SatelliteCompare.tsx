import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Satellite, CalendarDays, Info } from 'lucide-react';
import type { GeoPoint } from '@/lib/types';

/**
 * Before / after satellite imagery from NASA GIBS (Global Imagery Browse Services).
 *
 * GIBS serves daily global true-colour and false-colour composites as WMTS tiles,
 * free and without an API key, which is what makes a real date-to-date comparison
 * possible here. Native resolution is 250 m/pixel, so imagery is capped at zoom 9 —
 * enough to read regional inundation, not individual streets.
 */

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/**
 * Two sensors per product. VIIRS has a ~3040 km swath so its daily mosaics are
 * effectively gap-free, but it only starts in late 2015; MODIS/Terra reaches
 * back to 2000 at the cost of occasional black stripes between orbital swaths.
 * The right sensor is chosen from the requested date.
 */
const VIIRS_START = '2015-11-24';
const MODIS_START = '2000-02-24';

const PRODUCTS = {
  truecolor: {
    label: 'True colour',
    viirs: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    modis: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    hint: 'Natural colour, as the eye would see it.',
  },
  flood: {
    label: 'Water-highlight',
    viirs: 'VIIRS_SNPP_CorrectedReflectance_BandsM11-I2-I1',
    modis: 'MODIS_Terra_CorrectedReflectance_Bands721',
    hint: 'False colour: standing water reads near-black, vegetation bright green — the band combination flood analysts use to trace inundation.',
  },
} as const;

type ProductId = keyof typeof PRODUCTS;

/**
 * Builds the layer stack for a date: MODIS always forms the base, and for dates
 * VIIRS covers it is drawn on top with transparent error tiles. Wherever VIIRS
 * has no granule that day, MODIS shows through; wherever MODIS has an orbital
 * swath gap, VIIRS paints over it.
 */
function sensorFor(product: ProductId, date: string) {
  const useViirs = date >= VIIRS_START;
  return {
    base: PRODUCTS[product].modis,
    overlay: useViirs ? PRODUCTS[product].viirs : null,
    name: useViirs ? 'VIIRS · MODIS' : 'MODIS / Terra',
  };
}

/** A 1x1 transparent PNG, so days with no coverage render blank instead of broken. */
const BLANK_TILE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const MAX_IMAGERY_ZOOM = 9;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

interface ViewState {
  center: [number, number];
  zoom: number;
}

/** Reports user-driven movement up, and applies movement that came from the other pane. */
function ViewSync({
  view,
  onMove,
  selfMoving,
}: {
  view: ViewState;
  onMove: (v: ViewState) => void;
  selfMoving: React.MutableRefObject<boolean>;
}) {
  const map = useMap();
  const [targetLat, targetLng] = view.center;
  const targetZoom = view.zoom;

  useMapEvents({
    move() {
      if (selfMoving.current) return;
      const c = map.getCenter();
      onMove({ center: [c.lat, c.lng], zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    const c = map.getCenter();
    if (
      Math.abs(c.lat - targetLat) < 1e-7 &&
      Math.abs(c.lng - targetLng) < 1e-7 &&
      map.getZoom() === targetZoom
    ) {
      return;
    }
    selfMoving.current = true;
    map.setView([targetLat, targetLng], targetZoom, { animate: false });
    // Released after Leaflet has finished emitting its move events.
    requestAnimationFrame(() => {
      selfMoving.current = false;
    });
  }, [targetLat, targetLng, targetZoom, map, selfMoving]);

  return null;
}

function ImageryPane({
  title,
  date,
  product,
  view,
  onMove,
  point,
  accent,
  radiusKm,
  zoneColor,
}: {
  title: string;
  date: string;
  product: ProductId;
  view: ViewState;
  onMove: (v: ViewState) => void;
  point: GeoPoint;
  accent: string;
  radiusKm: number;
  zoneColor: string;
}) {
  const selfMoving = useRef(false);
  const { base, overlay, name: sensor } = sensorFor(product, date);

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink-950">
      <MapContainer
        center={view.center}
        zoom={view.zoom}
        maxZoom={MAX_IMAGERY_ZOOM}
        minZoom={2}
        scrollWheelZoom
        attributionControl={false}
        className="h-[300px] w-full"
        style={{ background: '#04121F' }}
      >
        <TileLayer
          key={`base-${base}-${date}`}
          url={`${GIBS}/${base}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
          maxNativeZoom={MAX_IMAGERY_ZOOM}
          maxZoom={MAX_IMAGERY_ZOOM}
          tileSize={256}
          errorTileUrl={BLANK_TILE}
        />
        {overlay && (
          <TileLayer
            key={`over-${overlay}-${date}`}
            url={`${GIBS}/${overlay}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
            maxNativeZoom={MAX_IMAGERY_ZOOM}
            maxZoom={MAX_IMAGERY_ZOOM}
            tileSize={256}
            errorTileUrl={BLANK_TILE}
          />
        )}
        {/* White halo under the zone ring keeps it readable over bright imagery */}
        <Circle
          center={[point.lat, point.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#FFFFFF', weight: 4, opacity: 0.7, fill: false }}
        />
        <Circle
          center={[point.lat, point.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: zoneColor, weight: 2, fillColor: zoneColor, fillOpacity: 0.08 }}
        />
        <ViewSync view={view} onMove={onMove} selfMoving={selfMoving} />
      </MapContainer>

      <div className="pointer-events-none absolute right-2.5 top-2.5 z-[1000] rounded-lg bg-ink-950/80 px-2.5 py-1.5 backdrop-blur">
        <div className="text-right text-[10px] font-semibold uppercase tracking-wider" style={{ color: accent }}>
          {title}
        </div>
        <div className="text-right text-[11px] font-medium tabular-nums text-white">{date}</div>
        <div className="text-right text-[10px] text-ink-400">{sensor}</div>
      </div>
    </div>
  );
}

export default function SatelliteCompare({
  point,
  riskRadiusKm = 5,
  riskColor = '#F59E0B',
}: {
  point: GeoPoint;
  /** Matches the risk zone drawn on the main map */
  riskRadiusKm?: number;
  riskColor?: string;
}) {
  const [beforeDate, setBeforeDate] = useState(isoDaysAgo(370));
  const [afterDate, setAfterDate] = useState(isoDaysAgo(2));
  const [product, setProduct] = useState<ProductId>('flood');
  const [view, setView] = useState<ViewState>({
    center: [point.lat, point.lng],
    zoom: MAX_IMAGERY_ZOOM,
  });

  // Re-centre both panes when a different location is assessed.
  useEffect(() => {
    setView({ center: [point.lat, point.lng], zoom: MAX_IMAGERY_ZOOM });
  }, [point.lat, point.lng]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="card-dark overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <Satellite className="h-4.5 w-4.5 text-brand-400" />
          <h3 className="font-display text-sm font-bold text-white">
            Satellite imagery — before &amp; after
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-white/5 p-1">
          {(Object.keys(PRODUCTS) as ProductId[]).map((id) => (
            <button
              key={id}
              onClick={() => setProduct(id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                product === id ? 'bg-brand-600 text-white' : 'text-ink-300 hover:text-white'
              }`}
            >
              {PRODUCTS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {/* Date pickers */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="text-xs text-ink-300">Before</span>
            <input
              type="date"
              value={beforeDate}
              min={MODIS_START}
              max={today}
              onChange={(e) => setBeforeDate(e.target.value)}
              className="ml-auto rounded-md bg-transparent text-xs font-medium tabular-nums text-white focus:outline-none [color-scheme:dark]"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-ink-400" />
            <span className="text-xs text-ink-300">After</span>
            <input
              type="date"
              value={afterDate}
              min={MODIS_START}
              max={today}
              onChange={(e) => setAfterDate(e.target.value)}
              className="ml-auto rounded-md bg-transparent text-xs font-medium tabular-nums text-white focus:outline-none [color-scheme:dark]"
            />
          </label>
        </div>

        {/* Panes — panning or zooming one moves the other */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageryPane
            title="Before"
            date={beforeDate}
            product={product}
            view={view}
            onMove={setView}
            point={point}
            accent="#6BBADE"
            radiusKm={riskRadiusKm}
            zoneColor={riskColor}
          />
          <ImageryPane
            title="After"
            date={afterDate}
            product={product}
            view={view}
            onMove={setView}
            point={point}
            accent="#F59E0B"
            radiusKm={riskRadiusKm}
            zoneColor={riskColor}
          />
        </div>

        <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-400" />
          <span>
            {PRODUCTS[product].hint} Imagery: NASA EOSDIS GIBS at 250 m per pixel —
            each pane names the sensor it drew from. The two panes stay locked together
            as you pan and zoom. A date with heavy cloud will hide the ground; step a
            day either way.
          </span>
        </p>
      </div>
    </div>
  );
}
