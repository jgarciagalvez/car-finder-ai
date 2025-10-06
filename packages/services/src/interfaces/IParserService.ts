import { Vehicle } from '@car-finder/types';

/**
 * Interface contract for HTML parsing services
 * Abstracts the ParserService implementation for testing and dependency injection
 */
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

export interface IParserService {
  /**
   * Parse HTML content and return structured data with auto-detected page type
   */
  parseHtml(html: string, siteKey: string, expectedType?: PageType): ParseResult;

  /**
   * Reload schema from file (useful for testing or dynamic updates)
   */
  reloadSchema(): void;
}
