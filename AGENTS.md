## Project Overview

Personal Car Finder AI - A local-first application for scraping, analyzing, and managing vehicle listings. Built as a Turborepo monorepo with Next.js frontend and Express.js API backend, leveraging Google Gemini for AI-powered analysis.

## Development Commands

### Core Workflow
```bash
pnpm dev           # Start Next.js frontend (apps/web)
pnpm dev:api       # Start Express.js API server (apps/api)
pnpm dev:all       # Start both frontend and API concurrently

pnpm ingest        # Run data scraping pipeline (apps/api/src/scripts/ingest.ts)
pnpm analyze       # Run AI analysis batch processor (apps/api/src/scripts/analyze.ts)
```

### Testing & Quality
```bash
pnpm test          # Run all tests across packages
pnpm lint          # Run linting across packages
pnpm type-check    # TypeScript type checking
pnpm build         # Build all packages for production

# Package-specific tests
pnpm --filter @car-finder/db test            # Test database layer
pnpm --filter @car-finder/ai test            # Test AI abstraction layer
pnpm --filter @car-finder/api test           # Test API services
```

### Environment Setup
`.env` in project root.
Should be used by services and factory, not by consumers
Consumers should load environment via `WorkspaceUtils.loadEnvironment()` before accessing service registry. Services deal with .env variables.

When using paths, make sure to us `WorkspaceUtils.findWorkspaceRoot()` so the correct directory is used independently from where the app is run.

## Architecture Principles

### Monorepo Structure
- **apps/api**: Express.js API server + background scripts (ingest/analyze)
- **apps/web**: Next.js frontend (no API routes - pure client)
- **packages/ai**: AI provider abstraction layer with prompt management
- **packages/db**: Database layer with repository pattern (LibSQL/SQLite)
- **packages/services**: Service abstraction layer for testing/mocks
- **packages/types**: Shared TypeScript types

### Critical Rules

1. **Separation of Concerns**
   - Frontend (`apps/web`): No API routes, all HTTP calls via `lib/api.ts`
   - Backend (`apps/api`): Express routes in `src/routes/{domain}.ts`
   - All database access via `packages/db` repositories
   - Services should be provided ready to consume (no path, .env, etc. done by consumer, unless strictlly necessary)


2. **AI Prompt Architecture**
   - AI prompts MUST be markdown files in `packages/ai/src/prompts/`
   - NEVER hardcode prompts in TypeScript
   - Use `PromptLoader` utility to load prompts at runtime
   - Prompts are versioned data artifacts, not code

3. **Service Contract Pattern**
   - Cross-package dependencies use `packages/services` interface contracts
   - Integration tests MUST use service mocks from `packages/services`
   - Service registry provides dependency injection

4. **Windows PowerShell Environment**
   - Use `New-Item` not `mkdir`
   - Use semicolons (`;`) not `&&` for command chaining
   - Use separate commands for conditional execution

### Key Architectural Patterns

- **Local-First**: All core components run locally (zero-cost requirement)
- **Schema-Driven Parser**: HTML parsing externalized to `parser-schema.json`
- **Declarative Prompts**: AI prompts as versioned markdown, not code
- **Repository Pattern**: Clean data access abstraction via `packages/db`
- **Provider Abstraction**: AI provider agnostic via factory pattern

## Common Development Patterns

### Adding a New AI Prompt
1. Create markdown file in `packages/ai/src/prompts/{prompt-name}.md`
2. Load via `PromptLoader.load('prompt-name')` in TypeScript
3. Update prompt tests in `packages/ai/src/utils/PromptLoader.test.ts`

### Creating a New Service
1. Define interface in `packages/services/src/interfaces/`
2. Create mock implementation in `packages/services/src/mocks/`
3. Register in `packages/services/src/registry/`
4. Use dependency injection in consuming code

### Running Background Scripts
Scripts live in `apps/api/src/scripts/`:
- `ingest.ts`: Scrapes vehicle listings from configured sources
- `analyze.ts`: Batch processes vehicles for AI scoring/reports


## Code Standards

### Naming Conventions
- **React Components**: `PascalCase` - `VehicleCard.tsx`
- **Utilities/Services**: `camelCase` - `scraperService.ts`
- **Directories**: `kebab-case` - `vehicle-detail/`
- **AI Prompts**: `kebab-case.md` - `personal-fit-score.md`
- **Interfaces**: `PascalCase` with `I` prefix - `IVehicleService`
- **Database Fields**: `snake_case` - `source_url`, `created_at`
- **API Endpoints**: `kebab-case` - `/api/vehicles`

### Import Order
1. React/Next.js imports
2. Third-party libraries
3. Internal packages (`@car-finder/*`)
4. Relative imports (`./`, `../`)

### Type Safety
- Explicit return types for all functions
- No `any` types (use `unknown` if needed)
- Strict null checks enabled
- Shared types from `packages/types`

## Database & Data Flow

- **Primary DB**: LibSQL (SQLite-compatible) at `./data/vehicles.db`
- **Repository Layer**: `packages/db/src/repositories/VehicleRepository.ts`
- **Schema**: Table definitions in `packages/db/src/schema.ts`
- **Testing**: Test database at `./data/vehicles.test.db` (committed for fixtures)

Data flow: `Ingest Script → VehicleRepository → SQLite → API Routes → Frontend`

## AI Integration

- **Provider**: Google Gemini (configured via `GEMINI_API_KEY`)
- **Factory**: `packages/ai/src/factory/AIProviderFactory.ts`
- **Prompts**: Markdown files in `packages/ai/src/prompts/`
- **Utilities**: Rate limiting, retry handling, prompt loading

## Testing Strategy

- **Unit Tests**: Per-package with Jest
- **Integration Tests**: Use service mocks from `packages/services`
- **Test Database**: `./data/vehicles.test.db` (pre-populated fixtures)
- **Environment**: Jest loads `.env` via `setupFilesAfterEnv`
