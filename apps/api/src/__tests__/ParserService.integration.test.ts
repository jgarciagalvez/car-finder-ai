import { ParserService } from '../services/ParserService';
import * as fs from 'fs';
import * as path from 'path';

describe('ParserService Integration Tests', () => {
  let parserService: ParserService;
  const testSchemaPath = path.join(__dirname, 'fixtures', 'test-parser-schema.json');
  
  const testSchema = {
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
              sourceUrl: 'url',
              pricePln: 'price.value',
              priceCurrency: 'price.currency',
              sourceDescriptionHtml: 'description',
              sourceCreatedAt: 'createdAt',
              sellerName: 'seller.name',
              sellerId: 'seller.id',
              sellerType: 'seller.type',
              sellerLocation: 'seller.location.address',
              year: 'details[label=Rok produkcji].value',
              mileage: 'details[label=Przebieg].value',
              sourceParameters: 'details',
              sourceEquipment: 'equipment',
              sourcePhotos: 'images.photos'
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
              price: '[data-testid="ad-price-container"]',
              description: '[data-cy="ad_description"]'
            }
          }
        }
      }
    }
  };

  beforeAll(() => {
    // Create test fixtures directory
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Write test schema
    fs.writeFileSync(testSchemaPath, JSON.stringify(testSchema, null, 2));
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testSchemaPath)) {
      fs.unlinkSync(testSchemaPath);
    }
  });

  beforeEach(() => {
    parserService = new ParserService(testSchemaPath);
  });

  describe('Otomoto Search Page Parsing', () => {
    it('should parse search results with multiple vehicles', () => {
      const searchData = {
        advertSearch: {
          edges: [
            {
              node: {
                id: '12345',
                url: '/oferta/ford-focus-ID6ABC123.html',
                title: 'Ford Focus 1.6 TDCi',
                createdAt: '2023-10-01T10:00:00Z'
              }
            },
            {
              node: {
                id: '67890',
                url: '/oferta/volkswagen-golf-ID6DEF456.html',
                title: 'Volkswagen Golf 2.0 TDI',
                createdAt: '2023-10-02T14:30:00Z'
              }
            }
          ]
        }
      };

      const nextData = {
        props: {
          pageProps: {
            urqlState: {
              'query-hash-abc123': {
                data: JSON.stringify(searchData)
              }
            }
          }
        }
      };

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Otomoto Search Results</title>
          </head>
          <body>
            <script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>
          </body>
        </html>
      `;

      const result = parserService.parseHtml(html, 'otomoto');

      expect(result.pageType).toBe('search');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(2);
      
      const vehicles = result.data as any[];
      expect(vehicles[0]).toMatchObject({
        sourceId: '12345',
        sourceUrl: '/oferta/ford-focus-ID6ABC123.html',
        sourceTitle: 'Ford Focus 1.6 TDCi',
        sourceCreatedAt: '2023-10-01T10:00:00Z'
      });
    });

    it('should handle dynamic query hash keys in urqlState', () => {
      const searchData = {
        advertSearch: {
          edges: [
            {
              node: {
                id: '11111',
                url: '/test-url',
                title: 'Test Vehicle',
                createdAt: '2023-01-01T00:00:00Z'
              }
            }
          ]
        }
      };

      const nextData = {
        props: {
          pageProps: {
            urqlState: {
              'dynamic-key-xyz789': {
                data: JSON.stringify(searchData)
              },
              'another-key-456': {
                data: JSON.stringify({ someOtherData: true })
              }
            }
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      const result = parserService.parseHtml(html, 'otomoto');

      expect(result.pageType).toBe('search');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Otomoto Detail Page Parsing', () => {
    it('should parse complete vehicle details', () => {
      const advertData = {
        id: '12345678',
        title: 'Ford Transit Custom 320 L2H2 VA Trend',
        url: '/oferta/ford-transit-custom-ID6HG4T1.html',
        createdAt: '2023-09-28T13:11:56Z',
        price: {
          value: 70725,
          currency: 'PLN'
        },
        description: '<p>Witam mam do sprzedania Ford Transit Custom...</p>',
        seller: {
          name: 'Paweł',
          id: '1915462',
          type: 'PRIVATE',
          location: {
            address: 'Częstochowa, Lisiniec'
          },
          featuresBadges: [
            {
              code: 'registration-date',
              label: 'Sprzedający na OTOMOTO od 2015'
            }
          ]
        },
        details: [
          {
            label: 'Marka pojazdu',
            value: 'Ford'
          },
          {
            label: 'Model pojazdu',
            value: 'Transit Custom'
          },
          {
            label: 'Rok produkcji',
            value: '2017'
          },
          {
            label: 'Przebieg',
            value: '150 000 km'
          }
        ],
        equipment: [
          {
            label: 'Audio i multimedia',
            values: [
              { label: 'Interfejs Bluetooth' },
              { label: 'Radio' }
            ]
          },
          {
            label: 'Komfort i dodatki',
            values: [
              { label: 'Hak' },
              { label: 'Klimatyzacja manualna' }
            ]
          }
        ],
        images: {
          photos: [
            { url: 'https://example.com/photo1.jpg' },
            { url: 'https://example.com/photo2.jpg' }
          ]
        }
      };

      const nextData = {
        props: {
          pageProps: {
            advert: advertData
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      const result = parserService.parseHtml(html, 'otomoto');

      expect(result.pageType).toBe('detail');
      
      const vehicle = result.data as any;
      expect(vehicle.sourceId).toBe('12345678');
      expect(vehicle.sourceTitle).toBe('Ford Transit Custom 320 L2H2 VA Trend');
      expect(vehicle.pricePln).toBe(70725);
      expect(vehicle.priceEur).toBeCloseTo(16266.75, 2);
      expect(vehicle.sellerInfo.name).toBe('Paweł');
      expect(vehicle.sellerInfo.type).toBe('PRIVATE');
      
      // Check normalized data
      expect(vehicle.description).toBe('Witam mam do sprzedania Ford Transit Custom...');
      expect(vehicle.sourcePhotos).toEqual([
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg'
      ]);
      
      // Check direct field extraction
      expect(vehicle.year).toBe(2017);
      expect(vehicle.mileage).toBe(150000);
      
      // Check parameters conversion
      expect(vehicle.sourceParameters).toEqual({
        'Marka pojazdu': 'Ford',
        'Model pojazdu': 'Transit Custom',
        'Rok produkcji': '2017',
        'Przebieg': '150 000 km'
      });
      
      // Check equipment conversion
      expect(vehicle.sourceEquipment).toEqual({
        'Audio i multimedia': ['Interfejs Bluetooth', 'Radio'],
        'Komfort i dodatki': ['Hak', 'Klimatyzacja manualna']
      });
    });

    it('should handle various mileage formats correctly', () => {
      const testCases = [
        { input: '150 000 km', expected: 150000 },
        { input: '75,500 km', expected: 75500 },
        { input: '25000 km', expected: 25000 },
        { input: '100 000', expected: 100000 }, // Without km
        { input: '50 000 KM', expected: 50000 }, // Uppercase
        { input: 'invalid', expected: 0 }, // Invalid input
      ];

      testCases.forEach(({ input, expected }) => {
        const advertData = {
          id: 'test',
          title: 'Test',
          url: '/test',
          price: { value: 50000, currency: 'PLN' },
          description: 'Test',
          createdAt: '2023-01-01T00:00:00Z',
          seller: { name: 'Test', id: '1', type: 'PRIVATE', location: { address: 'Test' } },
          details: [{ label: 'Przebieg', value: input }],
          equipment: [],
          images: { photos: [] }
        };

        const nextData = { props: { pageProps: { advert: advertData } } };
        const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
        const result = parserService.parseHtml(html, 'otomoto');
        
        expect(result.data.mileage).toBe(expected);
      });
    });

    it('should handle missing or malformed data gracefully', () => {
      const incompleteData = {
        id: '99999',
        title: 'Incomplete Vehicle Data',
        // Missing price, seller, etc.
      };

      const nextData = {
        props: {
          pageProps: {
            advert: incompleteData
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      const result = parserService.parseHtml(html, 'otomoto');

      expect(result.pageType).toBe('detail');
      
      const vehicle = result.data as any;
      expect(vehicle.sourceId).toBe('99999');
      expect(vehicle.sourceTitle).toBe('Incomplete Vehicle Data');
      expect(vehicle.features).toEqual([]);
      expect(vehicle.status).toBe('new');
    });
  });

  describe('OLX CSS Parsing', () => {
    it('should parse vehicle details using CSS selectors', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OLX Vehicle</title>
          </head>
          <body>
            <h1 data-cy="ad_title">BMW X5 3.0d xDrive</h1>
            <div data-testid="ad-price-container">85 000 zł</div>
            <div data-cy="ad_description">
              Sprzedam BMW X5 w bardzo dobrym stanie.
              <br>Serwisowane w ASO.
            </div>
          </body>
        </html>
      `;

      const result = parserService.parseHtml(html, 'olx');

      expect(result.pageType).toBe('detail');
      
      const vehicle = result.data as any;
      expect(vehicle.title).toBe('BMW X5 3.0d xDrive');
      expect(vehicle.description).toContain('Sprzedam BMW X5 w bardzo dobrym stanie');
    });

    it('should handle missing CSS elements gracefully', () => {
      const html = `
        <html>
          <body>
            <h1>No matching selectors</h1>
          </body>
        </html>
      `;

      const result = parserService.parseHtml(html, 'olx');

      expect(result.pageType).toBe('detail');
      expect(result.data).toBeDefined();
    });
  });

  describe('Data Normalization Integration', () => {
    it('should normalize complex price formats', () => {
      const testCases = [
        { input: '50,000', expected: 50000 },
        { input: '75 500', expected: 75500 },
        { input: '120.000,50', expected: 120000.5 },
        { input: 'PLN 95,000', expected: 95000 }
      ];

      testCases.forEach(({ input, expected }) => {
        const nextData = {
          props: {
            pageProps: {
              advert: {
                id: '123',
                title: 'Test',
                price: { value: input }
              }
            }
          }
        };

        const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
        const result = parserService.parseHtml(html, 'otomoto') as { data: any };

        expect(result.data.pricePln).toBe(expected);
      });
    });

    it('should normalize image URLs correctly', () => {
      const nextData = {
        props: {
          pageProps: {
            advert: {
              id: '123',
              title: 'Test',
              images: {
                photos: [
                  { url: 'https://example.com/photo1.jpg' },
                  { url: '//cdn.example.com/photo2.jpg' },
                  { url: '/relative/photo3.jpg' },
                  { url: 'invalid-url' },
                  { url: '' }
                ]
              }
            }
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      const result = parserService.parseHtml(html, 'otomoto') as { data: any };

      expect(result.data.sourcePhotos).toEqual([
        'https://example.com/photo1.jpg',
        'https://cdn.example.com/photo2.jpg',
        '/relative/photo3.jpg'
      ]);
    });
  });

  describe('Performance and Error Recovery', () => {
    it('should handle large JSON structures efficiently', () => {
      const largeSearchData = {
        advertSearch: {
          edges: Array.from({ length: 100 }, (_, i) => ({
            node: {
              id: `id-${i}`,
              url: `/url-${i}`,
              title: `Vehicle ${i}`,
              createdAt: '2023-01-01T00:00:00Z'
            }
          }))
        }
      };

      const nextData = {
        props: {
          pageProps: {
            urqlState: {
              'large-query': {
                data: JSON.stringify(largeSearchData)
              }
            }
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      
      const startTime = Date.now();
      const result = parserService.parseHtml(html, 'otomoto');
      const endTime = Date.now();

      expect(result.pageType).toBe('search');
      expect(result.data).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should recover from malformed nested JSON gracefully', () => {
      const nextData = {
        props: {
          pageProps: {
            urqlState: {
              'malformed-key': {
                data: 'invalid json string'
              },
              'valid-key': {
                data: JSON.stringify({
                  advertSearch: {
                    edges: [{
                      node: {
                        id: '123',
                        url: '/test',
                        title: 'Test',
                        createdAt: '2023-01-01'
                      }
                    }]
                  }
                })
              }
            }
          }
        }
      };

      const html = `<script id="__NEXT_DATA__">${JSON.stringify(nextData)}</script>`;
      const result = parserService.parseHtml(html, 'otomoto');

      expect(result.pageType).toBe('search');
      expect(result.data).toHaveLength(1);
    });
  });
});
