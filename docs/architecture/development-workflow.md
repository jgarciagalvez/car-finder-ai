# Development Workflow

Development is managed via `pnpm` scripts with concurrent execution:
- `pnpm dev` - Starts the Next.js frontend (`apps/web`)
- `pnpm dev:api` - Starts the Express.js API server (`apps/api`) 
- `pnpm ingest` - Runs the data ingestion script (`apps/api/src/scripts/ingest.ts`)
- `pnpm analyze` - Runs the AI analysis script (`apps/api/src/scripts/analyze.ts`)

**Local Development**: Both frontend and API run concurrently on different ports (typically localhost:3001 for web, localhost:3000 for API).

