import { TestUtils } from '../src/utils/TestUtils';
import { ServiceFactory } from '../src/registry/ServiceFactory';
import { SERVICE_KEYS } from '../src/interfaces';
import { MockVehicleRepository } from '../src/mocks/MockVehicleRepository';

describe('Integration Testing Infrastructure', () => {
  let testEnv: ReturnType<typeof TestUtils.setupTestEnvironment>;

  beforeEach(() => {
    testEnv = TestUtils.setupTestEnvironment();
  });

  afterEach(() => {
    TestUtils.cleanupTestEnvironment();
  });

  describe('End-to-End Service Integration', () => {
    it('should complete a full scraping and parsing workflow', async () => {
      const { scraperService, parserService, vehicleRepository } = testEnv;
      const fixtures = TestUtils.createTestFixtures();

      // Configure services with test data
      TestUtils.configureMockServices(scraperService, parserService, vehicleRepository, fixtures);

      // Initialize scraper
      await scraperService.initialize();

      // Step 1: Scrape a search page
      const searchUrl = fixtures.searchUrls[0];
      const scrapingResult = await scraperService.scrapeUrl(searchUrl);
      
      expect(scrapingResult.statusCode).toBe(200);
      expect(scrapingResult.html).toContain('__NEXT_DATA__');

      // Step 2: Parse the search results
      const parseResult = parserService.parseHtml(scrapingResult.html, 'otomoto', 'search');
      
      expect(parseResult.pageType).toBe('search');
      expect(Array.isArray(parseResult.data)).toBe(true);
      expect((parseResult.data as any[]).length).toBeGreaterThan(0);

      // Step 3: Scrape individual vehicle pages
      const searchResults = parseResult.data as any[];
      const vehicleUrl = searchResults[0].sourceUrl;
      const vehicleScrapingResult = await scraperService.scrapeUrl(vehicleUrl);

      expect(vehicleScrapingResult.statusCode).toBe(200);

      // Step 4: Parse vehicle details
      const vehicleParseResult = parserService.parseHtml(vehicleScrapingResult.html, 'otomoto', 'detail');
      
      expect(vehicleParseResult.pageType).toBe('detail');
      expect(vehicleParseResult.data).toHaveProperty('sourceId');
      expect(vehicleParseResult.data).toHaveProperty('pricePln');

      // Step 5: Store in repository
      const vehicleData = vehicleParseResult.data as any;
      const completeVehicle = {
        ...fixtures.vehicles[0],
        ...vehicleData,
      };

      // Clear existing test data first
      vehicleRepository.clearAll();
      await vehicleRepository.insertVehicle(completeVehicle);

      // Step 6: Verify storage
      const storedVehicle = await vehicleRepository.findVehicleById(completeVehicle.id);
      expect(storedVehicle).toBeTruthy();
      expect(storedVehicle?.sourceUrl).toBe(completeVehicle.sourceUrl);

      await scraperService.close();
    });

    it('should handle error scenarios gracefully', async () => {
      const { scraperService, parserService, vehicleRepository } = testEnv;

      // Configure error scenarios
      TestUtils.configureErrorScenario(scraperService, parserService, vehicleRepository);

      await scraperService.initialize();

      // Test scraper error
      await expect(scraperService.scrapeUrl('https://otomoto.pl/error-url')).rejects.toThrow('Mock scraper error');

      // Test parser error
      expect(() => parserService.parseHtml('<html></html>', 'otomoto')).toThrow('Mock parser error');

      // Test repository error
      const errorVehicle = { sourceUrl: 'error-vehicle' } as any;
      await expect(vehicleRepository.insertVehicle(errorVehicle)).rejects.toThrow('Mock repository error');

      await scraperService.close();
    });
  });

  describe('Service Factory Integration', () => {
    it('should create services using factory methods', () => {
      const scraperService = ServiceFactory.createScraperService();
      const parserService = ServiceFactory.createParserService();
      const vehicleRepository = ServiceFactory.createVehicleRepository();

      expect(scraperService).toBeTruthy();
      expect(parserService).toBeTruthy();
      expect(vehicleRepository).toBeTruthy();

      // Verify they're the same instances (singletons)
      const scraperService2 = ServiceFactory.createScraperService();
      expect(scraperService).toBe(scraperService2);
    });

    it('should create test services bundle', () => {
      const services = ServiceFactory.createTestServices();

      expect(services.scraperService).toBeTruthy();
      expect(services.parserService).toBeTruthy();
      expect(services.vehicleRepository).toBeTruthy();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle multiple concurrent operations', async () => {
      const { scraperService, parserService, vehicleRepository } = testEnv;
      const fixtures = TestUtils.createTestFixtures();

      TestUtils.configureMockServices(scraperService, parserService, vehicleRepository, fixtures);
      await scraperService.initialize();

      // Create multiple concurrent scraping operations
      const urls = fixtures.detailUrls.slice(0, 3);
      const scrapingPromises = urls.map(url => scraperService.scrapeUrl(url));

      const results = await Promise.all(scrapingPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.statusCode).toBe(200);
        expect(result.html).toBeTruthy();
      });

      await scraperService.close();
    });

    it('should handle large datasets efficiently', async () => {
      const { vehicleRepository } = testEnv;
      const performanceData = TestUtils.createPerformanceTestData(100);

      const startTime = Date.now();

      // Insert all vehicles
      for (const vehicleData of performanceData.vehicles) {
        const vehicle = MockVehicleRepository.createTestVehicle(vehicleData);
        await vehicleRepository.insertVehicle(vehicle);
      }

      const insertTime = Date.now() - startTime;

      // Retrieve all vehicles
      const retrieveStartTime = Date.now();
      const allVehicles = await vehicleRepository.getAllVehicles();
      const retrieveTime = Date.now() - retrieveStartTime;

      expect(allVehicles).toHaveLength(100);
      expect(insertTime).toBeLessThan(1000); // Should complete within 1 second
      expect(retrieveTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Cross-Package Module Resolution', () => {
    it('should import services from different packages', () => {
      // This test verifies that Jest module resolution is working correctly
      const { registry } = testEnv;

      expect(registry.isRegistered(SERVICE_KEYS.SCRAPER_SERVICE)).toBe(true);
      expect(registry.isRegistered(SERVICE_KEYS.PARSER_SERVICE)).toBe(true);
      expect(registry.isRegistered(SERVICE_KEYS.VEHICLE_REPOSITORY)).toBe(true);

      // Verify we can resolve services by their keys
      const scraperService = registry.resolve(SERVICE_KEYS.SCRAPER_SERVICE);
      const parserService = registry.resolve(SERVICE_KEYS.PARSER_SERVICE);
      const vehicleRepository = registry.resolve(SERVICE_KEYS.VEHICLE_REPOSITORY);

      expect(scraperService).toBeTruthy();
      expect(parserService).toBeTruthy();
      expect(vehicleRepository).toBeTruthy();
    });
  });
});
