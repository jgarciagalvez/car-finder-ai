import { IScraperService, IParserService, IVehicleRepository, SERVICE_KEYS } from '../interfaces';
import { getGlobalRegistry } from './index';
import { WorkspaceUtils } from '../utils/WorkspaceUtils';
import * as path from 'path';

/**
 * Service adapter for runtime service binding
 * Provides adapter pattern implementation for different service implementations
 */
export class ServiceAdapter {
  /**
   * Register production services with the global registry
   */
  static registerProductionServices(): void {
    const registry = getGlobalRegistry();

    // Register ScraperService with async browser initialization
    registry.registerSingleton(SERVICE_KEYS.SCRAPER_SERVICE, async () => {
      // Dynamic import to avoid circular dependency
      const scraperPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'apps/api/src/services/ScraperService');
      const { ScraperService } = require(scraperPath);
      
      // Initialize browser with proper async handling
      const scraperService = new ScraperService();
      await scraperService.initialize();
      
      return scraperService;
    });

    // Register ParserService
    registry.registerSingleton(SERVICE_KEYS.PARSER_SERVICE, () => {
      const parserPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'apps/api/src/services/ParserService');
      const { ParserService } = require(parserPath);
      return new ParserService();
    });

    // Register VehicleRepository with async database initialization
    registry.registerSingleton(SERVICE_KEYS.VEHICLE_REPOSITORY, async () => {
      const dbPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'packages/db/src/database');
      const repoPath = path.join(WorkspaceUtils.findWorkspaceRoot(), 'packages/db/src/repositories/vehicleRepository');
      const { DatabaseService } = require(dbPath);
      const { VehicleRepository } = require(repoPath);
      
      // Initialize database with proper async handling
      const database = new DatabaseService();
      await database.initialize();

      return new VehicleRepository(database.getDatabase());
    });
  }

  /**
   * Register test/mock services with the global registry
   */
  static registerTestServices(): void {
    const registry = getGlobalRegistry();

    // Register mock services (will be implemented in next task)
    registry.registerTransient(SERVICE_KEYS.SCRAPER_SERVICE, () => {
      const { MockScraperService } = require('../mocks/MockScraperService');
      return new MockScraperService();
    });

    registry.registerTransient(SERVICE_KEYS.PARSER_SERVICE, () => {
      const { MockParserService } = require('../mocks/MockParserService');
      return new MockParserService();
    });

    registry.registerTransient(SERVICE_KEYS.VEHICLE_REPOSITORY, () => {
      const { MockVehicleRepository } = require('../mocks/MockVehicleRepository');
      return new MockVehicleRepository();
    });
  }

  /**
   * Register custom service implementations
   */
  static registerCustomServices(services: {
    scraperService?: () => IScraperService;
    parserService?: () => IParserService;
    vehicleRepository?: () => IVehicleRepository;
  }): void {
    const registry = getGlobalRegistry();

    if (services.scraperService) {
      registry.register(SERVICE_KEYS.SCRAPER_SERVICE, services.scraperService);
    }

    if (services.parserService) {
      registry.register(SERVICE_KEYS.PARSER_SERVICE, services.parserService);
    }

    if (services.vehicleRepository) {
      registry.register(SERVICE_KEYS.VEHICLE_REPOSITORY, services.vehicleRepository);
    }
  }

  /**
   * Get the current environment and register appropriate services
   */
  static autoRegisterServices(): void {
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    
    if (isTest) {
      this.registerTestServices();
    } else {
      this.registerProductionServices();
    }
  }
}
