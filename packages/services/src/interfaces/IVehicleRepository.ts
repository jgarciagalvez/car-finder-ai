import { Vehicle } from '@car-finder/types';

/**
 * Interface contract for vehicle data repository
 * Abstracts the VehicleRepository implementation for testing and dependency injection
 */
export interface IVehicleRepository {
  /**
   * Insert a new vehicle into the database
   */
  insertVehicle(vehicle: Vehicle): Promise<void>;

  /**
   * Find a vehicle by its source URL (for deduplication)
   */
  findVehicleByUrl(sourceUrl: string): Promise<Vehicle | null>;

  /**
   * Find a vehicle by its ID
   */
  findVehicleById(id: string): Promise<Vehicle | null>;

  /**
   * Update a vehicle's data
   */
  updateVehicle(id: string, updates: Partial<Vehicle>): Promise<void>;

  /**
   * Get all vehicles (for dashboard display)
   */
  getAllVehicles(): Promise<Vehicle[]>;

  /**
   * Get vehicles by status (for filtering)
   */
  getVehiclesByStatus(status: Vehicle['status']): Promise<Vehicle[]>;

  /**
   * Delete a vehicle by ID
   */
  deleteVehicle(id: string): Promise<void>;
}
