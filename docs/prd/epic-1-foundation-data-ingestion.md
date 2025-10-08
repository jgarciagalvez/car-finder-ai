# Epic 1: Foundation & Data Ingestion
**Epic Goal:** Establish the complete project foundation and build a fully functional, automated pipeline that scrapes vehicle listings, parses the data using the schema file, and populates a clean, standardized local database.

---
### **Story 1.1: Project Initialization and Monorepo Setup**
**As a** user, **I want** a new monorepo project initialized with the basic folder structure and configuration files, **so that** I have a clean, organized foundation to start building the application.
**Acceptance Criteria:**
1. A new Turborepo project is initialized.
2. The root `package.json` is configured with workspaces for `apps` and `packages`.
3. A placeholder backend application (`apps/api`) and a shared types package (`packages/types`) are created.
4. Base TypeScript (`tsconfig.json`) and ESLint configurations are set up for the monorepo.

---
### **Story 1.2: Local Database Initialization**
**As a** user, **I want** a local SQLite database and a simple data access layer set up, **so that** scraped data can be stored persistently on my machine.
**Acceptance Criteria:**
1. The project includes `@libsql/client` and a query builder like `Kysely`.
2. A database schema is defined for a `vehicles` table with columns for all required data.
3. A database service is created that can initialize the database file and schema.
4. The service exposes basic functions like `insertVehicle` and `findVehicleByUrl`.

---
### **Story 1.3: Headless Browser Scraper Service**
**As a** user, **I want** a scraper service that uses a headless browser (Puppeteer) to visit URLs and retrieve their full HTML content, **so that** I can gather the raw data from the marketplace websites.
**Acceptance Criteria:**
1. Puppeteer is added as a dependency to the `api` application.
2. A `ScraperService` is created that can launch a headless browser with best-practice configurations.
3. The service has a function that accepts a URL and returns the full, rendered HTML content.
4. The service includes respectful delays between requests.

---
### **Story 1.4: Schema-Driven HTML Parser**
**As a** user, **I want** a parser that reads a `parser-schema.json` file and uses its rules (CSS selectors) to extract structured data from a raw HTML string, **so that** I can turn unstructured web pages into clean data without hardcoding parsing logic.
**Acceptance Criteria:**
1. A `parser-schema.json` file is created with placeholder selector structures.
2. A `ParserService` is created that uses `Cheerio` to load HTML.
3. The service has a function that takes raw HTML and a site key, reads the schema, applies the selectors, and returns a structured JSON object.

---
### **Story 1.5: Main Ingestion Pipeline**
**As a** user, **I want** a main script that orchestrates the entire data ingestion process, **so that** I can run a single command to find and store all new vehicle listings.
**Acceptance Criteria:**
1. A main script (`packages/scripts/ingest.ts`) is created.
2. The script reads search URLs from a configuration file.
3. It uses the `ScraperService` to get a list of individual vehicle URLs.
4. For each new URL, it uses the `ScraperService`, `ParserService`, and database service to save the new vehicle data.
