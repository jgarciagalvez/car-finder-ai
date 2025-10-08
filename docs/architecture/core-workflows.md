# Core Workflows

## 1. Data Ingestion Workflow

The ingestion pipeline scrapes vehicle listings from configured search URLs, parses structured data, and stores deduplicated records in the database.

```mermaid
sequenceDiagram
    participant Script as ingest.ts
    participant Config as search-config.json
    participant Scraper as ScraperService
    participant Parser as ParserService<br/>(parser-schema.json)
    participant Repo as VehicleRepository
    participant DB as SQLite Database

    Script->>Config: Load search URLs & settings
    Script->>Scraper: initialize() - Launch Puppeteer
    
    loop For each search URL
        Script->>Scraper: scrapeUrl(searchPageUrl)
        Scraper-->>Script: HTML content
        Script->>Parser: parseHtml(html, source, 'search')
        Parser-->>Script: Vehicle URLs array
        
        loop For each vehicle URL
            Script->>Repo: findVehicleByUrl() - Check duplicate
            alt Not exists
                Script->>Scraper: scrapeUrl(vehicleUrl)
                Scraper-->>Script: HTML content
                Script->>Parser: parseHtml(html, source, 'detail')
                Parser-->>Script: Parsed vehicle data
                Script->>Repo: insertVehicle(vehicle)
                Repo->>DB: INSERT vehicle record
            else Exists
                Script->>Script: Skip (deduplicate)
            end
        end
    end
    
    Script->>Scraper: close() - Cleanup browser
    Script->>Script: Generate summary report
```

**Key Points:**
- OLX uses search-only extraction (full data from search pages)
- Otomoto requires detail page visits for complete data
- Deduplication via `sourceUrl` uniqueness check
- Respectful delays between requests (configurable in search-config.json)

## 2. AI Analysis Workflow

The analysis pipeline processes vehicles with NULL AI fields, generating scores and reports via LLM calls.

```mermaid
sequenceDiagram
    participant Script as analyze.ts
    participant Repo as VehicleRepository
    participant AI as AIService<br/>(packages/ai)
    participant Gemini as Gemini API
    participant Market as MarketValueService
    participant DB as SQLite Database

    Script->>Repo: findVehiclesWithoutAnalysis()
    Repo-->>Script: Vehicles with NULL AI fields
    
    loop For each vehicle
        Script->>AI: generatePersonalFitScore(vehicle, criteria)
        AI->>Gemini: LLM prompt with vehicle data
        Gemini-->>AI: Fit score + reasoning
        
        Script->>AI: generatePriorityRating(vehicle)
        AI->>Gemini: Synthesize all data points
        Gemini-->>AI: Priority rating + summary
        
        Script->>AI: generateMechanicReport(vehicle)
        AI->>Gemini: Model-specific analysis
        Gemini-->>AI: Inspection points + red flags
        
        Script->>AI: generateDataSanityCheck(vehicle)
        AI->>Gemini: Compare structured vs text data
        Gemini-->>AI: Inconsistency flags
        
        Script->>Market: calculateMarketValue(vehicle)
        Market->>Repo: findSimilarVehicles(year, model)
        Market-->>Script: Price deviation percentage
        
        Script->>Repo: updateVehicleAnalysis(vehicleId, aiData)
        Repo->>DB: UPDATE vehicle SET ai* fields
    end
```

**Key Points:**
- Batch processing to stay within API rate limits (15 RPM)
- Results cached in database (no re-analysis)
- Market value calculated locally (no LLM needed)

## 3. AI Chat Interaction Workflow

The chat endpoint provides contextual LLM assistance for message drafting and translation.

```mermaid
sequenceDiagram
    participant UI as CommunicationAssistant
    participant API as POST /api/ai/chat
    participant Repo as VehicleRepository
    participant AI as AIService
    participant Gemini as Gemini API

    UI->>API: { context: { vehicleId }, conversationHistory, userMessage }
    
    alt vehicleId provided
        API->>Repo: findVehicleById(vehicleId)
        Repo-->>API: Vehicle data for context
    end
    
    API->>AI: chat(context, history, message)
    AI->>AI: Build system prompt with vehicle context
    AI->>Gemini: Send prompt + conversation history
    Gemini-->>AI: LLM response (markdown)
    AI-->>API: Formatted response
    
    API-->>UI: { aiResponse: "markdown text" }
    UI->>UI: Render markdown response
```

**Key Points:**
- Context includes current view and vehicle being viewed
- Conversation history maintained client-side
- Supports Polish message generation and translation
- Responses formatted in Markdown

