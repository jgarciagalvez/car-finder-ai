# Requirements

### Functional

* **FR1:** The system shall scrape new vehicle listings from Otomoto.pl and OLX.pl based on a configurable search schema file.
* **FR2:** The system shall parse the HTML of each scraped listing to extract key data points (e.g., price, year, mileage, description, photos) using a configurable parser schema.
* **FR3:** The system shall standardize all extracted data and store it in a local database (e.g., SQLite), de-duplicating any listings found on both source websites.
* **FR4:** The system shall convert all prices from PLN to EUR and store both values.
* **FR5:** The system shall use an LLM to generate a "Personal Fit Score" for each vehicle based on predefined user criteria.
* **FR6:** The system shall calculate a "Market Value Score" for each vehicle by comparing its price against similar vehicles in the database.
* **FR7:** The system shall use an LLM to generate an "AI Priority Rating" and a natural-language summary for each vehicle, synthesizing all other data points.
* **FR8:** The system shall use an LLM to generate a "Virtual Mechanic's Report" for each vehicle.
* **FR9:** The system shall use an LLM to perform a "Data Sanity Check" to flag inconsistencies between an ad's structured data and its text description.
* **FR10:** The system shall present all vehicles in a sortable, filterable, card-based dashboard UI.
* **FR11:** The system shall provide a detail view for each vehicle, displaying all scraped information, scores, and AI reports.
* **FR12:** The user shall be able to assign and update a status (e.g., `New`, `To Contact`, `Deleted`) for each vehicle from the dashboard UI.
* **FR13:** The user shall be able to add, edit, and save personal text comments for each vehicle.
* **FR14:** The system shall provide an LLM-powered "Communication Assistant" to help draft messages to sellers in Polish and translate replies.

### Non-Functional

* **NFR1:** The entire application (scraper, backend, and UI) must be capable of running on a local desktop machine.
* **NFR2:** The application's operational costs must be near-zero, relying on local execution and staying within the free/low-cost tiers of the Gemini API.
* **NFR3:** The user interface must remain responsive and performant, with long-running tasks like scraping and analysis executed in the background.
* **NFR4:** The web scraper must operate using a headless browser configured with best practices (e.g., appropriate user agents, request throttling) to behave like a real user and minimize detection risk.
* **NFR5:** The scraper's core logic (search URLs, parsing selectors) must be configurable via external JSON files, allowing for updates without changing the application's source code.
* **NFR6 (Fault Tolerance):** To ensure resilience, the system shall cache the results of intermediate steps in any multi-step workflow (e.g., saving raw HTML after scraping, saving AI responses). In case of a failure, workflows should be able to resume from the last successfully completed step, preventing redundant work.
* **NFR7 (Backup, Recovery, and Rollback):** The system shall provide a robust mechanism for data protection and recovery. This includes manual or automatic full database backups, as well as an automated pre-execution snapshot capability. Before any script that performs significant data modification (e.g., ingestion or analysis) is run, a timestamped database snapshot must be created to allow for a rapid rollback in case of failure or data corruption.

### Out of Scope

To ensure focus on the core MVP functionality, the following features and capabilities are explicitly out of scope for the initial version:

*   **User Accounts and Authentication:** The application is for a single user and will not have a login system.
*   **Support for Additional Scraper Sources:** The MVP will be built and tested only for `Otomoto.pl` and `OLX.pl`. Adding more sites is a future enhancement.
*   **Cloud Hosting or Public Web Access:** The entire application is designed to run locally on a desktop machine and will not be deployed to the cloud.
*   **Advanced AI Model Customization:** The AI prompts and models will be hardcoded for the MVP; a user interface for modifying them will not be included.
*   **Mobile-Native Application:** The UI will be responsive for web browsers, but a dedicated iOS or Android app is not part of the MVP.
