#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { ServiceRegistry, IScraperService, IParserService, IVehicleRepository, WorkspaceUtils } from '@car-finder/services';
import { SearchResult, ParseResult } from '../../../apps/api/src/services/ParserService';
import { Vehicle, VehicleSource } from '@car-finder/types';
import { v4 as uuidv4 } from 'uuid';

// Configuration interfaces
interface SearchConfig {
  name: string;
  url: string;
  description: string;
}

interface IngestionConfig {
  searchUrls: {
    otomoto: SearchConfig[];
    olx: SearchConfig[];
  };
  ingestionSettings: {
    maxPagesPerSearch: number;
    delayBetweenRequests: { min: number; max: number };
    retryAttempts: number;
    batchSize: number;
    enableDeduplication: boolean;
  };
  currencyConversion: {
    plnToEurRate: number;
    lastUpdated: string;
  };
}

interface IngestionStats {
  totalSearchUrls: number;
  totalVehicleUrls: number;
  newVehicles: number;
  duplicateVehicles: number;
  failedScrapes: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
}

export class IngestionPipeline {
  private scraperService: IScraperService;
  private parserService: IParserService;
  private vehicleRepository: IVehicleRepository;
  private config: IngestionConfig;
  private stats: IngestionStats;
  private processedUrls: Set<string> = new Set();

  constructor() {
    // Services will be initialized in run() method using ServiceRegistry
    this.config = this.loadConfiguration();
    this.stats = {
      totalSearchUrls: 0,
      totalVehicleUrls: 0,
      newVehicles: 0,
      duplicateVehicles: 0,
      failedScrapes: 0,
      errors: [],
      startTime: new Date()
    };
  }

  /**
   * Load and validate search configuration from JSON file
   */
  private loadConfiguration(): IngestionConfig {
    const configPath = WorkspaceUtils.resolveConfigFile('search-config.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    try {
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as IngestionConfig;
      
      // Basic validation
      if (!config.searchUrls || !config.ingestionSettings) {
        throw new Error('Invalid configuration: missing required sections');
      }

      console.log(`✅ Configuration loaded: ${config.searchUrls.otomoto.length + config.searchUrls.olx.length} search URLs`);
      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract individual vehicle URLs from search results
   */
  private async scrapeSearchResults(searchUrl: string, source: VehicleSource): Promise<string[]> {
    const vehicleUrls: string[] = [];
    let currentPage = 1;
    const maxPages = this.config.ingestionSettings.maxPagesPerSearch;

    console.log(`🔍 Scraping search results from ${source}: ${searchUrl}`);

    while (currentPage <= maxPages) {
      try {
        const pageUrl = currentPage === 1 ? searchUrl : `${searchUrl}&page=${currentPage}`;
        console.log(`  📄 Processing page ${currentPage}/${maxPages}`);

        const scrapeResult = await this.scraperService.scrapeUrl(pageUrl);
        const parseResult = await this.parserService.parseHtml(scrapeResult.html, source, 'search');

        if (parseResult.pageType !== 'search') {
          console.log(`  ⚠️  Expected search page but got ${parseResult.pageType}, stopping pagination`);
          break;
        }

        const searchResults = parseResult.data as SearchResult[];
        if (searchResults.length === 0) {
          console.log(`  ℹ️  No more results found on page ${currentPage}, stopping pagination`);
          break;
        }

        // Extract URLs and add to collection
        const pageUrls = searchResults.map(result => result.sourceUrl);
        vehicleUrls.push(...pageUrls);
        
        console.log(`  ✅ Found ${pageUrls.length} vehicle URLs on page ${currentPage}`);

        // Respectful delay between pages
        await this.delay(
          this.config.ingestionSettings.delayBetweenRequests.min,
          this.config.ingestionSettings.delayBetweenRequests.max
        );

        currentPage++;
      } catch (error) {
        console.error(`  ❌ Error scraping page ${currentPage}:`, error instanceof Error ? error.message : 'Unknown error');
        this.stats.errors.push(`Search page ${currentPage} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        break;
      }
    }

    console.log(`✅ Search completed: ${vehicleUrls.length} vehicle URLs found`);
    return vehicleUrls;
  }

  /**
   * Process individual vehicle URLs and save to database
   */
  private async processVehicleUrls(vehicleUrls: string[], source: VehicleSource): Promise<void> {
    console.log(`🚗 Processing ${vehicleUrls.length} vehicle URLs from ${source}`);
    
    const batchSize = this.config.ingestionSettings.batchSize;
    
    for (let i = 0; i < vehicleUrls.length; i += batchSize) {
      const batch = vehicleUrls.slice(i, i + batchSize);
      console.log(`  📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vehicleUrls.length / batchSize)} (${batch.length} URLs)`);

      await Promise.all(batch.map(url => this.processVehicleUrl(url, source)));

      // Delay between batches
      if (i + batchSize < vehicleUrls.length) {
        await this.delay(
          this.config.ingestionSettings.delayBetweenRequests.min,
          this.config.ingestionSettings.delayBetweenRequests.max
        );
      }
    }
  }

  /**
   * Process a single vehicle URL
   */
  private async processVehicleUrl(url: string, source: VehicleSource): Promise<void> {
    // Check for duplicates if deduplication is enabled
    if (this.config.ingestionSettings.enableDeduplication) {
      if (this.processedUrls.has(url)) {
        this.stats.duplicateVehicles++;
        return;
      }

      // Check if vehicle already exists in database
      try {
        const existingVehicle = await this.vehicleRepository.findVehicleByUrl(url);
        if (existingVehicle) {
          console.log(`  ⏭️  Vehicle already exists: ${url}`);
          this.stats.duplicateVehicles++;
          this.processedUrls.add(url);
          return;
        }
      } catch (error) {
        console.error(`  ⚠️  Error checking for existing vehicle: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    let retryCount = 0;
    const maxRetries = this.config.ingestionSettings.retryAttempts;

    while (retryCount <= maxRetries) {
      try {
        console.log(`  🔍 Scraping vehicle: ${url} (attempt ${retryCount + 1})`);

        // Scrape vehicle detail page
        const scrapeResult = await this.scraperService.scrapeUrl(url);
        const parseResult = await this.parserService.parseHtml(scrapeResult.html, source, 'detail');

        if (parseResult.pageType !== 'detail') {
          throw new Error(`Expected detail page but got ${parseResult.pageType}`);
        }

        // Transform parsed data to Vehicle interface
        const vehicleData = parseResult.data as Partial<Vehicle>;
        const vehicle = this.transformToVehicle(vehicleData, url, source);

        // Save to database
        await this.vehicleRepository.insertVehicle(vehicle);

        console.log(`  ✅ Vehicle saved: ${vehicle.title} (${vehicle.year}, ${vehicle.pricePln} PLN)`);
        this.stats.newVehicles++;
        this.processedUrls.add(url);
        return;

      } catch (error) {
        retryCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (retryCount > maxRetries) {
          console.error(`  ❌ Failed to process vehicle after ${maxRetries} retries: ${url} - ${errorMessage}`);
          this.stats.failedScrapes++;
          this.stats.errors.push(`Vehicle processing failed: ${url} - ${errorMessage}`);
          return;
        } else {
          console.log(`  ⚠️  Retry ${retryCount}/${maxRetries} for ${url}: ${errorMessage}`);
          await this.delay(1000, 2000); // Short delay before retry
        }
      }
    }
  }

  /**
   * Transform parsed vehicle data to complete Vehicle interface
   */
  private transformToVehicle(vehicleData: Partial<Vehicle>, url: string, source: VehicleSource): Vehicle {
    const now = new Date();
    
    // Convert PLN to EUR using configured rate
    const pricePln = vehicleData.pricePln || 0;
    const priceEur = Math.round(pricePln * this.config.currencyConversion.plnToEurRate);

    return {
      // Generate unique ID
      id: uuidv4(),
      source,
      sourceId: vehicleData.sourceId || this.extractIdFromUrl(url, source),
      sourceUrl: url,
      sourceCreatedAt: vehicleData.sourceCreatedAt || now,

      // Raw scraped data
      sourceTitle: vehicleData.sourceTitle || '',
      sourceDescriptionHtml: vehicleData.sourceDescriptionHtml || '',
      sourceParameters: vehicleData.sourceParameters || {},
      sourceEquipment: vehicleData.sourceEquipment || {},
      sourcePhotos: vehicleData.sourcePhotos || [],

      // Processed & normalized data
      title: vehicleData.title || vehicleData.sourceTitle || 'Unknown Vehicle',
      description: vehicleData.description || '',
      features: vehicleData.features || [],
      pricePln,
      priceEur,
      year: vehicleData.year || 0,
      mileage: vehicleData.mileage || 0,
      sellerInfo: vehicleData.sellerInfo || {
        name: null,
        id: null,
        type: null,
        location: null,
        memberSince: null
      },
      photos: vehicleData.photos || [],

      // AI generated data (initially null)
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      aiDataSanityCheck: null,

      // User workflow data
      status: 'new',
      personalNotes: null,

      // Timestamps
      scrapedAt: now,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Extract vehicle ID from URL for different sources
   */
  private extractIdFromUrl(url: string, source: VehicleSource): string {
    try {
      if (source === 'otomoto') {
        // Otomoto URLs typically end with ID like: /ID12345678.html
        const match = url.match(/ID(\d+)\.html/);
        return match ? match[1] : url.split('/').pop() || url;
      } else if (source === 'olx') {
        // OLX URLs typically have ID in path like: /oferta/some-title-ID123456789
        const match = url.match(/ID(\d+)/);
        return match ? match[1] : url.split('/').pop() || url;
      }
    } catch (error) {
      console.warn(`Could not extract ID from URL: ${url}`);
    }
    
    return url.split('/').pop() || url;
  }

  /**
   * Random delay between min and max milliseconds
   */
  private async delay(min: number, max: number): Promise<void> {
    const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Deduplicate URLs across all sources
   */
  private deduplicateUrls(allUrls: { url: string; source: VehicleSource }[]): { url: string; source: VehicleSource }[] {
    if (!this.config.ingestionSettings.enableDeduplication) {
      return allUrls;
    }

    const seen = new Set<string>();
    const deduplicated = allUrls.filter(item => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });

    const duplicatesRemoved = allUrls.length - deduplicated.length;
    if (duplicatesRemoved > 0) {
      console.log(`🔄 Removed ${duplicatesRemoved} duplicate URLs across sources`);
    }

    return deduplicated;
  }

  /**
   * Generate and display ingestion summary report
   */
  private generateReport(): void {
    this.stats.endTime = new Date();
    const duration = this.stats.endTime.getTime() - this.stats.startTime.getTime();
    const durationMinutes = Math.round(duration / 60000);

    console.log('\n' + '='.repeat(60));
    console.log('📊 INGESTION SUMMARY REPORT');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${durationMinutes} minutes`);
    console.log(`🔍 Search URLs processed: ${this.stats.totalSearchUrls}`);
    console.log(`🔗 Vehicle URLs found: ${this.stats.totalVehicleUrls}`);
    console.log(`✅ New vehicles saved: ${this.stats.newVehicles}`);
    console.log(`⏭️  Duplicate vehicles skipped: ${this.stats.duplicateVehicles}`);
    console.log(`❌ Failed scrapes: ${this.stats.failedScrapes}`);
    console.log(`⚠️  Total errors: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n🚨 ERRORS ENCOUNTERED:');
      this.stats.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (this.stats.errors.length > 10) {
        console.log(`  ... and ${this.stats.errors.length - 10} more errors`);
      }
    }

    console.log('='.repeat(60));
  }

  /**
   * Main ingestion pipeline execution
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Starting Car Finder AI Data Ingestion Pipeline');
      console.log(`📅 Started at: ${this.stats.startTime.toISOString()}`);

      // Initialize services using ServiceRegistry
      this.scraperService = ServiceRegistry.getScraperService();
      this.parserService = ServiceRegistry.getParserService();
      this.vehicleRepository = await ServiceRegistry.getVehicleRepository();

      // Collect all vehicle URLs from all search configurations
      const allVehicleUrls: { url: string; source: VehicleSource }[] = [];

      // Process Otomoto search URLs
      for (const searchConfig of this.config.searchUrls.otomoto) {
        console.log(`\n🔍 Processing Otomoto search: ${searchConfig.name}`);
        const urls = await this.scrapeSearchResults(searchConfig.url, 'otomoto');
        allVehicleUrls.push(...urls.map(url => ({ url, source: 'otomoto' as VehicleSource })));
        this.stats.totalSearchUrls++;
      }

      // Process OLX search URLs
      for (const searchConfig of this.config.searchUrls.olx) {
        console.log(`\n🔍 Processing OLX search: ${searchConfig.name}`);
        const urls = await this.scrapeSearchResults(searchConfig.url, 'olx');
        allVehicleUrls.push(...urls.map(url => ({ url, source: 'olx' as VehicleSource })));
        this.stats.totalSearchUrls++;
      }

      // Deduplicate URLs across sources
      const deduplicatedUrls = this.deduplicateUrls(allVehicleUrls);
      this.stats.totalVehicleUrls = deduplicatedUrls.length;

      console.log(`\n📊 Found ${this.stats.totalVehicleUrls} unique vehicle URLs across all sources`);

      // Group URLs by source for processing
      const otomotoUrls = deduplicatedUrls.filter(item => item.source === 'otomoto').map(item => item.url);
      const olxUrls = deduplicatedUrls.filter(item => item.source === 'olx').map(item => item.url);

      // Process vehicle URLs by source
      if (otomotoUrls.length > 0) {
        console.log(`\n🚗 Processing ${otomotoUrls.length} Otomoto vehicles`);
        await this.processVehicleUrls(otomotoUrls, 'otomoto');
      }

      if (olxUrls.length > 0) {
        console.log(`\n🚗 Processing ${olxUrls.length} OLX vehicles`);
        await this.processVehicleUrls(olxUrls, 'olx');
      }

      console.log('\n✅ Ingestion pipeline completed successfully');

    } catch (error) {
      console.error('\n❌ Ingestion pipeline failed:', error instanceof Error ? error.message : 'Unknown error');
      this.stats.errors.push(`Pipeline failure: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Cleanup resources
      await this.scraperService.close();
      this.generateReport();
    }
  }
}

// CLI execution
if (require.main === module) {
  const pipeline = new IngestionPipeline();
  pipeline.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default IngestionPipeline;
