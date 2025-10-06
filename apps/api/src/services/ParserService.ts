import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { Vehicle, VehicleSource, SellerInfo, SellerType } from '@car-finder/types';

// Parser-specific types
export type PageType = 'search' | 'detail';

export interface SearchResult {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceCreatedAt: string;
}

export interface ParseResult {
  pageType: PageType;
  data: SearchResult[] | Partial<Vehicle>;
}

interface ParserSchema {
  sites: {
    [siteKey: string]: {
      method: 'json' | 'css';
      scriptSelector?: string;
      autoDetection?: {
        searchPageIndicator: string;
        detailPageIndicator: string;
      };
      pageTypes: {
        [pageType: string]: {
          basePath?: string;
          dataPath?: string;
          listPath?: string;
          fields?: Record<string, string>;
          selectors?: Record<string, string>;
        };
      };
    };
  };
}

export class ParserService {
  private schema!: ParserSchema; // Definite assignment assertion - initialized in loadSchema()
  private schemaPath: string;

  constructor(schemaPath?: string) {
    this.schemaPath = schemaPath || path.join(process.cwd(), 'parser-schema.json');
    this.loadSchema();
  }

  /**
   * Load and validate the parser schema from JSON file
   */
  private loadSchema(): void {
    try {
      if (!fs.existsSync(this.schemaPath)) {
        throw new Error(`Parser schema file not found: ${this.schemaPath}`);
      }

      const schemaContent = fs.readFileSync(this.schemaPath, 'utf-8');
      this.schema = JSON.parse(schemaContent);

      // Basic validation
      if (!this.schema.sites || typeof this.schema.sites !== 'object') {
        throw new Error('Invalid schema: missing or invalid sites configuration');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to load parser schema: ${errorMessage}`);
    }
  }

  /**
   * Parse HTML content and return structured data with auto-detected page type
   */
  public parseHtml(html: string, siteKey: string, expectedType?: PageType): ParseResult {
    const siteConfig = this.schema.sites[siteKey];
    if (!siteConfig) {
      throw new Error(`No configuration found for site: ${siteKey}`);
    }

    if (siteConfig.method === 'json') {
      return this.parseWithJson(html, siteConfig, expectedType);
    } else if (siteConfig.method === 'css') {
      return this.parseWithCss(html, siteConfig, expectedType);
    } else {
      throw new Error(`Unsupported parsing method: ${siteConfig.method}`);
    }
  }

  /**
   * Parse HTML using JSON extraction method (for Otomoto)
   */
  private parseWithJson(html: string, siteConfig: any, expectedType?: PageType): ParseResult {
    const $ = cheerio.load(html);
    
    // Extract JSON from script tag
    const scriptSelector = siteConfig.scriptSelector || 'script#__NEXT_DATA__';
    const scriptContent = $(scriptSelector).html();
    
    if (!scriptContent) {
      throw new Error(`Script tag not found: ${scriptSelector}`);
    }

    let nextData: any;
    try {
      nextData = JSON.parse(scriptContent);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse JSON from script tag: ${errorMessage}`);
    }

    // Auto-detect page type
    const pageType = this.detectPageType(nextData, siteConfig);
    
    // Validate against expected type if provided
    if (expectedType && pageType !== expectedType) {
      throw new Error(`Page type mismatch: expected ${expectedType}, detected ${pageType}`);
    }

    const pageConfig = siteConfig.pageTypes[pageType];
    if (!pageConfig) {
      throw new Error(`No configuration found for page type: ${pageType}`);
    }

    if (pageType === 'search') {
      return {
        pageType,
        data: this.extractSearchResults(nextData, pageConfig)
      };
    } else {
      const rawData = this.extractDetailData(nextData, pageConfig);
      return {
        pageType,
        data: this.normalizeVehicleData(rawData)
      };
    }
  }

  /**
   * Parse HTML using CSS selectors method (for OLX and fallback)
   */
  private parseWithCss(html: string, siteConfig: any, expectedType?: PageType): ParseResult {
    const $ = cheerio.load(html);
    
    // For CSS method, we assume detail page unless specified
    const pageType: PageType = expectedType || 'detail';
    const pageConfig = siteConfig.pageTypes[pageType];
    
    if (!pageConfig || !pageConfig.selectors) {
      throw new Error(`No CSS selectors found for page type: ${pageType}`);
    }

    const data: Partial<Vehicle> = {};
    
    // Extract data using CSS selectors
    for (const [field, selector] of Object.entries(pageConfig.selectors)) {
      try {
        const element = $(selector as string);
        if (element.length > 0) {
          if (field === 'sourcePhotos') {
            // Handle multiple images
            const photos: string[] = [];
            element.each((_, el) => {
              const src = $(el).attr('src') || $(el).attr('data-src');
              if (src) photos.push(src);
            });
            (data as any)[field] = photos;
          } else {
            // Handle single values
            let value = element.text().trim();
            if (!value && (element.attr('href') || element.attr('content'))) {
              value = element.attr('href') || element.attr('content') || '';
            }
            (data as any)[field] = value;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to extract field ${field} with selector ${selector}: ${errorMessage}`);
      }
    }

    return {
      pageType,
      data: this.normalizeVehicleData(data)
    };
  }

  /**
   * Auto-detect page type based on JSON structure
   */
  private detectPageType(nextData: any, siteConfig: any): PageType {
    const pageProps = nextData?.props?.pageProps;
    
    if (!pageProps) {
      throw new Error('Invalid JSON structure: missing props.pageProps');
    }

    const { autoDetection } = siteConfig;
    if (!autoDetection) {
      throw new Error('Auto-detection configuration missing');
    }

    // Check for detail page indicator (direct property check)
    if (autoDetection.detailPageIndicator === 'props.pageProps.advert' && pageProps.advert) {
      return 'detail';
    }

    // Check for search page indicator (direct property check)
    if (autoDetection.searchPageIndicator === 'props.pageProps.urqlState' && pageProps.urqlState) {
      return 'search';
    }

    throw new Error('Unknown page type - neither search nor detail indicators found');
  }

  /**
   * Extract search results from JSON data
   */
  private extractSearchResults(nextData: any, pageConfig: any): SearchResult[] {
    const basePath = pageConfig.basePath;
    const dataPath = pageConfig.dataPath;
    const listPath = pageConfig.listPath;
    
    // Navigate to urqlState
    const urqlState = this.getNestedValue(nextData, basePath);
    if (!urqlState) {
      throw new Error(`Base path not found: ${basePath}`);
    }

    // Find the dynamic key containing search data
    let searchData: any = null;
    for (const key in urqlState) {
      const stateData = urqlState[key];
      if (stateData && stateData[dataPath]) {
        try {
          const parsedData = JSON.parse(stateData[dataPath]);
          if (this.getNestedValue(parsedData, listPath)) {
            searchData = parsedData;
            break;
          }
        } catch (error) {
          // Continue searching other keys
        }
      }
    }

    if (!searchData) {
      throw new Error('Search data not found in urqlState');
    }

    // Extract the list of results
    const resultsList = this.getNestedValue(searchData, listPath);
    if (!Array.isArray(resultsList)) {
      throw new Error(`Results list not found or invalid: ${listPath}`);
    }

    // Map results using field configuration
    return resultsList.map((item: any) => {
      const result: SearchResult = {
        sourceId: '',
        sourceUrl: '',
        sourceTitle: '',
        sourceCreatedAt: ''
      };

      for (const [field, path] of Object.entries(pageConfig.fields)) {
        const value = this.getNestedValue(item, path as string);
        if (value !== undefined) {
          (result as any)[field] = String(value);
        }
      }

      return result;
    });
  }

  /**
   * Extract detailed vehicle data from JSON
   */
  private extractDetailData(nextData: any, pageConfig: any): Partial<Vehicle> {
    const basePath = pageConfig.basePath;
    const advertData = this.getNestedValue(nextData, basePath);
    
    if (!advertData) {
      throw new Error(`Advert data not found at: ${basePath}`);
    }

    const result: Partial<Vehicle> = {};
    const sellerData: Partial<SellerInfo> = {};

    // Extract basic fields
    for (const [field, path] of Object.entries(pageConfig.fields)) {
      if (typeof path === 'string') {
        let value = this.getNestedValue(advertData, path);
        
        // Handle special cases
        if (field === 'memberSince' && path.includes('[code=registration-date]')) {
          // Handle complex selector for member since
          const badges = advertData.seller?.featuresBadges;
          if (Array.isArray(badges)) {
            const regBadge = badges.find((badge: any) => badge.code === 'registration-date');
            value = regBadge?.label;
          }
        } else if (field === 'sourceParameters' && Array.isArray(value)) {
          // Convert details array to key-value object
          const params: Record<string, string> = {};
          value.forEach((item: any) => {
            if (item.label && item.value) {
              params[item.label] = item.value;
            }
          });
          value = params;
        } else if (field === 'sourceEquipment' && Array.isArray(value)) {
          // Convert equipment array to categorized object
          const equipment: Record<string, string[]> = {};
          value.forEach((item: any) => {
            if (item.label && Array.isArray(item.values)) {
              equipment[item.label] = item.values.map((v: any) => v.label || v);
            }
          });
          value = equipment;
        } else if (field === 'sourcePhotos' && Array.isArray(value)) {
          // Extract URLs from photos array
          value = value.map((photo: any) => photo.url || photo).filter(Boolean);
        }

        // Handle seller-related fields
        if (field === 'sellerName') {
          sellerData.name = value || null;
        } else if (field === 'sellerId') {
          sellerData.id = value || null;
        } else if (field === 'sellerType') {
          sellerData.type = (value as SellerType) || null;
        } else if (field === 'sellerLocation') {
          sellerData.location = value || null;
        } else if (field === 'memberSince') {
          sellerData.memberSince = value || null;
        } else if (value !== undefined) {
          (result as any)[field] = value;
        }
      }
    }

    // Construct SellerInfo object if we have any seller data
    if (Object.keys(sellerData).length > 0) {
      result.sellerInfo = {
        name: sellerData.name || null,
        id: sellerData.id || null,
        type: sellerData.type || null,
        location: sellerData.location || null,
        memberSince: sellerData.memberSince || null
      };
    }

    return result;
  }

  /**
   * Get nested value from object using dot notation path
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Normalize and convert price from PLN to EUR
   */
  private normalizePriceData(pricePln: string | number, priceCurrency?: string): { pricePln: number; priceEur: number } {
    let numericPrice: number;
    
    if (typeof pricePln === 'string') {
      // Remove non-numeric characters except decimal points and commas
      let cleanPrice = pricePln.replace(/[^\d.,]/g, '');
      
      // Handle different number formats
      if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
        // Format like "120.000,50" - comma is decimal separator
        cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
      } else if (cleanPrice.includes(',')) {
        // Check if comma is thousands separator or decimal separator
        const parts = cleanPrice.split(',');
        if (parts.length === 2 && parts[1].length <= 2 && parts[0].length <= 3) {
          // Likely decimal separator: "50,00" -> "50.00"
          cleanPrice = cleanPrice.replace(',', '.');
        } else {
          // Likely thousands separator: "50,000" -> "50000"
          cleanPrice = cleanPrice.replace(/,/g, '');
        }
      }
      
      numericPrice = parseFloat(cleanPrice) || 0;
    } else {
      numericPrice = pricePln || 0;
    }

    // Simple PLN to EUR conversion (should be updated with real exchange rate)
    const PLN_TO_EUR_RATE = 0.23; // Approximate rate - should be fetched from API
    const priceEur = Math.round(numericPrice * PLN_TO_EUR_RATE * 100) / 100;

    return {
      pricePln: numericPrice,
      priceEur
    };
  }

  /**
   * Clean and normalize text content
   */
  private normalizeTextContent(text: string): string {
    if (!text) return '';
    
    // Remove HTML tags
    const withoutHtml = text.replace(/<[^>]*>/g, '');
    
    // Normalize whitespace
    const normalized = withoutHtml
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Handle common encoding issues
    return normalized
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Validate and normalize image URLs
   */
  private normalizeImageUrls(urls: string[]): string[] {
    if (!Array.isArray(urls)) return [];
    
    return urls
      .filter(url => typeof url === 'string' && url.trim())
      .map(url => {
        let normalized = url.trim();
        
        // Handle relative URLs
        if (normalized.startsWith('//')) {
          normalized = 'https:' + normalized;
        } else if (normalized.startsWith('/')) {
          // Would need base URL - for now just return as is
          return normalized;
        }
        
        // Validate URL format
        try {
          new URL(normalized);
          return normalized;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];
  }

  /**
   * Apply data normalization to parsed vehicle data
   */
  private normalizeVehicleData(data: Partial<Vehicle>): Partial<Vehicle> {
    const normalized = { ...data };

    // Normalize price data
    if (data.pricePln !== undefined) {
      const priceData = this.normalizePriceData(data.pricePln as any);
      normalized.pricePln = priceData.pricePln;
      normalized.priceEur = priceData.priceEur;
    }

    // Normalize text fields
    if (data.sourceTitle) {
      normalized.sourceTitle = this.normalizeTextContent(data.sourceTitle);
      normalized.title = normalized.sourceTitle; // Use as processed title initially
    }

    if (data.sourceDescriptionHtml) {
      normalized.sourceDescriptionHtml = data.sourceDescriptionHtml; // Keep original
      normalized.description = this.normalizeTextContent(data.sourceDescriptionHtml);
    }

    // Normalize image URLs
    if (data.sourcePhotos) {
      normalized.sourcePhotos = this.normalizeImageUrls(data.sourcePhotos);
      normalized.photos = normalized.sourcePhotos; // Use as processed photos initially
    }

    // Handle dates
    if (data.sourceCreatedAt && typeof data.sourceCreatedAt === 'string') {
      try {
        normalized.sourceCreatedAt = new Date(data.sourceCreatedAt) as any;
      } catch {
        // Keep original if parsing fails
      }
    }

    // Set default values for missing fields
    normalized.features = normalized.features || [];
    normalized.status = normalized.status || 'new';
    normalized.personalNotes = normalized.personalNotes || null;

    // Set timestamps
    const now = new Date();
    normalized.scrapedAt = now as any;
    normalized.createdAt = normalized.createdAt || (now as any);
    normalized.updatedAt = now as any;

    return normalized;
  }

  /**
   * Handle missing or malformed data gracefully
   */
  private handleMissingData(data: any, field: string, defaultValue: any = null): any {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      console.warn(`Missing or empty field: ${field}, using default value`);
      return defaultValue;
    }
    return data[field];
  }

  /**
   * Reload schema from file (useful for testing or dynamic updates)
   */
  public reloadSchema(): void {
    this.loadSchema();
  }
}
