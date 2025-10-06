import * as fs from 'fs';
import { Vehicle } from '@car-finder/types';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn()
};

jest.mock('fs', () => mockFs);

// Mock external services
const mockScraperService = {
  scrapeUrl: jest.fn(),
  close: jest.fn()
};

const mockParserService = {
  parseHtml: jest.fn()
};

const mockVehicleRepository = {
  insertVehicle: jest.fn(),
  findVehicleByUrl: jest.fn()
};

const mockDatabase = {
  getDb: jest.fn().mockReturnValue({})
};

jest.mock('../../../apps/api/src/services/ScraperService', () => ({
  ScraperService: jest.fn().mockImplementation(() => mockScraperService)
}));

jest.mock('../../../apps/api/src/services/ParserService', () => ({
  ParserService: jest.fn().mockImplementation(() => mockParserService)
}));

jest.mock('@car-finder/db', () => ({
  Database: jest.fn().mockImplementation(() => mockDatabase),
  VehicleRepository: jest.fn().mockImplementation(() => mockVehicleRepository)
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

describe('IngestionPipeline Integration Tests', () => {
  const testConfig = {
    searchUrls: {
      otomoto: [
        {
          name: 'Test BMW Search',
          url: 'https://www.otomoto.pl/test-search',
          description: 'Test BMW search'
        }
      ],
      olx: []
    },
    ingestionSettings: {
      maxPagesPerSearch: 1,
      delayBetweenRequests: { min: 10, max: 20 }, // Very short delays for testing
      retryAttempts: 1,
      batchSize: 2,
      enableDeduplication: true
    },
    currencyConversion: {
      plnToEurRate: 0.23,
      lastUpdated: '2025-10-06'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(testConfig));
    
    mockScraperService.scrapeUrl.mockResolvedValue({
      html: '<html>test</html>',
      finalUrl: 'https://test.com',
      statusCode: 200,
      scrapingTime: 1000
    });
    
    mockParserService.parseHtml.mockResolvedValue({
      pageType: 'search',
      data: []
    });
    
    mockVehicleRepository.findVehicleByUrl.mockResolvedValue(null);
    mockVehicleRepository.insertVehicle.mockResolvedValue(undefined);
  });

  describe('End-to-End Workflow', () => {
    it('should complete full ingestion workflow with mock data', async () => {
      // Mock search results
      const searchParseResult = {
        pageType: 'search',
        data: [
          {
            sourceId: '12345',
            sourceUrl: 'https://www.otomoto.pl/vehicle/12345',
            sourceTitle: 'BMW 320d Test',
            sourceCreatedAt: '2025-10-06'
          },
          {
            sourceId: '67890',
            sourceUrl: 'https://www.otomoto.pl/vehicle/67890',
            sourceTitle: 'BMW 330i Test',
            sourceCreatedAt: '2025-10-05'
          }
        ]
      };

      // Mock vehicle detail results
      const vehicleDetailResult1 = {
        pageType: 'detail',
        data: {
          sourceId: '12345',
          sourceTitle: 'BMW 320d Test Vehicle',
          pricePln: 25000,
          year: 2010,
          mileage: 150000,
          sourceDescriptionHtml: '<p>Great car</p>',
          sourceParameters: { fuel: 'diesel', transmission: 'manual' },
          sourceEquipment: { comfort: ['air_conditioning', 'heated_seats'] },
          sourcePhotos: ['photo1.jpg', 'photo2.jpg'],
          sellerInfo: {
            name: 'Test Seller',
            id: 'seller123',
            type: 'private' as const,
            location: 'Warsaw',
            memberSince: '2020-01-01'
          }
        }
      };

      const vehicleDetailResult2 = {
        pageType: 'detail',
        data: {
          sourceId: '67890',
          sourceTitle: 'BMW 330i Test Vehicle',
          pricePln: 35000,
          year: 2012,
          mileage: 120000,
          sourceDescriptionHtml: '<p>Excellent condition</p>',
          sourceParameters: { fuel: 'petrol', transmission: 'automatic' },
          sourceEquipment: { comfort: ['air_conditioning'], safety: ['abs', 'esp'] },
          sourcePhotos: ['photo3.jpg'],
          sellerInfo: {
            name: 'Test Dealer',
            id: 'dealer456',
            type: 'company' as const,
            location: 'Krakow',
            memberSince: '2018-06-15'
          }
        }
      };

      // Setup mock responses
      mockScraperService.scrapeUrl
        .mockResolvedValueOnce({
          html: '<html>search results</html>',
          finalUrl: 'https://www.otomoto.pl/test-search',
          statusCode: 200,
          scrapingTime: 1000
        })
        .mockResolvedValueOnce({
          html: '<html>vehicle 12345</html>',
          finalUrl: 'https://www.otomoto.pl/vehicle/12345',
          statusCode: 200,
          scrapingTime: 800
        })
        .mockResolvedValueOnce({
          html: '<html>vehicle 67890</html>',
          finalUrl: 'https://www.otomoto.pl/vehicle/67890',
          statusCode: 200,
          scrapingTime: 900
        });

      mockParserService.parseHtml
        .mockResolvedValueOnce(searchParseResult)
        .mockResolvedValueOnce(vehicleDetailResult1)
        .mockResolvedValueOnce(vehicleDetailResult2);

      // Execute pipeline
      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      
      // Mock console.log to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await pipeline.run();

      // Verify search was scraped
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/test-search'
      );

      // Verify search results were parsed
      expect(mockParserService.parseHtml).toHaveBeenCalledWith(
        '<html>search results</html>',
        'otomoto',
        'search'
      );

      // Verify both vehicles were scraped
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/12345'
      );
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/67890'
      );

      // Verify both vehicles were parsed
      expect(mockParserService.parseHtml).toHaveBeenCalledWith(
        '<html>vehicle 12345</html>',
        'otomoto',
        'detail'
      );
      expect(mockParserService.parseHtml).toHaveBeenCalledWith(
        '<html>vehicle 67890</html>',
        'otomoto',
        'detail'
      );

      // Verify both vehicles were checked for duplicates
      expect(mockVehicleRepository.findVehicleByUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/12345'
      );
      expect(mockVehicleRepository.findVehicleByUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/67890'
      );

      // Verify both vehicles were inserted
      expect(mockVehicleRepository.insertVehicle).toHaveBeenCalledTimes(2);

      // Verify the inserted vehicle data structure
      const insertedVehicles = mockVehicleRepository.insertVehicle.mock.calls.map(call => call[0]);
      
      expect(insertedVehicles[0]).toMatchObject({
        source: 'otomoto',
        sourceId: '12345',
        sourceUrl: 'https://www.otomoto.pl/vehicle/12345',
        title: 'BMW 320d Test Vehicle',
        pricePln: 25000,
        priceEur: 5750, // 25000 * 0.23
        year: 2010,
        mileage: 150000,
        status: 'new'
      });

      expect(insertedVehicles[1]).toMatchObject({
        source: 'otomoto',
        sourceId: '67890',
        sourceUrl: 'https://www.otomoto.pl/vehicle/67890',
        title: 'BMW 330i Test Vehicle',
        pricePln: 35000,
        priceEur: 8050, // 35000 * 0.23
        year: 2012,
        mileage: 120000,
        status: 'new'
      });

      // Verify cleanup
      expect(mockScraperService.close).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should skip duplicate vehicles when found in database', async () => {
      const searchParseResult = {
        pageType: 'search',
        data: [
          {
            sourceId: '12345',
            sourceUrl: 'https://www.otomoto.pl/vehicle/12345',
            sourceTitle: 'BMW 320d Test',
            sourceCreatedAt: '2025-10-06'
          }
        ]
      };

      // Mock existing vehicle in database
      const existingVehicle: Vehicle = {
        id: 'existing-uuid',
        source: 'otomoto',
        sourceId: '12345',
        sourceUrl: 'https://www.otomoto.pl/vehicle/12345',
        sourceCreatedAt: new Date(),
        sourceTitle: 'BMW 320d Test',
        sourceDescriptionHtml: '',
        sourceParameters: {},
        sourceEquipment: {},
        sourcePhotos: [],
        title: 'BMW 320d Test',
        description: '',
        features: [],
        pricePln: 25000,
        priceEur: 5750,
        year: 2010,
        mileage: 150000,
        sellerInfo: { name: null, id: null, type: null, location: null, memberSince: null },
        photos: [],
        personalFitScore: null,
        marketValueScore: null,
        aiPriorityRating: null,
        aiPrioritySummary: null,
        aiMechanicReport: null,
        aiDataSanityCheck: null,
        status: 'new',
        personalNotes: null,
        scrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockScraperService.scrapeUrl.mockResolvedValueOnce({
        html: '<html>search results</html>',
        finalUrl: 'https://www.otomoto.pl/test-search',
        statusCode: 200,
        scrapingTime: 1000
      });

      mockParserService.parseHtml.mockResolvedValueOnce(searchParseResult);
      mockVehicleRepository.findVehicleByUrl.mockResolvedValue(existingVehicle);

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      
      // Mock console.log to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await pipeline.run();

      // Verify search was performed
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/test-search'
      );

      // Verify duplicate check was performed
      expect(mockVehicleRepository.findVehicleByUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/12345'
      );

      // Verify vehicle was NOT scraped (duplicate found)
      expect(mockScraperService.scrapeUrl).not.toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/12345'
      );

      // Verify vehicle was NOT inserted (duplicate found)
      expect(mockVehicleRepository.insertVehicle).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle scraping errors with retry logic', async () => {
      const searchParseResult = {
        pageType: 'search',
        data: [
          {
            sourceId: '12345',
            sourceUrl: 'https://www.otomoto.pl/vehicle/12345',
            sourceTitle: 'BMW 320d Test',
            sourceCreatedAt: '2025-10-06'
          }
        ]
      };

      // Mock search success but vehicle scraping failure
      mockScraperService.scrapeUrl
        .mockResolvedValueOnce({
          html: '<html>search results</html>',
          finalUrl: 'https://www.otomoto.pl/test-search',
          statusCode: 200,
          scrapingTime: 1000
        })
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout')); // Both retries fail

      mockParserService.parseHtml.mockResolvedValueOnce(searchParseResult);
      mockVehicleRepository.findVehicleByUrl.mockResolvedValue(null);

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      
      // Mock console methods to avoid test output noise
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await pipeline.run();

      // Verify search was performed
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/test-search'
      );

      // Verify vehicle scraping was attempted twice (original + 1 retry)
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledWith(
        'https://www.otomoto.pl/vehicle/12345'
      );
      expect(mockScraperService.scrapeUrl).toHaveBeenCalledTimes(3); // 1 search + 2 vehicle attempts

      // Verify no vehicle was inserted due to failures
      expect(mockVehicleRepository.insertVehicle).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Service Integration', () => {
    it('should properly initialize all services', async () => {
      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();

      // Verify services were initialized
      expect(mockDatabase.getDb).toHaveBeenCalled();
    });
  });
});