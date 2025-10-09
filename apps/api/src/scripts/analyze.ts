#!/usr/bin/env node

/**
 * Vehicle Analysis Script
 *
 * Batch processes vehicles to generate AI-powered analysis including:
 * - Personal Fit Score (requires user criteria)
 * - AI Priority Rating
 * - Virtual Mechanic's Report
 * - Data Sanity Check
 *
 * Usage:
 *   pnpm --filter @car-finder/scripts analyze                    # Analyze all vehicles without AI data
 *   pnpm --filter @car-finder/scripts analyze --vehicle-id <id>  # Analyze specific vehicle
 * pnpm analyze --vehicle-id c9c93b5f246e8f0ce4e5d937871e5210
 *   pnpm --filter @car-finder/scripts analyze --limit 10         # Analyze only first 10 vehicles
 *
 * Environment Variables:
 *   DATABASE_PATH    Optional. Path to database file (default: <root>/data/vehicles.db)
 *   GEMINI_API_KEY   Required. Your Gemini API key for AI analysis
 */

import { AIService, UserCriteria } from '../services/AIService';
import { DatabaseService, VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import { WorkspaceUtils } from '@car-finder/services';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

interface AnalysisStats {
  totalVehicles: number;
  analyzed: number;
  failed: number;
  skipped: number;
  errors: Array<{ vehicleId: string; error: string }>;
  startTime: Date;
  endTime?: Date;
}

interface AnalysisOptions {
  vehicleId?: string;
  limit?: number;
  skipMechanicReport?: boolean;
  skipSanityCheck?: boolean;
  skipPriorityRating?: boolean;
}

/**
 * Load user criteria from search-config.json
 */
function loadUserCriteria(): UserCriteria {
  try {
    const configPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'search-config.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    if (config.analysisSettings?.userCriteria) {
      return config.analysisSettings.userCriteria;
    }

    throw new Error('User criteria not found in search-config.json');
  } catch (error) {
    console.error('❌ Failed to load user criteria from config:', error);
    console.error('   Using default criteria as fallback');

    // Fallback to default criteria
    return {
      budgetEur: { min: 5000, max: 20000 },
      preferredFeatures: ['air_conditioning', 'parking_sensors'],
      useCase: 'daily commute',
      priorityFactors: ['fuel_efficiency', 'reliability'],
    };
  }
}

export class VehicleAnalyzer {
  private aiService: AIService;
  private vehicleRepository!: VehicleRepository;
  private userCriteria: UserCriteria;
  private stats: AnalysisStats;

  private constructor() {
    // AIService loads configuration from environment automatically
    this.aiService = new AIService();

    // Load user criteria from config file
    this.userCriteria = loadUserCriteria();

    this.stats = {
      totalVehicles: 0,
      analyzed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startTime: new Date(),
    };
  }

  /**
   * Create and initialize a VehicleAnalyzer instance
   */
  static async create(databasePath?: string): Promise<VehicleAnalyzer> {
    const analyzer = new VehicleAnalyzer();

    // Initialize database service and repository
    // If no path provided, DatabaseService will use smart defaults (env var or project root)
    const dbService = new DatabaseService(databasePath);
    await dbService.initialize();
    analyzer.vehicleRepository = new VehicleRepository(dbService.getDatabase());

    return analyzer;
  }

  /**
   * Run the analysis pipeline
   */
  async run(options: AnalysisOptions = {}): Promise<void> {
    console.log('🚀 Starting Vehicle Analysis Pipeline...\n');

    try {
      // Fetch vehicles to analyze
      const vehicles = await this.fetchVehiclesToAnalyze(options);

      if (vehicles.length === 0) {
        console.log('✅ No vehicles need analysis. All done!');
        return;
      }

      this.stats.totalVehicles = vehicles.length;
      console.log(`📊 Found ${vehicles.length} vehicle(s) to analyze\n`);

      // Process vehicles with rate limiting (15 RPM = 4 seconds per vehicle)
      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];
        console.log(`\n[${i + 1}/${vehicles.length}] Analyzing vehicle ${vehicle.id}...`);

        try {
          await this.analyzeVehicle(vehicle, options);
          this.stats.analyzed++;
          console.log(`✅ Analysis complete for ${vehicle.id}`);
        } catch (error) {
          this.stats.failed++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          this.stats.errors.push({ vehicleId: vehicle.id, error: errorMsg });
          console.error(`❌ Failed to analyze ${vehicle.id}: ${errorMsg}`);

          // Continue processing remaining vehicles
          continue;
        }

        // Rate limiting: 15 RPM = 4 seconds between requests
        if (i < vehicles.length - 1) {
          console.log('⏳ Waiting 4 seconds (rate limit)...');
          await this.delay(4000);
        }
      }

      this.stats.endTime = new Date();
      this.printSummary();
    } catch (error) {
      console.error('❌ Fatal error in analysis pipeline:', error);
      throw error;
    }
  }

  /**
   * Fetch vehicles that need analysis
   */
  private async fetchVehiclesToAnalyze(options: AnalysisOptions): Promise<Vehicle[]> {
    if (options.vehicleId) {
      console.log(`🔍 Fetching specific vehicle: ${options.vehicleId}`);
      const vehicle = await this.vehicleRepository.findVehicleById(options.vehicleId);
      
      if (!vehicle) {
        // Vehicle not found - provide helpful error message
        console.error(`\n❌ Vehicle not found: ${options.vehicleId}`);
        console.error(`\n💡 Possible reasons:`);
        console.error(`   • Vehicle hasn't been scraped/ingested yet`);
        console.error(`   • Vehicle ID is incorrect or malformed`);
        console.error(`   • Wrong database being used (check DATABASE_PATH env var)`);
        console.error(`\n💡 To ingest a vehicle, run:`);
        console.error(`   pnpm --filter @car-finder/scripts ingest <vehicle-source-url>`);
        throw new Error(`Vehicle with ID ${options.vehicleId} not found in database`);
      }
      
      // Check if this specific vehicle needs analysis
      const needsAnalysis = this.vehicleNeedsAnalysis(vehicle);
      if (!needsAnalysis) {
        console.log(`\n✅ Vehicle ${options.vehicleId} already has complete AI analysis:`);
        console.log(`   📊 Personal Fit Score: ${vehicle.personalFitScore ?? 'N/A'}`);
        console.log(`   ⭐ AI Priority Rating: ${vehicle.aiPriorityRating ?? 'N/A'}`);
        console.log(`   🔧 Mechanic Report: ${vehicle.aiMechanicReport ? '✓ Present' : '✗ Missing'}`);
        console.log(`   🔍 Data Sanity Check: ${vehicle.aiDataSanityCheck ? '✓ Present' : '✗ Missing'}`);
        return [];
      }
      
      console.log(`📊 Vehicle ${options.vehicleId} needs AI analysis`);
      return [vehicle];
    }

    console.log('🔍 Fetching vehicles without AI analysis...');
    const vehicles = await this.vehicleRepository.findVehiclesWithoutAnalysis();

    if (options.limit && options.limit > 0) {
      return vehicles.slice(0, options.limit);
    }

    return vehicles;
  }

  /**
   * Check if a vehicle needs AI analysis
   */
  private vehicleNeedsAnalysis(vehicle: Vehicle): boolean {
    return (
      vehicle.personalFitScore === null ||
      vehicle.aiPriorityRating === null ||
      vehicle.aiPrioritySummary === null ||
      vehicle.aiMechanicReport === null ||
      vehicle.aiDataSanityCheck === null
    );
  }

  /**
   * Analyze a single vehicle
   */
  private async analyzeVehicle(vehicle: Vehicle, options: AnalysisOptions): Promise<void> {
    const analysis: {
      personalFitScore?: number;
      aiPriorityRating?: number;
      aiPrioritySummary?: string;
      aiMechanicReport?: string;
      aiDataSanityCheck?: string;
    } = {};

    // 1. Generate Data Sanity Check (should be first to detect issues)
    if (!vehicle.aiDataSanityCheck && !options.skipSanityCheck) {
      try {
        console.log('  🔍 Generating Data Sanity Check...');
        analysis.aiDataSanityCheck = await this.aiService.generateDataSanityCheck(vehicle);
        console.log('  ✓ Data Sanity Check complete');
      } catch (error) {
        console.error('  ⚠️ Failed to generate sanity check:', error);
        // Continue with other analyses even if sanity check fails
      }
    }

    // 2. Generate Personal Fit Score (if not already present)
    if (vehicle.personalFitScore === null) {
      try {
        console.log('  💯 Generating Personal Fit Score...');
        analysis.personalFitScore = await this.aiService.generatePersonalFitScore(
          vehicle,
          this.userCriteria
        );
        console.log(`  ✓ Personal Fit Score: ${analysis.personalFitScore}/10`);
      } catch (error) {
        console.error('  ⚠️ Failed to generate fit score:', error);
        // Set a default score so we can still generate priority rating
        analysis.personalFitScore = 5;
      }
    }

    // 3. Generate Virtual Mechanic's Report
    if (!vehicle.aiMechanicReport && !options.skipMechanicReport) {
      try {
        console.log('  🔧 Generating Virtual Mechanic\'s Report...');
        analysis.aiMechanicReport = await this.aiService.generateMechanicReport(vehicle);
        console.log('  ✓ Mechanic Report complete');
      } catch (error) {
        console.error('  ⚠️ Failed to generate mechanic report:', error);
        // Continue with other analyses
      }
    }

    // 4. Generate Priority Rating (should be last since it uses other scores)
    if ((vehicle.aiPriorityRating === null || !vehicle.aiPrioritySummary) && !options.skipPriorityRating) {
      try {
        console.log('  ⭐ Generating Priority Rating...');
        // Update vehicle with new analysis before generating priority rating
        const updatedVehicle: Vehicle = {
          ...vehicle,
          personalFitScore: analysis.personalFitScore ?? vehicle.personalFitScore,
          aiDataSanityCheck: analysis.aiDataSanityCheck ?? vehicle.aiDataSanityCheck,
        };

        const priorityResult = await this.aiService.generatePriorityRating(updatedVehicle);
        analysis.aiPriorityRating = priorityResult.rating;
        analysis.aiPrioritySummary = priorityResult.summary;
        console.log(`  ✓ Priority Rating: ${analysis.aiPriorityRating}/10`);
      } catch (error) {
        console.error('  ⚠️ Failed to generate priority rating:', error);
        // Continue to save other analyses
      }
    }

    // Save analysis to database
    if (Object.keys(analysis).length > 0) {
      console.log('  💾 Saving analysis to database...');
      await this.vehicleRepository.updateVehicleAnalysis(vehicle.id, analysis);
      console.log('  ✓ Saved successfully');
    } else {
      this.stats.skipped++;
      console.log('  ⏭️ No new analysis to save (vehicle already analyzed)');
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print analysis summary
   */
  private printSummary(): void {
    const duration = this.stats.endTime
      ? (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000
      : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Analysis Summary');
    console.log('='.repeat(60));
    console.log(`Total Vehicles:    ${this.stats.totalVehicles}`);
    console.log(`✅ Analyzed:       ${this.stats.analyzed}`);
    console.log(`❌ Failed:         ${this.stats.failed}`);
    console.log(`⏭️  Skipped:        ${this.stats.skipped}`);
    console.log(`⏱️  Duration:       ${duration.toFixed(2)}s`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(({ vehicleId, error }) => {
        console.log(`  - ${vehicleId}: ${error}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): AnalysisOptions {
  const args = process.argv.slice(2);
  console.log('🔍 Debug: Received arguments:', args);
  const options: AnalysisOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--vehicle-id' && i + 1 < args.length) {
      options.vehicleId = args[i + 1];
      i++;
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--skip-mechanic-report') {
      options.skipMechanicReport = true;
    } else if (arg === '--skip-sanity-check') {
      options.skipSanityCheck = true;
    } else if (arg === '--skip-priority-rating') {
      options.skipPriorityRating = true;
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
Vehicle Analysis Script

Usage:
  pnpm --filter @car-finder/scripts analyze                     # Analyze all vehicles without AI data
  pnpm --filter @car-finder/scripts analyze --vehicle-id <id>   # Analyze specific vehicle
  pnpm --filter @car-finder/scripts analyze --limit 10          # Analyze only first 10 vehicles
  pnpm --filter @car-finder/scripts analyze --skip-mechanic-report   # Skip mechanic report generation
  pnpm --filter @car-finder/scripts analyze --skip-sanity-check      # Skip sanity check generation
  pnpm --filter @car-finder/scripts analyze --skip-priority-rating   # Skip priority rating generation
  pnpm --filter @car-finder/scripts analyze --help               # Show this help message

Environment Variables:
  GEMINI_API_KEY       Required. Your Gemini API key for AI analysis
  DATABASE_PATH        Optional. Path to database file (default: <root>/data/vehicles.db)

Examples:
  pnpm --filter @car-finder/scripts analyze
  pnpm --filter @car-finder/scripts analyze --limit 5
  pnpm --filter @car-finder/scripts analyze --vehicle-id c9c93b5f246e8f0ce4e5d937871e5210
  `);
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();

    // DatabaseService will handle path resolution (env var or smart defaults)
    // AIService will check for GEMINI_API_KEY and throw error if missing
    const analyzer = await VehicleAnalyzer.create();
    await analyzer.run(options);

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
export { main, parseArgs };
