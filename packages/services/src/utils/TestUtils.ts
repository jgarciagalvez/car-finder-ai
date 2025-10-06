import { Vehicle } from '@car-finder/types';
import { MockScraperService } from '../mocks/MockScraperService';
import { MockParserService } from '../mocks/MockParserService';
import { MockVehicleRepository } from '../mocks/MockVehicleRepository';
import { ServiceRegistry, getGlobalRegistry, clearGlobalRegistry } from '../registry';
import { SERVICE_KEYS } from '../interfaces';

/**
 * Test utilities for integration testing
 * Provides helper functions for setting up test environments
 */
export class TestUtils {
  /**
   * Set up a clean test environment with mock services
   */
  static setupTestEnvironment(): {
    scraperService: MockScraperService;
    parserService: MockParserService;
    vehicleRepository: MockVehicleRepository;
    registry: ServiceRegistry;
  } {
    // Clear any existing global registry
    clearGlobalRegistry();
    
    // Create fresh mock services
    const scraperService = new MockScraperService();
    const parserService = new MockParserService();
    const vehicleRepository = new MockVehicleRepository();
    
    // Register services in global registry
    const registry = getGlobalRegistry();
    registry.registerSingleton(SERVICE_KEYS.SCRAPER_SERVICE, () => scraperService);
    registry.registerSingleton(SERVICE_KEYS.PARSER_SERVICE, () => parserService);
    registry.registerSingleton(SERVICE_KEYS.VEHICLE_REPOSITORY, () => vehicleRepository);
    
    return {
      scraperService,
      parserService,
      vehicleRepository,
      registry,
    };
  }

  /**
   * Clean up test environment
   */
  static cleanupTestEnvironment(): void {
    clearGlobalRegistry();
  }

  /**
   * Create test fixtures for common scenarios
   */
  static createTestFixtures(): {
    vehicles: Vehicle[];
    searchHtml: string;
    detailHtml: string;
    searchUrls: string[];
    detailUrls: string[];
  } {
    const vehicles = [
      MockVehicleRepository.createTestVehicle({
        id: 'fixture-1',
        sourceUrl: 'https://otomoto.pl/fixture-vehicle-1',
        title: 'Fixture Vehicle 1',
        pricePln: 45000,
        year: 2019,
      }),
      MockVehicleRepository.createTestVehicle({
        id: 'fixture-2',
        sourceUrl: 'https://otomoto.pl/fixture-vehicle-2',
        title: 'Fixture Vehicle 2',
        pricePln: 55000,
        year: 2021,
      }),
      MockVehicleRepository.createTestVehicle({
        id: 'fixture-3',
        source: 'olx',
        sourceUrl: 'https://olx.pl/fixture-vehicle-3',
        title: 'Fixture Vehicle 3',
        pricePln: 35000,
        year: 2017,
      }),
    ];

    const searchHtml = `
      <html>
        <script id="__NEXT_DATA__">
          ${JSON.stringify({
            props: {
              pageProps: {
                urqlState: {
                  'fixture-key': {
                    data: JSON.stringify({
                      advertSearch: {
                        edges: vehicles.slice(0, 2).map(v => ({
                          node: {
                            id: v.sourceId,
                            url: v.sourceUrl,
                            title: v.title,
                            createdAt: v.sourceCreatedAt.toISOString(),
                          }
                        }))
                      }
                    })
                  }
                }
              }
            }
          })}
        </script>
      </html>
    `;

    const detailHtml = `
      <html>
        <script id="__NEXT_DATA__">
          ${JSON.stringify({
            props: {
              pageProps: {
                advert: {
                  id: vehicles[0].sourceId,
                  title: vehicles[0].title,
                  description: vehicles[0].description,
                  price: { amount: vehicles[0].pricePln, currency: 'PLN' },
                  year: vehicles[0].year,
                  mileage: vehicles[0].mileage,
                  photos: vehicles[0].photos.map(url => ({ url })),
                  seller: {
                    name: vehicles[0].sellerInfo.name,
                    id: vehicles[0].sellerInfo.id,
                    type: vehicles[0].sellerInfo.type,
                    location: vehicles[0].sellerInfo.location,
                  }
                }
              }
            }
          })}
        </script>
      </html>
    `;

    return {
      vehicles,
      searchHtml,
      detailHtml,
      searchUrls: [
        'https://otomoto.pl/osobowe/search',
        'https://olx.pl/motoryzacja/samochody/search',
      ],
      detailUrls: vehicles.map(v => v.sourceUrl),
    };
  }

  /**
   * Configure mock services with test data
   */
  static configureMockServices(
    scraperService: MockScraperService,
    parserService: MockParserService,
    vehicleRepository: MockVehicleRepository,
    fixtures = TestUtils.createTestFixtures()
  ): void {
    // Configure scraper service responses
    fixtures.searchUrls.forEach(url => {
      scraperService.setMockResponse(url, {
        html: fixtures.searchHtml,
        statusCode: 200,
      });
    });

    fixtures.detailUrls.forEach(url => {
      scraperService.setMockResponse(url, {
        html: fixtures.detailHtml,
        statusCode: 200,
      });
    });

    // Configure parser service responses
    parserService.setMockParseResult('otomoto', 'search', {
      pageType: 'search',
      data: fixtures.vehicles.slice(0, 2).map(v => ({
        sourceId: v.sourceId,
        sourceUrl: v.sourceUrl,
        sourceTitle: v.title,
        sourceCreatedAt: v.sourceCreatedAt.toISOString(),
      })),
    });

    parserService.setMockParseResult('otomoto', 'detail', {
      pageType: 'detail',
      data: fixtures.vehicles[0],
    });

    // Seed vehicle repository with test data
    vehicleRepository.seedWithTestData(fixtures.vehicles);
  }

  /**
   * Wait for async operations to complete
   */
  static async waitForAsync(ms: number = 10): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a test scenario with error conditions
   */
  static createErrorScenario(): {
    scraperError: Error;
    parserError: Error;
    repositoryError: Error;
    errorUrls: string[];
  } {
    return {
      scraperError: new Error('Mock scraper error'),
      parserError: new Error('Mock parser error'),
      repositoryError: new Error('Mock repository error'),
      errorUrls: [
        'https://otomoto.pl/error-url',
        'https://olx.pl/error-url',
      ],
    };
  }

  /**
   * Configure services for error testing
   */
  static configureErrorScenario(
    scraperService: MockScraperService,
    parserService: MockParserService,
    vehicleRepository: MockVehicleRepository
  ): void {
    const scenario = TestUtils.createErrorScenario();

    // Configure scraper errors
    scenario.errorUrls.forEach(url => {
      scraperService.setMockError(url, scenario.scraperError);
    });

    // Configure parser errors
    parserService.setMockError('otomoto', 'auto', scenario.parserError);

    // Configure repository errors
    vehicleRepository.setMockError('insert:error-vehicle', scenario.repositoryError);
  }

  /**
   * Assert that a vehicle matches expected structure
   */
  static assertVehicleStructure(vehicle: any): asserts vehicle is Vehicle {
    if (!vehicle || typeof vehicle !== 'object') {
      throw new Error('Vehicle must be an object');
    }

    const requiredFields = [
      'id', 'source', 'sourceId', 'sourceUrl', 'sourceCreatedAt',
      'sourceTitle', 'title', 'pricePln', 'priceEur', 'year', 'mileage',
      'status', 'createdAt', 'updatedAt'
    ];

    for (const field of requiredFields) {
      if (!(field in vehicle)) {
        throw new Error(`Vehicle missing required field: ${field}`);
      }
    }

    if (!['otomoto', 'olx'].includes(vehicle.source)) {
      throw new Error(`Invalid vehicle source: ${vehicle.source}`);
    }

    if (!['new', 'to_contact', 'contacted', 'to_visit', 'visited', 'deleted'].includes(vehicle.status)) {
      throw new Error(`Invalid vehicle status: ${vehicle.status}`);
    }
  }

  /**
   * Create performance test data
   */
  static createPerformanceTestData(count: number): {
    vehicles: Partial<Vehicle>[];
    urls: string[];
  } {
    const vehicles = Array.from({ length: count }, (_, index) => ({
      id: `perf-test-${index}`,
      sourceUrl: `https://otomoto.pl/perf-test-${index}`,
      title: `Performance Test Vehicle ${index}`,
      pricePln: 30000 + (index * 1000),
      year: 2015 + (index % 10),
    }));

    const urls = vehicles.map(v => v.sourceUrl!);

    return { vehicles, urls };
  }
}
