# Car Finder AI Fullstack Architecture Document

### High Level Architecture

#### Technical Summary
This project will be a full-stack application operating under a local-first execution model. The system consists of two primary components within a monorepo: a backend service built with Node.js responsible for scraping and AI analysis, and a frontend web application built with Next.js for the user interface. Key architectural patterns include a schema-driven parser for resilience, an AI abstraction layer for future flexibility, and a repository pattern for clean data access. This design directly supports the MVP goal of creating a fast, zero-cost, and powerful personal analysis tool.

#### Platform and Infrastructure Choice
* **Platform:** Local-First Execution Model. The entire application is designed to run on your local desktop/laptop machine.
* **Key Services:**
    * **Local:** Node.js Runtime, SQLite Database Engine, Local File System.
    * **External:** Google Gemini API.
* **Deployment Host and Regions:** N/A - Local execution.

#### Repository Structure
* **Structure:** Monorepo
* **Monorepo Tool:** Turborepo
* **Package Organization:** The monorepo will contain `apps` (for the `web` UI and `api` backend) and `packages` (for shared code like `types` and `db` access).

#### High Level Architecture Diagram
```mermaid
graph TD
    subgraph "Your Local Machine"
        U[You] -- Interacts with --> WEB_UI("Web UI (Next.js)");
        WEB_UI -- Fetches data from --> API["API & Scraper Service (Node.js)"];
        API -- Reads/Writes to --> DB[(SQLite Database)];
        API -- Reads --> CONFIG[("parser-schema.json")];
    end

    API -- Calls for analysis --> GEMINI_API(("Google Gemini API"));
```

#### Architectural Patterns

  * **Local-First Architecture:** All core components run locally. *Rationale:* This provides the fastest development path and achieves the zero-cost requirement for the MVP.
  * **Monorepo:** A single repository for all code. *Rationale:* Simplifies sharing types and logic between the frontend and backend.
  * **Schema-Driven Parser:** The scraper's parsing logic is externalized to a JSON file. *Rationale:* This makes the scraper resilient to website changes.
  * **AI Provider Abstraction Layer:** AI calls are routed through an internal service. *Rationale:* Decouples the application from a specific AI provider, making it easy to add others in the future.
  * **Repository Pattern:** Database interactions will be handled by a dedicated "repository" layer. *Rationale:* This abstracts the data logic, making the application easier to test.
  * **Service Contract Architecture:** Cross-package service dependencies use interface contracts and dependency injection. *Rationale:* Enables proper testing with mocks and maintains clean architectural boundaries.
  * **Integration Testing Infrastructure:** Comprehensive testing framework with service abstractions and mock implementations. *Rationale:* Ensures reliable cross-package integration testing in the monorepo environment.

### Tech Stack

| Category | Technology | Version | Purpose | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Monorepo** | Turborepo | `~2.0.0` | Manages the monorepo workspace | Lightweight and fast. |
| **Language** | TypeScript | `~5.5.0` | Primary language for all code | Type safety improves code quality. |
| **FE Framework** | Next.js | `~14.2.0` | Frontend application | Robust React framework for UI with App Router. |
| **Styling** | Tailwind CSS | `~3.4.0` | Utility-first CSS framework | Allows for rapid UI development. |
| **UI Components**| Shadcn UI | `CLI` | Component library primitives | Accessible and unstyled components for easy customization. |
| **State Mgmt** | React Context/Hooks| `N/A` | Manages global UI state | Built-in to React, avoiding extra dependencies. |
| **BE Runtime** | Node.js | `~20.11.0` | Executes backend scripts/API | Current Long-Term Support (LTS) version. |
| **API Framework** | Express.js | `~4.18.0` | API server and routing | Lightweight and flexible web framework for Node.js. |
| **Web Scraping**| Puppeteer | `~22.0.0` | Headless browser for scraping | Robust control over a headless Chrome instance. |
| **Database** | LibSQL | `@libsql/client` | Local database storage | SQLite-compatible database with pure JavaScript implementation for zero-cost, cross-platform operation. |
| **AI SDK** | `@google/generative-ai` | `~0.11.0` | Gemini API client library | The official Google SDK. |
| **Testing** | Jest & RTL | `~29.7.0` | Unit and integration testing | The standard testing suite for Next.js/React. |

### Data Models

#### Vehicle

**Purpose:** To represent a single vehicle listing, combining the rich data scraped from the source with our own generated analysis and user-workflow data. This will be our primary data entity.

**TypeScript Interface:**
This interface will be placed in the shared `packages/types` directory within our monorepo, ensuring both the frontend and backend use the exact same data structure.

```typescript
export type VehicleSource = 'otomoto' | 'olx';
export type VehicleStatus = 'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'deleted';
export type SellerType = 'private' | 'company' | null;

export interface SellerInfo {
  name: string | null;
  id: string | null;
  type: SellerType;
  location: string | null;
  memberSince: string | null;
}

export interface Vehicle {
  id: string; // Our internal unique identifier
  source: VehicleSource;
  sourceId: string; // The ID from the source site (e.g., Otomoto's ID)
  sourceUrl: string;
  sourceCreatedAt: Date; // When the ad was published on Otomoto/OLX

  // Raw Scraped Data
  sourceTitle: string;
  sourceDescriptionHtml: string;
  sourceParameters: Record<string, string>;
  sourceEquipment: Record<string, string[]>;
  sourcePhotos: string[];
  
  // Our Processed & Normalised Data
  title: string; // Cleaned title
  description: string; // Translated, plain-text description
  features: string[]; // Normalised, e.g., ["comfort_air_conditioning"]
  pricePln: number;
  priceEur: number;
  year: number; 
  mileage: number;
  sellerInfo: SellerInfo;
  photos: string[]; // Cleaned photo URLs

  // AI Generated Data
  personalFitScore: number | null;
  marketValueScore: string | null; // e.g., "-5%" or "+10%"
  aiPriorityRating: number | null;
  aiPrioritySummary: string | null;
  aiMechanicReport: string | null;
  aiDataSanityCheck: string | null;

  // User Workflow Data
  status: VehicleStatus;
  personalNotes: string | null;

  // Our Timestamps
  scrapedAt: Date;
  createdAt: Date; 
  updatedAt: Date;
}
```
**Relationships:**
For the scope of the MVP, the Vehicle model is a self-contained entity. It has no direct relationships with other data models.

### API Specification

This API provides the necessary endpoints for the web UI to fetch vehicle data and interact with the AI services. It is designed around a primary conversational endpoint for all AI interactions.

```yaml
openapi: 3.0.0
info:
  title: "Car Finder AI API"
  version: "1.0.0"
  description: "API for the personal Car Finder application."
servers:
  - url: "http://localhost:3000"
    description: "Local development server"

paths:
  /api/vehicles:
    get:
      summary: "Get all vehicles"
      description: "Retrieves a list of all vehicles from the database, including all processed and AI-generated data."
      responses:
        '200':
          description: "A list of all vehicle objects."
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Vehicle"

  /api/vehicles/{id}:
    get:
      summary: "Get a single vehicle by ID"
      description: "Retrieves all details for a single vehicle by its unique internal ID."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
            description: "The internal CUID or UUID of the vehicle."
      responses:
        '200':
          description: "A single vehicle object."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."
    patch:
      summary: "Update a vehicle's status or notes"
      description: "Updates the user-managed workflow fields for a single vehicle."
      parameters:
        - name: "id"
          in: "path"
          required: true
          schema:
            type: "string"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateVehiclePayload"
      responses:
        '200':
          description: "The updated vehicle object."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Vehicle"
        '404':
          description: "Vehicle not found."

  /api/ai/chat:
    post:
      summary: "Have a contextual conversation with the AI assistant"
      description: "Handles all conversational AI tasks, from analysis to message generation and translation. It requires the context of the UI and the conversation history."
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChatRequest"
      responses:
        '200':
          description: "The AI assistant's response."
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChatResponse"

components:
  schemas:
    Vehicle:
      type: "object"
      description: "Represents a single vehicle listing with all processed and generated data."
      properties:
        id:
          type: "string"
        source:
          type: "string"
          enum: ["otomoto", "olx"]
        sourceUrl:
          type: "string"
          format: "uri"
        title:
          type: "string"
        description:
          type: "string"
        features:
          type: "array"
          items:
            type: "string"
        pricePln:
          type: "number"
        priceEur:
          type: "number"
        year:
          type: "integer"
        mileage:
          type: "integer"
        photos:
          type: "array"
          items:
            type: "string"
            format: "uri"
        personalFitScore:
          type: "number"
          nullable: true
        marketValueScore:
          type: "string"
          nullable: true
        aiPriorityRating:
          type: "number"
          nullable: true
        aiPrioritySummary:
          type: "string"
          nullable: true
        aiMechanicReport:
          type: "string"
          nullable: true
        status:
          type: "string"
          enum: ["new", "to_contact", "contacted", "to_visit", "visited", "deleted"]
        personalNotes:
          type: "string"
          nullable: true
        createdAt:
          type: "string"
          format: "date-time"
        updatedAt:
          type: "string"
          format: "date-time"
        # Note: Raw source fields are omitted here for API response clarity
        # but are present in the database model.

    UpdateVehiclePayload:
      type: "object"
      description: "Payload for updating a vehicle's workflow status."
      properties:
        status:
          type: "string"
          enum: ["new", "to_contact", "contacted", "to_visit", "visited", "deleted"]
        personalNotes:
          type: "string"

    ChatMessage:
      type: "object"
      properties:
        role:
          type: "string"
          enum: ["user", "model"]
        content:
          type: "string"

    ChatRequest:
      type: "object"
      properties:
        context:
          type: "object"
          description: "The UI context, e.g., which vehicle is being viewed."
          properties:
            view: 
              type: "string"
              enum: ["dashboard", "detail"]
            vehicleId:
              type: "string"
        conversationHistory:
          type: "array"
          items:
            $ref: "#/components/schemas/ChatMessage"
        userMessage:
          type: "string"

    ChatResponse:
      type: "object"
      properties:
        aiResponse:
          type: "string"
          description: "The AI's response, formatted in Markdown."
```

### Components

The system is broken down into Backend (Orchestration Scripts, Scraper, Parser, DB Service, AI Service, API Handler) and Frontend (API Client, Global State, Dashboard, Cards, Detail Page, Chat Panel) components, with a Service Abstraction Layer (Service Interfaces, Adapters, Mocks, Registry) providing clean integration testing capabilities.

### Core Workflows

Workflows are defined for **Data Ingestion**, **Data Analysis**, and **AI Chat Interaction** using sequence diagrams to show component interactions.

### Database Schema

A `vehicles` table will be created in SQLite using SQL DDL, with indexes for performance and a trigger to auto-update timestamps.

### Global Project Structure

```
car-finder-ai/
├── apps/
│   ├── api/                 # Express.js API server
│   └── web/                 # Next.js frontend application
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── db/                 # Database layer & repositories
│   ├── scripts/            # Background processing scripts (ingest, analyze)
│   ├── services/           # Service abstraction layer (Story 2.0)
│   └── ai/                 # AI provider abstraction (Epic 2)
├── docs/                   # Project documentation
│   ├── architecture.md     # This file
│   ├── prd.md             # Product requirements
│   ├── project-brief.md   # Project overview
│   └── stories/           # User stories
├── data/                   # Runtime data directory
│   ├── vehicles.db         # Main SQLite database (gitignored)
│   └── vehicles.test.db    # Test database (example, committed)
├── .env                    # Environment configuration (gitignored)
├── .env.example           # Environment template
├── .gitignore             # Git ignore rules
├── package.json           # Root workspace configuration
├── pnpm-workspace.yaml    # pnpm workspace config
├── turbo.json             # Turborepo build pipeline
├── tsconfig.json          # Root TypeScript config
├── parser-schema.json     # HTML parsing configuration
└── search-config.json     # Search URL configuration
```

### Backend Architecture

The backend follows a **dual-purpose Node.js architecture** with clear separation between API serving and background processing:

- **API Server (`apps/api`)**: Express.js server for HTTP endpoints serving the frontend
- **Background Scripts (`packages/scripts`)**: Independent Node.js processes for data ingestion and AI analysis
- **Shared Services**: Reusable business logic in `apps/api/src/services/` consumed by both API and scripts
- **Service Contracts**: Cross-package dependencies use `packages/services` interface contracts for testing

### Frontend Architecture

The architecture is based on Next.js App Router, with a clear folder structure for components, context, hooks, and libraries. It uses React Context for state and a dedicated API client for data fetching.

### Package Architecture

- **`packages/types`**: Shared TypeScript interfaces and types used across all apps and packages
- **`packages/db`**: Database layer with SQLite, Kysely query builder, and repository pattern
- **`packages/scripts`**: Background processing scripts for data ingestion and AI analysis
- **`packages/services`**: Service abstraction layer with interfaces, adapters, and mocks for testing
- **`packages/ai`**: AI provider abstraction layer with Gemini API integration and future provider support

### Application Architecture

#### API Server Structure (`apps/api`)

```
apps/api/
├── src/
│   ├── routes/                 # HTTP endpoint handlers
│   │   ├── vehicles.ts         # GET/PATCH /api/vehicles
│   │   ├── ai.ts              # POST /api/ai/chat
│   │   └── index.ts           # Route registration & middleware setup
│   ├── services/              # Business logic (reusable)
│   │   ├── ScraperService.ts  # Puppeteer scraping
│   │   ├── ParserService.ts   # HTML parsing
│   │   ├── AIService.ts       # LLM interactions (Epic 2)
│   │   └── MarketValueService.ts # Price analysis (Epic 2)
│   ├── middleware/            # Cross-cutting concerns
│   │   ├── cors.ts           # CORS configuration
│   │   ├── errorHandler.ts   # Global error handling
│   │   └── validation.ts     # Request validation
│   ├── types/                # API-specific types
│   │   ├── requests.ts       # Request DTOs
│   │   └── responses.ts      # Response DTOs
│   └── index.ts              # Express server entry point
├── __tests__/                # Integration tests
├── package.json
└── tsconfig.json
```

#### Frontend Application Structure (`apps/web`)

```
apps/web/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── dashboard/         # Main vehicle dashboard
│   │   │   └── page.tsx
│   │   ├── vehicle/           # Vehicle detail pages
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx          # Home page (redirect to dashboard)
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # Shadcn UI primitives
│   │   ├── VehicleCard.tsx   # Vehicle card component
│   │   ├── VehicleDashboard.tsx
│   │   ├── VehicleDetail.tsx
│   │   └── CommunicationAssistant.tsx
│   ├── lib/                  # Utilities and configurations
│   │   ├── api.ts           # API client (fetch wrapper)
│   │   ├── utils.ts         # General utilities
│   │   └── types.ts         # Frontend-specific types
│   ├── context/             # React Context providers
│   │   ├── VehicleContext.tsx # Vehicle state management
│   │   └── UIContext.tsx     # UI state (filters, sorting)
│   └── hooks/               # Custom React hooks
│       ├── useVehicles.ts   # Vehicle data fetching
│       └── useAPI.ts        # Generic API hook
├── public/                  # Static assets
├── __tests__/              # Component tests
├── package.json
├── tsconfig.json
└── next.config.js          # Next.js configuration
```

#### Environment Configuration

**Single Root Configuration**:
```bash
# Root .env file (gitignored)
GEMINI_API_KEY=your_key_here
DATABASE_PATH=./data/vehicles.db
TEST_DATABASE_PATH=./data/vehicles.test.db
NODE_ENV=development
API_PORT=3000
WEB_PORT=3001
API_BASE_URL=http://localhost:3000
```

**Database Configuration**:
- **Production Database**: `./data/vehicles.db` (gitignored - contains real user data)
- **Test Database**: `./data/vehicles.test.db` (committed as example with sample data)
- **Database Directory**: `./data/` created automatically if it doesn't exist

**Access Patterns**:
- **`apps/api`**: Direct access via `process.env.DATABASE_PATH`
- **`apps/web`**: Next.js automatically loads root `.env` files for `NEXT_PUBLIC_*` variables
- **`packages/scripts`**: Direct access for ingestion/analysis scripts
- **`packages/db`**: Uses `DATABASE_PATH` for production, `TEST_DATABASE_PATH` for testing

**Security**: Root `.env` in `.gitignore`, provide `.env.example` template with sample values.

#### Build Outputs

```
# Build artifacts (gitignored)
apps/api/dist/       # Compiled TypeScript for API server
apps/web/.next/      # Next.js build output
packages/*/dist/     # Compiled package builds
node_modules/        # Dependencies

# Data directory (mixed gitignore strategy)
data/
├── vehicles.db      # Production database (gitignored)
└── vehicles.test.db # Test database with sample data (committed)
```

### Unified Project Structure

A Turborepo monorepo will be used with `apps/web`, `apps/api`, and `packages/db`, `packages/scripts`, `packages/types`, `packages/services`, `packages/ai`.

### Development Workflow

Development is managed via `pnpm` scripts with concurrent execution:
- `pnpm dev` - Starts the Next.js frontend (`apps/web`)
- `pnpm dev:api` - Starts the Express.js API server (`apps/api`) 
- `pnpm ingest` - Runs the data ingestion script (`packages/scripts`)
- `pnpm analyze` - Runs the AI analysis script (`packages/scripts`)

**Local Development**: Both frontend and API run concurrently on different ports (typically localhost:3001 for web, localhost:3000 for API).

### Development Standards

#### Naming Conventions

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

#### Code Organization Standards

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

#### Testing Patterns

**Test Organization**:
- Co-located tests: `Component.test.tsx`
- Integration tests: `__tests__/integration/`
- Service mocks: Use `packages/services` abstractions

**State Management Approach**:
- React Context for global state
- Custom hooks for data fetching
- Local state for UI interactions

### Key Developer Standards

  * **Frontend**: Pure Next.js application in `apps/web` (no API routes)
  * **API Endpoints**: All HTTP endpoints in `apps/api/src/routes/{domain}.ts` files using Express.js
  * **Types**: Use shared types from `packages/types`
  * **Database**: All DB access through the `packages/db` repository
  * **API Client**: All frontend API calls through `lib/api.ts`
  * **Environment**: Single root `.env` file for all configuration
  * **Services**: Cross-package service dependencies must use `packages/services` interface contracts
  * **Testing**: All integration tests must use service mocks and abstractions from `packages/services`
  * **AI**: AI operations must use the provider abstraction layer from `packages/ai`
  * **Naming**: Follow established naming conventions for consistency across the monorepo

### Checklist Results Report

**Final Decision:** **READY FOR DEVELOPMENT**
