export * from './ServiceRegistry';

// Global service registry instance
import { ServiceRegistry } from './ServiceRegistry';

let globalRegistry: ServiceRegistry | null = null;

/**
 * Get the global service registry instance
 * Creates one if it doesn't exist
 */
export function getGlobalRegistry(): ServiceRegistry {
  if (!globalRegistry) {
    globalRegistry = new ServiceRegistry();
  }
  return globalRegistry;
}

/**
 * Set a custom global registry (useful for testing)
 */
export function setGlobalRegistry(registry: ServiceRegistry): void {
  globalRegistry = registry;
}

/**
 * Clear the global registry (useful for testing)
 */
export function clearGlobalRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
