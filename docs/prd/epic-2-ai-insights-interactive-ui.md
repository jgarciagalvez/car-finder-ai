# Epic 2: AI Insights & Interactive UI
**Epic Goal:** Build the complete web interface that reads from the local database, executes all AI-powered analysis and scoring, and provides the full suite of interactive tools for the user to manage their search workflow.

---
### **Story 2.0: Integration Testing & Build Infrastructure**
**As a** developer, **I want** a comprehensive integration testing infrastructure that resolves monorepo module resolution issues, **so that** all Epic 2 stories can be properly tested and validated.
**Acceptance Criteria:**
1. A new `packages/services` package is created with service abstraction layer and interface contracts.
2. Service registry and adapter pattern implemented for runtime service binding with dependency injection.
3. Comprehensive mock implementations and integration test utilities are created.
4. Jest configuration is updated across all packages with proper module resolution and cross-package testing patterns.
5. Turbo configuration is updated with proper test dependencies and build pipeline integration.
6. Epic 1 integration tests are retrofitted using the new infrastructure to validate the solution.

---
### **Story 2.1: Frontend Application Setup and API Connection**
**As a** user, **I want** a basic Next.js frontend application created that can connect to a simple backend API, **so that** the foundation for the user interface is in place and can display data.
**Acceptance Criteria:**
1. A new `web` app is created in the `apps` directory.
2. A simple API endpoint (`/api/vehicles`) is created in the `api` app to return all vehicles from the database.
3. The frontend successfully fetches and displays the raw data from this endpoint.
4. Tailwind CSS is configured in the `web` application.

---
### **Story 2.2a: AI Infrastructure & Abstraction Layer**
**As a** developer, **I want** a robust AI infrastructure with provider abstraction, **so that** the foundation for all AI-powered features is established with proper error handling and rate limiting.
**Acceptance Criteria:**
1. A new `packages/ai` package is created with provider interface and factory pattern.
2. Gemini API client is implemented with proper authentication and configuration.
3. AI provider abstraction layer is created to support future provider additions.
4. Rate limiting, error handling, and retry logic are implemented for AI operations.
5. Basic prompt engineering utilities and response validation are established.

---
### **Story 2.2b: AI Analysis Features**
**As a** user, **I want** comprehensive AI analysis for each vehicle including fit scores and reports, **so that** I have intelligent insights to guide my vehicle selection decisions.
**Acceptance Criteria:**
1. Personal Fit Score generation is implemented using LLM analysis of vehicle data against user criteria.
2. AI Priority Rating and natural-language summaries are generated synthesizing all data points.
3. Virtual Mechanic's Report is created providing model-specific mechanical insights and inspection points.
4. Data Sanity Check is implemented to flag inconsistencies between structured data and descriptions.
5. A separate script (`apps/api/src/scripts/analyze.ts`) is created to run analysis on all un-analyzed vehicles.

---
### **Story 2.3: Market Value Score Service**
**As a** user, **I want** a backend service that can calculate the Market Value Score for each vehicle, **so that** I can objectively see if it is a good deal.
**Acceptance Criteria:**
1. A `MarketValueService` is created in the backend.
2. It has a function that takes a vehicle, finds comparable vehicles in the database, calculates the average price, and returns the percentage difference.
3. The result is saved to the vehicle's record in the database.
4. The main analysis script is updated to run this service.

---
### **Story 2.4: Card-Based Vehicle Dashboard**
**As a** user, **I want** a dashboard UI that fetches and displays all the analyzed vehicles in a card-based layout, **so that** I can easily scan and compare all the potential vehicles.
**Acceptance Criteria:**
1. A dashboard page is created that fetches all vehicle data.
2. Each vehicle is rendered as a `VehicleCard` component showing key info, scores, and an interactive image carousel.
3. Basic sorting controls are added to the dashboard.

---
### **Story 2.5: Interactive Workflow Tools**
**As a** user, **I want** to be able to change the status of a vehicle and add notes directly from its card on the dashboard, **so that** I can manage my search workflow efficiently.
**Acceptance Criteria:**
1. The `VehicleCard` includes a working status dropdown that updates the database.
2. The `VehicleCard` includes a way to add/edit notes that are saved to the database.
3. The dashboard can be filtered by status.

---
### **Story 2.6: Vehicle Detail View and Communication Assistant**
**As a** user, **I want** a full detail page for each vehicle that shows all information and includes the AI Communication Assistant, **so that** I can do a deep-dive analysis and prepare to contact the seller.
**Acceptance Criteria:**
1. Clicking a `VehicleCard` navigates to a unique detail page.
2. The page displays all scraped data and the full Virtual Mechanic's Report.
3. A "Communication Assistant" component uses the AI service to generate messages in Polish and translate replies.
