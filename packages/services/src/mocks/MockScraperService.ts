import { IScraperService, ScraperConfig, ScrapingResult, BrowserStats } from '../interfaces/IScraperService';

/**
 * Mock implementation of ScraperService for testing
 * Provides configurable responses and error scenarios
 */
export class MockScraperService implements IScraperService {
  private initialized = false;
  private requestCount = 0;
  private lastRequestTime = 0;
  private mockResponses = new Map<string, ScrapingResult>();
  private mockErrors = new Map<string, Error>();
  private defaultDelay = 100; // Fast for testing

  constructor(private config?: Partial<ScraperConfig>) {}

  /**
   * Mock browser initialization
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 10));
    this.initialized = true;
  }

  /**
   * Mock URL scraping with configurable responses
   */
  async scrapeUrl(url: string): Promise<ScrapingResult> {
    if (!this.initialized) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    // Check for configured error
    const mockError = this.mockErrors.get(url);
    if (mockError) {
      throw mockError;
    }

    // Simulate respectful delay
    await new Promise(resolve => setTimeout(resolve, this.defaultDelay));

    const startTime = Date.now();
    this.requestCount++;
    this.lastRequestTime = Date.now();

    // Return configured mock response or default
    const mockResponse = this.mockResponses.get(url);
    if (mockResponse) {
      return {
        ...mockResponse,
        scrapingTime: Date.now() - startTime,
      };
    }

    // Default mock response
    return {
      html: this.generateMockHtml(url),
      finalUrl: url,
      statusCode: 200,
      scrapingTime: Date.now() - startTime,
    };
  }

  /**
   * Mock browser statistics
   */
  getBrowserStats(): BrowserStats {
    return {
      isInitialized: this.initialized,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    };
  }

  /**
   * Mock browser close
   */
  async close(): Promise<void> {
    this.initialized = false;
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Mock browser restart
   */
  async restart(): Promise<void> {
    await this.close();
    await this.initialize();
  }

  // Test helper methods

  /**
   * Configure a mock response for a specific URL
   */
  setMockResponse(url: string, response: Partial<ScrapingResult>): void {
    this.mockResponses.set(url, {
      html: '<html><body>Mock HTML</body></html>',
      finalUrl: url,
      statusCode: 200,
      scrapingTime: 100,
      ...response,
    });
  }

  /**
   * Configure a mock error for a specific URL
   */
  setMockError(url: string, error: Error): void {
    this.mockErrors.set(url, error);
  }

  /**
   * Clear all mock configurations
   */
  clearMocks(): void {
    this.mockResponses.clear();
    this.mockErrors.clear();
  }

  /**
   * Set the mock delay for testing timing
   */
  setMockDelay(delay: number): void {
    this.defaultDelay = delay;
  }

  /**
   * Reset all counters and state
   */
  reset(): void {
    this.initialized = false;
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.clearMocks();
  }

  /**
   * Generate mock HTML content based on URL patterns
   */
  private generateMockHtml(url: string): string {
    if (url.includes('otomoto')) {
      return this.generateOtomotoMockHtml(url);
    } else if (url.includes('olx')) {
      return this.generateOlxMockHtml(url);
    }
    
    return '<html><body><h1>Mock HTML Content</h1></body></html>';
  }

  /**
   * Generate mock Otomoto HTML with __NEXT_DATA__
   */
  private generateOtomotoMockHtml(url: string): string {
    const isSearchPage = url.includes('/osobowe/');
    const mockData = isSearchPage ? this.getMockSearchData() : this.getMockDetailData();
    
    return `
      <html>
        <head><title>Mock Otomoto</title></head>
        <body>
          <div id="__next">Mock Otomoto Content</div>
          <script id="__NEXT_DATA__" type="application/json">
            ${JSON.stringify(mockData)}
          </script>
        </body>
      </html>
    `;
  }

  /**
   * Generate mock OLX HTML with CSS selectors
   */
  private generateOlxMockHtml(url: string): string {
    return `
      <html>
        <head><title>Mock OLX</title></head>
        <body>
          <h1 class="title">Mock Vehicle Title</h1>
          <div class="price">50000 zł</div>
          <div class="description">Mock vehicle description</div>
          <img class="photo" src="https://example.com/photo1.jpg" />
          <img class="photo" src="https://example.com/photo2.jpg" />
        </body>
      </html>
    `;
  }

  /**
   * Get mock search page data structure
   */
  private getMockSearchData(): any {
    return {
      props: {
        pageProps: {
          urqlState: {
            'mock-key-123': {
              data: JSON.stringify({
                advertSearch: {
                  edges: [
                    {
                      node: {
                        id: 'mock-id-1',
                        url: 'https://otomoto.pl/mock-vehicle-1',
                        title: 'Mock Vehicle 1',
                        createdAt: '2025-01-01T00:00:00Z',
                      }
                    },
                    {
                      node: {
                        id: 'mock-id-2',
                        url: 'https://otomoto.pl/mock-vehicle-2',
                        title: 'Mock Vehicle 2',
                        createdAt: '2025-01-02T00:00:00Z',
                      }
                    }
                  ]
                }
              })
            }
          }
        }
      }
    };
  }

  /**
   * Get mock detail page data structure
   */
  private getMockDetailData(): any {
    return {
      props: {
        pageProps: {
          advert: {
            id: 'mock-vehicle-id',
            title: 'Mock Vehicle Title',
            description: 'Mock vehicle description with details',
            price: { amount: 50000, currency: 'PLN' },
            year: 2020,
            mileage: 50000,
            photos: [
              { url: 'https://example.com/photo1.jpg' },
              { url: 'https://example.com/photo2.jpg' }
            ],
            seller: {
              name: 'Mock Seller',
              id: 'mock-seller-id',
              type: 'private',
              location: 'Warsaw, Poland'
            },
            details: [
              { label: 'Brand', value: 'Mock Brand' },
              { label: 'Model', value: 'Mock Model' }
            ],
            equipment: [
              {
                label: 'Comfort',
                values: [{ label: 'Air Conditioning' }, { label: 'Heated Seats' }]
              }
            ]
          }
        }
      }
    };
  }
}
