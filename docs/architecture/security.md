# Security

## Critical Rules

- **API Keys**: Store in root `.env` (gitignored), never expose to frontend
- **Input Validation**: Validate API request bodies and sanitize user input before storage
- **Scraped Data**: Treat all scraped HTML as untrusted; validate with schema before processing
- **Error Messages**: Never expose API keys or internal details in error responses
- **Scraping Behavior**: Use appropriate User-Agent and throttling to avoid detection/blocking

