// Basic test to verify Jest setup and core functionality
describe('Ingestion Pipeline Basic Tests', () => {
  describe('Configuration Validation', () => {
    it('should validate search configuration structure', () => {
      const validConfig = {
        searchUrls: {
          otomoto: [
            {
              name: 'Test BMW Search',
              url: 'https://www.otomoto.pl/test',
              description: 'Test search'
            }
          ],
          olx: []
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

      // Test configuration structure
      expect(validConfig.searchUrls).toBeDefined();
      expect(validConfig.ingestionSettings).toBeDefined();
      expect(validConfig.currencyConversion).toBeDefined();
      
      expect(validConfig.searchUrls.otomoto).toBeInstanceOf(Array);
      expect(validConfig.searchUrls.olx).toBeInstanceOf(Array);
      
      expect(validConfig.ingestionSettings.maxPagesPerSearch).toBeGreaterThan(0);
      expect(validConfig.ingestionSettings.delayBetweenRequests.min).toBeGreaterThan(0);
      expect(validConfig.ingestionSettings.delayBetweenRequests.max).toBeGreaterThan(validConfig.ingestionSettings.delayBetweenRequests.min);
      
      expect(validConfig.currencyConversion.plnToEurRate).toBeGreaterThan(0);
      expect(validConfig.currencyConversion.plnToEurRate).toBeLessThan(1);
    });

    it('should identify invalid configuration', () => {
      const invalidConfigs = [
        {}, // Empty config
        { searchUrls: {} }, // Missing ingestionSettings
        { 
          searchUrls: { otomoto: [], olx: [] },
          ingestionSettings: {} // Missing required settings
        },
        {
          searchUrls: { otomoto: [], olx: [] },
          ingestionSettings: {
            maxPagesPerSearch: -1, // Invalid value
            delayBetweenRequests: { min: 100, max: 200 },
            retryAttempts: 2,
            batchSize: 5,
            enableDeduplication: true
          }
        }
      ];

      invalidConfigs.forEach(config => {
        const hasRequiredSections = config.searchUrls && config.ingestionSettings;
        const hasValidSettings = hasRequiredSections && 
          config.ingestionSettings.maxPagesPerSearch > 0;
        
        expect(hasRequiredSections && hasValidSettings).toBeFalsy();
      });
    });
  });

  describe('URL Processing Logic', () => {
    it('should extract ID from Otomoto URLs', () => {
      const extractOtomotoId = (url: string): string => {
        const match = url.match(/ID(\d+)\.html/);
        return match ? match[1] : url.split('/').pop() || url;
      };

      expect(extractOtomotoId('https://www.otomoto.pl/oferta/bmw-320d-ID12345678.html')).toBe('12345678');
      expect(extractOtomotoId('https://www.otomoto.pl/oferta/audi-a4-ID87654321.html')).toBe('87654321');
      expect(extractOtomotoId('https://example.com/fallback')).toBe('fallback');
    });

    it('should extract ID from OLX URLs', () => {
      const extractOlxId = (url: string): string => {
        const match = url.match(/ID(\d+)/);
        return match ? match[1] : url.split('/').pop() || url;
      };

      expect(extractOlxId('https://www.olx.pl/oferta/bmw-320d-ID987654321')).toBe('987654321');
      expect(extractOlxId('https://www.olx.pl/oferta/audi-a4-ID123456789')).toBe('123456789');
      expect(extractOlxId('https://example.com/fallback')).toBe('fallback');
    });

    it('should deduplicate URLs correctly', () => {
      const deduplicateUrls = (urls: { url: string; source: string }[]): { url: string; source: string }[] => {
        const seen = new Set<string>();
        return urls.filter(item => {
          if (seen.has(item.url)) {
            return false;
          }
          seen.add(item.url);
          return true;
        });
      };

      const urls = [
        { url: 'https://example.com/1', source: 'otomoto' },
        { url: 'https://example.com/2', source: 'otomoto' },
        { url: 'https://example.com/1', source: 'olx' }, // duplicate
        { url: 'https://example.com/3', source: 'olx' }
      ];

      const result = deduplicateUrls(urls);
      expect(result).toHaveLength(3);
      expect(result.map(item => item.url)).toEqual([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3'
      ]);
    });
  });

  describe('Data Transformation Logic', () => {
    it('should convert PLN to EUR correctly', () => {
      const convertPlnToEur = (pln: number, rate: number): number => {
        return Math.round(pln * rate);
      };

      expect(convertPlnToEur(25000, 0.23)).toBe(5750);
      expect(convertPlnToEur(30000, 0.23)).toBe(6900);
      expect(convertPlnToEur(0, 0.23)).toBe(0);
    });

    it('should create proper vehicle data structure', () => {
      const createVehicleData = (parsedData: any, url: string, source: string) => {
        const now = new Date();
        const pricePln = parsedData.pricePln || 0;
        const priceEur = Math.round(pricePln * 0.23);

        return {
          id: 'test-uuid',
          source,
          sourceId: parsedData.sourceId || 'unknown',
          sourceUrl: url,
          sourceCreatedAt: parsedData.sourceCreatedAt || now,
          title: parsedData.title || parsedData.sourceTitle || 'Unknown Vehicle',
          pricePln,
          priceEur,
          year: parsedData.year || 0,
          mileage: parsedData.mileage || 0,
          status: 'new',
          createdAt: now,
          scrapedAt: now,
          updatedAt: now
        };
      };

      const parsedData = {
        sourceId: '12345',
        sourceTitle: 'BMW 320d',
        pricePln: 25000,
        year: 2010,
        mileage: 150000
      };

      const result = createVehicleData(parsedData, 'https://example.com/12345', 'otomoto');

      expect(result).toMatchObject({
        source: 'otomoto',
        sourceId: '12345',
        sourceUrl: 'https://example.com/12345',
        title: 'BMW 320d',
        pricePln: 25000,
        priceEur: 5750,
        year: 2010,
        mileage: 150000,
        status: 'new'
      });
    });

    it('should handle missing data gracefully', () => {
      const createVehicleData = (parsedData: any, url: string, source: string) => {
        const now = new Date();
        const pricePln = parsedData.pricePln || 0;
        const priceEur = Math.round(pricePln * 0.23);

        return {
          id: 'test-uuid',
          source,
          sourceId: parsedData.sourceId || 'unknown',
          sourceUrl: url,
          title: parsedData.title || parsedData.sourceTitle || 'Unknown Vehicle',
          pricePln,
          priceEur,
          year: parsedData.year || 0,
          mileage: parsedData.mileage || 0,
          status: 'new'
        };
      };

      const result = createVehicleData({}, 'https://example.com/test', 'olx');

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
  });

  describe('Error Handling Logic', () => {
    it('should handle retry logic correctly', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const mockOperation = async (): Promise<string> => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return 'success';
      };

      const executeWithRetry = async (operation: () => Promise<string>, maxRetries: number): Promise<string | null> => {
        let retryCount = 0;
        
        while (retryCount <= maxRetries) {
          try {
            return await operation();
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              return null;
            }
          }
        }
        return null;
      };

      const result = await executeWithRetry(mockOperation, maxRetries);
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attemptCount = 0;
      const maxRetries = 2;

      const mockOperation = async (): Promise<string> => {
        attemptCount++;
        throw new Error('Persistent error');
      };

      const executeWithRetry = async (operation: () => Promise<string>, maxRetries: number): Promise<string | null> => {
        let retryCount = 0;
        
        while (retryCount <= maxRetries) {
          try {
            return await operation();
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              return null;
            }
          }
        }
        return null;
      };

      const result = await executeWithRetry(mockOperation, maxRetries);
      expect(result).toBeNull();
      expect(attemptCount).toBe(3); // Initial attempt + 2 retries
    });
  });
});
