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
import { MarketValueService } from '../services/MarketValueService';
import { DatabaseService, VehicleRepository } from '@car-finder/db';
import { Vehicle } from '@car-finder/types';
import { AIError, RateLimitError, ValidationError } from '@car-finder/ai';
import { WorkspaceUtils } from '@car-finder/services';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

// Analysis step types
type AnalysisStep = 'translate' | 'sanity_check' | 'fit_score' | 'mechanic_report' | 'market_value' | 'priority_rating';

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
  resume?: boolean;
  retryFailed?: string;
  showLogs?: boolean;
}

interface AnalysisRunLog {
  runId: string;
  startTime: Date;
  endTime?: Date;
  vehiclesProcessed: number;
  vehiclesCompleted: number;
  vehiclesFailed: number;
  failures: AnalysisFailure[];
  summary?: {
    byStep: Record<AnalysisStep, number>;
    retryableCount: number;
    permanentFailureCount: number;
  };
}

interface AnalysisFailure {
  vehicleId: string;
  vehicleTitle: string;
  vehicleUrl: string;
  step: AnalysisStep;
  error: string;
  errorType: string;
  timestamp: Date;
  retryable: boolean;
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

/**
 * Determine which analysis steps are required for a vehicle
 * based on which fields are already populated (not null)
 */
function getRequiredAnalysisSteps(vehicle: Vehicle): AnalysisStep[] {
  const steps: AnalysisStep[] = [];

  // Check each analysis field - if null, add corresponding step
  // Translation is needed if description is missing (features can be empty array after translation)
  if (!vehicle.description) {
    steps.push('translate');
  }

  if (!vehicle.aiDataSanityCheck) {
    steps.push('sanity_check');
  }

  if (vehicle.personalFitScore === null || vehicle.personalFitScore === undefined) {
    steps.push('fit_score');
  }

  if (!vehicle.aiMechanicReport) {
    steps.push('mechanic_report');
  }

  if (!vehicle.marketValueScore) {
    steps.push('market_value');
  }

  if (vehicle.aiPriorityRating === null || vehicle.aiPriorityRating === undefined) {
    steps.push('priority_rating');
  }

  return steps;
}

/**
 * Classify error as retryable or non-retryable
 */
function isRetryableError(error: Error): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }

  if (error instanceof AIError) {
    // 500/503 are retryable, 400/401 are not
    const aiError = error as any;
    return aiError.statusCode === 500 || aiError.statusCode === 503;
  }

  if (error instanceof ValidationError) {
    return false; // Data issues need manual intervention
  }

  // Default: assume non-retryable
  return false;
}

/**
 * Get error type name
 */
function getErrorType(error: Error): string {
  // Check specific error types first (ValidationError extends AIError)
  if (error instanceof RateLimitError) return 'RateLimitError';
  if (error instanceof ValidationError) return 'ValidationError';
  if (error instanceof AIError) return 'AIError';
  return error.constructor.name || 'Error';
}

export class VehicleAnalyzer {
  private aiService: AIService;
  private marketValueService!: MarketValueService;
  private vehicleRepository!: VehicleRepository;
  private userCriteria: UserCriteria;
  private stats: AnalysisStats;
  private runLog: AnalysisRunLog;

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

    // Initialize run log
    this.runLog = {
      runId: crypto.randomUUID(),
      startTime: new Date(),
      vehiclesProcessed: 0,
      vehiclesCompleted: 0,
      vehiclesFailed: 0,
      failures: [],
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

    // Initialize market value service
    analyzer.marketValueService = new MarketValueService(analyzer.vehicleRepository);

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
          this.runLog.vehiclesFailed++;
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
      this.runLog.endTime = new Date();

      // Generate summary statistics for run log
      this.generateRunLogSummary();

      // Write run log to JSON file
      this.writeRunLog();

      // Print summary
      this.printSummary();
    } catch (error) {
      console.error('❌ Fatal error in analysis pipeline:', error);

      // Write run log even on fatal error
      this.runLog.endTime = new Date();
      this.generateRunLogSummary();
      this.writeRunLog();

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
      const requiredSteps = getRequiredAnalysisSteps(vehicle);
      if (requiredSteps.length === 0) {
        console.log(`\n✅ Vehicle ${options.vehicleId} already has complete AI analysis:`);
        console.log(`   🌐 Translation: ${vehicle.description ? '✓ Present' : '✗ Missing'}`);
        console.log(`   📊 Personal Fit Score: ${vehicle.personalFitScore ?? 'N/A'}`);
        console.log(`   ⭐ AI Priority Rating: ${vehicle.aiPriorityRating ?? 'N/A'}`);
        console.log(`   🔧 Mechanic Report: ${vehicle.aiMechanicReport ? '✓ Present' : '✗ Missing'}`);
        console.log(`   🔍 Data Sanity Check: ${vehicle.aiDataSanityCheck ? '✓ Present' : '✗ Missing'}`);
        console.log(`   💰 Market Value Score: ${vehicle.marketValueScore ?? 'N/A'}`);
        return [];
      }

      console.log(`📊 Vehicle ${options.vehicleId} needs ${requiredSteps.length} step(s): ${requiredSteps.join(', ')}`);
      return [vehicle];
    }

    // Use resume-aware query that finds vehicles with ANY missing analysis field
    console.log('🔍 Fetching vehicles needing analysis (resume-aware)...');
    const vehicles = await this.vehicleRepository.findVehiclesNeedingAnalysis();

    if (options.limit && options.limit > 0) {
      return vehicles.slice(0, options.limit);
    }

    return vehicles;
  }

  /**
   * Analyze a single vehicle
   */
  private async analyzeVehicle(vehicle: Vehicle, options: AnalysisOptions): Promise<void> {
    // Get required steps for this vehicle (resume logic)
    const requiredSteps = getRequiredAnalysisSteps(vehicle);

    if (requiredSteps.length === 0) {
      this.stats.skipped++;
      console.log('  ⏭️  No analysis needed (all steps complete)');
      return;
    }

    console.log(`  📋 Required steps: ${requiredSteps.join(', ')}`);
    this.runLog.vehiclesProcessed++;
    const analysis: {
      description?: string;
      features?: string[];
      personalFitScore?: number;
      marketValueScore?: string;
      aiPriorityRating?: number;
      aiPrioritySummary?: string;
      aiMechanicReport?: string;
      aiDataSanityCheck?: string;
    } = {};

    // 0. Translate vehicle content (must run FIRST to provide English content for other analyses)
    if (requiredSteps.includes('translate')) {
      try {
        console.log('  🌐 Translating vehicle content (Polish → English)...');
        const translation = await this.aiService.translateVehicleContent(vehicle);
        analysis.description = translation.description;
        analysis.features = translation.features;
        console.log(`  ✓ Translation complete (${translation.features.length} features)`);
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to translate vehicle content:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'translate',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else {
      console.log('  ⏭️  Skipping translation (already complete)');
    }

    // 1. Generate Data Sanity Check (should be first to detect issues)
    if (requiredSteps.includes('sanity_check') && !options.skipSanityCheck) {
      try {
        console.log('  🔍 Generating Data Sanity Check...');
        analysis.aiDataSanityCheck = await this.aiService.generateDataSanityCheck(vehicle);
        console.log('  ✓ Data Sanity Check complete');
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate sanity check:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'sanity_check',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else if (!options.skipSanityCheck) {
      console.log('  ⏭️  Skipping sanity check (already complete)');
    }

    // 2. Generate Personal Fit Score (if not already present)
    if (requiredSteps.includes('fit_score')) {
      try {
        console.log('  💯 Generating Personal Fit Score...');
        analysis.personalFitScore = await this.aiService.generatePersonalFitScore(
          vehicle,
          this.userCriteria
        );
        console.log(`  ✓ Personal Fit Score: ${analysis.personalFitScore}/10`);
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate fit score:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'fit_score',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else {
      console.log('  ⏭️  Skipping fit score (already complete)');
    }

    // 3. Generate Virtual Mechanic's Report
    if (requiredSteps.includes('mechanic_report') && !options.skipMechanicReport) {
      try {
        console.log('  🔧 Generating Virtual Mechanic\'s Report...');
        analysis.aiMechanicReport = await this.aiService.generateMechanicReport(vehicle);
        console.log('  ✓ Mechanic Report complete');
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate mechanic report:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'mechanic_report',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else if (!options.skipMechanicReport) {
      console.log('  ⏭️  Skipping mechanic report (already complete)');
    }

    // 4. Calculate Market Value Score (before Priority Rating so AI can use it)
    if (requiredSteps.includes('market_value')) {
      try {
        console.log('  💰 Calculating Market Value Score...');
        const marketValue = await this.marketValueService.calculateMarketValue(vehicle);
        if (marketValue !== null) {
          analysis.marketValueScore = marketValue;
          console.log(`  ✓ Market Value: ${marketValue}`);
        } else {
          console.log('  ⚠️  Market Value: No comparables found (insufficient data)');
        }
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to calculate market value:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'market_value',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else {
      console.log('  ⏭️  Skipping market value (already complete)');
    }

    // 5. Generate Priority Rating (should be last since it uses other scores)
    if (requiredSteps.includes('priority_rating') && !options.skipPriorityRating) {
      try {
        console.log('  ⭐ Generating Priority Rating...');
        // Update vehicle with new analysis before generating priority rating
        const updatedVehicle: Vehicle = {
          ...vehicle,
          personalFitScore: analysis.personalFitScore ?? vehicle.personalFitScore,
          marketValueScore: analysis.marketValueScore ?? vehicle.marketValueScore,
          aiDataSanityCheck: analysis.aiDataSanityCheck ?? vehicle.aiDataSanityCheck,
        };

        const priorityResult = await this.aiService.generatePriorityRating(updatedVehicle);
        analysis.aiPriorityRating = priorityResult.rating;
        analysis.aiPrioritySummary = priorityResult.summary;
        console.log(`  ✓ Priority Rating: ${analysis.aiPriorityRating}/10`);
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate priority rating:', err.message);

        // Log failure to run log
        this.runLog.failures.push({
          vehicleId: vehicle.id,
          vehicleTitle: vehicle.title,
          vehicleUrl: vehicle.sourceUrl,
          step: 'priority_rating',
          error: err.message,
          errorType: getErrorType(err),
          timestamp: new Date(),
          retryable: isRetryableError(err),
        });

        throw err; // Re-throw to skip remaining steps
      }
    } else if (!options.skipPriorityRating) {
      console.log('  ⏭️  Skipping priority rating (already complete)');
    }

    // Save analysis to database
    if (Object.keys(analysis).length > 0) {
      console.log('  💾 Saving analysis to database...');
      await this.vehicleRepository.updateVehicleAnalysis(vehicle.id, analysis);
      console.log('  ✓ Saved successfully');

      // Mark vehicle as completed in run log
      this.runLog.vehiclesCompleted++;
    }
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate summary statistics for run log
   */
  private generateRunLogSummary(): void {
    // Count failures by step
    const byStep: Record<AnalysisStep, number> = {
      translate: 0,
      sanity_check: 0,
      fit_score: 0,
      mechanic_report: 0,
      market_value: 0,
      priority_rating: 0,
    };

    let retryableCount = 0;
    let permanentFailureCount = 0;

    this.runLog.failures.forEach(failure => {
      byStep[failure.step]++;
      if (failure.retryable) {
        retryableCount++;
      } else {
        permanentFailureCount++;
      }
    });

    this.runLog.summary = {
      byStep,
      retryableCount,
      permanentFailureCount,
    };
  }

  /**
   * Write run log to JSON file
   */
  private writeRunLog(): void {
    try {
      const logDir = path.join(WorkspaceUtils.findWorkspaceRoot(), 'data/logs/analysis-runs');

      // Create directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        console.log(`📁 Created log directory: ${logDir}`);
      }

      const logFilePath = path.join(logDir, `analysis-${this.runLog.runId}.json`);
      fs.writeFileSync(logFilePath, JSON.stringify(this.runLog, null, 2), 'utf-8');

      console.log(`\n📝 Run log saved: ${logFilePath}`);
    } catch (error) {
      console.error('⚠️  Failed to write run log:', error);
      // Don't throw - logging failure shouldn't crash the script
    }
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
    console.log(`Run ID:            ${this.runLog.runId}`);
    console.log(`Total Vehicles:    ${this.stats.totalVehicles}`);
    console.log(`✅ Completed:      ${this.runLog.vehiclesCompleted}`);
    console.log(`❌ Failed:         ${this.runLog.vehiclesFailed}`);
    console.log(`⏭️  Skipped:        ${this.stats.skipped}`);
    console.log(`⏱️  Duration:       ${duration.toFixed(2)}s`);

    if (this.runLog.summary && this.runLog.failures.length > 0) {
      console.log(`\n📉 Failure Breakdown:`);
      console.log(`   Retryable:      ${this.runLog.summary.retryableCount}`);
      console.log(`   Permanent:      ${this.runLog.summary.permanentFailureCount}`);

      console.log(`\n🔧 Failures by Step:`);
      Object.entries(this.runLog.summary.byStep).forEach(([step, count]) => {
        if (count > 0) {
          console.log(`   ${step}: ${count}`);
        }
      });

      console.log('\n❌ Failed Vehicles:');
      this.runLog.failures.forEach(failure => {
        const retryBadge = failure.retryable ? '🔄' : '⛔';
        console.log(`  ${retryBadge} ${failure.vehicleId} (${failure.step}): ${failure.error}`);
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
  const options: AnalysisOptions = {
    resume: true, // Default to enabled
  };

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
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--no-resume') {
      options.resume = false;
    } else if (arg === '--retry-failed' && i + 1 < args.length) {
      options.retryFailed = args[i + 1];
      i++;
    } else if (arg === '--show-logs') {
      options.showLogs = true;
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
  pnpm analyze                                                   # Analyze all vehicles needing analysis (resume-aware)
  pnpm analyze --vehicle-id <id>                                 # Analyze specific vehicle
  pnpm analyze --limit 10                                        # Analyze only first 10 vehicles
  pnpm analyze --skip-mechanic-report                            # Skip mechanic report generation
  pnpm analyze --skip-sanity-check                               # Skip sanity check generation
  pnpm analyze --skip-priority-rating                            # Skip priority rating generation
  pnpm analyze --no-resume                                       # Disable resume logic (reanalyze all steps)
  pnpm analyze --show-logs                                       # List available analysis run logs
  pnpm analyze --retry-failed <run-id>                           # Retry only failed vehicles from a previous run
  pnpm analyze --help                                            # Show this help message

Environment Variables:
  GEMINI_API_KEY       Required. Your Gemini API key for AI analysis
  DATABASE_PATH        Optional. Path to database file (default: <root>/data/vehicles.db)

Examples:
  pnpm analyze                                                   # Analyze all vehicles (resume from where it left off)
  pnpm analyze --limit 5                                         # Analyze first 5 vehicles needing analysis
  pnpm analyze --vehicle-id c9c93b5f246e8f0ce4e5d937871e5210    # Analyze specific vehicle
  pnpm analyze --show-logs                                       # View previous run logs
  pnpm analyze --retry-failed f47ac10b-58cc-4372-a567-0e02b2c3d479  # Retry failed vehicles from a specific run
  `);
}

/**
 * List available analysis run logs
 */
function listAnalysisLogs(): void {
  try {
    const logDir = path.join(WorkspaceUtils.findWorkspaceRoot(), 'data/logs/analysis-runs');

    if (!fs.existsSync(logDir)) {
      console.log('📭 No analysis logs found.');
      return;
    }

    const logFiles = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => b.localeCompare(a)); // Most recent first

    if (logFiles.length === 0) {
      console.log('📭 No analysis logs found.');
      return;
    }

    console.log('\n📋 Analysis Run Logs:\n');
    console.log('='.repeat(80));

    logFiles.forEach(file => {
      const logPath = path.join(logDir, file);
      const logContent = JSON.parse(fs.readFileSync(logPath, 'utf-8')) as AnalysisRunLog;

      const duration = logContent.endTime
        ? ((new Date(logContent.endTime).getTime() - new Date(logContent.startTime).getTime()) / 1000).toFixed(1)
        : 'N/A';

      console.log(`Run ID: ${logContent.runId}`);
      console.log(`Date:   ${new Date(logContent.startTime).toLocaleString()}`);
      console.log(`Stats:  ${logContent.vehiclesCompleted} completed, ${logContent.vehiclesFailed} failed (${duration}s)`);
      if (logContent.summary) {
        console.log(`Retry:  ${logContent.summary.retryableCount} retryable, ${logContent.summary.permanentFailureCount} permanent`);
      }
      console.log(`File:   ${logPath}`);
      console.log('-'.repeat(80));
    });

    console.log(`\nTotal logs: ${logFiles.length}\n`);
  } catch (error) {
    console.error('❌ Failed to list logs:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();

    // Handle show-logs option
    if (options.showLogs) {
      listAnalysisLogs();
      process.exit(0);
    }

    // Handle retry-failed option
    if (options.retryFailed) {
      console.log(`\n⚠️  --retry-failed feature not yet implemented (run ID: ${options.retryFailed})`);
      console.log('    For now, failed vehicles will automatically be retried on next run due to resume logic.\n');
      process.exit(0);
    }

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
export {
  main,
  parseArgs,
  getRequiredAnalysisSteps,
  isRetryableError,
  getErrorType,
  listAnalysisLogs
};
