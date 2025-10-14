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

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

interface TranslationOptions {
  vehicleId?: string;
  limit?: number;
  force?: boolean;
}

interface TranslationRunLog {
  runId: string;
  startTime: Date;
  endTime?: Date;
  vehiclesProcessed: number;
  vehiclesCompleted: number;
  vehiclesFailed: number;
  vehiclesFiltered: number;
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
 * Load configuration from search-config.json
 */
function loadSearchConfig(): SearchConfig {
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
 * Checks the ORIGINAL Polish sourceEquipment field before translation
 */
function hasRequiredFeatures(vehicle: Vehicle, requiredFeatures: string[]): boolean {
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

  if (allPolishFeatures.length === 0) {
    return false;
  }

  // ANY-match: vehicle must have at least one required feature (case-insensitive)
  return allPolishFeatures.some(polishFeature => {
    const featureLower = polishFeature.toLowerCase();
    return requiredFeatures.some(requiredFeature =>
      featureLower.includes(requiredFeature.toLowerCase())
    );
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
   * Run the translation pipeline
   */
  async run(options: TranslationOptions = {}): Promise<void> {
    console.log('🌐 Starting Vehicle Translation Pipeline...\n');

    try {
      const vehicles = await this.fetchVehiclesToTranslate(options);

      if (vehicles.length === 0) {
        console.log('✅ No vehicles need translation. All done!');
        return;
      }

      console.log(`📊 Found ${vehicles.length} vehicle(s) to translate\n`);

      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        console.log(`\n[${i + 1}/${vehicles.length}] Processing vehicle ${vehicle.id}...`);

        let wasFiltered = false;
        try {
          wasFiltered = await this.translateVehicle(vehicle, options);
          this.runLog.vehiclesCompleted++;

          if (!wasFiltered) {
            console.log(`✅ Translation complete for ${vehicle.id}`);
          }
        } catch (error) {
          this.runLog.vehiclesFailed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to process ${vehicle.id}: ${errorMsg}`);

          this.runLog.failures.push({
            vehicleId: vehicle.id,
            vehicleTitle: vehicle.title,
            vehicleUrl: vehicle.sourceUrl,
            error: errorMsg,
            errorType: getErrorType(error instanceof Error ? error : new Error(errorMsg)),
            timestamp: new Date(),
            retryable: isRetryableError(error instanceof Error ? error : new Error(errorMsg)),
          });

          continue;
        }

        // Rate limiting: 15 RPM = 4 seconds (only if AI was called)
        if (!wasFiltered && i < vehicles.length - 1) {
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
  pnpm translate --force                        # Force re-translation, bypass filters
  pnpm translate --help                         # Show this help message

Flags:
  --force       Re-translate even if already translated, bypass required features filter

Environment Variables:
  GEMINI_API_KEY       Required. Your Gemini API key for AI translation
  DATABASE_PATH        Optional. Path to database file (default: <root>/data/vehicles.db)

Examples:
  pnpm translate                                # Translate all untranslated vehicles
  pnpm translate --limit 5                      # Translate first 5 vehicles
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
  loadSearchConfig,
  hasRequiredFeatures,
  isRetryableError,
  getErrorType
};
