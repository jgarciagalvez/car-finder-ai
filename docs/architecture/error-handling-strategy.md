# Error Handling Strategy

## Logging Standards

- **Levels**: ERROR, WARN, INFO with timestamp and component context
- **Never Log**: API keys, sensitive data

## Error Recovery Patterns

**API Errors**
- Gemini API: Retry with exponential backoff, cache partial responses
- Validation errors: Return 400 with field-specific messages
- Server errors: Return 500 generic (log details server-side)

**Scraper Errors**
- Parse failures: Save raw HTML for retry, skip vehicle, continue processing
- Network errors: Retry with backoff, abort after threshold

**Frontend Errors**
- API failures: User-friendly toast, log to console
- Component errors: Error boundaries prevent full crash

