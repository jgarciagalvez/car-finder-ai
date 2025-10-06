import { IScraperService, IParserService, IVehicleRepository, SERVICE_KEYS } from '../interfaces';
import { getGlobalRegistry } from './index';

/**
 * Service factory for creating and configuring services
 * Provides environment-specific service creation patterns
 */
export class ServiceFactory {
  /**
   * Create a scraper service instance
   */
  static createScraperService(): IScraperService {
    const registry = getGlobalRegistry();
    return registry.resolve<IScraperService>(SERVICE_KEYS.SCRAPER_SERVICE);
  }

  /**
   * Create a parser service instance
   */
  static createParserService(): IParserService {
    const registry = getGlobalRegistry();
    return registry.resolve<IParserService>(SERVICE_KEYS.PARSER_SERVICE);
  }

  /**
   * Create a vehicle repository instance
   */
  static createVehicleRepository(): IVehicleRepository {
    const registry = getGlobalRegistry();
    return registry.resolve<IVehicleRepository>(SERVICE_KEYS.VEHICLE_REPOSITORY);
  }

  /**
   * Create all services for production environment
   */
  static async createProductionServices(): Promise<{
    scraperService: IScraperService;
    parserService: IParserService;
    vehicleRepository: IVehicleRepository;
  }> {
    const registry = getGlobalRegistry();
    
    return {
      scraperService: await registry.resolveAsync<IScraperService>(SERVICE_KEYS.SCRAPER_SERVICE),
      parserService: registry.resolve<IParserService>(SERVICE_KEYS.PARSER_SERVICE),
      vehicleRepository: registry.resolve<IVehicleRepository>(SERVICE_KEYS.VEHICLE_REPOSITORY),
    };
  }

  /**
   * Create all services for testing environment
   */
  static createTestServices(): {
    scraperService: IScraperService;
    parserService: IParserService;
    vehicleRepository: IVehicleRepository;
  } {
    const registry = getGlobalRegistry();
    
    return {
      scraperService: registry.resolve<IScraperService>(SERVICE_KEYS.SCRAPER_SERVICE),
      parserService: registry.resolve<IParserService>(SERVICE_KEYS.PARSER_SERVICE),
      vehicleRepository: registry.resolve<IVehicleRepository>(SERVICE_KEYS.VEHICLE_REPOSITORY),
    };
  }
}
