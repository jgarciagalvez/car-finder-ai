import { ServiceRegistry } from '../src/registry/ServiceRegistry';
import { SERVICE_KEYS } from '../src/interfaces';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  describe('Basic Registration and Resolution', () => {
    it('should register and resolve a simple service', () => {
      const mockService = { name: 'test-service' };
      registry.register('test-key', () => mockService);

      const resolved = registry.resolve('test-key');
      expect(resolved).toBe(mockService);
    });

    it('should register and resolve a singleton service', () => {
      let instanceCount = 0;
      const factory = () => ({ id: ++instanceCount });

      registry.registerSingleton('singleton-key', factory);

      const instance1 = registry.resolve('singleton-key');
      const instance2 = registry.resolve('singleton-key');

      expect(instance1).toBe(instance2);
      expect(instance1.id).toBe(1);
    });

    it('should register and resolve a transient service', () => {
      let instanceCount = 0;
      const factory = () => ({ id: ++instanceCount });

      registry.registerTransient('transient-key', factory);

      const instance1 = registry.resolve('transient-key');
      const instance2 = registry.resolve('transient-key');

      expect(instance1).not.toBe(instance2);
      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
    });
  });

  describe('Async Resolution', () => {
    it('should resolve async services', async () => {
      const asyncFactory = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { name: 'async-service' };
      };

      registry.register('async-key', asyncFactory);

      const resolved = await registry.resolveAsync('async-key');
      expect(resolved.name).toBe('async-service');
    });

    it('should throw error when using sync resolve on async factory', () => {
      const asyncFactory = async () => ({ name: 'async-service' });
      registry.register('async-key', asyncFactory);

      expect(() => registry.resolve('async-key')).toThrow(
        'Service \'async-key\' factory returns a Promise. Use resolveAsync() instead.'
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unregistered service', () => {
      expect(() => registry.resolve('unknown-key')).toThrow(
        'Service with key \'unknown-key\' is not registered'
      );
    });

    it('should throw error for duplicate registration', () => {
      registry.register('duplicate-key', () => ({}));
      
      expect(() => registry.register('duplicate-key', () => ({}))).toThrow(
        'Service with key \'duplicate-key\' is already registered'
      );
    });
  });

  describe('Registry Management', () => {
    it('should check if service is registered', () => {
      expect(registry.isRegistered('test-key')).toBe(false);
      
      registry.register('test-key', () => ({}));
      
      expect(registry.isRegistered('test-key')).toBe(true);
    });

    it('should get all registered keys', () => {
      registry.register('key1', () => ({}));
      registry.register('key2', () => ({}));

      const keys = registry.getRegisteredKeys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all registrations', () => {
      registry.register('key1', () => ({}));
      registry.register('key2', () => ({}));

      expect(registry.getRegisteredKeys()).toHaveLength(2);

      registry.clear();

      expect(registry.getRegisteredKeys()).toHaveLength(0);
      expect(registry.isRegistered('key1')).toBe(false);
    });

    it('should replace existing service registration', () => {
      const service1 = { name: 'service1' };
      const service2 = { name: 'service2' };

      registry.register('test-key', () => service1);
      expect(registry.resolve('test-key')).toBe(service1);

      registry.replace('test-key', () => service2);
      expect(registry.resolve('test-key')).toBe(service2);
    });
  });

  describe('Service Keys Integration', () => {
    it('should work with predefined service keys', () => {
      const mockScraperService = { scrape: jest.fn() };
      
      registry.register(SERVICE_KEYS.SCRAPER_SERVICE, () => mockScraperService);
      
      const resolved = registry.resolve(SERVICE_KEYS.SCRAPER_SERVICE);
      expect(resolved).toBe(mockScraperService);
    });
  });
});
