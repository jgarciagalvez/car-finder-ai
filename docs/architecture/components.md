# Components

## Backend Services (apps/api/src/services/)

- **ScraperService**: Puppeteer automation for listing extraction
- **ParserService**: Schema-driven HTML parsing
- **AIService**: LLM operations via provider abstraction layer
- **VehicleRepository**: Database CRUD operations (via @car-finder/db)

## API Layer (apps/api/src/routes/)

- **Vehicle Routes**: GET/PATCH endpoints for vehicle data
- **AI Routes**: POST endpoint for chat/analysis

## Background Scripts (apps/api/src/scripts/)

- **ingest.ts**: Data scraping pipeline that fetches vehicle listings from search pages
- **analyze.ts**: AI analysis batch processor that generates scores and reports for vehicles

## Frontend Components

- **VehicleDashboard**: Main grid view with filters/sorting
- **VehicleCard**: Individual vehicle card with quick actions
- **VehicleDetail**: Full vehicle page with AI reports
- **CommunicationAssistant**: AI message drafting and translation
- **API Client**: Centralized HTTP client wrapper

## Shared Infrastructure

- **Service Abstraction Layer**: Interface contracts and mocks for testing
- **Type Definitions**: Shared TypeScript types across packages

