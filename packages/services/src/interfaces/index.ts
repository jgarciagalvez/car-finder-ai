// Service interface contracts
export * from './IScraperService';
export * from './IParserService';
export * from './IVehicleRepository';
export * from './IServiceRegistry';

// Service keys for dependency injection
export const SERVICE_KEYS = {
  SCRAPER_SERVICE: Symbol('ScraperService'),
  PARSER_SERVICE: Symbol('ParserService'),
  VEHICLE_REPOSITORY: Symbol('VehicleRepository'),
} as const;

export type ServiceKeys = typeof SERVICE_KEYS;
