export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface DistanceResult {
  distance: number;
  duration: string;
  cost: number;
}

export interface RouteResponse {
  features: Array<{
    properties: {
      segments: Array<{
        distance: number;
        duration: number;
      }>;
    };
    geometry: {
      coordinates: [number, number][];
    };
  }>;
}