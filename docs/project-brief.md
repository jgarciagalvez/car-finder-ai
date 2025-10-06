# Project Brief: Car Finder AI

### Executive Summary

Car Finder AI is a short-term, personal web application designed to automate and streamline the process of finding and purchasing a specific used vehicle in Poland. The application will aggregate listings from multiple online marketplaces (Otomoto, OLX), standardize the data, and score each vehicle against a set of predefined personal criteria. Key features include an objective market price analysis to identify good deals and an integrated AI-driven review to provide expert mechanical advice tailored to each specific car's model, year, and engine. The project's goal is to equip the user with the best possible information to make a quick, confident, and well-informed purchasing decision, after which the application will have served its purpose.

### Problem Statement

The current process of searching for a specific type of used vehicle (e.g., Renault Trafic, Ford Transit) across multiple Polish marketplaces is highly manual, inefficient, and difficult to manage. The key pain points include:

* **Repetitive Manual Searches:** Daily, time-consuming checks are required across multiple websites to find new listings.
* **Inconsistent Data:** Listings lack a standard format, making direct comparisons of key metrics like mileage, price, and features difficult and prone to error.
* **Disorganized Tracking:** Managing a list of interesting vehicles, their statuses (e.g., to contact, visited), seller communications, and personal notes is cumbersome and often spread across different tools like spreadsheets or notebooks.
* **Difficulty in Assessing Value:** It is hard to objectively determine if a vehicle is a "good deal" without extensive manual market research for every potential vehicle.
* **Lack of Specialized Knowledge:** For each unique combination of model, year, and engine, the buyer must manually research common mechanical faults and inspection points, a repetitive and expert-driven task.

This manual process leads to wasted time, potential for missing out on good opportunities, and decision fatigue, ultimately hindering the ability to find the best possible vehicle for the price.

### Proposed Solution (Revised)

The proposed solution is a full-stack web application that acts as a centralized and intelligent "mission control" for the vehicle purchasing process. The application will automate the most labor-intensive aspects of the search and provide data-driven insights to aid in decision-making.

The core workflow is as follows:
1.  **Automated Aggregation:** The system will run a daily scheduled task to scrape new vehicle listings from pre-configured search URLs for Otomoto and OLX.
2.  **Data Processing:** It will parse, standardize, and de-duplicate the scraped data, storing it in a structured database. Prices will be converted to EUR for easy comparison.
3.  **Individual Scoring:** Each vehicle will be evaluated and presented with two key scores:
    * A **Personal Fit Score** (1-100) that rates the vehicle against the user's subjective preferences (tailgate, windows, seller type, distance from Wrocław, etc.).
    * A **Market Value Score** (e.g., "5% below market average") that objectively compares its price to similar vehicles in the database.
4.  **AI-Powered Prioritization:** The application's core intelligence lies in this step. An LLM will analyze each vehicle holistically, considering all available data:
    * The Personal Fit Score and Market Value Score.
    * A detailed analysis of the ad's description and photos for positive or negative indicators.
    * The findings of a "Virtual Mechanic's Report" (common issues for that specific model/year/engine).
    
    The output will be a **Priority Rating** and a concise, natural-language summary explaining *why* a particular vehicle is a top contender (e.g., "Top 5% deal. Ranks high on your personal criteria and the mechanic's report shows only minor common issues to check."). This will be used to automatically sort the main list, putting the most promising vehicles at the top.
5.  **Unified Interface:** All aggregated and processed listings will be displayed in a clean, powerful UI, sorted by the AI Priority Rating. The user can filter, sort, and manage the status of each vehicle (`New`, `To Contact`, `Visited`, etc.). The interface will also feature a communication assistant to help draft messages to sellers in Polish and translate their replies.

This solution directly addresses the problem of manual inefficiency and information overload by creating a single, automated, and insight-rich platform that not only gathers data but also helps prioritize it for the duration of the vehicle search.

### Target Users

#### Primary User Segment: The "Vehicle Seeker"

* **Profile:** A single, tech-savvy individual based in Wrocław, Poland, on a focused, short-term mission to purchase a specific type of used vehicle.
* **Current Behaviors:** Currently relies on a manual, multi-platform search process involving daily checks on sites like Otomoto and OLX, coupled with disorganized external note-taking (e.g., spreadsheets, text files) to track potential vehicles.
* **Needs & Pain Points:** The user needs to overcome information overload, data inconsistency, and decision fatigue. They require a tool that provides efficiency through automation, clarity through data standardization, and confidence through expert-level insights (market value, common mechanical issues).
* **Goals:** To find and purchase the best possible vehicle that meets a complex set of criteria, for the best value, with the least amount of wasted time and effort.

#### Secondary User Segment

There are no secondary user segments for this project. The application is a purpose-built, short-term tool designed for a single user's purchasing journey.

### Goals & Success Metrics

#### Project Objectives

* **Reduce Search Time:** Decrease the daily time spent manually searching for vehicles from over 30 minutes to less than 5 minutes by automating the aggregation of new listings.
* **Improve Decision Quality:** Increase confidence in the final purchase by providing data-driven insights for each vehicle, including objective market value analysis and an AI-generated pre-inspection report.
* **Centralize a Disorganized Process:** Achieve 100% centralization of potential vehicles, personal notes, and seller communication history within the application, eliminating the need for external spreadsheets or notes.
* **Achieve the Primary Goal:** Successfully identify, vet, and purchase a qualifying vehicle within the desired timeframe (e.g., before the end of 2025).

#### User Success Metrics

Success from the user's perspective will be measured by:

* Feeling confident that no good deals have been missed due to the comprehensive, daily scraping.
* Entering into negotiations with a seller armed with a clear understanding of the vehicle's market value and its specific potential mechanical issues.
* Effortlessly tracking the status of multiple vehicle candidates without confusion.
* Finding the overall vehicle search process to be significantly less stressful and more organized than a manual approach.

#### Key Performance Indicators (KPIs)

* **Time-to-Purchase:** The number of days from the application's first successful scrape to the date a vehicle is purchased.
* **Candidates Processed:** The total number of unique vehicle listings scraped, analyzed, and stored in the database.
* **"Good Deal" Ratio:** The percentage of vehicles moved to the "To Contact" status that were identified by the app as being at or below the market average price.

### MVP Scope (Revised)

#### Core Features (Must-Have for MVP)

* **Automated Multi-Source Scraper:** A scheduled, daily-running service that scrapes new listings from pre-defined search URLs for Otomoto.pl and OLX.pl, including handling of paginated results.
* **Data Processing & Standardization:** A backend process that parses, standardizes (e.g., mileage, year, price), and de-duplicates listings into a single, clean database format. Must include currency conversion to EUR.
* **Comprehensive Scoring Engine:** The system must calculate and display three distinct scores for each vehicle:
    1.  **Personal Fit Score:** A rating based on your hardcoded preferences (e.g., tailgate, A/C, seats, seller type, windows).
    2.  **Market Value Score:** An objective comparison of the vehicle's price against the average price of similar vehicles in the scraped database.
    3.  **AI Priority Rating:** A top-level AI-generated rating that synthesizes all data points to rank and recommend which vehicles to prioritize.
* **AI-Powered Analysis:** The application must integrate with an LLM to provide three functions:
    1.  **Virtual Mechanic's Report:** For each vehicle, a detailed report on common mechanical issues and inspection points for its specific model, year, and engine.
    2.  **Communication Assistant:** A tool within the vehicle detail page to generate messages to sellers (in Polish) and translate their replies.
    3.  **Data Sanity Check:** The LLM will cross-reference key details (e.g., mileage, year) from the ad's structured fields against the free-text description to flag potential inconsistencies (e.g., '300 km' vs '300,000 km').
* **Unified Web Interface:** A functional UI with two main views:
    1.  **Card-Based Dashboard View:** A main view, styled similarly to Otomoto/OLX, displaying each vehicle as a summary "card". Optimized for desktop, each card will show key info, scores, an image carousel, and directly integrate the status dropdown and a preview of personal notes for efficient management.
    2.  **Detail View:** A dedicated page for each vehicle showing all scraped details, photos, AI reports, and user-specific tools.
* **Vehicle Tracking Workflow:** Core tools for managing the search process integrated directly into the UI.

#### Out of Scope for MVP

* **Vehicle History Check Integration:** Automated scraping of `historiapojazdu.gov.pl` is a "Phase 2" feature due to its technical complexity.
* **UI for Search Configuration:** A graphical interface to build new searches is not included. However, searches will be configured via an editable JSON file, allowing for flexible adjustments without code changes.
* **User Authentication System:** As a personal application, a login system is unnecessary.
* **Push Notifications:** A simple in-app digest of new vehicles is sufficient.

#### MVP Success Criteria

The MVP will be deemed a success when it can reliably and automatically perform the end-to-end workflow: scraping listings from both sources, processing and scoring them, displaying them in the UI with all AI-generated insights, and allowing the user to manage the workflow, ultimately leading to the successful purchase of a vehicle.

### Post-MVP Vision

#### Phase 2 Features

* **Vehicle History Check Integration:** Build a dedicated scraper to automatically query `historiapojazdu.gov.pl`.
* **Dynamic Search Management UI:** Create a user interface to build, save, and manage multiple search configurations directly within the app.
* **Historical Market Price Analysis:** Add a feature to show price trends for specific models over time.

#### Long-term Vision

The long-term vision for this project is its successful conclusion. The application is considered a complete success once it has helped the user find and purchase a vehicle, at which point its mission is accomplished and it can be decommissioned.

#### Expansion Opportunities

The underlying codebase and architecture could serve as a reusable template for future personal scraping and analysis projects.

### Technical Considerations (Revised Update)

#### Platform Requirements
* **Target Platforms:** A responsive web application with a local-first execution model. The backend scraping and processing can run as a Node.js script on your local machine.
* **Browser/OS Support:** Latest stable versions of modern web browsers.

#### Technology Preferences
* **Frontend:** React (or Next.js) with a UI library like Shadcn UI and Tailwind CSS.
* **Backend:** A Node.js runtime using a headless browser library like Puppeteer. LLM integration via the Google Gemini API SDK.
* **Database:** A simple, local database solution like SQLite.
* **Hosting/Infrastructure:**
    1.  **Primary MVP Model (Local-First):** The application will be designed to run entirely on your local machine.
    2.  **Optional Cloud Model:** The architecture should allow for an easy transition to a serverless Firebase deployment.

#### Architecture Considerations
* **Repository Structure:** A monorepo is suggested.
* **Service Architecture:** A local script-based architecture.
* **Parser Abstraction:** The scraping logic will read its instructions (e.g., CSS selectors) from an external 'HTML Parser Schema' file (e.g., `parser-schema.json`).
* **Integration Requirements:** Secure local management of your Gemini API key.
* **Testing Infrastructure:** Comprehensive integration testing framework with service abstraction layer to resolve monorepo module resolution issues and enable proper cross-package testing.

### Constraints & Assumptions (Revised)

#### Constraints
* **Budget:** Minimal to zero operational cost.
* **Timeline:** The MVP should be functional within a few days (this weekend).
* **Resources:** Development will be led by you, directing AI agents.
* **Technical:** The project's success depends on the ability to scrape Otomoto.pl and OLX.pl.

#### Key Assumptions
* The target websites will remain scrapable using a headless browser.
* An LLM (Gemini API) will be effective for analysis tasks (not runtime parsing).
* The application can run effectively as a local script/application.
* Your personal criteria can be interpreted by an LLM for the Personal Fit Score.

### Risks & Open Questions (Revised)

#### Key Risks
* **Scraper Blocking:** Mitigation: A 'low and slow' scraping strategy will be used, with a commercial service like `scrapingFish` as a fallback.
* **Website Structure Changes:** Mitigation: The external 'HTML Parser Schema' file will allow for updates without code changes.
* **LLM API Costs:** This risk is significantly reduced as the LLM is not used for high-volume parsing.

#### Open Questions
* How effective will the LLM be for the analysis and report generation tasks?
* What will the average cost-per-vehicle be for the AI analysis steps?

#### Areas Needing Further Research
* **Schema Generation:** You will perform the initial task of using an LLM to generate the `parser-schema.json` file.
* **Scraping Etiquette:** Implement "best practice" scraping configurations to minimize blocking risk.

### Appendices

#### C. References
* Otomoto Example Search URL: `https://www.otomoto.pl/osobowe/renault/trafic/wroclaw?search%5Bdist%5D=300...`
* OLX Example Search URL: `https://www.olx.pl/motoryzacja/samochody/renault/wroclaw/?search%5Bdist%5D=100...`

### Next Steps

#### Immediate Actions
1.  Finalize and save this Project Brief as the foundational document.
2.  Begin the Proof of Concept (PoC) this weekend, focusing on generating the 'HTML Parser Schema' file.
3.  Proceed to the next phase: creating the detailed Product Requirements Document (PRD).