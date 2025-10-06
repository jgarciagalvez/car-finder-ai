// Main exports for the database package
export { DatabaseService } from './database';
export { VehicleRepository } from './repositories/vehicleRepository';
export * from './schema';

// Re-export types for convenience
export type { Vehicle as VehicleType } from '@car-finder/types';
