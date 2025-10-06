import { MockScraperService } from '../src/mocks/MockScraperService';
import { MockParserService } from '../src/mocks/MockParserService';
import { MockVehicleRepository } from '../src/mocks/MockVehicleRepository';
import { TestUtils } from '../src/utils/TestUtils';
import { SERVICE_KEYS } from '../src/interfaces';

describe('Mock Services', () => {
  describe('MockScraperService', () => {
    let scraperService: MockScraperService;

    beforeEach(() => {
      scraperService = new MockScraperService();
    });

    afterEach(() => {
      scraperService.reset();
    });

    it('should initialize and close browser', async () => {
      expect(scraperService.getBrowserStats().isInitialized).toBe(false);

      await scraperService.initialize();
      expect(scraperService.getBrowserStats().isInitialized).toBe(true);

      await scraperService.close();
      expect(scraperService.getBrowserStats().isInitialized).toBe(false);
    });

    it('should scrape URLs with default mock response', async () => {
      await scraperService.initialize();

      const result = await scraperService.scrapeUrl('https://example.com');

      expect(result.html).toContain('Mock HTML Content');
      expect(result.finalUrl).toBe('https://example.com');
      expect(result.statusCode).toBe(200);
      expect(result.scrapingTime).toBeGreaterThanOrEqual(0);
    });

    it('should use configured mock responses', async () => {
      await scraperService.initialize();

      const customResponse = {
        html: '<html><body>Custom Response</body></html>',
        statusCode: 201,
      };

      scraperService.setMockResponse('https://test.com', customResponse);

      const result = await scraperService.scrapeUrl('https://test.com');

      expect(result.html).toBe(customResponse.html);
      expect(result.statusCode).toBe(201);
    });

    it('should throw configured mock errors', async () => {
      await scraperService.initialize();

      const mockError = new Error('Test error');
      scraperService.setMockError('https://error.com', mockError);

      await expect(scraperService.scrapeUrl('https://error.com')).rejects.toThrow('Test error');
    });

    it('should generate Otomoto mock HTML', async () => {
      await scraperService.initialize();

      const result = await scraperService.scrapeUrl('https://otomoto.pl/test');

      expect(result.html).toContain('__NEXT_DATA__');
      expect(result.html).toContain('Mock Otomoto');
    });
  });

  describe('MockParserService', () => {
    let parserService: MockParserService;

    beforeEach(() => {
      parserService = new MockParserService();
    });

    afterEach(() => {
      parserService.clearMocks();
    });

    it('should parse HTML and return mock search results', () => {
      const html = '<html><body>Search page</body></html>';
      
      const result = parserService.parseHtml(html, 'otomoto', 'search');

      expect(result.pageType).toBe('search');
      expect(Array.isArray(result.data)).toBe(true);
      expect((result.data as any[]).length).toBeGreaterThan(0);
    });

    it('should parse HTML and return mock vehicle data', () => {
      const html = '<html><body>Detail page</body></html>';
      
      const result = parserService.parseHtml(html, 'otomoto', 'detail');

      expect(result.pageType).toBe('detail');
      expect(result.data).toHaveProperty('sourceId');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('pricePln');
    });

    it('should use configured mock results', () => {
      const customResult = {
        pageType: 'detail' as const,
        data: { customField: 'customValue' },
      };

      parserService.setMockParseResult('test-site', 'detail', customResult);

      const result = parserService.parseHtml('<html></html>', 'test-site', 'detail');

      expect(result).toEqual(customResult);
    });

    it('should throw configured mock errors', () => {
      const mockError = new Error('Parser error');
      parserService.setMockError('error-site', 'auto', mockError);

      expect(() => parserService.parseHtml('<html></html>', 'error-site')).toThrow('Parser error');
    });

    it('should reload schema', () => {
      expect(parserService.wasSchemaReloaded()).toBe(false);
      
      parserService.reloadSchema();
      
      expect(parserService.wasSchemaReloaded()).toBe(true);
    });
  });

  describe('MockVehicleRepository', () => {
    let repository: MockVehicleRepository;

    beforeEach(() => {
      repository = new MockVehicleRepository();
    });

    afterEach(() => {
      repository.clearAll();
    });

    it('should insert and find vehicles', async () => {
      const vehicle = MockVehicleRepository.createTestVehicle();

      await repository.insertVehicle(vehicle);

      const found = await repository.findVehicleById(vehicle.id);
      expect(found).toMatchObject({
        ...vehicle,
        updatedAt: expect.any(Date),
      });

      const foundByUrl = await repository.findVehicleByUrl(vehicle.sourceUrl);
      expect(foundByUrl).toMatchObject({
        ...vehicle,
        updatedAt: expect.any(Date),
      });
    });

    it('should update vehicles', async () => {
      const vehicle = MockVehicleRepository.createTestVehicle();
      await repository.insertVehicle(vehicle);

      await repository.updateVehicle(vehicle.id, { status: 'contacted' });

      const updated = await repository.findVehicleById(vehicle.id);
      expect(updated?.status).toBe('contacted');
    });

    it('should get all vehicles', async () => {
      const vehicle1 = MockVehicleRepository.createTestVehicle({ 
        id: 'test-1', 
        sourceUrl: 'https://otomoto.pl/test-vehicle-1' 
      });
      const vehicle2 = MockVehicleRepository.createTestVehicle({ 
        id: 'test-2', 
        sourceUrl: 'https://otomoto.pl/test-vehicle-2' 
      });

      await repository.insertVehicle(vehicle1);
      await repository.insertVehicle(vehicle2);

      const allVehicles = await repository.getAllVehicles();
      expect(allVehicles).toHaveLength(2);
    });

    it('should get vehicles by status', async () => {
      const vehicle1 = MockVehicleRepository.createTestVehicle({ 
        id: 'test-1', 
        status: 'new',
        sourceUrl: 'https://otomoto.pl/test-vehicle-status-1' 
      });
      const vehicle2 = MockVehicleRepository.createTestVehicle({ 
        id: 'test-2', 
        status: 'contacted',
        sourceUrl: 'https://otomoto.pl/test-vehicle-status-2' 
      });

      await repository.insertVehicle(vehicle1);
      await repository.insertVehicle(vehicle2);

      const newVehicles = await repository.getVehiclesByStatus('new');
      expect(newVehicles).toHaveLength(1);
      expect(newVehicles[0].id).toBe('test-1');
    });

    it('should delete vehicles', async () => {
      const vehicle = MockVehicleRepository.createTestVehicle();
      await repository.insertVehicle(vehicle);

      await repository.deleteVehicle(vehicle.id);

      const found = await repository.findVehicleById(vehicle.id);
      expect(found).toBeNull();
    });

    it('should throw configured mock errors', async () => {
      const mockError = new Error('Repository error');
      repository.setMockError('insert:error-vehicle', mockError);

      const vehicle = MockVehicleRepository.createTestVehicle({ sourceUrl: 'error-vehicle' });

      await expect(repository.insertVehicle(vehicle)).rejects.toThrow('Repository error');
    });
  });

  describe('TestUtils Integration', () => {
    it('should set up test environment with all services', () => {
      const { scraperService, parserService, vehicleRepository, registry } = TestUtils.setupTestEnvironment();

      expect(scraperService).toBeInstanceOf(MockScraperService);
      expect(parserService).toBeInstanceOf(MockParserService);
      expect(vehicleRepository).toBeInstanceOf(MockVehicleRepository);
      expect(registry.isRegistered(SERVICE_KEYS.SCRAPER_SERVICE)).toBe(true);
      expect(registry.isRegistered(SERVICE_KEYS.PARSER_SERVICE)).toBe(true);
      expect(registry.isRegistered(SERVICE_KEYS.VEHICLE_REPOSITORY)).toBe(true);

      TestUtils.cleanupTestEnvironment();
    });

    it('should create test fixtures', () => {
      const fixtures = TestUtils.createTestFixtures();

      expect(fixtures.vehicles).toHaveLength(3);
      expect(fixtures.searchHtml).toContain('__NEXT_DATA__');
      expect(fixtures.detailHtml).toContain('advert');
      expect(fixtures.searchUrls.length).toBeGreaterThan(0);
      expect(fixtures.detailUrls.length).toBeGreaterThan(0);
    });

    it('should configure mock services with fixtures', () => {
      const { scraperService, parserService, vehicleRepository } = TestUtils.setupTestEnvironment();
      const fixtures = TestUtils.createTestFixtures();

      TestUtils.configureMockServices(scraperService, parserService, vehicleRepository, fixtures);

      // Verify configuration
      expect(vehicleRepository.getVehicleCount()).toBe(fixtures.vehicles.length);

      TestUtils.cleanupTestEnvironment();
    });
  });
});
