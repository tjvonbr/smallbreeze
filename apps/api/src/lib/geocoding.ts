/**
 * Geocoding service for converting addresses to coordinates.
 *
 * To enable geocoding, set one of the following environment variables:
 * - GOOGLE_MAPS_API_KEY: For Google Maps Geocoding API
 * - MAPBOX_ACCESS_TOKEN: For Mapbox Geocoding API
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  coordinates: Coordinates | null;
  error?: string;
}

/**
 * Geocode an address to coordinates.
 * Returns null coordinates if geocoding is not configured or fails.
 */
export async function geocodeAddress(
  streetAddress: string,
  city: string,
  state: string,
  zip: string,
  country: string,
): Promise<GeocodingResult> {
  const fullAddress = `${streetAddress}, ${city}, ${state} ${zip}, ${country}`;

  // Try Google Maps first
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return geocodeWithGoogle(fullAddress);
  }

  // Try Mapbox second
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    return geocodeWithMapbox(fullAddress);
  }

  // No geocoding service configured
  return {
    coordinates: null,
    error: 'No geocoding service configured. Set GOOGLE_MAPS_API_KEY or MAPBOX_ACCESS_TOKEN.',
  };
}

async function geocodeWithGoogle(address: string): Promise<GeocodingResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return {
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };
    }

    return {
      coordinates: null,
      error: `Google Maps geocoding failed: ${data.status}`,
    };
  } catch (err) {
    console.error('Google Maps geocoding error:', err);
    return {
      coordinates: null,
      error: 'Google Maps geocoding request failed',
    };
  }
}

async function geocodeWithMapbox(address: string): Promise<GeocodingResult> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${process.env.MAPBOX_ACCESS_TOKEN}&limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.features?.[0]?.center) {
      const [lng, lat] = data.features[0].center;
      return {
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
      };
    }

    return {
      coordinates: null,
      error: 'Mapbox geocoding returned no results',
    };
  } catch (err) {
    console.error('Mapbox geocoding error:', err);
    return {
      coordinates: null,
      error: 'Mapbox geocoding request failed',
    };
  }
}

/**
 * Check if geocoding is available.
 */
export function isGeocodingEnabled(): boolean {
  return !!(process.env.GOOGLE_MAPS_API_KEY || process.env.MAPBOX_ACCESS_TOKEN);
}
