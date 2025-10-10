/**
 * AIService - AI-powered vehicle analysis service
 *
 * Generates intelligent insights for vehicles including:
 * - Personal Fit Score (how well vehicle matches user criteria)
 * - Priority Rating (overall recommendation score)
 * - Virtual Mechanic's Report (model-specific inspection guidance)
 * - Data Sanity Check (consistency validation)
 */

import { AIProviderFactory, IAIProvider, PromptLoader, DictionaryLoader } from '@car-finder/ai';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import { Vehicle } from '@car-finder/types';

/**
 * User criteria for Personal Fit Score analysis
 */
export interface UserCriteria {
  budgetEur: {
    min: number;
    max: number;
  };
  preferredFeatures: string[]; // e.g., ["air_conditioning", "leather_seats"]
  useCase: string; // e.g., "daily commute", "family car"
  priorityFactors: string[]; // e.g., ["fuel_efficiency", "reliability"]
}

/**
 * Personal Fit Score result
 */
export interface PersonalFitScoreResult {
  score: number;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  dealBreakers: string[];
}

/**
 * Priority Rating result
 */
export interface PriorityRatingResult {
  rating: number;
  summary: string;
}

/**
 * Data Sanity Check result
 */
export interface SanityCheckResult {
  consistencyScore: number;
  flags: string[];
  warnings: string[];
  trustLevel: 'high' | 'medium' | 'low';
  summary: string;
}

/**
 * Translation result
 */
export interface TranslationResult {
  description: string;
  features: string[];
}

/**
 * Helper type for extracting vehicle properties from sourceParameters
 */
interface VehicleExtractedData {
  make?: string;
  model?: string;
  year: number;
  mileageKm: number;
  fuelType?: string;
  transmissionType?: string;
  horsePower?: number;
  engineCapacityCmc?: number;
}

/**
 * AIService - Main service for AI-powered vehicle analysis
 */
export class AIService {
  private provider: IAIProvider;

  constructor() {
    // Use factory to create provider from environment variables
    // This loads GEMINI_API_KEY and other settings from .env automatically
    this.provider = AIProviderFactory.createFromEnvironment();
  }

  /**
   * Translate vehicle content (description and features) from Polish to English
   * Uses dictionary-first approach: checks dictionary, only calls AI for unmapped features
   */
  async translateVehicleContent(vehicle: Vehicle): Promise<TranslationResult> {
    try {
      // Get equipment array from vehicle.sourceEquipment (not sourceParameters)
      const polishEquipment: string[] = Array.isArray(vehicle.sourceEquipment)
        ? vehicle.sourceEquipment
        : [];

      // Use dictionary to translate features
      const { translated, unmapped } = DictionaryLoader.translateFeatures(polishEquipment);

      let translatedEquipment: string[] = [];

      // Check if source description is empty
      if (!vehicle.sourceDescriptionHtml || vehicle.sourceDescriptionHtml.trim() === '') {
        console.warn(`  ⚠️  Vehicle ${vehicle.id} has no description - using placeholder`);
        return {
          description: 'No description provided by seller.',
          features: translated,
        };
      }

      // Only call AI if there are unmapped features
      if (unmapped.length > 0) {
        console.log(`Calling AI to translate ${unmapped.length} unmapped features for vehicle ${vehicle.id}`);

        // Load prompt definition
        const prompt = await PromptLoader.loadPrompt('translate-vehicle');

        // Build prompt with unmapped equipment
        const fullPrompt = PromptLoader.buildPrompt(prompt, {
          sourceDescriptionHtml: vehicle.sourceDescriptionHtml || '',
          unmappedEquipment: unmapped,
        });

        // Call AI provider
        const response = await this.provider.generateStructured<{
          description: string;
          translatedEquipment: string[];
        }>(fullPrompt, prompt.outputFormat);

        // DEBUG: Log AI response for translation debugging
        console.log(`  🔍 DEBUG - AI Translation Response for ${vehicle.id}:`);
        console.log(`     Description length: ${response.description?.length || 0} chars`);
        console.log(`     Description preview: "${response.description?.substring(0, 80)}..."`);
        console.log(`     Equipment translated: ${response.translatedEquipment?.length || 0} items`);
        if (response.translatedEquipment && response.translatedEquipment.length > 0) {
          console.log(`     Equipment preview: ${response.translatedEquipment.slice(0, 3).join(', ')}`);
        }

        // If AI returns empty description, use placeholder
        if (!response.description || response.description.trim() === '') {
          console.warn(`  ⚠️  AI returned empty description for ${vehicle.id} - using placeholder`);
          response.description = 'Description translation unavailable.';
        }

        translatedEquipment = response.translatedEquipment || [];

        // Combine dictionary translations with AI translations
        const allFeatures = [...translated, ...translatedEquipment];

        return {
          description: response.description,
          features: allFeatures,
        };
      } else {
        // All features found in dictionary, only translate description
        console.log(`All features found in dictionary for vehicle ${vehicle.id}, translating description only`);

        const prompt = await PromptLoader.loadPrompt('translate-vehicle');
        const fullPrompt = PromptLoader.buildPrompt(prompt, {
          sourceDescriptionHtml: vehicle.sourceDescriptionHtml,
          unmappedEquipment: [],
        });

        const response = await this.provider.generateStructured<{
          description: string;
          translatedEquipment: string[];
        }>(fullPrompt, prompt.outputFormat);

        // DEBUG: Log AI response for translation debugging
        console.log(`  🔍 DEBUG - AI Translation Response for ${vehicle.id}:`);
        console.log(`     Description length: ${response.description?.length || 0} chars`);
        console.log(`     Description preview: "${response.description?.substring(0, 80)}..."`);
        console.log(`     Dictionary features: ${translated.length} items`);

        // If AI returns empty description, use placeholder
        if (!response.description || response.description.trim() === '') {
          console.warn(`  ⚠️  AI returned empty description for ${vehicle.id} - using placeholder`);
          response.description = 'Description translation unavailable.';
        }

        return {
          description: response.description,
          features: translated,
        };
      }
    } catch (error) {
      console.error(`Error translating vehicle content for ${vehicle.id}:`, error);
      if (error instanceof AIError || error instanceof RateLimitError || error instanceof ValidationError) {
        throw error;
      }
      throw new AIError(`Failed to translate vehicle content: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Personal Fit Score for a vehicle based on user criteria
   */
  async generatePersonalFitScore(
    vehicle: Vehicle,
    criteria: UserCriteria
  ): Promise<number> {
    try {
      // Load prompt definition
      const prompt = await PromptLoader.loadPrompt('personal-fit-score');

      // Extract vehicle data for prompt
      const vehicleData = this._extractVehicleData(vehicle);

      // Build prompt with vehicle data and criteria
      const fullPrompt = PromptLoader.buildPrompt(prompt, {
        vehicle: vehicleData,
        criteria,
      });

      // Call AI provider with structured output
      const response = await this.provider.generateStructured<PersonalFitScoreResult>(
        fullPrompt,
        prompt.outputFormat
      );

      // Validate and return score
      if (typeof response.score !== 'number' || response.score < 0 || response.score > 10) {
        throw new ValidationError('Invalid score returned from AI provider');
      }

      return response.score;
    } catch (error) {
      console.error(`Error generating Personal Fit Score for vehicle ${vehicle.id}:`, error);
      if (error instanceof AIError || error instanceof RateLimitError || error instanceof ValidationError) {
        throw error;
      }
      throw new AIError(`Failed to generate Personal Fit Score: ${(error as Error).message}`);
    }
  }

  /**
   * Generate AI Priority Rating and summary
   */
  async generatePriorityRating(vehicle: Vehicle): Promise<{ rating: number; summary: string }> {
    try {
      // Load prompt definition
      const prompt = await PromptLoader.loadPrompt('priority-rating');

      // Build vehicle data for prompt
      const vehicleData = {
        ...this._extractVehicleData(vehicle),
        personalFitScore: vehicle.personalFitScore,
        marketValueScore: vehicle.marketValueScore,
        aiDataSanityCheck: vehicle.aiDataSanityCheck,
      };

      // Build prompt
      const fullPrompt = PromptLoader.buildPrompt(prompt, {
        vehicle: vehicleData,
      });

      // Call AI provider
      const response = await this.provider.generateStructured<PriorityRatingResult>(
        fullPrompt,
        prompt.outputFormat
      );

      // Validate response
      if (typeof response.rating !== 'number' || response.rating < 0 || response.rating > 10) {
        throw new ValidationError('Invalid rating returned from AI provider');
      }

      if (!response.summary || response.summary.trim() === '') {
        throw new ValidationError('Empty summary returned from AI provider');
      }

      return {
        rating: response.rating,
        summary: response.summary,
      };
    } catch (error) {
      console.error(`Error generating Priority Rating for vehicle ${vehicle.id}:`, error);
      if (error instanceof AIError || error instanceof RateLimitError || error instanceof ValidationError) {
        throw error;
      }
      throw new AIError(`Failed to generate Priority Rating: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Virtual Mechanic's Report
   */
  async generateMechanicReport(vehicle: Vehicle): Promise<string> {
    try {
      // Load prompt definition
      const prompt = await PromptLoader.loadPrompt('mechanic-report');

      // Extract vehicle data for mechanic analysis
      const vehicleData = this._extractVehicleData(vehicle);

      // Build prompt
      const fullPrompt = PromptLoader.buildPrompt(prompt, {
        vehicle: vehicleData,
      });

      // Call AI provider
      const response = await this.provider.generateStructured<{ report: string }>(
        fullPrompt,
        prompt.outputFormat
      );

      // Validate response
      if (!response.report || response.report.trim() === '') {
        throw new ValidationError('Empty report returned from AI provider');
      }

      return response.report;
    } catch (error) {
      console.error(`Error generating Mechanic Report for vehicle ${vehicle.id}:`, error);
      if (error instanceof AIError || error instanceof RateLimitError || error instanceof ValidationError) {
        throw error;
      }
      throw new AIError(`Failed to generate Mechanic Report: ${(error as Error).message}`);
    }
  }

  /**
   * Generate Data Sanity Check
   */
  async generateDataSanityCheck(vehicle: Vehicle): Promise<string> {
    try {
      // Load prompt definition
      const prompt = await PromptLoader.loadPrompt('sanity-check');

      // Extract vehicle data for sanity check
      const vehicleData = this._extractVehicleData(vehicle);

      // Build prompt
      const fullPrompt = PromptLoader.buildPrompt(prompt, {
        vehicle: vehicleData,
      });

      // Call AI provider
      const response = await this.provider.generateStructured<SanityCheckResult>(
        fullPrompt,
        prompt.outputFormat
      );

      // Format result as text
      const result = this._formatSanityCheckResult(response);

      return result;
    } catch (error) {
      console.error(`Error generating Data Sanity Check for vehicle ${vehicle.id}:`, error);
      if (error instanceof AIError || error instanceof RateLimitError || error instanceof ValidationError) {
        throw error;
      }
      throw new AIError(`Failed to generate Data Sanity Check: ${(error as Error).message}`);
    }
  }

  /**
   * Extract vehicle data from Vehicle object for AI prompts
   */
  private _extractVehicleData(vehicle: Vehicle): any {
    // Parse sourceParameters to extract make, model, etc.
    let sourceParams: Record<string, string> = {};
    try {
      sourceParams = typeof vehicle.sourceParameters === 'string'
        ? JSON.parse(vehicle.sourceParameters)
        : vehicle.sourceParameters;
    } catch (e) {
      console.warn(`Failed to parse sourceParameters for vehicle ${vehicle.id}`);
    }

    return {
      id: vehicle.id,
      source: vehicle.source,
      priceEur: vehicle.priceEur,
      make: sourceParams['Marka pojazdu'] || sourceParams['Make'] || 'Unknown',
      model: sourceParams['Model pojazdu'] || sourceParams['Model'] || 'Unknown',
      year: vehicle.year,
      mileageKm: vehicle.mileage,
      fuelType: sourceParams['Rodzaj paliwa'] || sourceParams['Fuel type'] || 'Unknown',
      transmissionType: sourceParams['Skrzynia biegów'] || sourceParams['Transmission'] || 'Unknown',
      horsePower: parseInt(sourceParams['Moc'] || sourceParams['Power'] || '0', 10) || undefined,
      engineCapacityCmc: parseInt(sourceParams['Pojemność skokowa'] || sourceParams['Engine capacity'] || '0', 10) || undefined,
      sourceParameters: sourceParams,
      sourceDescriptionHtml: vehicle.sourceDescriptionHtml,
    };
  }

  /**
   * Format sanity check result as human-readable text
   */
  private _formatSanityCheckResult(result: SanityCheckResult): string {
    let output = `Consistency Score: ${result.consistencyScore}/10\n`;
    output += `Trust Level: ${result.trustLevel.toUpperCase()}\n\n`;
    output += `${result.summary}\n`;

    if (result.warnings.length > 0) {
      output += `\nWARNINGS:\n`;
      result.warnings.forEach((warning) => {
        output += `- ${warning}\n`;
      });
    }

    if (result.flags.length > 0) {
      output += `\nFLAGS:\n`;
      result.flags.forEach((flag) => {
        output += `- ${flag}\n`;
      });
    }

    return output;
  }
}
