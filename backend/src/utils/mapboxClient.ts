import { config } from '../config/env.js';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  placeName?: string;
}

// In-memory geocode cache to save Mapbox API quota (ponytail: Map cache sufficient)
const geocodeCache = new Map<string, GeocodeResult>();

export const mapboxClient = {
  /**
   * Geocode human address to latitude and longitude coordinates via Mapbox Places API
   */
  async geocode(address: string, countryCode?: string): Promise<GeocodeResult | null> {
    if (!address || typeof address !== 'string' || !address.trim()) {
      return null;
    }

    const cleanAddress = address.trim();
    const cacheKey = `${countryCode || 'ANY'}:${cleanAddress.toLowerCase()}`;

    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    const token = config.MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.warn('[Mapbox] MAPBOX_ACCESS_TOKEN is not configured');
      return null;
    }

    try {
      const encoded = encodeURIComponent(cleanAddress);
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1`;
      
      if (countryCode) {
        const iso = countryCode.toLowerCase() === 'uk' ? 'gb' : countryCode.toLowerCase();
        url += `&country=${iso}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[Mapbox] Geocoding HTTP error ${response.status}: ${response.statusText}`);
        return null;
      }

      const data = (await response.json()) as any;
      if (data && data.features && data.features.length > 0) {
        const first = data.features[0];
        const [longitude, latitude] = first.center; // Mapbox returns [lng, lat]
        const result: GeocodeResult = {
          latitude,
          longitude,
          formattedAddress: first.place_name,
          placeName: first.text,
        };

        // Cache result (capped at 5000 items)
        if (geocodeCache.size > 5000) {
          const firstKey = geocodeCache.keys().next().value;
          if (firstKey) geocodeCache.delete(firstKey);
        }
        geocodeCache.set(cacheKey, result);

        return result;
      }

      return null;
    } catch (err) {
      console.error('[Mapbox] Geocoding request failed:', err);
      return null;
    }
  },

  /**
   * Reverse geocode latitude and longitude to street address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    const token = config.MAPBOX_ACCESS_TOKEN;
    if (!token) return null;

    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&limit=1`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = (await response.json()) as any;
      if (data && data.features && data.features.length > 0) {
        return data.features[0].place_name || null;
      }
      return null;
    } catch (err) {
      console.error('[Mapbox] Reverse geocoding failed:', err);
      return null;
    }
  },
};

export default mapboxClient;
