# Components

## Backend Services

- **ScraperService**: Puppeteer automation for listing extraction
- **ParserService**: Schema-driven HTML parsing
- **AIService**: LLM operations via provider abstraction layer
- **VehicleRepository**: Database CRUD operations

## API Layer

- **Vehicle Routes**: GET/PATCH endpoints for vehicle data
- **AI Routes**: POST endpoint for chat/analysis

## Frontend Components

- **VehicleDashboard**: Main grid view with filters/sorting
- **VehicleCard**: Individual vehicle card with quick actions
- **VehicleDetail**: Full vehicle page with AI reports
- **CommunicationAssistant**: AI message drafting and translation
- **API Client**: Centralized HTTP client wrapper

## Shared Infrastructure

- **Service Abstraction Layer**: Interface contracts and mocks for testing
- **Type Definitions**: Shared TypeScript types across packages

