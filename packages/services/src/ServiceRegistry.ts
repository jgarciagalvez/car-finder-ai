import { IScraperService, IParserService, IVehicleRepository, SERVICE_KEYS } from './interfaces';
import { getGlobalRegistry } from './registry';
import { ServiceAdapter } from './registry/ServiceAdapter';

/**
 * Static service registry wrapper for easy access to services
 * Provides convenient static methods for service resolution
 */
export class ServiceRegistry {
  private static initialized = false;

  /**
   * Initialize services if not already done
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      ServiceAdapter.autoRegisterServices();
      this.initialized = true;
    }
  }

  /**
   * Get scraper service instance
   */
  static async getScraperService(): Promise<IScraperService> {
    this.ensureInitialized();
    const registry = getGlobalRegistry();
    return await registry.resolveAsync<IScraperService>(SERVICE_KEYS.SCRAPER_SERVICE);
  }

  /**
   * Get parser service instance
   */
  static getParserService(): IParserService {
    this.ensureInitialized();
    const registry = getGlobalRegistry();
    return registry.resolve<IParserService>(SERVICE_KEYS.PARSER_SERVICE);
  }

  /**
   * Get vehicle repository instance
   */
  static async getVehicleRepository(): Promise<IVehicleRepository> {
    this.ensureInitialized();
    const registry = getGlobalRegistry();
    return await registry.resolveAsync<IVehicleRepository>(SERVICE_KEYS.VEHICLE_REPOSITORY);
  }

  /**
   * Reset initialization state (useful for testing)
   */
  static reset(): void {
    this.initialized = false;
  }
}
