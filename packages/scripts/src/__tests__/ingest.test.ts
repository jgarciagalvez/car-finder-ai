import * as fs from 'fs';
import * as path from 'path';
import { VehicleSource } from '@car-finder/types';

// Mock fs module
const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn()
};

jest.mock('fs', () => mockFs);

// Mock external services with manual mocks
jest.mock('../../../apps/api/src/services/ScraperService', () => {
  return {
    ScraperService: jest.fn().mockImplementation(() => ({
      scrapeUrl: jest.fn(),
      close: jest.fn()
    }))
  };
});

jest.mock('../../../apps/api/src/services/ParserService', () => {
  return {
    ParserService: jest.fn().mockImplementation(() => ({
      parseHtml: jest.fn()
    }))
  };
});

jest.mock('@car-finder/db', () => {
  return {
    Database: jest.fn().mockImplementation(() => ({
      getDb: jest.fn().mockReturnValue({})
    })),
    VehicleRepository: jest.fn().mockImplementation(() => ({
      insertVehicle: jest.fn(),
      findVehicleByUrl: jest.fn()
    }))
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

describe('IngestionPipeline Configuration and Utilities', () => {
  const mockConfig = {
    searchUrls: {
      otomoto: [
        {
          name: 'Test BMW Search',
          url: 'https://www.otomoto.pl/test',
          description: 'Test search'
        }
      ],
      olx: [
        {
          name: 'Test OLX Search',
          url: 'https://www.olx.pl/test',
          description: 'Test OLX search'
        }
      ]
    },
    ingestionSettings: {
      maxPagesPerSearch: 2,
      delayBetweenRequests: { min: 100, max: 200 },
      retryAttempts: 2,
      batchSize: 5,
      enableDeduplication: true
    },
    currencyConversion: {
      plnToEurRate: 0.23,
      lastUpdated: '2025-10-06'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration Loading', () => {
    it('should load configuration successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      // Dynamically import to avoid module resolution issues
      const { IngestionPipeline } = await import('../ingest');
      
      expect(() => new IngestionPipeline()).not.toThrow();
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'search-config.json')
      );
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'search-config.json'),
        'utf-8'
      );
    });

    it('should throw error when config file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const { IngestionPipeline } = await import('../ingest');
      
      expect(() => new IngestionPipeline()).toThrow(
        'Configuration file not found'
      );
    });

    it('should throw error when config file is invalid JSON', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      const { IngestionPipeline } = await import('../ingest');
      
      expect(() => new IngestionPipeline()).toThrow(
        'Failed to load configuration'
      );
    });

    it('should throw error when config is missing required sections', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}));
      
      const { IngestionPipeline } = await import('../ingest');
      
      expect(() => new IngestionPipeline()).toThrow(
        'Invalid configuration: missing required sections'
      );
    });
  });

  describe('URL Deduplication Logic', () => {
    it('should remove duplicate URLs when deduplication is enabled', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();

      const allUrls = [
        { url: 'https://example.com/1', source: 'otomoto' as VehicleSource },
        { url: 'https://example.com/2', source: 'otomoto' as VehicleSource },
        { url: 'https://example.com/1', source: 'olx' as VehicleSource }, // duplicate
        { url: 'https://example.com/3', source: 'olx' as VehicleSource }
      ];

      // Access private method for testing
      const deduplicateUrls = (pipeline as any).deduplicateUrls.bind(pipeline);
      const result = deduplicateUrls(allUrls);

      expect(result).toHaveLength(3);
      expect(result.map((item: any) => item.url)).toEqual([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3'
      ]);
    });

    it('should not remove duplicates when deduplication is disabled', async () => {
      const configWithoutDedup = {
        ...mockConfig,
        ingestionSettings: {
          ...mockConfig.ingestionSettings,
          enableDeduplication: false
        }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configWithoutDedup));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();

      const allUrls = [
        { url: 'https://example.com/1', source: 'otomoto' as VehicleSource },
        { url: 'https://example.com/1', source: 'olx' as VehicleSource }
      ];

      const deduplicateUrls = (pipeline as any).deduplicateUrls.bind(pipeline);
      const result = deduplicateUrls(allUrls);

      expect(result).toHaveLength(2);
    });
  });

  describe('ID Extraction Logic', () => {
    it('should extract ID from Otomoto URL', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const extractIdFromUrl = (pipeline as any).extractIdFromUrl.bind(pipeline);
      
      const url = 'https://www.otomoto.pl/oferta/bmw-320d-ID12345678.html';
      const result = extractIdFromUrl(url, 'otomoto');
      
      expect(result).toBe('12345678');
    });

    it('should extract ID from OLX URL', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const extractIdFromUrl = (pipeline as any).extractIdFromUrl.bind(pipeline);
      
      const url = 'https://www.olx.pl/oferta/bmw-320d-ID987654321';
      const result = extractIdFromUrl(url, 'olx');
      
      expect(result).toBe('987654321');
    });

    it('should fallback to URL segment when ID pattern not found', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const extractIdFromUrl = (pipeline as any).extractIdFromUrl.bind(pipeline);
      
      const url = 'https://example.com/some/path/fallback-id';
      const result = extractIdFromUrl(url, 'otomoto');
      
      expect(result).toBe('fallback-id');
    });
  });

  describe('Data Transformation Logic', () => {
    it('should transform parsed data to Vehicle interface', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const transformToVehicle = (pipeline as any).transformToVehicle.bind(pipeline);
      
      const parsedData = {
        sourceId: '12345',
        sourceTitle: 'BMW 320d',
        pricePln: 25000,
        year: 2010,
        mileage: 150000
      };

      const result = transformToVehicle(
        parsedData,
        'https://example.com/12345',
        'otomoto'
      );

      expect(result).toMatchObject({
        id: 'mock-uuid-1234',
        source: 'otomoto',
        sourceId: '12345',
        sourceUrl: 'https://example.com/12345',
        title: 'BMW 320d',
        pricePln: 25000,
        priceEur: 5750, // 25000 * 0.23
        year: 2010,
        mileage: 150000,
        status: 'new'
      });

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.scrapedAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle missing data gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const transformToVehicle = (pipeline as any).transformToVehicle.bind(pipeline);
      
      const parsedData = {}; // Empty data
      
      const result = transformToVehicle(
        parsedData,
        'https://example.com/test',
        'olx'
      );

      expect(result).toMatchObject({
        source: 'olx',
        sourceUrl: 'https://example.com/test',
        title: 'Unknown Vehicle',
        pricePln: 0,
        priceEur: 0,
        year: 0,
        mileage: 0,
        status: 'new'
      });
    });

    it('should convert PLN to EUR correctly', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const transformToVehicle = (pipeline as any).transformToVehicle.bind(pipeline);
      
      const parsedData = { pricePln: 30000 };
      
      const result = transformToVehicle(
        parsedData,
        'https://example.com/test',
        'otomoto'
      );

      expect(result.priceEur).toBe(6900); // 30000 * 0.23 = 6900
    });
  });

  describe('Delay Function', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay for time within specified range', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const { IngestionPipeline } = await import('../ingest');
      const pipeline = new IngestionPipeline();
      const delay = (pipeline as any).delay.bind(pipeline);
      
      const delayPromise = delay(1000, 2000);
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      await expect(delayPromise).resolves.toBeUndefined();
    });
  });
});