/**
 * Distance Calculation Service
 *
 * Calculates straight-line distance from Wrocław to Polish cities using:
 * 1. Nominatim API for geocoding (city -> lat/lon)
 * 2. Haversine formula for distance calculation
 *
 * Implements caching to minimize API calls and improve performance.
 */

interface Coordinates {
  lat: number;
  lon: number;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
}

export class DistanceCalculationService {
  private readonly WROCLAW_COORDS: Coordinates = {
    lat: 51.1079,
    lon: 17.0385,
  };

  // In-memory cache: city -> distance (km)
  private distanceCache: Map<string, number> = new Map();

  // Geocoding cache: city -> coordinates
  private geocodeCache: Map<string, Coordinates> = new Map();

  // Rate limiting: delay between API calls (ms)
  private readonly API_DELAY_MS = 1000; // Nominatim requires 1 req/sec
  private lastApiCallTime = 0;

  /**
   * Calculate straight-line distance from Wrocław to a given city
   * @param city City name (e.g., "Warsaw", "Kraków")
   * @returns Distance in kilometers, or null if calculation fails
   */
  async calculateDistanceFromWroclaw(city: string): Promise<number | null> {
    if (!city || city.trim() === '') {
      return null;
    }

    const normalizedCity = city.trim();

    // Check distance cache first
    if (this.distanceCache.has(normalizedCity)) {
      return this.distanceCache.get(normalizedCity)!;
    }

    try {
      // Geocode city to coordinates
      const coords = await this.geocodeCity(normalizedCity);
      if (!coords) {
        console.warn(`Failed to geocode city: ${normalizedCity}`);
        return null;
      }

      // Calculate distance using Haversine formula
      const distance = this.calculateHaversineDistance(
        this.WROCLAW_COORDS,
        coords
      );

      // Cache the result
      this.distanceCache.set(normalizedCity, distance);

      return distance;
    } catch (error) {
      console.error(`Error calculating distance for ${normalizedCity}:`, error);
      return null;
    }
  }

  /**
   * Geocode a city name to lat/lon coordinates using Nominatim API
   * @param city City name
   * @returns Coordinates or null if geocoding fails
   */
  private async geocodeCity(city: string): Promise<Coordinates | null> {
    // Check geocode cache first
    if (this.geocodeCache.has(city)) {
      return this.geocodeCache.get(city)!;
    }

    try {
      // Rate limiting: ensure at least API_DELAY_MS between calls
      await this.enforceRateLimit();

      // Call Nominatim API
      // Add "Poland" to improve accuracy for Polish cities
      const query = encodeURIComponent(`${city}, Poland`);
      const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CarFinderAI/1.0', // Nominatim requires User-Agent
        },
      });

      if (!response.ok) {
        console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: NominatimResponse[] = await response.json();

      if (data.length === 0) {
        console.warn(`No geocoding results for: ${city}`);
        return null;
      }

      const coords: Coordinates = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };

      // Validate parsed coordinates
      if (isNaN(coords.lat) || isNaN(coords.lon)) {
        console.warn(`Invalid coordinates for ${city}: lat=${coords.lat}, lon=${coords.lon}`);
        return null;
      }

      // Cache the result
      this.geocodeCache.set(city, coords);

      console.log(`Geocoded ${city} -> ${coords.lat}, ${coords.lon}`);

      return coords;
    } catch (error) {
      console.error(`Error geocoding city ${city}:`, error);
      return null;
    }
  }

  /**
   * Calculate straight-line distance between two coordinates using Haversine formula
   * @param coord1 First coordinate
   * @param coord2 Second coordinate
   * @returns Distance in kilometers
   */
  private calculateHaversineDistance(
    coord1: Coordinates,
    coord2: Coordinates
  ): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLon = this.toRadians(coord2.lon - coord1.lon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance); // Round to nearest km
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Enforce rate limiting to respect Nominatim API limits (1 req/sec)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCallTime;

    if (timeSinceLastCall < this.API_DELAY_MS) {
      const delay = this.API_DELAY_MS - timeSinceLastCall;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastApiCallTime = Date.now();
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): { distanceCacheSize: number; geocodeCacheSize: number } {
    return {
      distanceCacheSize: this.distanceCache.size,
      geocodeCacheSize: this.geocodeCache.size,
    };
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache(): void {
    this.distanceCache.clear();
    this.geocodeCache.clear();
  }
}
