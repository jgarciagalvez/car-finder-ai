# Coding Standards

## Naming Conventions

**Files & Directories**:
- React components: `PascalCase` - `VehicleCard.tsx`, `DashboardLayout.tsx`
- Utilities/services: `camelCase` - `api.ts`, `scraperService.ts`, `marketValueService.ts`
- Next.js routes: Follow App Router conventions - `dashboard/page.tsx`, `vehicle/[id]/page.tsx`
- Type files: `camelCase` - `vehicleTypes.ts`, `apiTypes.ts`
- Test files: Match source file - `VehicleCard.test.tsx`, `api.test.ts`
- Directories: `kebab-case` - `vehicle-detail/`, `ai-analysis/`

**Variables & Functions**:
- Variables: `camelCase` - `vehicleData`, `isLoading`
- Functions: `camelCase` - `fetchVehicles()`, `calculateScore()`
- Constants: `SCREAMING_SNAKE_CASE` - `MAX_RETRY_ATTEMPTS`, `API_ENDPOINTS`
- Private methods: `_camelCase` - `_validateInput()`

**Types & Interfaces**:
- Interfaces: `PascalCase` with `I` prefix - `IVehicleService`, `IScraperConfig`
- Types: `PascalCase` - `VehicleStatus`, `ApiResponse`
- Enums: `PascalCase` - `VehicleSource`, `AnalysisType`
- Generic types: `T`, `K`, `V` - `ApiResponse<T>`

**React Specific**:
- Components: `PascalCase` - `VehicleCard`, `DashboardLayout`
- Props interfaces: `ComponentNameProps` - `VehicleCardProps`
- Hooks: `use` prefix - `useVehicles`, `useAPI`
- Context: `ComponentContext` - `VehicleContext`, `UIContext`

**Database & API**:
- Database fields: `snake_case` - `source_url`, `created_at`
- API endpoints: `kebab-case` - `/api/vehicles`, `/api/ai-analysis`
- Query parameters: `camelCase` - `?sortBy=price&filterStatus=new`

## Code Organization Standards

**Import Order**:
1. React/Next.js imports
2. Third-party libraries
3. Internal packages (`@car-finder/*`)
4. Relative imports (`./`, `../`)

**Function Organization**:
- Public methods first
- Private methods last
- Async functions clearly marked
- Error handling explicit

**Type Safety**:
- Explicit return types for functions
- Strict null checks enabled
- No `any` types (use `unknown` if needed)
- Proper error type definitions

## Critical Project Rules

**Development Environment:**
  * **Terminal**: Windows 11 with PowerShell 5.1 - use `New-Item` not `mkdir`, semicolons (;) not `&&`, separate commands for conditional execution
  
**Architecture Rules:**

  * **Frontend**: Pure Next.js application in `apps/web` (no API routes)
  * **API Endpoints**: All HTTP endpoints in `apps/api/src/routes/{domain}.ts` files using Express.js
  * **Types**: Use shared types from `packages/types`
  * **Database**: All DB access through the `packages/db` repository
  * **API Client**: All frontend API calls through `lib/api.ts`
  * **Environment**: Single root `.env` file for all configuration
  * **Services**: Cross-package service dependencies must use `packages/services` interface contracts
  * **Testing**: All integration tests must use service mocks from `packages/services`
  * **AI**: AI operations must use the provider abstraction layer from `packages/ai`
  * **Naming**: Follow established naming conventions for consistency across the monorepo

