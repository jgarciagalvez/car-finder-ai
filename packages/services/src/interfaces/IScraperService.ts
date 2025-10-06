/**
 * Interface contract for web scraping services
 * Abstracts the ScraperService implementation for testing and dependency injection
 */
export interface ScraperConfig {
  /** Delay between requests in milliseconds (default: 1000-3000ms random) */
  delayRange: { min: number; max: number };
  /** Request timeout in milliseconds (default: 30000ms) */
  timeout: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries: number;
  /** Whether to use stealth mode configurations (default: true) */
  stealthMode: boolean;
  /** Custom user agents to rotate through */
  userAgents?: string[];
}

export interface ScrapingResult {
  /** The scraped HTML content */
  html: string;
  /** The final URL after any redirects */
  finalUrl: string;
  /** HTTP status code */
  statusCode: number;
  /** Time taken to scrape in milliseconds */
  scrapingTime: number;
}

export interface BrowserStats {
  isInitialized: boolean;
  requestCount: number;
  lastRequestTime: number;
}

export interface IScraperService {
  /**
   * Initializes the browser with best-practice configurations
   */
  initialize(): Promise<void>;

  /**
   * Scrapes a URL and returns the HTML content with retry logic
   */
  scrapeUrl(url: string): Promise<ScrapingResult>;

  /**
   * Gets browser statistics
   */
  getBrowserStats(): BrowserStats;

  /**
   * Closes the browser and cleans up resources
   */
  close(): Promise<void>;

  /**
   * Restarts the browser (useful for long-running processes)
   */
  restart(): Promise<void>;
}
