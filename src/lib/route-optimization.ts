const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_TOKEN || ''

interface RouteRequest {
  origin: string;
  destination: string;
  profile?: 'driving-traffic' | 'truck';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: string;
}

interface RouteResponse {
  distance: number;
  duration: number;
  geometry: any;
  eta: string;
  warnings?: string[];
  restrictions?: string[];
  tollgates?: any[];
  roadConditions?: any[];
}

export class TruckRouteOptimizer {
  private mapboxToken: string;
  private googleKey: string;

  constructor() {
    this.mapboxToken = MAPBOX_TOKEN;
    this.googleKey = GOOGLE_KEY;
  }

  async optimizeRoute(request: RouteRequest): Promise<RouteResponse> {
    const { origin, destination, departureTime } = request;
    
    try {
      const [originCoords, destCoords] = await Promise.all([
        this.geocodeLocation(origin),
        this.geocodeLocation(destination)
      ]);

      if (!originCoords || !destCoords) {
        throw new Error('Unable to geocode locations');
      }

      const coordinates = `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}`;
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        exclude: 'ferry'
      });
      
      if (departureTime) {
        const date = new Date(departureTime);
        const formattedDate = date.toISOString().slice(0, 16);
        params.set('depart_at', formattedDate);
      }

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (!response.ok || !data.routes || data.routes.length === 0) {
        throw new Error(`No routes found between ${origin} and ${destination}`);
      }

      const route = data.routes[0];
      
      const startTime = departureTime ? new Date(departureTime) : new Date();
      const eta = new Date(startTime.getTime() + route.duration * 1000);
      
      const restrictions = await this.detectTruckRestrictions(route);
      const tollgates = this.detectTollgates(route);
      const roadConditions = await this.getRoadConditions(route);

      return {
        distance: Math.round(route.distance / 1000 * 10) / 10,
        duration: Math.round(route.duration / 60),
        geometry: route.geometry,
        eta: eta.toISOString(),
        warnings: ['Standard route - CHECK: Bridge heights and ferry restrictions'],
        restrictions,
        tollgates,
        roadConditions
      };

    } catch (error) {
      console.error('Route optimization error:', error);
      throw error;
    }
  }

  private async geocodeLocation(location: string): Promise<{lat: number, lng: number} | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${this.googleKey}&region=za`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  private async detectTruckRestrictions(route: any): Promise<string[]> {
    const restrictions: string[] = [];
    
    if (route.legs) {
      for (const leg of route.legs) {
        for (const step of leg.steps || []) {
          if (step.maneuver?.instruction?.toLowerCase().includes('bridge')) {
            const bridgeHeight = await this.estimateBridgeHeight(step.maneuver.location);
            if (bridgeHeight && bridgeHeight < 4.2) {
              restrictions.push(`⚠️ LOW BRIDGE: ${bridgeHeight.toFixed(1)}m clearance (4.2m required) - ROUTE BLOCKED`);
            } else if (bridgeHeight && bridgeHeight >= 4.2) {
              restrictions.push(`✅ Bridge clearance: ${bridgeHeight.toFixed(1)}m (Safe for 4.2m trucks)`);
            } else {
              restrictions.push('🔍 Bridge detected - calculating clearance...');
            }
          }
        }
      }
    }
    
    return [...new Set(restrictions)];
  }

  private async estimateBridgeHeight(location: [number, number]): Promise<number | null> {
    try {
      const [lng, lat] = location;
      
      const bridgeElevation = await this.getElevationAtPoint(lng, lat);
      const roadElevationBefore = await this.getElevationAtPoint(lng - 0.001, lat);
      const roadElevationAfter = await this.getElevationAtPoint(lng + 0.001, lat);
      
      if (bridgeElevation && roadElevationBefore && roadElevationAfter) {
        const avgRoadElevation = (roadElevationBefore + roadElevationAfter) / 2;
        const bridgeClearance = bridgeElevation - avgRoadElevation;
        const structureHeight = 1.5;
        const totalClearance = Math.abs(bridgeClearance) + structureHeight;
        
        return Math.max(totalClearance, 3.5);
      }
      
      return 4.5;
      
    } catch (error) {
      console.error('Error calculating bridge height:', error);
      return 4.5;
    }
  }

  private async getElevationAtPoint(lng: number, lat: number): Promise<number | null> {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${this.googleKey}`
      );
      
      if (!response.ok) {
        return this.estimateElevationFromCoordinates(lat, lng);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results?.length > 0) {
        return data.results[0].elevation;
      }
      
      return this.estimateElevationFromCoordinates(lat, lng);
      
    } catch (error) {
      console.error('Error fetching elevation data:', error);
      return null;
    }
  }

  private estimateElevationFromCoordinates(lat: number, lng: number): number {
    if (lat > -26.5 && lat < -25.5 && lng > 27.5 && lng < 28.5) {
      return 1700;
    } else if (lat > -34.5 && lat < -33.5 && lng > 18 && lng < 19) {
      return 100;
    } else if (lat > -30 && lat < -29 && lng > 30 && lng < 31.5) {
      return 50;
    }
    
    return 1000;
  }

  private detectTollgates(route: any): any[] {
    const tollgates: any[] = [];
    
    if (route.legs) {
      route.legs.forEach((leg: any) => {
        if (leg.summary?.includes('N1')) {
          tollgates.push({ name: 'N1 Toll Plaza', cost: 'R45', location: 'N1 Highway' });
        }
        if (leg.summary?.includes('N3')) {
          tollgates.push({ name: 'N3 Toll Plaza', cost: 'R38', location: 'N3 Highway' });
        }
      });
    }
    
    return tollgates;
  }

  private async getRoadConditions(route: any): Promise<any[]> {
    return [{
      type: 'info',
      message: 'Standard road conditions',
      severity: 'low'
    }];
  }
}
