/**
 * MarketValueService - Market value analysis service
 *
 * Calculates market value scores for vehicles by comparing them to similar
 * listings in the database. Uses mileage-weighted averaging to determine
 * if a vehicle is priced above, below, or at market average.
 *
 * Supports vehicle equivalency groups (platform twins like Trafic/Vivaro/Primastar)
 * and attribute-based weighting (engine size, horsepower, transmission, fuel type).
 *
 * Configuration loaded from search-config.json:
 * - Vehicle equivalency groups with weights
 * - Attribute comparison tolerances and penalties
 * - Matching criteria (year range, mileage range, min comparables)
 */

import { Vehicle } from '@car-finder/types';
import { VehicleRepository } from '@car-finder/db';
import { WorkspaceUtils } from '@car-finder/services';
import * as fs from 'fs';

interface VehicleEquivalent {
  make: string;
  model: string;
  weight: number;
}

interface EquivalencyGroup {
  name: string;
  vehicles: VehicleEquivalent[];
}

interface MarketValueConfig {
  vehicleEquivalency: {
    groups: EquivalencyGroup[];
  };
  attributeWeights: {
    engineSize_tolerance_cc: number;
    engineSize_penalty: number;
    horsepower_tolerance_hp: number;
    horsepower_penalty: number;
    transmission_mismatch_penalty: number;
    fuelType_mismatch_penalty: number;
    wheelbase_mismatch_penalty: number;
  };
  matchingCriteria: {
    yearRange: number;
    mileageRange_km: number;
    minComparables: number;
  };
}

interface ComparableVehicle extends Vehicle {
  equivalencyWeight: number;
  attributeWeight: number;
}

/**
 * MarketValueService - Main service for market value calculations
 */
export class MarketValueService {
  private vehicleRepo: VehicleRepository;
  private config: MarketValueConfig;

  constructor(vehicleRepo: VehicleRepository) {
    this.vehicleRepo = vehicleRepo;
    this.config = this.loadConfig();
  }

  /**
   * Load market value configuration from search-config.json
   */
  private loadConfig(): MarketValueConfig {
    const configPath = WorkspaceUtils.resolveConfigFile('search-config.json');
    const configFile = fs.readFileSync(configPath, 'utf-8');
    const fullConfig = JSON.parse(configFile);

    if (!fullConfig.marketValueSettings) {
      throw new Error('marketValueSettings not found in search-config.json');
    }

    return fullConfig.marketValueSettings;
  }

  /**
   * Calculate market value score for a vehicle based on comparable listings
   * Uses vehicle equivalency groups and attribute weighting
   *
   * @param vehicle - Vehicle to evaluate
   * @returns Percentage difference string (e.g., "-5%", "+10%", "market_avg") or null if insufficient data
   */
  async calculateMarketValue(vehicle: Vehicle): Promise<string | null> {
    try {
      // 1. Find comparable vehicles (including platform twins and equivalents)
      const comparables = await this.findComparableVehiclesWithEquivalency(vehicle);

      // 2. Check minimum sample size
      const minRequired = this.config.matchingCriteria.minComparables;
      if (comparables.length < minRequired) {
        console.log(`  ⚠️ Insufficient comparables (${comparables.length}/${minRequired}) for vehicle ${vehicle.id}`);
        return null; // Insufficient data
      }

      console.log(`  ✓ Found ${comparables.length} comparable vehicles for ${vehicle.id}`);

      // 3. Calculate weighted average price (mileage + equivalency + attributes)
      const weightedAvg = this.calculateWeightedAverageWithAttributes(vehicle, comparables);
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
   * Find equivalent vehicle makes/models based on equivalency groups
   * Returns array of {make, model, weight} for all equivalent vehicles
   */
  private findEquivalentModels(make: string, model: string): VehicleEquivalent[] {
    const equivalents: VehicleEquivalent[] = [];

    // Search through all equivalency groups
    for (const group of this.config.vehicleEquivalency.groups) {
      // Find if this vehicle is in the group
      const matchingVehicle = group.vehicles.find(
        v => v.make.toLowerCase() === make.toLowerCase() && v.model.toLowerCase() === model.toLowerCase()
      );

      if (matchingVehicle) {
        // Add all vehicles from this group (including the original)
        equivalents.push(...group.vehicles);
        break; // Vehicle can only be in one group
      }
    }

    // If no group found, return just the original vehicle with weight 1.0
    if (equivalents.length === 0) {
      equivalents.push({ make, model, weight: 1.0 });
    }

    return equivalents;
  }

  /**
   * Find comparable vehicles including platform twins and equivalents
   * Applies equivalency weights and attribute-based filtering
   */
  private async findComparableVehiclesWithEquivalency(vehicle: Vehicle): Promise<ComparableVehicle[]> {
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

      // Find all equivalent vehicles
      const equivalents = this.findEquivalentModels(make, model);
      console.log(`  ✓ Found ${equivalents.length} equivalent model(s) for ${make} ${model}`);

      // Query for each equivalent make/model
      const allComparables: ComparableVehicle[] = [];

      for (const equiv of equivalents) {
        const comparables = await this.vehicleRepo.findComparableVehicles({
          source: vehicle.source,
          make: equiv.make,
          model: equiv.model,
          year: vehicle.year,
          mileage: vehicle.mileage,
          excludeId: vehicle.id,
        });

        // Add equivalency weight and calculate attribute weight
        for (const comp of comparables) {
          const attributeWeight = this.calculateAttributeWeight(vehicle, comp);
          allComparables.push({
            ...comp,
            equivalencyWeight: equiv.weight,
            attributeWeight,
          });
        }
      }

      console.log(`  ✓ Total comparables found: ${allComparables.length}`);
      return allComparables;
    } catch (error) {
      console.error(`❌ Error finding comparable vehicles with equivalency:`, error);
      return [];
    }
  }

  /**
   * Calculate attribute-based weight for a comparable vehicle
   * Compares engine size, horsepower, transmission, fuel type, wheelbase
   * Returns weight multiplier (1.0 = perfect match, <1.0 = penalties applied)
   */
  private calculateAttributeWeight(target: Vehicle, comparable: Vehicle): number {
    let weight = 1.0;

    try {
      const targetParams = typeof target.sourceParameters === 'string'
        ? JSON.parse(target.sourceParameters)
        : target.sourceParameters;
      const compParams = typeof comparable.sourceParameters === 'string'
        ? JSON.parse(comparable.sourceParameters)
        : comparable.sourceParameters;

      // 1. Engine size comparison (extract from "Pojemność skokowa" field)
      const targetEngineSize = this.extractEngineSize(targetParams);
      const compEngineSize = this.extractEngineSize(compParams);

      if (targetEngineSize && compEngineSize) {
        const engineDiff = Math.abs(targetEngineSize - compEngineSize);
        const tolerance = this.config.attributeWeights.engineSize_tolerance_cc;
        if (engineDiff > tolerance) {
          const steps = Math.floor((engineDiff - tolerance) / tolerance);
          weight *= Math.pow(1 - this.config.attributeWeights.engineSize_penalty, steps);
        }
      }

      // 2. Horsepower comparison (extract from "Moc" field)
      const targetHP = this.extractHorsepower(targetParams);
      const compHP = this.extractHorsepower(compParams);

      if (targetHP && compHP) {
        const hpDiff = Math.abs(targetHP - compHP);
        const tolerance = this.config.attributeWeights.horsepower_tolerance_hp;
        if (hpDiff > tolerance) {
          const steps = Math.floor((hpDiff - tolerance) / tolerance);
          weight *= Math.pow(1 - this.config.attributeWeights.horsepower_penalty, steps);
        }
      }

      // 3. Transmission comparison (extract from "Skrzynia biegów")
      const targetTransmission = this.extractTransmission(targetParams);
      const compTransmission = this.extractTransmission(compParams);

      if (targetTransmission && compTransmission && targetTransmission !== compTransmission) {
        weight *= (1 - this.config.attributeWeights.transmission_mismatch_penalty);
      }

      // 4. Fuel type comparison (extract from "Rodzaj paliwa")
      const targetFuel = this.extractFuelType(targetParams);
      const compFuel = this.extractFuelType(compParams);

      if (targetFuel && compFuel && targetFuel !== compFuel) {
        weight *= (1 - this.config.attributeWeights.fuelType_mismatch_penalty);
      }

      // 5. Wheelbase comparison (extract from "Wersja" - look for L1/L2/L3)
      const targetWheelbase = this.extractWheelbase(targetParams);
      const compWheelbase = this.extractWheelbase(compParams);

      if (targetWheelbase && compWheelbase && targetWheelbase !== compWheelbase) {
        weight *= (1 - this.config.attributeWeights.wheelbase_mismatch_penalty);
      }

    } catch (error) {
      console.warn(`  ⚠️ Error calculating attribute weight:`, error);
      // Return 1.0 on error - don't penalize for parsing issues
    }

    return weight;
  }

  /**
   * Extract engine size in cc from sourceParameters
   * Handles formats like "1 995 cm3", "1995 cm3", "2.0"
   */
  private extractEngineSize(params: Record<string, any>): number | null {
    const field = params['Pojemność skokowa'] || params['Engine size'] || params['engineSize'];
    if (!field) return null;

    const match = field.toString().match(/(\d[\d\s]*)\s*(cm3|cc)/);
    if (match) {
      return parseInt(match[1].replace(/\s/g, ''));
    }
    return null;
  }

  /**
   * Extract horsepower from sourceParameters
   * Handles formats like "115 KM", "115HP"
   */
  private extractHorsepower(params: Record<string, any>): number | null {
    const field = params['Moc'] || params['Power'] || params['horsepower'];
    if (!field) return null;

    const match = field.toString().match(/(\d+)\s*(KM|HP|hp)/);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  }

  /**
   * Extract transmission type from sourceParameters
   * Normalizes to "manual" or "automatic"
   */
  private extractTransmission(params: Record<string, any>): string | null {
    const field = params['Skrzynia biegów'] || params['Transmission'] || params['transmission'];
    if (!field) return null;

    const normalized = field.toString().toLowerCase();
    if (normalized.includes('manual') || normalized.includes('manualna')) {
      return 'manual';
    }
    if (normalized.includes('automatic') || normalized.includes('automatyczna')) {
      return 'automatic';
    }
    return null;
  }

  /**
   * Extract fuel type from sourceParameters
   * Normalizes to "diesel", "petrol", "lpg", etc.
   */
  private extractFuelType(params: Record<string, any>): string | null {
    const field = params['Rodzaj paliwa'] || params['Fuel type'] || params['fuelType'];
    if (!field) return null;

    const normalized = field.toString().toLowerCase();
    if (normalized.includes('diesel')) return 'diesel';
    if (normalized.includes('petrol') || normalized.includes('benzyna')) return 'petrol';
    if (normalized.includes('lpg')) return 'lpg';
    if (normalized.includes('electric')) return 'electric';
    return null;
  }

  /**
   * Extract wheelbase from "Wersja" field
   * Looks for L1/L2/L3 patterns (short/medium/long wheelbase)
   */
  private extractWheelbase(params: Record<string, any>): string | null {
    const field = params['Wersja'] || params['Version'] || params['version'];
    if (!field) return null;

    const match = field.toString().match(/L([123])/);
    if (match) {
      return `L${match[1]}`;
    }
    return null;
  }

  /**
   * Calculate mileage-weighted average price with equivalency and attribute weights
   * Vehicles with closer mileage to target get higher weight
   * Apply mileage condition adjustments (high/low mileage bonuses/penalties)
   */
  private calculateWeightedAverageWithAttributes(target: Vehicle, comparables: ComparableVehicle[]): number {
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    for (const comp of comparables) {
      // 1. Calculate mileage proximity weight
      const mileageDiff = Math.abs(comp.mileage - target.mileage);
      const mileageWeight = 1 / (1 + mileageDiff / 10000); // Closer mileage = higher weight

      // 2. Apply equivalency and attribute weights
      const combinedWeight = mileageWeight * comp.equivalencyWeight * comp.attributeWeight;

      // 3. Apply mileage condition adjustments to price
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

      // 4. Add to weighted sum
      totalWeightedPrice += adjustedPrice * combinedWeight;
      totalWeight += combinedWeight;
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
