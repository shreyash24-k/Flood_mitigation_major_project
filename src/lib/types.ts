export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe' | 'extreme';

export type RiskImpact = 'not harmful' | 'less harmful' | 'harmful';

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface EnvironmentalFactor {
  name: string;
  value: string;
  detail: string;
  contribution: number; // 0-1 weight toward flood probability
}

export interface DataSourceLayer {
  name: string;
  description: string;
  status: 'synced' | 'live' | 'historical';
}

export interface FloodAssessment {
  location: GeoPoint;
  probability: number; // 0-100
  riskLevel: RiskLevel;
  impact: RiskImpact;
  elevation: { meters: number; feet: number };
  rainfall: { mm24h: number; mmForecast7d: number };
  soilMoisture: number; // 0-100 %
  slope: number; // degrees
  riverProximityKm: number;
  nearestWaterBody: string;
  temperatureC: number;
  humidity: number;
  windKph: number;
  factors: EnvironmentalFactor[];
  dataSources: DataSourceLayer[];
  recommendedActions: string[];
  assessedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  category: 'fire' | 'ambulance' | 'police' | 'disaster' | 'rescue';
  available: string;
}
