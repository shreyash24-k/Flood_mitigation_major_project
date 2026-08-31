import type {
  FloodAssessment,
  RiskLevel,
  RiskImpact,
  EnvironmentalFactor,
  GeoPoint,
  EmergencyContact,
} from './types';

// Deterministic pseudo-random based on lat/lng so the same location
// always yields the same assessment (feels like a real model).
function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function classifyRisk(probability: number): RiskLevel {
  if (probability < 20) return 'low';
  if (probability < 45) return 'moderate';
  if (probability < 70) return 'high';
  if (probability < 88) return 'severe';
  return 'extreme';
}

export function impactForRisk(risk: RiskLevel): RiskImpact {
  if (risk === 'low') return 'not harmful';
  if (risk === 'moderate') return 'less harmful';
  return 'harmful';
}

// Crude terrain heuristics — coastal / low-land / equatorial areas skew higher.
function terrainWeight(lat: number, lng: number): number {
  const absLat = Math.abs(lat);
  // Closer to equator → heavier monsoon influence
  const equatorial = 1 - Math.min(absLat / 50, 1);
  // Coastal bias (rough — near coastlines of major landmasses)
  const coastal =
    Math.abs(Math.sin(lng * 0.4) * Math.cos(lat * 0.3)) > 0.55 ? 0.15 : 0;
  return 0.35 + equatorial * 0.4 + coastal;
}

export function assessFloodRisk(point: GeoPoint): FloodAssessment {
  const { lat, lng } = point;
  const h = hash(lat, lng);
  const h2 = hash(lng, lat);
  const h3 = hash(lat + 5.3, lng - 2.1);

  const terrain = terrainWeight(lat, lng);

  // Elevation (meters) — inland mountains get higher values
  const baseElevation = lerp(2, 480, h);
  const elevationBonus = Math.abs(lat) > 28 ? lerp(0, 900, h2) : 0;
  const elevationM = Math.round(baseElevation + elevationBonus);

  // Rainfall
  const rainfall24 = Math.round(lerp(0, 180, h2) * terrain);
  const rainfall7d = Math.round(rainfall24 * lerp(2.2, 4.5, h3));

  const soilMoisture = Math.round(lerp(18, 96, h * terrain + h2 * (1 - terrain)));
  const slope = +(lerp(0.2, 34, h2) * (elevationM > 200 ? 1.4 : 0.6)).toFixed(1);
  const riverProximity = +(lerp(0.2, 24, h3)).toFixed(1);
  const temperature = Math.round(lerp(8, 36, 1 - Math.abs(lat) / 55) + h2 * 4 - 2);
  const humidity = Math.round(lerp(35, 98, terrain));
  const wind = Math.round(lerp(4, 62, h3));

  // Weighted probability model (mirrors a Random-Forest-style feature blend)
  const elevScore = Math.max(0, 1 - elevationM / 250); // lower land → higher risk
  const rainScore = Math.min(1, rainfall24 / 120);
  const soilScore = soilMoisture / 100;
  const slopeScore = Math.max(0, 1 - slope / 30); // flatter → worse drainage
  const riverScore = Math.max(0, 1 - riverProximity / 15);

  const probability = Math.round(
    Math.min(
      99,
      Math.max(
        2,
        (elevScore * 0.26 +
          rainScore * 0.28 +
          soilScore * 0.18 +
          slopeScore * 0.12 +
          riverScore * 0.16) *
          100 *
          lerp(0.8, 1.25, terrain),
      ),
    ),
  );

  const riskLevel = classifyRisk(probability);
  const impact = impactForRisk(riskLevel);

  const factors: EnvironmentalFactor[] = [
    {
      name: 'Rainfall intensity',
      value: `${rainfall24} mm / 24h`,
      detail: `7-day forecast: ${rainfall7d} mm. ${rainfall24 > 80 ? 'Heavy precipitation event detected.' : rainfall24 > 40 ? 'Moderate sustained rainfall.' : 'Light, scattered showers.'}`,
      contribution: rainScore,
    },
    {
      name: 'Elevation',
      value: `${elevationM} m`,
      detail: elevationM < 20 ? 'Low-lying terrain — highly susceptible to water accumulation.' : elevationM < 150 ? 'Gently sloped lowland with moderate runoff.' : 'Elevated terrain with natural drainage advantage.',
      contribution: elevScore,
    },
    {
      name: 'Soil moisture',
      value: `${soilMoisture}%`,
      detail: soilMoisture > 75 ? 'Soil near saturation — reduced infiltration capacity.' : soilMoisture > 50 ? 'Damp ground, moderate absorption remaining.' : 'Dry soil, good infiltration capacity.',
      contribution: soilScore,
    },
    {
      name: 'Slope gradient',
      value: `${slope}°`,
      detail: slope < 3 ? 'Nearly flat — water pools rather than draining.' : slope < 10 ? 'Gentle slope aids slow runoff.' : 'Steep grade — flash runoff, but less standing water.',
      contribution: slopeScore,
    },
    {
      name: 'Water-body proximity',
      value: `${riverProximity} km`,
      detail: `Nearest: ${nearestWater(lat, lng)}. ${riverProximity < 3 ? 'Very close — overflow risk is significant.' : riverProximity < 8 ? 'Within typical floodplain range.' : 'Distant — direct overflow unlikely.'}`,
      contribution: riverScore,
    },
  ].sort((a, b) => b.contribution - a.contribution);

  const recommendedActions = buildActions(riskLevel, elevationM, riverProximity);

  return {
    location: point,
    probability,
    riskLevel,
    impact,
    elevation: { meters: elevationM, feet: Math.round(elevationM * 3.281) },
    rainfall: { mm24h: rainfall24, mmForecast7d: rainfall7d },
    soilMoisture,
    slope,
    riverProximityKm: riverProximity,
    nearestWaterBody: nearestWater(lat, lng),
    temperatureC: temperature,
    humidity,
    windKph: wind,
    factors,
    dataSources: [
      { name: 'Sentinel-1 SAR', description: 'Satellite surface-water & flood extent imagery', status: 'synced' },
      { name: 'DEM / Elevation', description: 'Digital Elevation Model for terrain analysis', status: 'synced' },
      { name: 'Rainfall telemetry', description: '24h & 7-day precipitation gauge network', status: 'live' },
      { name: 'Soil moisture grid', description: 'Surface soil moisture from microwave remote sensing', status: 'historical' },
      { name: 'Hydrography network', description: 'Rivers, lakes & drainage proximity mapping', status: 'synced' },
    ],
    recommendedActions,
    assessedAt: new Date().toISOString(),
  };
}

function nearestWater(lat: number, lng: number): string {
  const names = [
    'Ganges River basin',
    'Brahmaputra tributary',
    'Mekong delta',
    'Coastal estuary',
    'Regional reservoir',
    'Lowland marsh',
    'Yamuna floodplain',
    'Tonle Sap lake',
  ];
  return names[Math.floor(hash(lat * 3.1, lng * 1.7) * names.length)];
}

function buildActions(risk: RiskLevel, elev: number, river: number): string[] {
  const actions: string[] = [];
  if (risk === 'low') {
    actions.push('Conditions are stable — no immediate action required.');
    actions.push('Keep monitoring weekly forecasts during monsoon season.');
  } else if (risk === 'moderate') {
    actions.push('Stay alert to updated weather advisories over the next 48 hours.');
    actions.push('Clear nearby drainage channels of debris.');
  } else if (risk === 'high') {
    actions.push('Prepare an emergency go-bag with documents, medication & water.');
    actions.push('Move valuables and electronics to higher floors.');
    actions.push('Identify the nearest elevated shelter route.');
  } else if (risk === 'severe') {
    actions.push('Evacuate low-lying & ground-floor areas immediately.');
    actions.push('Do not walk or drive through flowing water.');
    actions.push('Keep emergency contacts and local rescue on speed-dial.');
  } else {
    actions.push('Execute evacuation plan NOW — move to designated high-ground shelter.');
    actions.push('Disconnect electrical mains before leaving if safe to do so.');
    actions.push('Call disaster response — life-safety threat is critical.');
  }
  if (elev < 15 && risk !== 'low') {
    actions.push('Your elevation is very low — consider relocation even at moderate risk.');
  }
  if (river < 3 && risk !== 'low') {
    actions.push('You are near a water body — watch for overflow and bank breach alerts.');
  }
  return actions;
}

export function defaultEmergencyContacts(): EmergencyContact[] {
  return [
    { id: 'fire', name: 'Fire Brigade', phone: '101', category: 'fire', available: '24/7' },
    { id: 'ambulance', name: 'Ambulance / EMS', phone: '102', category: 'ambulance', available: '24/7' },
    { id: 'police', name: 'Police', phone: '100', category: 'police', available: '24/7' },
    { id: 'ndrf', name: 'Disaster Response (NDRF)', phone: '1070', category: 'disaster', available: '24/7' },
    { id: 'rescue', name: 'Flood Rescue Helpline', phone: '1077', category: 'rescue', available: '24/7' },
    { id: 'redcross', name: 'Red Cross Disaster Relief', phone: '108', category: 'disaster', available: '24/7' },
  ];
}

// Geocoding now lives in `@/lib/geocode` (OpenStreetMap Nominatim).
