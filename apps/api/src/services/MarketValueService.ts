/**
 * MarketValueService - Market value analysis service
 *
 * Calculates market value scores for vehicles by comparing them to similar
 * listings in the database. Uses mileage-weighted averaging to determine
 * if a vehicle is priced above, below, or at market average.
 *
 * Optimized for 2005-2014 passenger vans with the following criteria:
 * - Same make/model
 * - Within ±3 years
 * - Within ±50,000 km
 * - Minimum 3 comparable vehicles required
 */

import { Vehicle } from '@car-finder/types';
import { VehicleRepository } from '@car-finder/db';

/**
 * MarketValueService - Main service for market value calculations
 */
export class MarketValueService {
  private vehicleRepo: VehicleRepository;

  constructor(vehicleRepo: VehicleRepository) {
    this.vehicleRepo = vehicleRepo;
  }

  /**
   * Calculate market value score for a vehicle based on comparable listings
   * Optimized for 2005-2014 passenger vans with mileage-weighted averaging
   *
   * @param vehicle - Vehicle to evaluate
   * @returns Percentage difference string (e.g., "-5%", "+10%", "market_avg") or null if insufficient data
   */
  async calculateMarketValue(vehicle: Vehicle): Promise<string | null> {
    try {
      // 1. Find comparable vehicles (same make/model, ±3 years, ±50k km)
      const comparables = await this.findComparableVehicles(vehicle);

      // 2. Check minimum sample size
      if (comparables.length < 3) {
        console.log(`  ⚠️ Insufficient comparables (${comparables.length}/3) for vehicle ${vehicle.id}`);
        return null; // Insufficient data
      }

      console.log(`  ✓ Found ${comparables.length} comparable vehicles for ${vehicle.id}`);

      // 3. Calculate mileage-weighted average price
      const weightedAvg = this.calculateWeightedAverage(vehicle, comparables);
      console.log(`  ✓ Weighted average price: €${weightedAvg.toFixed(0)}`);

      // 4. Calculate percentage difference
      return this.formatPercentageDifference(vehicle.priceEur, weightedAvg);
    } catch (error) {
      console.error(`❌ Error calculating market value for vehicle ${vehicle.id}:`, error);
      // Don't throw - return null to allow batch processing to continue
      return null;
    }
  }

  /**
   * Find comparable vehicles based on make, model, year, and mileage
   * Uses VehicleRepository to query database
   */
  private async findComparableVehicles(vehicle: Vehicle): Promise<Vehicle[]> {
    try {
      // Extract make/model from sourceParameters
      const sourceParams = typeof vehicle.sourceParameters === 'string'
        ? JSON.parse(vehicle.sourceParameters)
        : vehicle.sourceParameters;

      const make = sourceParams['Marka pojazdu'] || sourceParams['make'] || sourceParams['Make'];
      const model = sourceParams['Model pojazdu'] || sourceParams['model'] || sourceParams['Model'];

      if (!make || !model) {
        console.warn(`  ⚠️ Missing make/model for vehicle ${vehicle.id}`);
        return [];
      }

      // Query VehicleRepository for comparables
      return await this.vehicleRepo.findComparableVehicles({
        source: vehicle.source,
        make,
        model,
        year: vehicle.year,
        mileage: vehicle.mileage,
        excludeId: vehicle.id,
      });
    } catch (error) {
      console.error(`❌ Error finding comparable vehicles:`, error);
      return [];
    }
  }

  /**
   * Calculate mileage-weighted average price
   * Vehicles with closer mileage to target get higher weight
   * Apply mileage condition adjustments (high/low mileage bonuses/penalties)
   */
  private calculateWeightedAverage(target: Vehicle, comparables: Vehicle[]): number {
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    for (const comp of comparables) {
      // 1. Calculate mileage proximity weight
      const mileageDiff = Math.abs(comp.mileage - target.mileage);
      const weight = 1 / (1 + mileageDiff / 10000); // Closer mileage = higher weight

      // 2. Apply mileage condition adjustments to price
      let adjustedPrice = comp.priceEur;

      // High mileage penalty
      if (comp.mileage > 200000) {
        adjustedPrice *= 0.90; // -10% for >200k km
      }
      if (comp.mileage > 250000) {
        adjustedPrice *= 0.90; // Additional -10% for >250k km (total -19%)
      }

      // Low mileage bonus (for old vans)
      const vehicleAge = new Date().getFullYear() - comp.year;
      if (comp.mileage < 120000 && vehicleAge > 10) {
        adjustedPrice *= 1.10; // +10% bonus for low-mileage old vans (golden find!)
      }

      // 3. Add to weighted sum
      totalWeightedPrice += adjustedPrice * weight;
      totalWeight += weight;
    }

    // Handle edge case: avoid division by zero
    if (totalWeight === 0) {
      console.warn(`  ⚠️ Total weight is zero, falling back to simple average`);
      return comparables.reduce((sum, v) => sum + v.priceEur, 0) / comparables.length;
    }

    return totalWeightedPrice / totalWeight;
  }

  /**
   * Format percentage difference as string
   * Returns "-X%" for below market, "+X%" for above market, "market_avg" for at market
   */
  private formatPercentageDifference(vehiclePrice: number, avgPrice: number): string {
    // Handle edge case: avoid division by zero
    if (avgPrice === 0) {
      console.warn(`  ⚠️ Average price is zero, cannot calculate percentage`);
      return 'market_avg';
    }

    const percentageDiff = ((vehiclePrice - avgPrice) / avgPrice) * 100;

    // Round to nearest integer
    const rounded = Math.round(percentageDiff);

    // Format
    if (Math.abs(rounded) < 2) {
      return "market_avg"; // Within ±2% is "at market"
    } else if (rounded > 0) {
      return `+${rounded}%`; // Overpriced
    } else {
      return `${rounded}%`; // Good deal (negative, already has minus sign)
    }
  }
}
