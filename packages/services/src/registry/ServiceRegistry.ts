import {
  IServiceRegistry,
  ServiceKey,
  ServiceFactory,
  ServiceRegistration,
  ServiceInstance
} from '../interfaces/IServiceRegistry';

/**
 * Concrete implementation of service registry with dependency injection
 * Supports singleton and transient service lifetimes
 */
export class ServiceRegistry implements IServiceRegistry {
  private registrations = new Map<ServiceKey, ServiceRegistration>();

  /**
   * Register a service with the registry
   */
  register<T>(
    key: ServiceKey,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    if (this.registrations.has(key)) {
      throw new Error(`Service with key '${String(key)}' is already registered`);
    }

    this.registrations.set(key, {
      key,
      factory,
      singleton: options.singleton ?? false,
    });
  }

  /**
   * Register a singleton service instance
   */
  registerSingleton<T>(key: ServiceKey, factory: ServiceFactory<T>): void {
    this.register(key, factory, { singleton: true });
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(key: ServiceKey, factory: ServiceFactory<T>): void {
    this.register(key, factory, { singleton: false });
  }

  /**
   * Resolve a service from the registry
   */
  resolve<T>(key: ServiceKey): T {
    const registration = this.registrations.get(key);
    if (!registration) {
      throw new Error(`Service with key '${String(key)}' is not registered`);
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    // Create new instance
    const instance = registration.factory();
    
    // Handle async factories
    if (instance instanceof Promise) {
      throw new Error(`Service '${String(key)}' factory returns a Promise. Use resolveAsync() instead.`);
    }

    // Store singleton instance for future use
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance as T;
  }

  /**
   * Resolve a service asynchronously
   */
  async resolveAsync<T>(key: ServiceKey): Promise<T> {
    const registration = this.registrations.get(key);
    if (!registration) {
      throw new Error(`Service with key '${String(key)}' is not registered`);
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance as T;
    }

    // Create new instance (handle both sync and async factories)
    const instance = await registration.factory();

    // Store singleton instance for future use
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance as T;
  }

  /**
   * Check if a service is registered
   */
  isRegistered(key: ServiceKey): boolean {
    return this.registrations.has(key);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.registrations.clear();
  }

  /**
   * Get all registered service keys
   */
  getRegisteredKeys(): ServiceKey[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get registration details for debugging
   */
  getRegistrationInfo(key: ServiceKey): ServiceRegistration | undefined {
    return this.registrations.get(key);
  }

  /**
   * Replace a service registration (useful for testing)
   */
  replace<T>(key: ServiceKey, factory: ServiceFactory<T>, options: { singleton?: boolean } = {}): void {
    if (!this.registrations.has(key)) {
      throw new Error(`Service with key '${String(key)}' is not registered and cannot be replaced`);
    }

    // Clear existing instance if it's a singleton
    const existing = this.registrations.get(key);
    if (existing?.singleton && existing.instance) {
      existing.instance = undefined;
    }

    this.registrations.set(key, {
      key,
      factory,
      singleton: options.singleton ?? false,
    });
  }
}
