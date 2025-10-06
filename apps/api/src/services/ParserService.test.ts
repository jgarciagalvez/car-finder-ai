import { ParserService, PageType, ParseResult } from './ParserService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ParserService', () => {
  let parserService: ParserService;
  const mockSchemaPath = '/test/parser-schema.json';
  
  const mockSchema = {
    sites: {
      otomoto: {
        method: 'json',
        scriptSelector: 'script#__NEXT_DATA__',
        autoDetection: {
          searchPageIndicator: 'props.pageProps.urqlState',
          detailPageIndicator: 'props.pageProps.advert'
        },
        pageTypes: {
          search: {
            basePath: 'props.pageProps.urqlState',
            dataPath: 'data',
            listPath: 'advertSearch.edges',
            fields: {
              sourceId: 'node.id',
              sourceUrl: 'node.url',
              sourceTitle: 'node.title',
              sourceCreatedAt: 'node.createdAt'
            }
          },
          detail: {
            basePath: 'props.pageProps.advert',
            fields: {
              sourceId: 'id',
              sourceTitle: 'title',
              pricePln: 'price.value',
              sourceDescriptionHtml: 'description'
            }
          }
        }
      },
      olx: {
        method: 'css',
        pageTypes: {
          detail: {
            selectors: {
              title: 'h1[data-cy="ad_title"]',
              price: '[data-testid="ad-price-container"]'
            }
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockSchema));
  });

  describe('Constructor and Schema Loading', () => {
    it('should load schema successfully with default path', () => {
      expect(() => new ParserService()).not.toThrow();
    });

    it('should load schema successfully with custom path', () => {
      expect(() => new ParserService(mockSchemaPath)).not.toThrow();
    });

    it('should throw error when schema file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => new ParserService(mockSchemaPath)).toThrow('Parser schema file not found');
    });

    it('should throw error when schema file contains invalid JSON', () => {
      mockFs.readFileSync.mockReturnValue('invalid json');
      
      expect(() => new ParserService(mockSchemaPath)).toThrow('Failed to load parser schema');
    });

    it('should throw error when schema is missing sites configuration', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ invalid: 'schema' }));
      
      expect(() => new ParserService(mockSchemaPath)).toThrow('Invalid schema: missing or invalid sites configuration');
    });
  });

  describe('parseHtml Method', () => {
    beforeEach(() => {
      parserService = new ParserService(mockSchemaPath);
    });

    it('should throw error for unknown site key', () => {
      const html = '<html></html>';
      
      expect(() => parserService.parseHtml(html, 'unknown')).toThrow('No configuration found for site: unknown');
    });

    it('should throw error for unsupported parsing method', () => {
      const invalidSchema = {
        sites: {
          test: {
            method: 'invalid'
          }
        }
      };
      mockFs.readFileSync.mockReturnValue(JSON.stringify(invalidSchema));
      parserService = new ParserService(mockSchemaPath);
      
      expect(() => parserService.parseHtml('<html></html>', 'test')).toThrow('Unsupported parsing method: invalid');
    });
  });

  describe('JSON Parsing Method', () => {
    beforeEach(() => {
      parserService = new ParserService(mockSchemaPath);
    });

    it('should throw error when script tag is not found', () => {
      const html = '<html><body>No script tag</body></html>';
      
      expect(() => parserService.parseHtml(html, 'otomoto')).toThrow('Script tag not found');
    });

    it('should throw error when script contains invalid JSON', () => {
      const html = '<html><script id="__NEXT_DATA__">invalid json</script></html>';
      
      expect(() => parserService.parseHtml(html, 'otomoto')).toThrow('Failed to parse JSON from script tag');
    });

    it('should throw error when JSON structure is invalid', () => {
      const html = '<html><script id="__NEXT_DATA__">{"invalid": "structure"}</script></html>';
      
      expect(() => parserService.parseHtml(html, 'otomoto')).toThrow('Invalid JSON structure: missing props.pageProps');
    });

    it('should detect search page type correctly', () => {
      const nextData = {
        props: {
          pageProps: {
            urqlState: {
              'query-hash-123': {
                data: JSON.stringify({
                  advertSearch: {
                    edges: [
                      {
                        node: {
                          id: '123',
                          url: '/test-url',
                          title: 'Test Car',
                          createdAt: '2023-01-01'
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
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      const result = parserService.parseHtml(html, 'otomoto');
      
      expect(result.pageType).toBe('search');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should detect detail page type correctly', () => {
      const nextData = {
        props: {
          pageProps: {
            advert: {
              id: '123',
              title: 'Test Car',
              price: { value: 50000 }
            }
          }
        }
      };
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      const result = parserService.parseHtml(html, 'otomoto');
      
      expect(result.pageType).toBe('detail');
      expect(result.data).toHaveProperty('sourceId', '123');
    });

    it('should validate page type against expected type', () => {
      const nextData = {
        props: {
          pageProps: {
            advert: {
              id: '123',
              title: 'Test Car'
            }
          }
        }
      };
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      
      expect(() => parserService.parseHtml(html, 'otomoto', 'search')).toThrow('Page type mismatch: expected search, detected detail');
    });
  });

  describe('CSS Parsing Method', () => {
    beforeEach(() => {
      parserService = new ParserService(mockSchemaPath);
    });

    it('should extract data using CSS selectors', () => {
      const html = `
        <html>
          <body>
            <h1 data-cy="ad_title">Test Car Title</h1>
            <div data-testid="ad-price-container">50,000 PLN</div>
          </body>
        </html>
      `;
      
      const result = parserService.parseHtml(html, 'olx');
      
      expect(result.pageType).toBe('detail');
      expect(result.data).toHaveProperty('title', 'Test Car Title');
    });

    it('should handle missing elements gracefully', () => {
      const html = '<html><body>No matching elements</body></html>';
      
      const result = parserService.parseHtml(html, 'olx');
      
      expect(result.pageType).toBe('detail');
      expect(result.data).toBeDefined();
    });
  });

  describe('Data Normalization', () => {
    beforeEach(() => {
      parserService = new ParserService(mockSchemaPath);
    });

    it('should normalize price data correctly', () => {
      const nextData = {
        props: {
          pageProps: {
            advert: {
              id: '123',
              title: 'Test Car',
              price: { value: '50,000' }
            }
          }
        }
      };
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      const result = parserService.parseHtml(html, 'otomoto') as { data: any };
      
      expect(result.data.pricePln).toBe(50000);
      expect(result.data.priceEur).toBeCloseTo(11500, 0); // Approximate EUR conversion
    });

    it('should normalize text content by removing HTML tags', () => {
      const nextData = {
        props: {
          pageProps: {
            advert: {
              id: '123',
              title: '<b>Test Car</b> with <em>features</em>',
              description: '<p>Great car with   multiple   spaces</p>'
            }
          }
        }
      };
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      const result = parserService.parseHtml(html, 'otomoto') as { data: any };
      
      expect(result.data.sourceTitle).toBe('Test Car with features');
      expect(result.data.description).toBe('Great car with multiple spaces');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      parserService = new ParserService(mockSchemaPath);
    });

    it('should throw error for unknown page type detection', () => {
      const nextData = {
        props: {
          pageProps: {
            // Neither urqlState nor advert
            someOtherData: {}
          }
        }
      };
      
      const html = `<html><script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script></html>`;
      
      expect(() => parserService.parseHtml(html, 'otomoto')).toThrow('Unknown page type - neither search nor detail indicators found');
    });
  });

  describe('Schema Reload', () => {
    it('should reload schema successfully', () => {
      parserService = new ParserService(mockSchemaPath);
      
      expect(() => parserService.reloadSchema()).not.toThrow();
      expect(mockFs.readFileSync).toHaveBeenCalledTimes(2); // Once in constructor, once in reload
    });
  });
});
