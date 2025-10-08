# Testing Strategy

## Testing Approach

- **Philosophy**: Test critical paths and complex logic; practical over comprehensive
- **Frameworks**: Jest for unit/integration tests, React Testing Library for components
- **Coverage Goal**: Focus on backend services and data transformations, not coverage percentage

## Test Organization

**Backend Tests** (`apps/api/__tests__/`, `packages/*/src/__tests__/`)
- Unit tests for services (ScraperService, ParserService, AIService)
- Integration tests for API endpoints
- Repository tests with in-memory SQLite

**Frontend Tests** (`apps/web/__tests__/`)
- Component tests for critical UI (VehicleDashboard, VehicleCard)
- Hook tests for custom hooks
- Integration tests for API client

**Shared Package Tests**
- Service abstraction layer tests with mocks
- Type validation tests

## Key Testing Patterns

- **Service Mocks**: Use `packages/services` abstraction layer for cross-package testing
- **Database Tests**: In-memory LibSQL for fast, isolated tests
- **AI Service Tests**: Mock Gemini API responses to avoid rate limits
- **File Convention**: Co-located `*.test.ts` files next to source

## Post-MVP Considerations

- **Regression Testing:** The current strategy focuses on unit and integration tests for new features. Post-MVP, a dedicated regression testing suite should be formalized to automatically verify that existing functionality is not broken by new code changes.