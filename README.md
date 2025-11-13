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
