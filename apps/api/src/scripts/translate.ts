#!/usr/bin/env node

/**
 * Vehicle Translation Script
 *
 * Translates vehicle descriptions and features from Polish to English using AI.
 * Vehicles without required features are automatically filtered out and marked as 'not_interested'.
 *
 * Usage:
 *   pnpm translate                                   # Translate all vehicles needing translation
 *   pnpm translate --vehicle-id <id>                 # Translate specific vehicle
 *   pnpm translate --limit 10                        # Translate only first 10 vehicles
 *   pnpm translate --concurrency <n>                 # Process N vehicles concurrently (default: 1)
 *   pnpm translate --force                           # Force re-translation, bypass filters
 *
 * Environment Variables:
 *   DATABASE_PATH    Optional. Path to database file (default: <root>/data/vehicles.db)
 *   GEMINI_API_KEY   Required. Your Gemini API key for AI translation
 */

import { AIService, TranslationResult } from '../services/AIService';
import { DatabaseService, VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import { WorkspaceUtils } from '@car-finder/services';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pLimit from 'p-limit';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

interface TranslationOptions {
  vehicleId?: string;
  limit?: number;
  force?: boolean;
  concurrency?: number;
}

interface TranslationRunLog {
  runId: string;
  startTime: Date;
  endTime?: Date;
  vehiclesProcessed: number;
  vehiclesCompleted: number;
  vehiclesFailed: number;
  vehiclesFiltered: number;
  removedFromSource: number;
  failures: TranslationFailure[];
}

interface TranslationFailure {
  vehicleId: string;
  vehicleTitle: string;
  vehicleUrl: string;
  error: string;
  errorType: string;
  timestamp: Date;
  retryable: boolean;
}

interface SearchConfig {
  translationModel?: string;
  requiredFeatures: string[];
  analysisSettings?: {
    userCriteria: any;
  };
}

/**
 * Determine if existence check is needed for a vehicle
 * - Skip if scraped less than 4 hours ago (fresh data)
 * - Check if never checked or checked more than 4 hours ago
 * @exported for testing
 */
export function shouldCheckExistence(vehicle: Vehicle): boolean {
  // Skip if scraped less than 4 hours ago (fresh data)
  const scrapedAt = new Date(vehicle.scrapedAt);
  const hoursSinceScraped = (Date.now() - scrapedAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceScraped < 4) return false;

  // Check if never checked or checked more than 4 hours ago
  if (!vehicle.lastExistenceCheck) return true;

  const lastCheck = new Date(vehicle.lastExistenceCheck);
  const hoursSinceCheck = (Date.now() - lastCheck.getTime()) / (1000 * 60 * 60);
  return hoursSinceCheck > 4;
}

/**
 * Check if a vehicle still exists on the source website
 * Makes HEAD request to sourceUrl with 10s timeout
 * Updates database with result
 * Returns true if exists, false if removed
 * On network error: logs warning, returns true (fail-open)
 * @exported for testing
 */
export async function checkVehicleExistence(
  vehicle: Vehicle,
  vehicleRepository: VehicleRepository
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(vehicle.sourceUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeout);

    const exists = !(response.status === 404 || response.status === 410);

    // Update database
    await vehicleRepository.updateVehicle(vehicle.id, {
      isRemovedFromSource: !exists,
      lastExistenceCheck: new Date().toISOString()
    });

    return exists;
  } catch (error) {
    // Network error - fail open, allow operation to proceed
    console.warn(`⚠️  Existence check failed (network error) - proceeding with operation`);
    return true; // Fail-open for resilience
  }
}

/**
 * Load configuration from search-config.json
 */
export function loadSearchConfig(): SearchConfig {
  try {
    const configPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'search-config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    return {
      translationModel: config.translationModel,
      requiredFeatures: config.requiredFeatures || [],
      analysisSettings: config.analysisSettings,
    };
  } catch (error) {
    console.error('❌ Failed to load search-config.json:', error);
    throw new Error('Configuration file not found or invalid');
  }
}

/**
 * Check if vehicle has at least one of the required features (ANY-match logic)
 * Checks BOTH sourceEquipment AND sourceDescriptionHtml (Polish fields before translation)
 */
export function hasRequiredFeatures(vehicle: Vehicle, requiredFeatures: string[]): boolean {
  if (requiredFeatures.length === 0) {
    // If no required features configured, all vehicles pass
    return true;
  }

  // Parse sourceEquipment JSON (Polish feature names)
  let sourceEquipment: Record<string, string[]>;
  try {
    sourceEquipment = typeof vehicle.sourceEquipment === 'string'
      ? JSON.parse(vehicle.sourceEquipment)
      : vehicle.sourceEquipment;
  } catch (error) {
    console.error('  ⚠️  Failed to parse sourceEquipment:', error);
    return false;
  }

  // Flatten all Polish features from all categories
  const allPolishFeatures: string[] = Object.values(sourceEquipment).flat();

  // ANY-match: vehicle must have at least one required feature
  // Check BOTH sourceEquipment AND sourceDescriptionHtml (case-insensitive)
  return requiredFeatures.some(requiredFeature => {
    const requiredLower = requiredFeature.toLowerCase();

    // Check in sourceEquipment (existing behavior)
    const foundInEquipment = allPolishFeatures.some(polishFeature =>
      polishFeature.toLowerCase().includes(requiredLower)
    );
    if (foundInEquipment) return true;

    // NEW: Check in sourceDescriptionHtml
    if (!vehicle.sourceDescriptionHtml) return false;

    // For Polish word matching, handle declensions by checking if description contains the term
    // Use a stem-based approach: remove common Polish endings for more flexible matching
    const descriptionLower = vehicle.sourceDescriptionHtml.toLowerCase();

    // Direct substring match (works for most cases)
    if (descriptionLower.includes(requiredLower)) return true;

    // Handle Polish declensions: strip common endings like ą, ę, ę, ą for klimatyzacja/klimatyzację
    // Create a stem by removing the last 3 characters if the word is long enough
    if (requiredLower.length > 6) {
      const stem = requiredLower.slice(0, -3);
      if (descriptionLower.includes(stem)) return true;
    }

    return false;
  });
}

/**
 * Classify error as retryable or non-retryable
 */
function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof AIError) {
    const aiError = error as any;
    return aiError.statusCode === 500 || aiError.statusCode === 503;
  }

  if (error instanceof ValidationError) {
    return false;
  }

  return false;
}

/**
 * Get error type name
 */
function getErrorType(error: Error): string {
  if (error instanceof RateLimitError) return 'RateLimitError';
  if (error instanceof ValidationError) return 'ValidationError';
  if (error instanceof AIError) return 'AIError';
  return error.constructor.name || 'Error';
}

export class VehicleTranslator {
  private aiService: AIService;
  private vehicleRepository!: VehicleRepository;
  private runLog: TranslationRunLog;
  private config: SearchConfig;

  private constructor() {
    // Load config and initialize AIService with translation model
    this.config = loadSearchConfig();

    // Use translation model from config, or let AIService use default from .env
    this.aiService = new AIService(this.config.translationModel);

    this.runLog = {
      runId: crypto.randomUUID(),
      startTime: new Date(),
      vehiclesProcessed: 0,
      vehiclesCompleted: 0,
      vehiclesFailed: 0,
      vehiclesFiltered: 0,
      removedFromSource: 0,
      failures: [],
    };
  }

  /**
   * Create and initialize a VehicleTranslator instance
   */
  static async create(databasePath?: string): Promise<VehicleTranslator> {
    const translator = new VehicleTranslator();
    const dbService = new DatabaseService(databasePath);
    await dbService.initialize();
    translator.vehicleRepository = new VehicleRepository(dbService.getDatabase());
    return translator;
  }

  /**
   * Run the translation pipeline with concurrent batch processing
   */
  async run(options: TranslationOptions = {}): Promise<void> {
    console.log('🌐 Starting Vehicle Translation Pipeline...\n');

    try {
      const vehicles = await this.fetchVehiclesToTranslate(options);

      if (vehicles.length === 0) {
        console.log('✅ No vehicles need translation. All done!');
        return;
      }

      const concurrency = options.concurrency || 1; // Default: 1 for 15 RPM safety
      console.log(`📊 Found ${vehicles.length} vehicle(s) to translate (concurrency: ${concurrency})\n`);

      // Create p-limit limiter for concurrency control
      const limit = pLimit(concurrency);

      // Process vehicles in batches
      const batchSize = concurrency;
      const totalBatches = Math.ceil(vehicles.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, vehicles.length);
        const batch = vehicles.slice(batchStart, batchEnd);

        console.log(`\nBatch ${batchIndex + 1}/${totalBatches}: Processing vehicles ${batchStart + 1}-${batchEnd} of ${vehicles.length}`);

        // Process batch concurrently using p-limit
        const batchPromises = batch.map((vehicle, index) =>
          limit(async () => {
            const globalIndex = batchStart + index;

            try {
              // Check vehicle existence before processing (4-hour cache)
              if (shouldCheckExistence(vehicle)) {
                const exists = await checkVehicleExistence(vehicle, this.vehicleRepository);

                if (!exists) {
                  console.log(`  ⚠️  Skipping ${vehicle.id.substring(0, 8)} - removed from source [${globalIndex + 1}/${vehicles.length}]`);
                  this.runLog.removedFromSource++;
                  return;
                }
              }

              // Translate vehicle
              const wasFiltered = await this.translateVehicle(vehicle, options);
              this.runLog.vehiclesCompleted++;

              if (!wasFiltered) {
                console.log(`  ✅ ${vehicle.id.substring(0, 8)} translation complete [${globalIndex + 1}/${vehicles.length}]`);
              }
            } catch (error) {
              this.runLog.vehiclesFailed++;
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              console.error(`  ❌ ${vehicle.id.substring(0, 8)} failed: ${errorMsg} [${globalIndex + 1}/${vehicles.length}]`);

              this.runLog.failures.push({
                vehicleId: vehicle.id,
                vehicleTitle: vehicle.title,
                vehicleUrl: vehicle.sourceUrl,
                error: errorMsg,
                errorType: getErrorType(error instanceof Error ? error : new Error(errorMsg)),
                timestamp: new Date(),
                retryable: isRetryableError(error instanceof Error ? error : new Error(errorMsg)),
              });
              // Don't re-throw - allow other vehicles in batch to continue
            }
          })
        );

        // Wait for all vehicles in batch to complete
        await Promise.all(batchPromises);

        console.log(`Batch ${batchIndex + 1} complete. [Completed: ${this.runLog.vehiclesCompleted}, Failed: ${this.runLog.vehiclesFailed}, Filtered: ${this.runLog.vehiclesFiltered}]`);

        // Rate limiting: 4-second delay between batches (not within batch)
        // With concurrency=1: 1 vehicle per 4s = 15 RPM (compliant)
        if (batchIndex < totalBatches - 1) {
          console.log('⏳ Waiting 4 seconds (rate limit)...');
          await this.delay(4000);
        }
      }

      this.runLog.endTime = new Date();
      this.writeRunLog();
      this.printSummary();
    } catch (error) {
      console.error('❌ Fatal error in translation pipeline:', error);
      this.runLog.endTime = new Date();
      this.writeRunLog();
      throw error;
    }
  }

  /**
   * Fetch vehicles that need translation
   */
  private async fetchVehiclesToTranslate(options: TranslationOptions): Promise<Vehicle[]> {
    if (options.vehicleId) {
      const vehicle = await this.vehicleRepository.findVehicleById(options.vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle with ID ${options.vehicleId} not found`);
      }
      return [vehicle];
    }

    // Query vehicles where description or features is null/empty
    // If force=true, re-translate all vehicles
    const vehicles = await this.vehicleRepository.findVehiclesNeedingTranslation(options.force || false);

    if (options.limit && options.limit > 0) {
      return vehicles.slice(0, options.limit);
    }

    return vehicles;
  }

  /**
   * Translate a single vehicle
   * @returns true if vehicle was filtered out (no AI call), false if translated
   */
  private async translateVehicle(vehicle: Vehicle, options: TranslationOptions): Promise<boolean> {
    this.runLog.vehiclesProcessed++;

    // Check required features BEFORE translation (unless --force flag set)
    const hasFeatures = hasRequiredFeatures(vehicle, this.config.requiredFeatures);

    if (!options.force && !hasFeatures && this.config.requiredFeatures.length > 0) {
      console.log('  ⚠️  Missing all required features - marking as not_interested (skipping translation)');

      const missingFeaturesMsg = `Vehicle automatically excluded: None of the required features found. ` +
        `Vehicle must have at least one of: ${this.config.requiredFeatures.join(', ')}`;

      await this.vehicleRepository.updateVehicle(vehicle.id, {
        status: 'not_interested',
        aiDataSanityCheck: JSON.stringify({
          issues: [{
            severity: 'info',
            message: missingFeaturesMsg
          }],
          overallAssessment: 'filtered_out'
        }),
      });

      this.runLog.vehiclesFiltered++;
      return true; // Filtered out
    }

    if (hasFeatures && this.config.requiredFeatures.length > 0) {
      console.log('  ✓ Required features detected - proceeding with translation');
    }

    // Translate content
    console.log('  🌐 Translating content (Polish → English)...');
    const translation = await this.aiService.translateVehicleContent(vehicle);

    console.log(`  ✓ Translation complete (${translation.features.length} features)`);

    // Save translation to database
    console.log('  💾 Saving translation to database...');
    await this.vehicleRepository.updateVehicle(vehicle.id, {
      description: translation.description,
      features: translation.features,
    });
    console.log('  ✓ Saved successfully');

    return false; // Translated (AI was called)
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Write run log to JSON file
   */
  private writeRunLog(): void {
    try {
      const logDir = path.join(WorkspaceUtils.findWorkspaceRoot(), 'data/logs/translation-runs');

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFilePath = path.join(logDir, `translation-${this.runLog.runId}.json`);
      fs.writeFileSync(logFilePath, JSON.stringify(this.runLog, null, 2), 'utf-8');

      console.log(`\n📝 Run log saved: ${logFilePath}`);
    } catch (error) {
      console.error('⚠️  Failed to write run log:', error);
    }
  }

  /**
   * Print translation summary
   */
  private printSummary(): void {
    const duration = this.runLog.endTime
      ? (this.runLog.endTime.getTime() - this.runLog.startTime.getTime()) / 1000
      : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Translation Summary');
    console.log('='.repeat(60));
    console.log(`Run ID:              ${this.runLog.runId}`);
    console.log(`Vehicles Processed:  ${this.runLog.vehiclesProcessed}`);
    console.log(`✅ Completed:        ${this.runLog.vehiclesCompleted}`);
    console.log(`🚫 Filtered Out:     ${this.runLog.vehiclesFiltered}`);
    console.log(`❌ Failed:           ${this.runLog.vehiclesFailed}`);
    if (this.runLog.removedFromSource > 0) {
      console.log(`🗑️  Removed:          ${this.runLog.removedFromSource} (no longer on source)`);
    }
    console.log(`⏱️  Duration:         ${duration.toFixed(2)}s`);

    if (this.runLog.failures.length > 0) {
      console.log('\n❌ Failed Vehicles:');
      this.runLog.failures.forEach(failure => {
        const retryBadge = failure.retryable ? '🔄' : '⛔';
        console.log(`  ${retryBadge} ${failure.vehicleId}: ${failure.error}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): TranslationOptions {
  const args = process.argv.slice(2);
  const options: TranslationOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--vehicle-id' && i + 1 < args.length) {
      options.vehicleId = args[i + 1];
      i++;
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      options.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Vehicle Translation Script

Usage:
  pnpm translate                                # Translate all vehicles needing translation
  pnpm translate --vehicle-id <id>              # Translate specific vehicle
  pnpm translate --limit 10                     # Translate only first 10 vehicles
  pnpm translate --concurrency <n>              # Process N vehicles concurrently (default: 1)
  pnpm translate --force                        # Force re-translation, bypass filters
  pnpm translate --help                         # Show this help message

Flags:
  --concurrency <n>   Number of vehicles to process concurrently (default: 1)
                      ⚠️  WARNING: Concurrency > 1 may exceed 15 RPM rate limit
                      Recommended: Keep at 1 for safety (1 vehicle per 4s = 15 RPM)
  --force             Re-translate even if already translated, bypass required features filter

Environment Variables:
  GEMINI_API_KEY       Required. Your Gemini API key for AI translation
  DATABASE_PATH        Optional. Path to database file (default: <root>/data/vehicles.db)

Examples:
  pnpm translate                                # Translate all untranslated vehicles (sequential)
  pnpm translate --limit 5                      # Translate first 5 vehicles
  pnpm translate --concurrency 2 --limit 10     # Translate 10 vehicles with concurrency=2
  pnpm translate --vehicle-id abc123            # Translate specific vehicle
  pnpm translate --force --vehicle-id abc123    # Re-translate vehicle, bypass filter
  `);
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();
    const translator = await VehicleTranslator.create();
    await translator.run(options);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for testing
export {
  main,
  parseArgs,
  isRetryableError,
  getErrorType
};
