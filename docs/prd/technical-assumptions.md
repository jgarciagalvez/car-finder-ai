# Technical Assumptions

### Repository Structure
**Decision:** Monorepo

The project will be developed within a monorepo (e.g., using Turborepo) to simplify code sharing between the backend and frontend.

### Service Architecture
**Decision:** Local-First Execution Model

The primary architecture for the MVP will be a **Local-First Execution Model**. The application will be designed as a set of Node.js scripts and a local web server that runs entirely on your machine.

### Testing Requirements
**Decision:** Unit + Integration Tests

The testing strategy will focus on Unit Tests for complex functions and Integration Tests for the core scraping/parsing logic.

### Additional Technical Assumptions and Requests
* The backend will be built with **Node.js**, **Express.js**, and **Puppeteer**.
* The frontend will be built with **React/Next.js** and **Tailwind CSS**.
* The database will be **LibSQL** (SQLite-compatible).
* Data parsing will be driven by an external **`parser-schema.json`** file.
* **AI Provider Abstraction:** The application will use an abstraction layer for AI interactions. For the MVP, only the **Google Gemini API** will be implemented.
