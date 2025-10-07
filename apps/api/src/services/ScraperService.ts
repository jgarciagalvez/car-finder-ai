import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';

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

export class ScraperService {
  private browser: Browser | null = null;
  private config: ScraperConfig;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;

  private readonly defaultUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  constructor(config?: Partial<ScraperConfig>) {
    this.config = {
      delayRange: { min: 1000, max: 3000 },
      timeout: 30000,
      maxRetries: 3,
      stealthMode: true,
      ...config
    };
  }

  /**
   * Initializes the browser with best-practice configurations
   */
  public async initialize(): Promise<void> {
    if (this.browser) {
      console.log('⚠️ Browser already initialized');
      return;
    }

    try {
      const launchOptions: PuppeteerLaunchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };

      this.browser = await puppeteer.launch(launchOptions);
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a new page with stealth configurations
   */
  private async createStealthPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const page = await this.browser.newPage();

    if (this.config.stealthMode) {
      // Set a random user agent
      const userAgents = this.config.userAgents || this.defaultUserAgents;
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUserAgent);

      // Set realistic viewport
      await page.setViewport({
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100)
      });

      // Block images and CSS for faster loading
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Override webdriver detection
      await page.evaluateOnNewDocument(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Mock chrome property
        (window as any).chrome = {
          runtime: {},
        };

        // Mock permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);
      });
    }

    return page;
  }

  /**
   * Implements respectful delays between requests
   */
  private async respectfulDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const { min, max } = this.config.delayRange;
    const requiredDelay = Math.floor(Math.random() * (max - min + 1)) + min;

    if (timeSinceLastRequest < requiredDelay) {
      const waitTime = requiredDelay - timeSinceLastRequest;
      console.log(`⏳ Waiting ${waitTime}ms before next request (respectful delay)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Scrapes a URL and returns the HTML content with retry logic
   */
  public async scrapeUrl(url: string): Promise<ScrapingResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔍 Scraping attempt ${attempt}/${this.config.maxRetries}: ${url}`);
        
        // Respectful delay before request
        await this.respectfulDelay();
        
        const startTime = Date.now();
        const page = await this.createStealthPage();

        try {
          // Navigate to the URL with timeout
          const response = await page.goto(url, {
            waitUntil: 'networkidle0', // Wait until network is idle
            timeout: this.config.timeout
          });

          if (!response) {
            throw new Error('No response received from the page');
          }

          // For OLX pages, wait for dynamic content to load
          if (url.includes('olx.pl')) {
            try {
              // Wait for either __PRERENDERED_STATE__ or visible content
              await Promise.race([
                // Wait for the JSON data to be available
                page.waitForFunction(() => (window as any).__PRERENDERED_STATE__ !== undefined, { timeout: 10000 }),
                // Or wait for visible vehicle listings
                page.waitForSelector('[data-cy="l-card"], .css-1sw7q4x', { timeout: 10000 }),
                // Or fallback timeout
                new Promise(resolve => setTimeout(resolve, 8000))
              ]);
              
              // Additional wait for any remaining dynamic content
              await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
              console.warn(`⚠️  OLX dynamic content wait failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              // Continue anyway - we'll try to parse what we have
            }
          } else {
            // For other sites, use the original shorter wait
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Get the HTML content and final URL
          const html = await page.content();
          const finalUrl = page.url();
          const statusCode = response.status();
          const scrapingTime = Date.now() - startTime;

          console.log(`✅ Successfully scraped ${url} (${statusCode}) in ${scrapingTime}ms`);

          return {
            html,
            finalUrl,
            statusCode,
            scrapingTime
          };

        } finally {
          // Always close the page to free resources
          await page.close();
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Scraping attempt ${attempt} failed for ${url}:`, lastError.message);

        if (attempt < this.config.maxRetries) {
          // Exponential backoff for retries
          const backoffDelay = Math.pow(2, attempt) * 1000;
          console.log(`⏳ Waiting ${backoffDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All attempts failed
    throw new Error(`Failed to scrape ${url} after ${this.config.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Gets browser statistics
   */
  public getBrowserStats(): { isInitialized: boolean; requestCount: number; lastRequestTime: number } {
    return {
      isInitialized: this.browser !== null,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Closes the browser and cleans up resources
   */
  public async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('✅ Browser closed successfully');
      } catch (error) {
        console.error('❌ Failed to close browser:', error);
        throw new Error(`Browser close failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('⚠️ Browser was not initialized');
    }
  }

  /**
   * Restarts the browser (useful for long-running processes)
   */
  public async restart(): Promise<void> {
    console.log('🔄 Restarting browser...');
    await this.close();
    await this.initialize();
  }
}
