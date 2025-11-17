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
import pLimit from 'p-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables from the workspace root
WorkspaceUtils.loadEnvFromRoot();

// Analysis step types (translation removed - now handled by translate.ts)
type AnalysisStep = 'sanity_check' | 'fit_score' | 'mechanic_report' | 'market_value' | 'priority_rating';

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
  includeFullReport?: boolean;
  skipSanityCheck?: boolean;
  skipPriorityRating?: boolean;
  resume?: boolean;
  retryFailed?: string;
  showLogs?: boolean;
  force?: boolean;
  concurrency?: number;
}

interface AnalysisRunLog {
  runId: string;
  startTime: Date;
  endTime?: Date;
  concurrency: number;
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
 * Note: Translation is now handled separately by translate.ts
 * @exported for testing
 */
export function getRequiredAnalysisSteps(vehicle: Vehicle, force: boolean = false): AnalysisStep[] {
  const steps: AnalysisStep[] = [];

  // If force flag is set, re-analyze all steps
  if (force) {
    return ['sanity_check', 'fit_score', 'mechanic_report', 'market_value', 'priority_rating'];
  }

  // Check each analysis field - if null, add corresponding step
  if (!vehicle.aiDataSanityCheck) {
    steps.push('sanity_check');
  }

  if (vehicle.personalFitScore === null || vehicle.personalFitScore === undefined) {
    steps.push('fit_score');
  }

  // Check for mechanic summary (new default) instead of full report
  if (!vehicle.virtualMechanicSummary) {
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
      concurrency: 3, // Default, will be updated in run()
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
      const concurrency = options.concurrency || 3;

      // Store concurrency in run log
      this.runLog.concurrency = concurrency;

      console.log(`📊 Found ${vehicles.length} vehicle(s) to analyze`);
      console.log(`🚀 Starting concurrent analysis with concurrency=${concurrency}\n`);

      // Calculate expected throughput for user info
      const expectedRPM = Math.floor((concurrency * 4) / 4); // 4 API calls per vehicle / 4 second delay
      console.log(`⚡ Rate limit: ~${expectedRPM * 4} API calls per batch, ${expectedRPM} vehicles/batch`);
      console.log(`⏱️  Estimated time: ~${Math.ceil(vehicles.length / concurrency * 4 / 60)} minutes for ${vehicles.length} vehicles\n`);

      // Create concurrency limiter
      const limit = pLimit(concurrency);

      // Process vehicles in batches
      const batchSize = concurrency;
      const totalBatches = Math.ceil(vehicles.length / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, vehicles.length);
        const batch = vehicles.slice(batchStart, batchEnd);

        console.log(`\nBatch ${batchIndex + 1}/${totalBatches}: Processing vehicles ${batchStart + 1}-${batchEnd} of ${vehicles.length}`);
        console.log(`  Starting: ${batch.map(v => v.id.substring(0, 8)).join(', ')}...`);

        // Process batch concurrently using p-limit
        const batchPromises = batch.map((vehicle, index) =>
          limit(async () => {
            const globalIndex = batchStart + index;

            try {
              // Use quiet mode when concurrency > 1 to avoid log interleaving
              const quietMode = concurrency > 1;
              await this.analyzeVehicle(vehicle, options, quietMode);
              this.stats.analyzed++;
              console.log(`  ✅ ${vehicle.id.substring(0, 8)} complete [${globalIndex + 1}/${vehicles.length}]`);
            } catch (error) {
              this.stats.failed++;
              this.runLog.vehiclesFailed++;
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              this.stats.errors.push({ vehicleId: vehicle.id, error: errorMsg });
              console.error(`  ❌ ${vehicle.id.substring(0, 8)} failed: ${errorMsg}`);
              // Don't re-throw - allow other vehicles in batch to continue
            }
          })
        );

        // Wait for all vehicles in batch to complete
        await Promise.all(batchPromises);

        console.log(`Batch ${batchIndex + 1} complete. [Completed: ${this.stats.analyzed}/${vehicles.length} vehicles, Failed: ${this.stats.failed}]`);

        // Rate limiting: 4-second delay between batches (not within batch)
        if (batchIndex < totalBatches - 1) {
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
        console.error(`   pnpm ingest <vehicle-source-url>`);
        throw new Error(`Vehicle with ID ${options.vehicleId} not found in database`);
      }

      // Check if this specific vehicle needs analysis (or force re-analysis)
      const requiredSteps = getRequiredAnalysisSteps(vehicle, options.force);
      if (requiredSteps.length === 0 && !options.force) {
        console.log(`\n✅ Vehicle ${options.vehicleId} already has complete AI analysis:`);
        console.log(`   🌐 Translation: ${vehicle.description ? '✓ Present' : '✗ Missing'}`);
        console.log(`   📊 Personal Fit Score: ${vehicle.personalFitScore ?? 'N/A'}`);
        console.log(`   ⭐ AI Priority Rating: ${vehicle.aiPriorityRating ?? 'N/A'}`);
        console.log(`   🔧 Mechanic Summary: ${vehicle.virtualMechanicSummary ? '✓ Present' : '✗ Missing'}`);
        console.log(`   📋 Full Mechanic Report: ${vehicle.aiMechanicReport ? '✓ Present' : '✗ Missing'}`);
        console.log(`   🔍 Data Sanity Check: ${vehicle.aiDataSanityCheck ? '✓ Present' : '✗ Missing'}`);
        console.log(`   💰 Market Value Score: ${vehicle.marketValueScore ?? 'N/A'}`);
        console.log(`\n💡 To force re-analysis, use: pnpm analyze --vehicle-id ${options.vehicleId} --force`);
        return [];
      }

      console.log(`📊 Vehicle ${options.vehicleId} needs ${requiredSteps.length} step(s): ${requiredSteps.join(', ')}`);
      return [vehicle];
    }

    // Use resume-aware query that finds vehicles with ANY missing analysis field
    // Note: Only analyze vehicles that have been translated (description is not null)
    console.log('🔍 Fetching vehicles needing analysis (resume-aware)...');
    const allVehicles = await this.vehicleRepository.findVehiclesNeedingAnalysis();

    // Filter to only include vehicles with description (pre-translated)
    const vehicles = options.force
      ? allVehicles
      : allVehicles.filter(v => v.description && v.description.trim() !== '');

    const skippedCount = allVehicles.length - vehicles.length;
    if (skippedCount > 0) {
      console.log(`⚠️  Skipping ${skippedCount} vehicle(s) without translation - run 'pnpm translate' first`);
    }

    if (options.limit && options.limit > 0) {
      return vehicles.slice(0, options.limit);
    }

    return vehicles;
  }

  /**
   * Analyze a single vehicle
   */
  private async analyzeVehicle(vehicle: Vehicle, options: AnalysisOptions, quiet: boolean = false): Promise<void> {
    // Check if vehicle has been translated
    if (!vehicle.description || vehicle.description.trim() === '') {
      if (!quiet) console.log('  ⚠️  Vehicle missing translation - run translate.ts first');
      this.stats.skipped++;
      return;
    }

    // Get required steps for this vehicle (resume logic or force re-analysis)
    const requiredSteps = getRequiredAnalysisSteps(vehicle, options.force);

    if (requiredSteps.length === 0) {
      this.stats.skipped++;
      if (!quiet) console.log('  ⏭️  No analysis needed (all steps complete)');
      return;
    }

    if (!quiet) console.log(`  📋 Required steps: ${requiredSteps.join(', ')}`);
    this.runLog.vehiclesProcessed++;
    const analysis: {
      personalFitScore?: number;
      marketValueScore?: string;
      aiPriorityRating?: number;
      aiPrioritySummary?: string;
      aiMechanicReport?: string;
      virtualMechanicSummary?: string;
      aiDataSanityCheck?: string;
    } = {};

    // 1. Generate Data Sanity Check (should be first to detect issues)
    if (requiredSteps.includes('sanity_check') && !options.skipSanityCheck) {
      try {
        if (!quiet) console.log('  🔍 Generating Data Sanity Check...');
        analysis.aiDataSanityCheck = await this.aiService.generateDataSanityCheck(vehicle);
        if (!quiet) console.log('  ✓ Data Sanity Check complete');
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
    } else if (!options.skipSanityCheck && !quiet) {
      console.log('  ⏭️  Skipping sanity check (already complete)');
    }

    // 2. Generate Personal Fit Score (if not already present)
    if (requiredSteps.includes('fit_score')) {
      try {
        if (!quiet) console.log('  💯 Generating Personal Fit Score...');
        analysis.personalFitScore = await this.aiService.generatePersonalFitScore(
          vehicle,
          this.userCriteria
        );
        if (!quiet) console.log(`  ✓ Personal Fit Score: ${analysis.personalFitScore}/10`);
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
    } else if (!quiet) {
      console.log('  ⏭️  Skipping fit score (already complete)');
    }

    // 3. Generate Virtual Mechanic's Summary (concise 3-5 bullet points)
    if (requiredSteps.includes('mechanic_report') && !options.skipMechanicReport) {
      try {
        if (!quiet) console.log('  🔧 Generating Virtual Mechanic\'s Summary...');
        analysis.virtualMechanicSummary = await this.aiService.generateMechanicSummary(vehicle);
        if (!quiet) console.log('  ✓ Mechanic Summary complete');
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate mechanic summary:', err.message);

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
    } else if (!options.skipMechanicReport && !quiet) {
      console.log('  ⏭️  Skipping mechanic summary (already complete)');
    }

    // 3b. Optionally generate Full Detailed Mechanic Report (if --include-full-report flag)
    if (options.includeFullReport && !options.skipMechanicReport && !vehicle.aiMechanicReport) {
      try {
        if (!quiet) console.log('  📋 Generating Full Detailed Mechanic Report...');
        analysis.aiMechanicReport = await this.aiService.generateMechanicReport(vehicle);
        if (!quiet) console.log('  ✓ Full Mechanic Report complete');
      } catch (error) {
        const err = error as Error;
        console.error('  ❌ Failed to generate full mechanic report:', err.message);

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

        // Don't re-throw - full report is optional, continue with other steps
        if (!quiet) console.log('  ⚠️  Continuing without full report...');
      }
    }

    // 4. Calculate Market Value Score (before Priority Rating so AI can use it)
    if (requiredSteps.includes('market_value')) {
      try {
        if (!quiet) console.log('  💰 Calculating Market Value Score...');
        const marketValue = await this.marketValueService.calculateMarketValue(vehicle);
        if (marketValue !== null) {
          analysis.marketValueScore = marketValue;
          if (!quiet) console.log(`  ✓ Market Value: ${marketValue}`);
        } else {
          if (!quiet) console.log('  ⚠️  Market Value: No comparables found (insufficient data)');
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
    } else if (!quiet) {
      console.log('  ⏭️  Skipping market value (already complete)');
    }

    // 5. Generate Priority Rating (should be last since it uses other scores)
    if (requiredSteps.includes('priority_rating') && !options.skipPriorityRating) {
      try {
        if (!quiet) console.log('  ⭐ Generating Priority Rating...');
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
        if (!quiet) console.log(`  ✓ Priority Rating: ${analysis.aiPriorityRating}/10`);
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
    } else if (!options.skipPriorityRating && !quiet) {
      console.log('  ⏭️  Skipping priority rating (already complete)');
    }

    // Save analysis to database
    if (Object.keys(analysis).length > 0) {
      if (!quiet) console.log('  💾 Saving analysis to database...');
      await this.vehicleRepository.updateVehicleAnalysis(vehicle.id, analysis);
      if (!quiet) console.log('  ✓ Saved successfully');

      // Mark vehicle as completed in run log
      this.runLog.vehiclesCompleted++;

      // Update status from 'new' to 'processed' after successful analysis
      // Only update if current status is 'new' (don't overwrite user changes)
      if (vehicle.status === 'new' && analysis.aiPriorityRating !== undefined) {
        await this.vehicleRepository.updateVehicle(vehicle.id, { status: 'processed' });
        if (!quiet) console.log('  ✓ Status updated to "processed"');
      }
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

    // Calculate throughput
    const vehiclesPerHour = duration > 0 ? (this.stats.analyzed / duration) * 3600 : 0;
    const totalApiCalls = this.stats.analyzed * 4; // 4 API calls per vehicle (sanity, fit, mechanic, priority)
    const averageRPM = duration > 0 ? (totalApiCalls / (duration / 60)) : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Analysis Summary');
    console.log('='.repeat(60));
    console.log(`Run ID:            ${this.runLog.runId}`);
    console.log(`Concurrency:       ${this.runLog.concurrency} vehicles/batch`);
    console.log(`Total Vehicles:    ${this.stats.totalVehicles}`);
    console.log(`✅ Completed:      ${this.runLog.vehiclesCompleted}`);
    console.log(`❌ Failed:         ${this.runLog.vehiclesFailed}`);
    console.log(`⏭️  Skipped:        ${this.stats.skipped}`);
    console.log(`⏱️  Duration:       ${duration.toFixed(2)}s (${(duration / 60).toFixed(1)} min)`);
    console.log(`⚡ Throughput:      ${vehiclesPerHour.toFixed(1)} vehicles/hour`);
    console.log(`📞 API Calls:       ${totalApiCalls} total, ${averageRPM.toFixed(1)} RPM average`);

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
  const options: AnalysisOptions = {
    resume: true, // Default to enabled
    concurrency: 3, // Default concurrency level
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--vehicle-id' && i + 1 < args.length) {
      options.vehicleId = args[i + 1];
      i++;
    } else if (arg === '--limit' && i + 1 < args.length) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--concurrency' && i + 1 < args.length) {
      const concurrency = parseInt(args[i + 1], 10);

      // Validate concurrency value
      if (isNaN(concurrency) || concurrency < 1) {
        console.error('❌ Invalid --concurrency value. Must be a positive integer (>= 1).');
        process.exit(1);
      }

      if (concurrency > 5) {
        console.error('❌ Invalid --concurrency value. Maximum is 5 to respect rate limits.');
        process.exit(1);
      }

      if (concurrency > 4) {
        console.warn('⚠️  Warning: Concurrency > 4 may exceed 15 RPM rate limit.');
        console.warn('   Recommended concurrency: 3-4 for optimal performance.');
      }

      options.concurrency = concurrency;
      i++;
    } else if (arg === '--skip-mechanic-report') {
      options.skipMechanicReport = true;
    } else if (arg === '--include-full-report') {
      options.includeFullReport = true;
    } else if (arg === '--skip-sanity-check') {
      options.skipSanityCheck = true;
    } else if (arg === '--skip-priority-rating') {
      options.skipPriorityRating = true;
    } else if (arg === '--resume') {
      options.resume = true;
    } else if (arg === '--no-resume') {
      options.resume = false;
    } else if (arg === '--force') {
      options.force = true;
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

  // Auto-adjust concurrency for single vehicle analysis
  if (options.vehicleId) {
    options.concurrency = 1;
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Vehicle Analysis Script

IMPORTANT: Vehicles must be translated first using 'pnpm translate' before running analysis.

Workflow:
  1. pnpm translate         # Translate vehicle content (Polish → English)
  2. pnpm analyze           # Run AI analysis on translated vehicles

Usage:
  pnpm analyze                                                   # Analyze all vehicles needing analysis (resume-aware)
  pnpm analyze --vehicle-id <id>                                 # Analyze specific vehicle
  pnpm analyze --limit 10                                        # Analyze only first 10 vehicles
  pnpm analyze --concurrency 4                                   # Set concurrent processing level (default: 3)
  pnpm analyze --force                                           # Force re-analysis of all steps
  pnpm analyze --include-full-report                             # Generate both summary AND full detailed report
  pnpm analyze --skip-mechanic-report                            # Skip ALL mechanic reports (summary + full)
  pnpm analyze --skip-sanity-check                               # Skip sanity check generation
  pnpm analyze --skip-priority-rating                            # Skip priority rating generation
  pnpm analyze --show-logs                                       # List available analysis run logs
  pnpm analyze --help                                            # Show this help message

Flags:
  --concurrency <n>          Number of vehicles to process concurrently (1-5, default: 3)
                             Recommended: 3-4 for optimal performance within 15 RPM rate limit
  --force                    Re-analyze all steps even if already complete
  --include-full-report      Generate BOTH concise summary AND full detailed mechanic report
                             (by default, only concise 3-5 bullet point summary is generated)

Environment Variables:
  GEMINI_API_KEY       Required. Your Gemini API key for AI analysis
  DATABASE_PATH        Optional. Path to database file (default: <root>/data/vehicles.db)

Examples:
  pnpm analyze                                                   # Analyze all translated vehicles (concurrency: 3)
  pnpm analyze --limit 5                                         # Analyze first 5 vehicles needing analysis
  pnpm analyze --concurrency 4 --limit 20                        # Analyze 20 vehicles with concurrency of 4
  pnpm analyze --concurrency 1                                   # Sequential processing (original behavior)
  pnpm analyze --vehicle-id abc123                               # Analyze specific vehicle
  pnpm analyze --force --vehicle-id abc123                       # Force re-analyze all steps
  pnpm analyze --show-logs                                       # View previous run logs
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
  isRetryableError,
  getErrorType,
  listAnalysisLogs
};
