import { IScraperService, IParserService, IVehicleRepository, SERVICE_KEYS } from '../interfaces';
import { getGlobalRegistry } from './index';

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

    // Register ScraperService (lazy loading to avoid circular dependencies)
    registry.registerSingleton(SERVICE_KEYS.SCRAPER_SERVICE, () => {
      // Dynamic import to avoid circular dependency
      const { ScraperService } = require('../../../api/src/services/ScraperService');
      return new ScraperService();
    });

    // Register ParserService
    registry.registerSingleton(SERVICE_KEYS.PARSER_SERVICE, () => {
      const { ParserService } = require('../../../api/src/services/ParserService');
      return new ParserService();
    });

    // Register VehicleRepository
    registry.registerSingleton(SERVICE_KEYS.VEHICLE_REPOSITORY, () => {
      const { createDatabase } = require('../../db/src/database');
      const { VehicleRepository } = require('../../db/src/repositories/vehicleRepository');
      const db = createDatabase();
      return new VehicleRepository(db);
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
