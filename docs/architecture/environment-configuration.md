# Environment Configuration

## Environment Variables

Root `.env` file (gitignored):

```bash
# Required
GEMINI_API_KEY=your_api_key_here

# Optional (defaults shown)
DATABASE_PATH=./data/vehicles.db
```

## Loading Strategy

- **All services**: Environment variables loaded via `dotenv` at entry points (`index.ts`, `ingest.ts`, `analyze.ts`)
- **API Server**: Variables loaded in `apps/api/src/index.ts` before any service initialization
- **Background Scripts**: Variables loaded in `apps/api/src/scripts/*.ts` via WorkspaceUtils before service registry access
- **Tests**: Jest config loads `.env` in `setupFilesAfterEnv` - standalone test scripts must load manually via `dotenv/config`
- **Frontend**: No direct access to `.env` - API key never exposed to client

