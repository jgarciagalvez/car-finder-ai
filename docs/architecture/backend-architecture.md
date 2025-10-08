# Backend Architecture

The backend follows a **dual-purpose Node.js architecture** optimized for local execution with clear separation between HTTP API serving and background data processing.

## Service Architecture

- **API Server Pattern**: Express.js traditional server (not serverless) running on localhost
- **Route-Based Organization**: HTTP endpoints grouped by domain (`routes/vehicles.ts`, `routes/ai.ts`)
- **Service Layer**: Business logic in reusable services (`ScraperService`, `ParserService`, `AIService`) shared between API and scripts
- **Background Processing**: Independent Node.js scripts for long-running tasks (scraping, AI analysis)

## Database Access

- **Repository Pattern**: All database operations through `packages/db` repository layer
- **Query Builder**: Uses Kysely for type-safe SQL queries against LibSQL
- **Connection Management**: Single local SQLite file, no connection pooling needed
- **Migration Strategy**: Schema defined in code, manual migrations for local database

## API Structure

- **RESTful Design**: Standard HTTP verbs and status codes
- **Middleware Stack**: CORS (localhost), error handling, request validation
- **Type Safety**: Request/response types defined in `types/` directories
- **Error Responses**: Consistent error format across all endpoints

## Business Logic Organization

- **Scraper Service**: Puppeteer automation with schema-driven parsing
- **Parser Service**: HTML extraction using external `parser-schema.json`
- **AI Service**: LLM interactions via `packages/ai` abstraction layer
- **Separation of Concerns**: Each service has single responsibility, minimal dependencies

