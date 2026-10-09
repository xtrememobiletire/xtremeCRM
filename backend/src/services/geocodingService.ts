import { mapboxClient, type GeocodeResult } from '../utils/mapboxClient.js';

export class GeocodingService {
  /**
   * Resolve an address to coordinates
   */
  async geocodeAddress(
    address?: string | null,
    countryCode?: string
  ): Promise<{ latitude: number | null; longitude: number | null; formattedAddress?: string }> {
    if (!address || !address.trim()) {
      return { latitude: null, longitude: null };
    }

    try {
      const geo = await mapboxClient.geocode(address.trim(), countryCode);
      if (geo) {
        return {
          latitude: geo.latitude,
          longitude: geo.longitude,
          formattedAddress: geo.formattedAddress,
        };
      }
    } catch (err) {
      console.warn(`[GeocodingService] Failed to geocode "${address}":`, err);
    }

    return { latitude: null, longitude: null };
  }

  /**
   * Reverse geocode coordinates to street address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    return mapboxClient.reverseGeocode(latitude, longitude);
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
