import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { Vehicle, VehicleSource, SellerInfo, SellerType } from '@car-finder/types';
import { WorkspaceUtils } from '@car-finder/services';

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
  data: SearchResult[] | Partial<Vehicle> | any[];
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
    this.schemaPath = schemaPath || WorkspaceUtils.resolveSchemaFile('parser-schema.json');
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
    
    let nextData: any;
    
    // Handle different JSON extraction methods
    if (siteConfig.dataExtraction === 'window.__PRERENDERED_STATE__') {
      // OLX: Extract from window.__PRERENDERED_STATE__
      // Try multiple patterns to find the JSON data
      let match = html.match(/window\.__PRERENDERED_STATE__\s*=\s*"(.+?)";/s);
      
      if (!match) {
        // Try alternative pattern without quotes
        match = html.match(/window\.__PRERENDERED_STATE__\s*=\s*(.+?);/s);
      }
      
      if (!match) {
        // Debug: Check if the variable exists at all
        const hasVariable = html.includes('__PRERENDERED_STATE__');
        throw new Error(`window.__PRERENDERED_STATE__ not found. Variable exists in HTML: ${hasVariable}`);
      }
      
      try {
        let jsonString = match[1];
        
        // If the match includes quotes, it's a string that needs unescaping
        if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
          jsonString = jsonString.slice(1, -1); // Remove surrounding quotes
          
          // Unescape the JSON string
          jsonString = jsonString.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
          });
          jsonString = jsonString.replace(/\\"/g, '"');
          jsonString = jsonString.replace(/\\\\/g, '\\');
        }
        
        nextData = JSON.parse(jsonString);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse OLX JSON: ${errorMessage}. Raw match: ${match[1].substring(0, 200)}...`);
      }
    } else {
      // Otomoto: Extract from script tag
      const scriptSelector = siteConfig.scriptSelector || 'script#__NEXT_DATA__';
      const scriptContent = $(scriptSelector).html();
      
      if (!scriptContent) {
        throw new Error(`Script tag not found: ${scriptSelector}`);
      }

      try {
        nextData = JSON.parse(scriptContent);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse JSON from script tag: ${errorMessage}`);
      }
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
      // For OLX, extract complete vehicle data from search page
      if (siteConfig.dataExtraction === 'window.__PRERENDERED_STATE__') {
        return {
          pageType,
          data: this.extractOlxSearchVehicles(nextData, pageConfig)
        };
      } else {
        // For Otomoto, extract search results (URLs only)
        return {
          pageType,
          data: this.extractSearchResults(nextData, pageConfig)
        };
      }
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

    // Handle search pages differently from detail pages
    if (pageType === 'search') {
      return this.parseSearchPageWithCss($, pageConfig);
    } else {
      return this.parseDetailPageWithCss($, pageConfig, pageType);
    }
  }

  /**
   * Parse search page using CSS selectors to extract multiple vehicle URLs
   */
  private parseSearchPageWithCss($: cheerio.CheerioAPI, pageConfig: any): ParseResult {
    const selectors = pageConfig.selectors;
    const searchResults: SearchResult[] = [];

    // Find all listing items
    const listItems = $(selectors.listItems);
    
    listItems.each((_, listItem) => {
      try {
        const $item = $(listItem);
        
        // Extract URL - look for link within this item
        const linkElement = $item.find(selectors.sourceUrl);
        let sourceUrl = linkElement.attr('href') || '';
        
        // Convert relative URLs to absolute URLs for OLX
        if (sourceUrl && sourceUrl.startsWith('/d/oferta/')) {
          sourceUrl = `https://www.olx.pl${sourceUrl}`;
        }
        
        // Extract title
        const titleElement = $item.find(selectors.sourceTitle);
        const sourceTitle = titleElement.text().trim() || '';
        
        // Extract ID from the list item or URL
        let sourceId = '';
        if (selectors.sourceId) {
          sourceId = $item.attr('id') || '';
        }
        if (!sourceId && sourceUrl) {
          // Extract ID from URL pattern like /d/oferta/title-CID5-ID17J4yI.html
          const idMatch = sourceUrl.match(/ID([^.]+)/);
          sourceId = idMatch ? idMatch[1] : '';
        }

        // Only add if we have essential data
        if (sourceUrl && sourceTitle) {
          searchResults.push({
            sourceId: sourceId || sourceUrl,
            sourceUrl,
            sourceTitle,
            sourceCreatedAt: new Date().toISOString() // Default to current time
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to parse search result item: ${errorMessage}`);
      }
    });

    return {
      pageType: 'search',
      data: searchResults
    };
  }

  /**
   * Parse detail page using CSS selectors to extract single vehicle data
   */
  private parseDetailPageWithCss($: cheerio.CheerioAPI, pageConfig: any, pageType: PageType): ParseResult {
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
            
            // Apply special normalization for date fields
            if (field === 'sourceCreatedAt' && value) {
              value = this.normalizeDateString(value);
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
    const { autoDetection } = siteConfig;
    if (!autoDetection) {
      throw new Error('Auto-detection configuration missing');
    }

    // Handle OLX structure (different from Otomoto)
    if (siteConfig.dataExtraction === 'window.__PRERENDERED_STATE__') {
      // For OLX, check for listing.ads (search) or ad.ad (detail)
      if (autoDetection.searchPageIndicator === 'listing.ads' && this.getNestedValue(nextData, 'listing.ads')) {
        return 'search';
      }
      if (autoDetection.detailPageIndicator === 'ad.ad' && this.getNestedValue(nextData, 'ad.ad')) {
        return 'detail';
      }
    } else {
      // Handle Otomoto structure
      const pageProps = nextData?.props?.pageProps;
      
      if (!pageProps) {
        throw new Error('Invalid JSON structure: missing props.pageProps');
      }

      // Check for detail page indicator (direct property check)
      if (autoDetection.detailPageIndicator === 'props.pageProps.advert' && pageProps.advert) {
        return 'detail';
      }

      // Check for search page indicator (direct property check)
      if (autoDetection.searchPageIndicator === 'props.pageProps.urqlState' && pageProps.urqlState) {
        return 'search';
      }
    }

    throw new Error('Unknown page type - neither search nor detail indicators found');
  }

  /**
   * Extract complete vehicle data from OLX search page
   */
  private extractOlxSearchVehicles(nextData: any, pageConfig: any): any[] {
    const basePath = pageConfig.basePath;
    const ads = this.getNestedValue(nextData, basePath);
    
    if (!Array.isArray(ads)) {
      throw new Error(`OLX ads not found at path: ${basePath}`);
    }

    const vehicles: any[] = [];
    const fields = pageConfig.fields;
    const parameterMapping = pageConfig.parameterMapping || {};

    for (const ad of ads) {
      const vehicle: any = {};
      
      // Extract basic fields
      for (const [vehicleField, jsonPath] of Object.entries(fields)) {
        const value = this.getNestedValue(ad, jsonPath as string);
        if (value !== undefined && value !== null) {
          if (vehicleField === 'sourceCreatedAt' && typeof value === 'string') {
            vehicle[vehicleField] = this.normalizeDateString(value);
          } else if (vehicleField === 'sourcePhotos' && Array.isArray(value)) {
            vehicle[vehicleField] = value.map((photo: any) => photo.url || photo).filter(Boolean);
          } else if (vehicleField === 'sourceParameters' && Array.isArray(value)) {
            // Handle parameters separately
            vehicle.sourceParameters = this.extractOlxParameters(value, parameterMapping);
            
            // Extract specific vehicle fields from parameters
            this.mapOlxParametersToVehicleFields(value, vehicle, parameterMapping);
          } else {
            vehicle[vehicleField] = value;
          }
        }
      }

      // Convert price to EUR if PLN
      if (vehicle.pricePln && typeof vehicle.pricePln === 'number') {
        vehicle.priceEur = Math.round(vehicle.pricePln * 0.23); // Use configured rate
      }

      vehicles.push(vehicle);
    }

    return vehicles;
  }

  /**
   * Extract and format OLX parameters
   */
  private extractOlxParameters(params: any[], parameterMapping: Record<string, string>): Record<string, any> {
    const parameters: Record<string, any> = {};
    
    for (const param of params) {
      if (param.key && param.value) {
        parameters[param.key] = param.value;
      }
    }
    
    return parameters;
  }

  /**
   * Map OLX parameters to specific vehicle fields
   */
  private mapOlxParametersToVehicleFields(params: any[], vehicle: any, parameterMapping: Record<string, string>): void {
    for (const param of params) {
      if (!param.key || !param.value) continue;
      
      // Map known parameters to vehicle fields
      switch (param.key) {
        case parameterMapping.year || 'rok-produkcji':
          const year = parseInt(param.value);
          if (!isNaN(year)) vehicle.year = year;
          break;
          
        case parameterMapping.mileage || 'przebieg-pojazdu':
          const mileageStr = param.value.replace(/\D/g, ''); // Remove non-digits
          const mileage = parseInt(mileageStr);
          if (!isNaN(mileage)) vehicle.mileage = mileage;
          break;
          
        case parameterMapping.fuelType || 'rodzaj-paliwa':
          vehicle.fuelType = param.value;
          break;
          
        case parameterMapping.transmission || 'skrzynia-biegow':
          vehicle.transmission = param.value;
          break;
      }
    }
  }

  /**
   * Extract search results from JSON data (Otomoto)
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
        } else if (field === 'year' && value) {
          // Convert year to number
          const yearNum = parseInt(String(value), 10);
          value = isNaN(yearNum) ? 0 : yearNum;
        } else if (field === 'mileage' && value) {
          // Convert mileage to number, handle Polish formatting (spaces, commas, "km" suffix)
          const mileageStr = String(value)
            .replace(/\s+km$/i, '') // Remove "km" suffix (case insensitive)
            .replace(/[\s,]/g, ''); // Remove spaces and commas
          const mileageNum = parseInt(mileageStr, 10);
          value = isNaN(mileageNum) ? 0 : mileageNum;
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
   * Supports array selectors like: details[label=Rok produkcji].value
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (!current) return undefined;
      
      // Handle array selector syntax: arrayName[property=value]
      const arrayMatch = key.match(/^(\w+)\[(\w+)=(.+)\]$/);
      if (arrayMatch) {
        const [, arrayName, property, value] = arrayMatch;
        const array = current[arrayName];
        if (Array.isArray(array)) {
          return array.find((item: any) => item[property] === value);
        }
        return undefined;
      }
      
      // Regular property access
      return current[key] !== undefined ? current[key] : undefined;
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
   * Normalize date strings from various formats to ISO string
   */
  private normalizeDateString(dateText: string): string {
    if (!dateText) return new Date().toISOString();
    
    const cleanText = this.normalizeTextContent(dateText).toLowerCase();
    const now = new Date();
    
    // Handle Polish relative dates from OLX
    if (cleanText.includes('dzisiaj') || cleanText.includes('today')) {
      // "Dzisiaj o 07:18" -> today with time
      const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        return date.toISOString();
      }
      return now.toISOString();
    }
    
    if (cleanText.includes('wczoraj') || cleanText.includes('yesterday')) {
      // "Wczoraj o 15:30" -> yesterday with time
      const timeMatch = cleanText.match(/(\d{1,2}):(\d{2})/);
      const date = new Date(now);
      date.setDate(date.getDate() - 1);
      if (timeMatch) {
        const [, hours, minutes] = timeMatch;
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }
      return date.toISOString();
    }
    
    // Handle "X dni temu" (X days ago)
    const daysAgoMatch = cleanText.match(/(\d+)\s*(dni?|days?)\s*(temu|ago)/);
    if (daysAgoMatch) {
      const daysAgo = parseInt(daysAgoMatch[1], 10);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString();
    }
    
    // Handle "X tygodni temu" (X weeks ago)
    const weeksAgoMatch = cleanText.match(/(\d+)\s*(tygodni?|weeks?)\s*(temu|ago)/);
    if (weeksAgoMatch) {
      const weeksAgo = parseInt(weeksAgoMatch[1], 10);
      const date = new Date(now);
      date.setDate(date.getDate() - (weeksAgo * 7));
      return date.toISOString();
    }
    
    // Handle Polish month names (e.g., "02 października 2025")
    const polishMonths: Record<string, number> = {
      'stycznia': 0, 'lutego': 1, 'marca': 2, 'kwietnia': 3, 'maja': 4, 'czerwca': 5,
      'lipca': 6, 'sierpnia': 7, 'września': 8, 'października': 9, 'listopada': 10, 'grudnia': 11
    };
    
    const polishDateMatch = cleanText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (polishDateMatch) {
      const [, day, monthName, year] = polishDateMatch;
      const monthIndex = polishMonths[monthName.toLowerCase()];
      if (monthIndex !== undefined) {
        const date = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    
    // Try to parse as standard date format
    const parsedDate = new Date(dateText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    // Fallback to current date if parsing fails
    console.warn(`Could not parse date: "${dateText}", using current date`);
    return now.toISOString();
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
