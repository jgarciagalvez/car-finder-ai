# car-finder-ai

Personal Car Finder AI - A local-first application for scraping, analyzing, and managing vehicle listings. Built as a Turborepo monorepo with Next.js frontend and Express.js API backend, leveraging Google Gemini for AI-powered analysis.

## Getting Started

### Prerequisites
- Node.js >= 20.11.0
- pnpm >= 8.0.0

### Installation
```bash
pnpm install
```

### Environment Setup
Create a `.env` file in the project root with your configuration (see `.env.example` for required variables).

## Usage

### Development Commands

#### Start the Frontend
```bash
pnpm dev
```
Starts the Next.js frontend development server (typically at `http://localhost:3000`).

#### Start the API Server
```bash
pnpm dev:api
```
Starts the Express.js API server (typically at `http://localhost:3001`).

#### Start Both Frontend and API
```bash
pnpm dev:all
```
Starts both the frontend and API servers concurrently using Turbo.

### Data Pipeline Commands

#### Ingest Vehicle Listings
```bash
pnpm ingest
```
Runs the data scraping pipeline to collect vehicle listings from configured sources. This populates the database with new vehicle data.

#### Analyze Vehicles with AI
```bash
pnpm analyze
```
Runs the AI analysis batch processor to generate AI-powered scores and reports for vehicles in the database.

**Concurrent Processing** (added in v4.1):
- Processes 3-4 vehicles in parallel by default for 3x-4x faster analysis
- Respects Gemini API rate limits (15 RPM) with intelligent batch-based throttling
- Configurable concurrency via `--concurrency` flag (1-5, default: 3)

**Common Usage Examples:**
```bash
# Analyze with default concurrency (3 vehicles in parallel)
pnpm analyze

# Analyze first 20 vehicles with higher concurrency
pnpm analyze --concurrency 4 --limit 20

# Sequential processing (original behavior, for debugging)
pnpm analyze --concurrency 1

# Analyze specific vehicle by ID
pnpm analyze --vehicle-id abc123

# Force re-analysis of all steps
pnpm analyze --force

# Generate both concise summary AND full detailed report (Story 4.2)
pnpm analyze --include-full-report

# Skip all mechanic reports (summary + full)
pnpm analyze --skip-mechanic-report
```

**Mechanic Report Modes** (Story 4.2):
- **Default**: Generates concise 3-5 bullet point summary only (faster, recommended)
- **--include-full-report**: Generates both summary AND full detailed report
- **--skip-mechanic-report**: Skips both summary and full report generation

**Performance:**
- **Sequential** (concurrency=1): ~15 vehicles/min → 4 hours for 240 vehicles
- **Concurrent** (concurrency=3): ~45-60 vehicles/min → **1-1.5 hours** for 240 vehicles
- Run `pnpm analyze --help` for all available options

#### Translate Vehicle Data
```bash
pnpm translate
```
Translates vehicle listings and descriptions (useful for Polish listings).

#### Run Full Pipeline
```bash
pnpm full-pipeline
```
Runs the complete data pipeline: ingest → translate → analyze (all steps in sequence).

### Testing & Quality

#### Run Tests
```bash
pnpm test
```
Runs all tests across all packages in the monorepo.

#### Lint Code
```bash
pnpm lint
```
Runs ESLint across all packages to check code quality.

#### Type Check
```bash
pnpm type-check
```
Runs TypeScript type checking across all packages.

#### Build for Production
```bash
pnpm build
```
Builds all packages for production deployment.

## Project Structure

- `apps/web` - Next.js frontend application
- `apps/api` - Express.js API server and background scripts
- `packages/ai` - AI provider abstraction layer
- `packages/db` - Database layer with repository pattern
- `packages/services` - Service abstraction layer
- `packages/types` - Shared TypeScript types

## Architecture

- **Local-First**: All core components run locally (zero-cost requirement)
- **Schema-Driven Parser**: HTML parsing externalized to `parser-schema.json`
- **Declarative Prompts**: AI prompts as versioned markdown files
- **Repository Pattern**: Clean data access abstraction
- **Provider Abstraction**: AI provider agnostic via factory pattern
