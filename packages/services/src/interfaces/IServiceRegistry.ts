/**
 * Service registry interface for dependency injection
 * Provides runtime service binding and resolution capabilities
 */
export type ServiceKey = string | symbol;
export type ServiceFactory<T = any> = () => T | Promise<T>;
export type ServiceInstance<T = any> = T;

export interface ServiceRegistration<T = any> {
  key: ServiceKey;
  factory: ServiceFactory<T>;
  singleton?: boolean;
  instance?: ServiceInstance<T>;
}

export interface IServiceRegistry {
  /**
   * Register a service with the registry
   */
  register<T>(key: ServiceKey, factory: ServiceFactory<T>, options?: { singleton?: boolean }): void;

  /**
   * Register a singleton service instance
   */
  registerSingleton<T>(key: ServiceKey, factory: ServiceFactory<T>): void;

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(key: ServiceKey, factory: ServiceFactory<T>): void;

  /**
   * Resolve a service from the registry
   */
  resolve<T>(key: ServiceKey): T;

  /**
   * Resolve a service asynchronously
   */
  resolveAsync<T>(key: ServiceKey): Promise<T>;

  /**
   * Check if a service is registered
   */
  isRegistered(key: ServiceKey): boolean;

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void;

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): ServiceKey[];
}
