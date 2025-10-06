import { Vehicle } from '@car-finder/types';
import { IParserService, PageType, SearchResult, ParseResult } from '../interfaces/IParserService';

/**
 * Mock implementation of ParserService for testing
 * Provides test fixture data and validation capabilities
 */
export class MockParserService implements IParserService {
  private mockParseResults = new Map<string, ParseResult>();
  private mockErrors = new Map<string, Error>();
  private schemaReloaded = false;

  /**
   * Mock HTML parsing with configurable results
   */
  parseHtml(html: string, siteKey: string, expectedType?: PageType): ParseResult {
    // Check for configured error
    const errorKey = `${siteKey}:${expectedType || 'auto'}`;
    const mockError = this.mockErrors.get(errorKey);
    if (mockError) {
      throw mockError;
    }

    // Return configured mock result
    const resultKey = `${siteKey}:${expectedType || 'auto'}`;
    const mockResult = this.mockParseResults.get(resultKey);
    if (mockResult) {
      return mockResult;
    }

    // Auto-detect page type from HTML content
    const detectedType = this.detectPageTypeFromHtml(html, siteKey);
    const pageType = expectedType || detectedType;

    if (pageType === 'search') {
      return {
        pageType: 'search',
        data: this.generateMockSearchResults(siteKey),
      };
    } else {
      return {
        pageType: 'detail',
        data: this.generateMockVehicleData(siteKey),
      };
    }
  }

  /**
   * Mock schema reload
   */
  reloadSchema(): void {
    this.schemaReloaded = true;
  }

  // Test helper methods

  /**
   * Configure a mock parse result for specific inputs
   */
  setMockParseResult(siteKey: string, expectedType: PageType | 'auto', result: ParseResult): void {
    const key = `${siteKey}:${expectedType}`;
    this.mockParseResults.set(key, result);
  }

  /**
   * Configure a mock error for specific inputs
   */
  setMockError(siteKey: string, expectedType: PageType | 'auto', error: Error): void {
    const key = `${siteKey}:${expectedType}`;
    this.mockErrors.set(key, error);
  }

  /**
   * Clear all mock configurations
   */
  clearMocks(): void {
    this.mockParseResults.clear();
    this.mockErrors.clear();
    this.schemaReloaded = false;
  }

  /**
   * Check if schema was reloaded (for testing)
   */
  wasSchemaReloaded(): boolean {
    return this.schemaReloaded;
  }

  /**
   * Generate mock search results
   */
  generateMockSearchResults(siteKey: string): SearchResult[] {
    const baseUrl = siteKey === 'otomoto' ? 'https://otomoto.pl' : 'https://olx.pl';
    
    return [
      {
        sourceId: 'mock-id-1',
        sourceUrl: `${baseUrl}/mock-vehicle-1`,
        sourceTitle: 'Mock Vehicle 1 - Test Car',
        sourceCreatedAt: '2025-01-01T00:00:00Z',
      },
      {
        sourceId: 'mock-id-2',
        sourceUrl: `${baseUrl}/mock-vehicle-2`,
        sourceTitle: 'Mock Vehicle 2 - Another Test Car',
        sourceCreatedAt: '2025-01-02T00:00:00Z',
      },
      {
        sourceId: 'mock-id-3',
        sourceUrl: `${baseUrl}/mock-vehicle-3`,
        sourceTitle: 'Mock Vehicle 3 - Third Test Car',
        sourceCreatedAt: '2025-01-03T00:00:00Z',
      },
    ];
  }

  /**
   * Generate mock vehicle data
   */
  generateMockVehicleData(siteKey: string): Partial<Vehicle> {
    const baseUrl = siteKey === 'otomoto' ? 'https://otomoto.pl' : 'https://olx.pl';
    const now = new Date();

    return {
      source: siteKey as 'otomoto' | 'olx',
      sourceId: 'mock-vehicle-id',
      sourceUrl: `${baseUrl}/mock-vehicle-detail`,
      sourceCreatedAt: now,
      sourceTitle: 'Mock Vehicle Title - Test Car 2020',
      sourceDescriptionHtml: '<p>Mock vehicle description with <strong>HTML</strong> formatting.</p>',
      sourceParameters: {
        'Brand': 'Mock Brand',
        'Model': 'Mock Model',
        'Year': '2020',
        'Mileage': '50000 km',
        'Fuel Type': 'Petrol',
        'Transmission': 'Manual',
      },
      sourceEquipment: {
        'Comfort': ['Air Conditioning', 'Heated Seats', 'Cruise Control'],
        'Safety': ['ABS', 'ESP', 'Airbags'],
        'Multimedia': ['Radio', 'Bluetooth', 'USB'],
      },
      sourcePhotos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ],
      title: 'Mock Vehicle Title - Test Car 2020',
      description: 'Mock vehicle description with HTML formatting.',
      features: ['comfort_air_conditioning', 'safety_abs', 'multimedia_bluetooth'],
      pricePln: 50000,
      priceEur: 11500,
      year: 2020,
      mileage: 50000,
      sellerInfo: {
        name: 'Mock Seller',
        id: 'mock-seller-id',
        type: 'private',
        location: 'Warsaw, Poland',
        memberSince: '2020-01-01',
      },
      photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg',
        'https://example.com/photo3.jpg',
      ],
      personalFitScore: null,
      marketValueScore: null,
      aiPriorityRating: null,
      aiPrioritySummary: null,
      aiMechanicReport: null,
      aiDataSanityCheck: null,
      status: 'new',
      personalNotes: null,
      scrapedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create mock vehicle with custom data
   */
  createMockVehicle(overrides: Partial<Vehicle> = {}): Partial<Vehicle> {
    const base = this.generateMockVehicleData('otomoto');
    return { ...base, ...overrides };
  }

  /**
   * Create multiple mock vehicles
   */
  createMockVehicles(count: number, siteKey: string = 'otomoto'): Partial<Vehicle>[] {
    return Array.from({ length: count }, (_, index) => {
      const base = this.generateMockVehicleData(siteKey);
      return {
        ...base,
        sourceId: `mock-vehicle-${index + 1}`,
        sourceUrl: `https://${siteKey}.pl/mock-vehicle-${index + 1}`,
        sourceTitle: `Mock Vehicle ${index + 1} - Test Car`,
        title: `Mock Vehicle ${index + 1} - Test Car`,
        pricePln: 40000 + (index * 5000),
        priceEur: Math.round((40000 + (index * 5000)) * 0.23),
        year: 2018 + index,
        mileage: 30000 + (index * 10000),
      };
    });
  }

  /**
   * Detect page type from HTML content (simplified mock logic)
   */
  private detectPageTypeFromHtml(html: string, siteKey: string): PageType {
    if (siteKey === 'otomoto') {
      // Check for __NEXT_DATA__ content patterns
      if (html.includes('urqlState')) {
        return 'search';
      } else if (html.includes('advert')) {
        return 'detail';
      }
    } else if (siteKey === 'olx') {
      // Simple heuristic for OLX
      if (html.includes('class="title"') && html.includes('class="price"')) {
        return 'detail';
      }
    }
    
    // Default to detail for unknown patterns
    return 'detail';
  }

  /**
   * Create test fixtures for common scenarios
   */
  static createTestFixtures(): {
    otomotoSearchHtml: string;
    otomotoDetailHtml: string;
    olxDetailHtml: string;
    expectedSearchResults: SearchResult[];
    expectedVehicleData: Partial<Vehicle>;
  } {
    const mockService = new MockParserService();
    
    return {
      otomotoSearchHtml: `
        <html>
          <script id="__NEXT_DATA__">
            ${JSON.stringify({
              props: {
                pageProps: {
                  urqlState: {
                    'test-key': {
                      data: JSON.stringify({
                        advertSearch: {
                          edges: [
                            {
                              node: {
                                id: 'test-id-1',
                                url: 'https://otomoto.pl/test-vehicle-1',
                                title: 'Test Vehicle 1',
                                createdAt: '2025-01-01T00:00:00Z'
                              }
                            }
                          ]
                        }
                      })
                    }
                  }
                }
              }
            })}
          </script>
        </html>
      `,
      otomotoDetailHtml: `
        <html>
          <script id="__NEXT_DATA__">
            ${JSON.stringify({
              props: {
                pageProps: {
                  advert: {
                    id: 'test-vehicle-id',
                    title: 'Test Vehicle',
                    price: { amount: 45000, currency: 'PLN' }
                  }
                }
              }
            })}
          </script>
        </html>
      `,
      olxDetailHtml: `
        <html>
          <h1 class="title">Test OLX Vehicle</h1>
          <div class="price">45000 zł</div>
        </html>
      `,
      expectedSearchResults: mockService.generateMockSearchResults('otomoto'),
      expectedVehicleData: mockService.generateMockVehicleData('otomoto'),
    };
  }
}
