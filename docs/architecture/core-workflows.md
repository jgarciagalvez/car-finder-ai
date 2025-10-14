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

## 2. Translation & Filtering Workflow

The translation pipeline processes vehicles with NULL description/features fields, filtering out vehicles that don't meet required feature criteria BEFORE calling AI.

```mermaid
sequenceDiagram
    participant Script as translate.ts
    participant Config as search-config.json
    participant Repo as VehicleRepository
    participant AI as AIService<br/>(packages/ai)
    participant Gemini as Gemini API (Flash-Lite)
    participant DB as SQLite Database

    Script->>Config: Load translationModel & requiredFeatures
    Script->>Repo: findVehiclesNeedingTranslation()
    Repo-->>Script: Vehicles with NULL description/features

    loop For each vehicle
        Script->>Script: Parse sourceEquipment (Polish JSON)
        Script->>Script: hasRequiredFeatures() check

        alt Has required features OR --force flag
            Script->>AI: translateVehicleContent(vehicle)
            AI->>Gemini: Translation prompt (Polish → English)
            Gemini-->>AI: Translated description + features
            Script->>Repo: updateVehicle(description, features)
            Repo->>DB: UPDATE vehicle
        else Missing ALL required features
            Script->>Repo: updateVehicle(status='not_interested', aiDataSanityCheck)
            Repo->>DB: UPDATE vehicle (filtered out)
        end

        Script->>Script: Rate limit delay (4s)
    end
```

**Key Points:**
- Feature filtering happens BEFORE translation (saves API costs)
- Uses `sourceEquipment` (Polish) for matching, not translated `features`
- Filtered vehicles marked as `'not_interested'` status
- Uses faster model (gemini-2.5-flash-lite) vs analysis model
- Respects 15 RPM rate limit (4s delay)
- `--force` flag bypasses filter for manual override
- UI can trigger re-translation via POST /api/vehicles/:id/translate?force=true

## 3. AI Analysis Workflow

**Note:** This workflow assumes vehicles are pre-translated via translate.ts (Step 2 above). Analysis pipeline no longer includes translation.

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

## 4. AI Chat Interaction Workflow

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

