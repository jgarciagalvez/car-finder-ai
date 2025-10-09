import express, { Express } from 'express';
import cors from 'cors';
import { WorkspaceUtils } from '@car-finder/services';
import { ScraperService } from './services/ScraperService';
import { ParserService } from './services/ParserService';
import vehiclesRouter from './routes/vehicles';

// Load environment variables from workspace root
WorkspaceUtils.loadEnvFromRoot();

const app: Express = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.WEB_PORT ? `http://localhost:${process.env.WEB_PORT}` : 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Car Finder AI API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/vehicles', vehiclesRouter);

// Parser service demonstration endpoint
app.post('/api/parse', async (req, res) => {
  try {
    const { html, siteKey, expectedType } = req.body;
    
    if (!html || !siteKey) {
      return res.status(400).json({ 
        error: 'HTML and siteKey are required',
        message: 'Please provide html and siteKey in the request body'
      });
    }

    const parser = new ParserService();
    const result = parser.parseHtml(html, siteKey, expectedType);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Parsing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Parsing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Scraper service demonstration endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        message: 'Please provide a URL in the request body'
      });
    }

    // Note: In production, you'd want to initialize the scraper once and reuse it
    // This is just for demonstration purposes
    const scraper = new ScraperService({
      delayRange: { min: 1000, max: 2000 },
      timeout: 30000,
      maxRetries: 3,
      stealthMode: true
    });

    await scraper.initialize();
    
    try {
      const result = await scraper.scrapeUrl(url);
      
      res.json({
        success: true,
        data: {
          url: result.finalUrl,
          statusCode: result.statusCode,
          scrapingTime: result.scrapingTime,
          htmlLength: result.html.length,
          // Don't return full HTML in API response for performance
          htmlPreview: result.html.substring(0, 500) + '...'
        }
      });
    } finally {
      await scraper.close();
    }
    
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Scraping failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚗 Car Finder AI API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

// Export services for use by other parts of the application
export { ScraperService } from './services/ScraperService';
export { ParserService } from './services/ParserService';
export type { PageType, ParseResult, SearchResult } from './services/ParserService';

export default app;
