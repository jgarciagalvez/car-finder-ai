# Car Finder AI Product Requirements Document (PRD)

### Goals and Background Context

#### Goals

* **Automate Search:** Drastically reduce the time and manual effort required to find relevant vehicle listings by automating the daily aggregation from multiple online sources.
* **Improve Decision-Making:** Equip the user with clear, data-driven insights—including a Personal Fit Score, objective Market Value Analysis, and an AI-generated Virtual Mechanic's Report—to build confidence and identify the best deals.
* **Centralize Workflow:** Provide a single, unified interface to manage all aspects of the vehicle search, from initial discovery to tracking seller communications and personal notes.
* **Enable a Successful Purchase:** The ultimate goal is to enable the user to efficiently find and purchase a qualifying vehicle that meets their specific, complex criteria.

#### Background Context

The search for a specific used vehicle in Poland is a fragmented and inefficient process, requiring manual checks across multiple marketplaces like Otomoto.pl and OLX.pl. This leads to disorganized tracking, difficulty in comparing vehicles objectively, and a lack of readily available, model-specific mechanical knowledge.

This project aims to solve that problem by creating a personal, automated application. It will act as a "mission control" for the vehicle search, providing the user with aggregated listings, intelligent scoring, and AI-powered analysis to streamline the entire process from discovery to purchase.

#### Change Log

| Date          | Version | Description                               | Author      |
| :------------ | :------ | :---------------------------------------- | :---------- |
| Oct 3, 2025   | 1.0     | Initial draft based on the approved Project Brief. | John (PM)   |

### Requirements

#### Functional Requirements

* **FR1:** The system shall scrape new vehicle listings from Otomoto.pl and OLX.pl based on a configurable search schema file.
* **FR2:** The system shall parse the HTML of each scraped listing to extract key data points (e.g., price, year, mileage, description, photos) using a configurable parser schema.
* **FR3:** The system shall standardize all extracted data and store it in a local database (e.g., SQLite), de-duplicating any listings found on both source websites.
* **FR4:** The system shall convert all prices from PLN to EUR and store both values.
* **FR5:** The system shall use an LLM to generate a "Personal Fit Score" for each vehicle based on predefined user criteria.
* **FR6:** The system shall calculate a "Market Value Score" for each vehicle by comparing its price against similar vehicles in the database.
* **FR7:** The system shall use an LLM to generate an "AI Priority Rating" and a natural-language summary for each vehicle, synthesizing all other data points.
* **FR8:** The system shall use an LLM to generate a "Virtual Mechanic's Report" for each vehicle.
* **FR9:** The system shall use an LLM to perform a "Data Sanity Check" to flag inconsistencies between an ad's structured data and its text description.
* **FR10:** The system shall present all vehicles in a sortable, filterable, vehicled-based dashboard UI.
* **FR11:** The system shall provide a detail view for each vehicle, displaying all scraped information, scores, and AI reports.
* **FR12:** The user shall be able to assign and update a status (e.g., `New`, `To Contact`, `Deleted`) for each vehicle from the dashboard UI.
* **FR13:** The user shall be able to add, edit, and save personal text comments for each vehicle.
* **FR14:** The system shall provide an LLM-powered "Communication Assistant" to help draft messages to sellers in Polish and translate replies.

#### Non-Functional Requirements

* **NFR1:** The entire application (scraper, backend, and UI) must be capable of running on a local desktop machine.
* **NFR2:** The application's operational costs must be near-zero, relying on local execution and staying within the free/low-cost tiers of the Gemini API.
* **NFR3:** The user interface must remain responsive and performant, with long-running tasks like scraping and analysis executed in the background.
* **NFR4:** The web scraper must operate using a headless browser configured with best practices (e.g., appropriate user agents, request throttling) to behave like a real user and minimize detection risk.
* **NFR5:** The scraper's core logic (search URLs, parsing selectors) must be configurable via external JSON files, allowing for updates without changing the application's source code.

### User Interface Design Goals

#### Overall UX Vision
The application's user experience should be that of a powerful, data-rich analysis tool. The vision is a "mission control" dashboard that presents complex information in a clean, scannable, and actionable format. The focus is on efficiency, clarity, and empowering the user to make quick, informed decisions.

#### Key Interaction Paradigms
* **Vehicled-Based Layout:** The main view will use a vehicled for each vehicle, presenting key information at a glance.
* **Direct Manipulation:** The user should be able to perform primary actions—like changing a vehicle's status or adding a quick note—directly from its vehicled on the dashboard.
* **Hover-to-Preview:** Image carousels on the dashboard vehicleds should be interactive on mouse hover.
* **Fast Navigation:** The application should feel like a Single-Page App (SPA), with near-instant navigation between the main dashboard and the detailed view.

#### Core Screens and Views
1.  **Dashboard View:** The primary screen, featuring a grid or list of vehicle vehicleds with powerful sorting and filtering controls.
2.  **Detail View:** A comprehensive page for a single vehicle, containing all scraped data, AI reports, comments, and the communication assistant.

#### Accessibility
* **Accessibility:** None. Formal accessibility compliance is not a requirement for this personal-use application.

#### Branding
* A clean, minimalist, "data-tool" aesthetic is preferred, potentially with a dark mode theme. No formal branding is required.

#### Target Device and Platforms
* **Target Device and Platforms:** Web Responsive, but primarily optimized for a desktop/laptop browser.

### Technical Assumptions (Revised)

#### Repository Structure: Monorepo
The project will be developed within a monorepo (e.g., using Turborepo) to simplify code sharing between the backend and frontend.

#### Service Architecture
The primary architecture for the MVP will be a **Local-First Execution Model**. The application will be designed as a set of Node.js scripts and a local web server that runs entirely on your machine.

#### Testing Requirements: Unit + Integration Tests
The testing strategy will focus on Unit Tests for complex functions and Integration Tests for the core scraping/parsing logic.

#### Additional Technical Assumptions and Requests
* The backend will be built with **Node.js** and **Puppeteer**.
* The frontend will be built with **React/Next.js** and **Tailwind CSS**.
* The database will be **SQLite**.
* Data parsing will be driven by an external **`parser-schema.json`** file.
* **AI Provider Abstraction:** The application will use an abstraction layer for AI interactions. For the MVP, only the **Google Gemini API** will be implemented.

### Epic List

1.  **Epic 1: Foundation & Data Ingestion**
    * **Goal:** Establish the complete project foundation and build a fully functional, automated pipeline that scrapes vehicle listings, parses the data using the schema file, and populates a clean, standardized local database.
2.  **Epic 2: AI Insights & Interactive UI**
    * **Goal:** Build the complete web interface that reads from the local database, executes all AI-powered analysis and scoring, and provides the full suite of interactive tools for the user to manage their search workflow.

### Epic 1: Foundation & Data Ingestion
**Epic Goal:** Establish the complete project foundation and build a fully functional, automated pipeline that scrapes vehicle listings, parses the data using the schema file, and populates a clean, standardized local database.

---
#### **Story 1.1: Project Initialization and Monorepo Setup**
**As a** user, **I want** a new monorepo project initialized with the basic folder structure and configuration files, **so that** I have a clean, organized foundation to start building the application.
**Acceptance Criteria:**
1. A new Turborepo project is initialized.
2. The root `package.json` is configured with workspaces for `apps` and `packages`.
3. A placeholder backend application (`apps/api`) and a shared types package (`packages/types`) are created.
4. Base TypeScript (`tsconfig.json`) and ESLint configurations are set up for the monorepo.

---
#### **Story 1.2: Local Database Initialization**
**As a** user, **I want** a local SQLite database and a simple data access layer set up, **so that** scraped data can be stored persistently on my machine.
**Acceptance Criteria:**
1. The project includes `sqlite3` and a query builder like `Kysely`.
2. A database schema is defined for a `vehicles` table with columns for all required data.
3. A database service is created that can initialize the database file and schema.
4. The service exposes basic functions like `insertVehicle` and `findVehicleByUrl`.

---
#### **Story 1.3: Headless Browser Scraper Service**
**As a** user, **I want** a scraper service that uses a headless browser (Puppeteer) to visit URLs and retrieve their full HTML content, **so that** I can gather the raw data from the marketplace websites.
**Acceptance Criteria:**
1. Puppeteer is added as a dependency to the `api` application.
2. A `ScraperService` is created that can launch a headless browser with best-practice configurations.
3. The service has a function that accepts a URL and returns the full, rendered HTML content.
4. The service includes respectful delays between requests.

---
#### **Story 1.4: Schema-Driven HTML Parser**
**As a** user, **I want** a parser that reads a `parser-schema.json` file and uses its rules (CSS selectors) to extract structured data from a raw HTML string, **so that** I can turn unstructured web pages into clean data without hardcoding parsing logic.
**Acceptance Criteria:**
1. A `parser-schema.json` file is created with placeholder selector structures.
2. A `ParserService` is created that uses `Cheerio` to load HTML.
3. The service has a function that takes raw HTML and a site key, reads the schema, applies the selectors, and returns a structured JSON object.

---
#### **Story 1.5: Main Ingestion Pipeline**
**As a** user, **I want** a main script that orchestrates the entire data ingestion process, **so that** I can run a single command to find and store all new vehicle listings.
**Acceptance Criteria:**
1. A main script (`packages/scripts/ingest.ts`) is created.
2. The script reads search URLs from a configuration file.
3. It uses the `ScraperService` to get a list of individual vehicle URLs.
4. For each new URL, it uses the `ScraperService`, `ParserService`, and database service to save the new vehicle data.

### Epic 2: AI Insights & Interactive UI
**Epic Goal:** Build the complete web interface that reads from the local database, executes all AI-powered analysis and scoring, and provides the full suite of interactive tools for the user to manage their search workflow.

---
#### **Story 2.1: Frontend Application Setup and API Connection**
**As a** user, **I want** a basic Next.js frontend application created that can connect to a simple backend API, **so that** the foundation for the user interface is in place and can display data.
**Acceptance Criteria:**
1. A new `web` app is created in the `apps` directory.
2. A simple API endpoint (`/api/vehicles`) is created in the `api` app to return all vehicles from the database.
3. The frontend successfully fetches and displays the raw data from this endpoint.
4. Tailwind CSS is configured in the `web` application.

---
#### **Story 2.2: AI Analysis Service**
**As a** user, **I want** a backend service that takes a vehicle's data, calls the Gemini API, and generates all the required AI insights, **so that** the core "intelligence" of the application is available to the UI.
**Acceptance Criteria:**
1. An `AIService` is created in the backend, using the AI Abstraction Layer.
2. A function accepts a vehicle object and calls the Gemini API to get all AI scores and reports.
3. The generated insights are saved back to the vehicle's record in the database.
4. A separate script (`packages/scripts/analyze.ts`) is created to run this analysis on all un-analyzed vehicles.

---
#### **Story 2.3: Market Value Score Service**
**As a** user, **I want** a backend service that can calculate the Market Value Score for each vehicle, **so that** I can objectively see if it is a good deal.
**Acceptance Criteria:**
1. A `MarketValueService` is created in the backend.
2. It has a function that takes a vehicle, finds comparable vehicles in the database, calculates the average price, and returns the percentage difference.
3. The result is saved to the vehicle's record in the database.
4. The main analysis script is updated to run this service.

---
#### **Story 2.4: Vehicled-Based Vehicle Dashboard**
**As a** user, **I want** a dashboard UI that fetches and displays all the analyzed vehicles in a vehicled-based layout, **so that** I can easily scan and compare all the potential vehicles.
**Acceptance Criteria:**
1. A dashboard page is created that fetches all vehicle data.
2. Each vehicle is rendered as a `VehicleCard` component showing key info, scores, and an interactive image carousel.
3. Basic sorting controls are added to the dashboard.

---
#### **Story 2.5: Interactive Workflow Tools**
**As a** user, **I want** to be able to change the status of a vehicle and add notes directly from its vehicled on the dashboard, **so that** I can manage my search workflow efficiently.
**Acceptance Criteria:**
1. The `VehicleCard` includes a working status dropdown that updates the database.
2. The `VehicleCard` includes a way to add/edit notes that are saved to the database.
3. The dashboard can be filtered by status.

---
#### **Story 2.6: Vehicle Detail View and Communication Assistant**
**As a** user, **I want** a full detail page for each vehicle that shows all information and includes the AI Communication Assistant, **so that** I can do a deep-dive analysis and prepare to contact the seller.
**Acceptance Criteria:**
1. Clicking a `VehicleCard` navigates to a unique detail page.
2. The page displays all scraped data and the full Virtual Mechanic's Report.
3. A "Communication Assistant" component uses the AI service to generate messages in Polish and translate replies.