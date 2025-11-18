# Epic 3: Dashboard Performance & Core Workflow

**Epic Goal:** Fix critical performance issues causing dashboard crashes, implement core workflow improvements including location features, advanced sorting, status management, and vehicle existence verification to create a stable, efficient vehicle browsing experience.

---

### **Story 3.1: Performance - Refactor VehicleCard State Management**

**As a** user, **I want** the dashboard to remain stable when scrolling through all vehicles, **so that** I can browse the entire vehicle list without crashes or performance degradation.

**Context:**
- Current issue: Dashboard crashes when scrolling past ~30-40 vehicles
- Root cause: Each VehicleCard has 10 React state variables (currentImageIndex, isTranslating, isAnalyzing, isUpdatingStatus, isSavingNotes, notes, isNotesExpanded, actionError, actionSuccess, imageError)
- 40 cards × 10 states = 400 state variables causing memory issues
- User requirement: Keep personal notes in dashboard cards with existing save/cancel button pattern

**Acceptance Criteria:**
1. Each VehicleCard only maintains essential local state:
   - `currentImageIndex` (for image carousel)
   - `imageError` (for broken image handling)
   - `isNotesExpanded` (for notes UI toggle)
   - `notes` (for notes textarea value)
2. Operation states (`isTranslating`, `isAnalyzing`, `isUpdatingStatus`, `isSavingNotes`) are moved to shared context/manager (e.g., track by vehicle ID in context)
3. Error and success messages (`actionError`, `actionSuccess`) are managed centrally instead of per-card
4. Dashboard remains stable and responsive when scrolling through 100+ vehicles
5. Personal notes remain visible and editable in dashboard cards with existing save/cancel button pattern
6. No regression in existing functionality (translate, analyze, status update, notes save/cancel)

**Technical Notes:**
- Files to modify: `apps/web/src/components/VehicleCard.tsx`, `apps/web/src/context/VehicleContext.tsx`
- Consider using a single operation state manager that tracks operations by vehicle ID
- Keep existing notes save/cancel button behavior (do not change to autosave)
- Focus on reducing per-card state overhead while maintaining all current functionality

---

### **Story 3.2: Location - Distance Calculation + Maps Integration**

**As a** user who is unfamiliar with Poland geography, **I want** to see driving distance from Wrocław and access maps quickly, **so that** I can easily assess vehicle accessibility and plan visits.

**Acceptance Criteria:**
1. **Distance Calculation:**
   - Driving distance in km from Wrocław is calculated for each vehicle
   - Distance is stored in database (new field: `distanceFromWroclaw: number | null`)
   - Distance is displayed in both dashboard cards and detail page
   - Distance is sortable in dashboard (ascending/descending)
   - Distance is filterable in dashboard (e.g., "within 50km", "50-100km", "100km+")

2. **Maps Integration - Dashboard:**
   - Vehicle location (city) is clickable
   - Clicking location opens Google Maps in new tab
   - Maps URL includes vehicle city for navigation

3. **Maps Integration - Detail Page:**
   - Same clickable location as dashboard
   - Interactive Google Maps embed showing vehicle location
   - Map shows city-level pin (no exact address, as not available)
   - Map is appropriately sized and positioned in layout

4. **Distance Calculation for New Vehicles:**
   - When new vehicles are scraped, distance is calculated automatically
   - Existing vehicles without distance are backfilled via migration/script

**Technical Notes:**
- Use Google Maps Distance Matrix API or similar service
- City-level precision only (exact addresses not available from scraping)
- Consider rate limits for distance calculation API
- Store calculated distance to avoid repeated API calls

---

### **Story 3.3: Multi-Level Sorting**

**As a** user, **I want** to apply multiple sort criteria that stack together, **so that** I can organize vehicles by priority while maintaining sub-sorting by other factors like price.

**Context:**
- User need: "If I sort by price low to high, and then by priority high to low, the high to low sort should also be sorted by price low to high"
- Solution: Stacked/compound sorting - last sort wins, but equal values use previous sort as tiebreaker

**Acceptance Criteria:**
1. Sorting system supports compound/stacked sorting:
   - Last applied sort becomes primary sort criterion
   - Equal values in primary sort are sub-sorted by previous sort criterion
   - Example: Sort by Priority (High→Low), then by Price (Low→High) = Vehicles primarily sorted by Price, but equal prices sub-sorted by Priority
2. Sort order persists ("fixed" once applied)
3. All existing sort options work with compound sorting:
   - AI Priority Rating
   - Personal Fit Score
   - Price
   - Year
   - Mileage
   - Date Added
   - Distance from Wrocław (from Story 3.2)
4. No visual UI indicator of sort stack (keep simple for MVP)
5. No "Clear all sorting" button (not needed for MVP)
6. Sort state persists during user session

**Technical Notes:**
- Implement sort stack in VehicleContext
- Consider storing sort history array (e.g., [{field: 'price', order: 'asc'}, {field: 'priority', order: 'desc'}])
- Apply sorts in reverse order (oldest first, newest last) when comparing vehicles

---

### **Story 3.4: Filtering - Hide Not Interested & Deleted Vehicles**

**As a** user, **I want** "not interested" vehicles hidden by default with an easy toggle to show them, and "deleted" vehicles completely archived away, **so that** I can focus on active vehicles while still being able to review hidden ones when needed.

**Context:**
- Two-tier hiding system: "Not Interested" (soft hide, toggleable) vs "Deleted" (hard archive, filter-only)
- Not Interested = "I might reconsider" → easily toggleable
- Deleted = "Completely irrelevant" → only accessible via explicit status filter
- Inline placeholders provide feedback when vehicles are hidden via status change

**Acceptance Criteria:**

1. **Not Interested Status (Soft Hide):**
   - Dashboard hides vehicles with status="not_interested" by default
   - UI includes "Show Not Interested" checkbox toggle (OFF by default)
   - When toggle ON, not_interested vehicles appear in normal sorted position with red status badge
   - When toggle OFF, not_interested vehicles are hidden from list
   - Toggle state persists during user session (SPA navigation)

2. **Deleted Status (Hard Archive):**
   - Deleted vehicles are NEVER shown in regular list (no toggle)
   - Deleted vehicles only visible when explicitly filtering via status dropdown (select "Deleted")
   - Deleted vehicles appear in sorted order when filtered

3. **Inline Placeholder Notifications:**
   - When user changes status TO "not_interested" (with toggle OFF), show inline placeholder: "Vehicle Added to Not Interested List" with X dismiss button
   - When user changes status TO "deleted", show inline placeholder: "Vehicle Deleted" with X dismiss button
   - Placeholders persist in vehicle's position until manually dismissed (X clicked)
   - Dismissing placeholder collapses the slot (list reflows)
   - Placeholders only appear on ACTION (status change), NOT on page load with already-filtered vehicles
   - If toggle is ON when marking "not_interested", vehicle stays visible (no placeholder needed)
   - Placeholders are slim/subtle, non-intrusive

4. **Status Badge Styling:**
   - "not_interested" status badge uses red background with red text
   - Badge appears on image carousel when vehicle is visible

5. **Filter Integration:**
   - "Show Not Interested" toggle works independently from status filter dropdown
   - Status filter dropdown can explicitly show "deleted" or "not_interested" vehicles
   - No regression in sorting, distance filter, or other status filters

**Technical Notes:**
- Current status filter implementation: `apps/web/src/context/VehicleContext.tsx`
- State additions: `showNotInterested: boolean`, `recentlyHiddenVehicles: Map<string, 'not_interested' | 'deleted'>`, `dismissedPlaceholders: Set<string>`
- New component: `PlaceholderNotification.tsx` for inline feedback
- Placeholder lifecycle: Created on status change action, persists until X clicked, session-bound (clears on page refresh)

---

### **Story 3.5: Status Management - Comprehensive Update**

**As a** user, **I want** clear status differentiation between system-processed vehicles and my workflow stages, **so that** I can track which vehicles have been analyzed and manage my evaluation workflow effectively.

**Context:**
- Need to differentiate between vehicles that are "processed" (AI analysis done) vs "skipped" (user chose not to analyze)
- "new" status represents scraped-but-not-analyzed vehicles (visible in UI for pipeline visibility)
- `isRemovedFromSource` boolean flag (NOT a status) represents vehicles no longer on Otomoto, separate from workflow status

**Acceptance Criteria:**
1. **Type Definition Update:**
   - Update VehicleStatus type in `packages/types/src/index.ts`:
     ```typescript
     type VehicleStatus = 'new' | 'processed' | 'skipped' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted'
     ```
   - Add `isRemovedFromSource: boolean` field to Vehicle interface (NOT a status value)

2. **New Status Behaviors:**
   - `new`: Assigned when vehicle is scraped, visible in UI for pipeline visibility
   - `processed`: User-facing status, indicates AI analysis is complete
   - `skipped`: User-facing status, indicates user chose not to analyze
   - `isRemovedFromSource`: Boolean flag, NOT a status (used by Story 3.7)

3. **Database Schema:**
   - Add new field: `isRemovedFromSource INTEGER DEFAULT 0` (SQLite boolean)
   - Add database migration for new statuses and field
   - Update existing "new" vehicles to "processed" if they have AI analysis

4. **UI Changes:**
   - Keep "new" visible in status dropdowns for pipeline visibility (scraped-but-not-analyzed vehicles)
   - Add "processed" and "skipped" to status dropdown
   - Status dropdown order: New, Processed, Skipped, To Contact, Contacted, To Visit, Visited, Not Interested, Deleted
   - Consistent status options in `VehicleCard.tsx`, `VehicleDetail.tsx`, and `SearchAndFilters.tsx`

5. **User Workflow:**
   - Vehicle scraped → status = "new" (visible in UI)
   - AI processes vehicle → status changes to "processed"
   - User can manually set status to "skipped" if choosing not to analyze
   - User workflow continues: `to_contact → contacted → to_visit → visited → not_interested → deleted`
   - `isRemovedFromSource` flag can be set regardless of current status (separate concern)

**Technical Notes:**
- Files to modify: `packages/types/src/index.ts`, `apps/web/src/components/VehicleCard.tsx`, vehicle repository, API routes
- Database migration required
- Ensure backward compatibility during migration

---

### **Story 3.6: Page Titles - Dynamic Browser Tab Titles**

**As a** user, **I want** clear, descriptive browser tab titles, **so that** I can easily identify tabs when working with multiple vehicles or returning to the app.

**Acceptance Criteria:**
1. **Dashboard Page:**
   - Browser tab title displays: "Dashboard | Car Finder AI"
   - Title updates immediately when navigating to dashboard

2. **Vehicle Detail Page:**
   - Browser tab title displays: "{Vehicle Name} | Car Finder AI"
   - Vehicle name is the actual name/title of the vehicle (e.g., "Audi A4 2.0 TDI" or similar)
   - Title updates immediately when navigating to vehicle detail
   - Title updates when switching between different vehicles

3. **Implementation:**
   - Uses Next.js metadata/head management best practices
   - Works correctly with client-side navigation
   - No flash of default title during navigation

**Technical Notes:**
- Files to modify: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/vehicle/[id]/page.tsx`
- Next.js 13+ uses Metadata API or `<title>` in layout/page components
- Ensure SSR and CSR both handle titles correctly

---

### **Story 3.7: Existence Check - Auto-Verification on Detail Page**

**As a** user, **I want** vehicles to automatically check if they're still available on Otomoto when I view their details, **so that** I can identify removed listings without manual effort.

**Context:**
- Vehicles may be removed from Otomoto after scraping (sold, expired, etc.)
- Auto-verification on detail page visit (background, non-blocking)
- 4-hour cache to avoid excessive requests (check only if last check >4 hours ago)
- Skip fresh vehicles (scraped <4 hours ago)
- Field `isRemovedFromSource` is a flag, NOT a status (doesn't auto-change workflow status)
- One-time cleanup script for existing ~500 vehicles (auto-marks as 'deleted')
- **Flag-based approach**: Visual warning badge, user decides on status changes

**Acceptance Criteria:**
1. **Database Fields:**
   - Field `isRemovedFromSource: boolean` exists (added in Story 3.5)
   - New field `lastExistenceCheck: Date | null` tracks when vehicle was last verified
   - Default values: `isRemovedFromSource = false`, `lastExistenceCheck = null`

2. **Auto-Check on Detail Page Visit:**
   - When user opens vehicle detail page, system checks if verification needed
   - Check triggers if: `lastExistenceCheck` is null OR >4 hours old
   - Check skipped if: vehicle was scraped <4 hours ago (fresh data)
   - Check runs in background (non-blocking page load)
   - On completion, updates `isRemovedFromSource` and `lastExistenceCheck`
   - If vehicle removed, shows toast notification: "This vehicle has been removed from Otomoto"

3. **Visual Warning Badge:**
   - Vehicles with `isRemovedFromSource = true` display badge: `⚠️ Removed from Source`
   - Badge visible in both dashboard cards and detail view header
   - Badge styled with orange/yellow warning colors, noticeable but not obstructive
   - Vehicles remain visible in dashboard (NOT auto-hidden or auto-deleted)
   - User manually decides to mark as "deleted" status or keep in list

4. **No Auto-Deletion (UI):**
   - Flagging as removed does NOT automatically change vehicle status
   - User maintains full control over status decisions
   - Flagged vehicles can still be contacted, visited, etc.
   - User can mark vehicle as 'deleted' to hide from dashboard (uses Story 3.4 filter)

5. **API Implementation:**
   - Create new API endpoint: `POST /api/vehicles/:id/check-existence`
   - Endpoint makes HEAD request to vehicle's `sourceUrl`
   - Returns 404/410 → sets `isRemovedFromSource = true`, updates `lastExistenceCheck`
   - Returns 200 → sets `isRemovedFromSource = false`, updates `lastExistenceCheck`
   - Handles errors gracefully (network issues, timeouts) - does not update fields on error

6. **One-Time Cleanup Script:**
   - Standalone script (`scripts/check-all-existence.js`) to check existing ~500 vehicles
   - Runs sequentially with 1.5s delays between requests to respect rate limits
   - Vehicles returning 404/410 are auto-marked as `status = 'deleted'` AND `isRemovedFromSource = true`
   - Logs progress and summary (e.g., "Checked 500 vehicles. 15 marked as deleted.")
   - Script is deleted after successful execution (one-time use)

**Technical Notes:**
- Files to modify: `packages/types/src/index.ts`, vehicle repository, create new API endpoint
- New file: `packages/db/src/migrations/add-last-existence-check.ts`
- New file: `scripts/check-all-existence.js` (temporary, delete after use)
- Use HEAD request instead of GET to minimize bandwidth
- Handle redirects appropriately (follow redirects, check final status)
- 4-hour cache prevents excessive requests while keeping data fresh
- One-time script provides clean slate for existing vehicles

---

### **Story 3.8: Existence Verification for AI Operations**

**As a** user, **I want** the system to verify vehicle availability before running expensive AI operations, **so that** I don't waste API credits on vehicles that have been removed from Otomoto.

**Context:**
- Story 3.7 implemented existence verification on detail page visits (user-driven, passive)
- AI operations (translation, analysis) consume expensive Gemini API credits (~4-5 calls per vehicle for full analysis)
- Current gap: Force translate/analyze buttons and batch commands don't check if vehicle is still available before processing
- Inconsistency: `pnpm analyze` processes `not_interested` vehicles, but `pnpm translate` skips them

**Acceptance Criteria:**

1. **Consistency Fix - Filter `not_interested` Vehicles:**
   - Update `findVehiclesNeedingAnalysis()` repository method to filter out `not_interested` vehicles
   - Match behavior of `findVehiclesNeedingTranslation()` (already filters both `deleted` and `not_interested`)
   - Batch `pnpm analyze` command skips `not_interested` vehicles automatically
   - Prevents wasting AI credits on vehicles user has explicitly dismissed

2. **Force Translate Button (VehicleCard/VehicleDetail):**
   - Before calling translation API, check vehicle existence (use endpoint from Story 3.7)
   - Respect 4-hour cache: only check if `lastExistenceCheck` is null or >4 hours old
   - Skip check if vehicle was scraped <4 hours ago (fresh data)
   - If vehicle is removed (404/410):
     - Block translation operation
     - Show toast notification: "Cannot translate - vehicle has been removed from Otomoto"
     - Update `isRemovedFromSource = true` and `lastExistenceCheck = now()`
     - Do NOT call translation API (save credits)
   - If vehicle is available (200):
     - Update `isRemovedFromSource = false` and `lastExistenceCheck = now()`
     - Proceed with translation normally

3. **Force Analysis Button (VehicleCard/VehicleDetail):**
   - Before calling analysis API, check vehicle existence
   - Same 4-hour cache logic as Force Translate
   - If vehicle is removed:
     - Block analysis operation
     - Show toast notification: "Cannot analyze - vehicle has been removed from Otomoto"
     - Update existence fields
     - Do NOT call analysis API (save ~4-5 API calls)
   - If vehicle is available:
     - Update existence fields
     - Proceed with analysis normally

4. **Batch `pnpm analyze` Command:**
   - Before processing each vehicle, check if existence verification is needed
   - Verification triggers if: `lastExistenceCheck` is null OR >4 hours old
   - Skip verification if: vehicle was scraped <4 hours ago
   - If vehicle is removed during check:
     - Skip analysis for that vehicle
     - Log: "⚠️  Skipping {vehicleId} - removed from source"
     - Update `isRemovedFromSource = true` and `lastExistenceCheck = now()`
     - Increment skipped count in run summary
   - If vehicle is available:
     - Update existence fields
     - Proceed with analysis
   - Rate limiting: existence check counts toward 15 RPM limit (factor into batch delays)

5. **Batch `pnpm translate` Command:**
   - Add same existence verification logic as analyze command
   - Check before translation API call
   - Skip translation if vehicle is removed
   - Log and update fields accordingly
   - Note: `pnpm translate` already filters `not_interested` vehicles ✓

6. **Error Handling:**
   - Network errors during existence check (timeouts, connection issues):
     - Log warning: "⚠️  Existence check failed (network error) - proceeding with operation"
     - Do NOT update `isRemovedFromSource` or `lastExistenceCheck` on error
     - Allow operation to proceed (fail-open for resilience)
   - HTTP errors (5xx):
     - Same fail-open behavior (proceed with operation)
   - Only 404/410 responses block operations and set `isRemovedFromSource = true`

7. **No Breaking Changes:**
   - Regular "Analyze" button (non-force) behavior unchanged
   - Single vehicle operations (`--vehicle-id` flag) still work
   - Existing tests remain valid
   - Backwards compatible with existing database

**Technical Notes:**
- Files to modify:
  - `packages/db/src/repositories/vehicleRepository.ts` - Add `not_interested` filter to `findVehiclesNeedingAnalysis()`
  - `apps/api/src/scripts/analyze.ts` - Add existence check in `analyzeVehicle()` method
  - `apps/api/src/scripts/translate.ts` - Add existence check in `translateVehicle()` method
  - `apps/web/src/components/VehicleCard.tsx` - Add existence check before force translate/analyze
  - `apps/web/src/components/VehicleDetail.tsx` - Add existence check before force translate/analyze
  - `apps/web/src/lib/api.ts` - May need to add helper for existence check API call

- Reuse existing endpoint: `POST /api/vehicles/:id/check-existence` (from Story 3.7)
- 4-hour cache logic matches Story 3.7 behavior
- Existence check is NON-BLOCKING for page load (only blocks AI operation)
- Rate limiting consideration: existence checks count as API calls (HEAD requests to Otomoto)
- Consider batching existence checks in `pnpm analyze` if processing many vehicles (optional optimization)

**Dependencies:**
- ✅ Story 3.5 (Status Management) - Adds `isRemovedFromSource` field
- ✅ Story 3.7 (Existence Check) - Adds `lastExistenceCheck` field and `/check-existence` endpoint

**Testing Considerations:**
- Mock Otomoto responses (200, 404, 410, 500, timeout)
- Test 4-hour cache logic (skip check if recent)
- Test fresh vehicle logic (skip check if scraped <4 hours ago)
- Test fail-open on network errors
- Verify `not_interested` filtering in batch analyze
- Verify toast notifications appear correctly
- Verify API credits are NOT consumed when vehicle is removed

---

### **Story 3.9: AI Analysis UX - Full Report Generation & Visual Indicators**

**As a** user, **I want** clear visual indicators of analysis completeness and the ability to generate full mechanic reports on-demand, **so that** I can understand what analysis has been performed and access detailed reports only when needed, saving AI credits.

**Context:**
- Current bug: Force Re-analyze button only generates summary, not full report (missing `includeFullReport` option)
- Current bug: API response structure mismatch causes frontend state update issues
- UX gap: No visual indication of what analysis has been performed (summary vs. full report)
- UX gap: No way to request full detailed mechanic report without re-running entire analysis
- Resource efficiency: Full reports cost additional AI credits and should be opt-in

**Acceptance Criteria:**

1. **CLI Behavior:**
   - `pnpm analyze` generates virtual mechanic summary only (default behavior)
   - `pnpm analyze --include-full-report` generates both summary AND full detailed mechanic report
   - Both commands respect existing `--force` flag behavior
   - Flag applies to single vehicle (`--vehicle-id`) and batch operations

2. **Visual Indicators - Vehicle Card:**
   - Location: Next to AI scores section (Personal Fit Score, Market Value, Priority Rating)
   - Style: Small icon + short text pills, subtle and non-intrusive
   - Badge variants:
     - `📊 Summary` - When `virtualMechanicSummary` exists but `aiMechanicReport` is null
     - `📋 Full` - When both `virtualMechanicSummary` AND `aiMechanicReport` exist
     - `⚠️ No Analysis` - When `virtualMechanicSummary` is null (no analysis performed)
   - Badges appear only when AI Analysis section is visible (at least one AI field populated)

3. **Vehicle Card Action Buttons (Renamed for Clarity):**
   - Replace current "Analyze" button with **"Quick Analysis"** (purple)
     - Generates summary only
     - Fills missing AI data (sanity check, fit score, summary, market value, priority rating)
     - Shows confirmation if re-analyzing existing data (force behavior)
   - Add new **"Full Analysis"** button (orange)
     - Generates summary + full detailed mechanic report
     - Shows confirmation with credit warning: "Generate full analysis including detailed report? This will use AI credits."
     - Button only visible when vehicle has been translated (`description` is not null)
   - Both buttons show loading spinner during operation
   - Both buttons show success/error toasts after completion

4. **Vehicle Details Page - Full Report Request:**
   - Below Virtual Mechanic Summary section, add dynamic button/link
   - Button text changes based on state:
     - **"✨ Generate detailed report"** - When `aiMechanicReport` is null
       - Triggers AI generation with loading spinner
       - Shows confirmation: "Generate detailed mechanic report? This will use 1 AI credit."
       - On success, expands to show the newly generated report
     - **"📋 View detailed report"** - When `aiMechanicReport` exists
       - Expands/collapses existing report section (no API call)
       - Toggle behavior (expand/collapse)
   - Report section is collapsible (same as current implementation)
   - Button styled as subtle link/button, not prominently featured

5. **API Fixes (Technical - Bug Resolution):**
   - Fix analyze endpoint response structure in `apps/api/src/routes/vehicles.ts`:
     - Current: Returns `{ message: string, vehicle: {...} }`
     - Fixed: Returns full `Vehicle` object directly (consistent with PATCH endpoint)
   - Pass `includeFullReport` option from frontend to `VehicleAnalyzer`:
     - Add query parameter: `?includeFullReport=true`
     - Wire through route handler to analyzer.run() options
   - Ensure frontend properly updates state with returned vehicle data:
     - Update `virtualMechanicSummary` state
     - Update `aiMechanicReport` state
     - Refresh visual indicators

6. **Loading & Feedback States:**
   - All analysis operations show loading spinner (no time estimates)
   - Success: Show green toast "Analysis completed successfully!"
   - Error: Show red toast with error message
   - Full report generation: Show loading spinner with text "Generating detailed report..."
   - All feedback follows existing patterns (Story 3.8 credit warnings pattern)

7. **No Breaking Changes:**
   - Existing analyze functionality remains unchanged
   - Database schema unchanged (uses existing `virtualMechanicSummary` and `aiMechanicReport` fields)
   - Backward compatible with existing analyzed vehicles
   - All existing tests remain valid

**Technical Notes:**
- Files to modify:
  - `apps/api/src/routes/vehicles.ts` - Fix response structure, add `includeFullReport` query param
  - `apps/api/src/scripts/analyze.ts` - Already supports `includeFullReport`, ensure it's wired correctly
  - `apps/web/src/components/VehicleCard.tsx` - Add visual indicators, rename buttons, add Full Analysis button
  - `apps/web/src/components/VehicleDetail.tsx` - Add dynamic Generate/View button, handle full report generation
  - `apps/web/src/lib/api.ts` - Update `analyzeVehicle()` to accept `includeFullReport` parameter, fix type expectations

- Visual indicator implementation:
  - Add badge component or inline styled element
  - Position: Flexbox next to scores grid
  - Responsive: Stack on mobile if needed

- Credit usage pattern (match Story 3.8):
  - Confirmation dialogs for operations that consume credits
  - Clear messaging: "This will use X AI credits"

- Full report generation from detail page:
  - New API call: `POST /api/vehicles/:id/analyze?includeFullReport=true&force=false`
  - Only generates full report (summary already exists)
  - Should NOT re-run other analysis steps (sanity check, fit score, priority rating)
  - Consider: Add `onlyFullReport` flag to skip already-complete steps

**Dependencies:**
- No blocking dependencies (can be implemented immediately)
- Complements Story 3.8 (existence verification) - both use similar confirmation patterns

**Testing Considerations:**
- Test `includeFullReport` flag in CLI (`pnpm analyze --include-full-report`)
- Test visual indicators appear correctly based on analysis state
- Test button rename doesn't break existing functionality
- Test Full Analysis button generates both summary and report
- Test Generate/View button state changes correctly
- Test API response structure fix updates frontend state properly
- Test confirmation dialogs appear for credit-consuming operations
- Mock AI service to avoid consuming real credits during testing

---

### **Story 3.10: Translation Quality & Performance Improvements**

**As a** user, **I want** vehicles with required features mentioned only in descriptions to be correctly included in translation processing, and for translation to run concurrently for faster processing, **so that** I don't miss good vehicle matches and can process translation batches efficiently.

**Context:**
- **Data Quality Issue (TD-022 - HIGH Priority)**: Vehicles are filtered as `not_interested` before translation when they lack required features in `sourceEquipment`, but some vehicles mention required features (like A/C) in `sourceDescriptionHtml` instead
- **User Discovery**: "Sometimes the car lists the A/C in the description, but not really in the features"
- **Impact**: Missing potentially good vehicles that have required features mentioned in Polish description
- **Performance Issue (TD-019 - MEDIUM Priority)**: Translation processes vehicles sequentially (one at a time), much slower than analyze script (which uses concurrent processing)
- **Current Performance**: 4 seconds per vehicle sequentially = very slow for large batches
- **Desired Behavior**: Concurrent processing with p-limit (similar to analyze script) for 3x performance improvement

**Acceptance Criteria:**
1. **Enhanced Feature Filtering with Description Search:**
   - `hasRequiredFeatures()` function searches both `sourceEquipment` AND `sourceDescriptionHtml` for required features
   - Uses `requiredFeatures` array from `search-config.json` (10 klimatyzacja variations, no hardcoded keywords)
   - Searches description HTML for ANY of the Polish terms in `requiredFeatures` (case-insensitive)
   - Vehicle passes filter if required feature found in EITHER sourceEquipment OR description
   - Vehicles with required features in equipment list continue to pass (existing behavior preserved)
   - Vehicles with required features only in description now pass filter (new behavior)
   - Implementation uses existing configuration infrastructure (search-config.json), not hardcoded Polish keywords

2. **Concurrent Translation Processing:**
   - Add `concurrency` parameter to `TranslationOptions` interface (default: 3)
   - Add `--concurrency` CLI flag to allow user control of concurrent processing
   - Use p-limit library for concurrent processing (same pattern as analyze.ts)
   - Process up to N vehicles concurrently (where N = concurrency parameter)
   - Maintain 4-second delay between batches (not within batch) for 15 RPM rate limit compliance
   - Concurrent processing uses Promise.all() for batch execution
   - Progress tracking shows concurrent operations clearly

3. **Error Handling & Backward Compatibility:**
   - Failed vehicle translation doesn't block other concurrent operations
   - Errors logged clearly with vehicle ID
   - Script continues processing remaining vehicles on individual failures
   - Comprehensive summary report at completion (success/failure/skipped counts)
   - Script can still run with concurrency=1 for debugging (sequential mode)
   - All existing functionality remains intact (--vehicle-id, --limit flags, etc.)
   - No breaking changes to translation API or database schema

4. **Testing Requirements:**
   - Unit tests for enhanced `hasRequiredFeatures()` function covering all scenarios
   - Unit tests for concurrent translation processing
   - Integration test: concurrent translation respects rate limits
   - Integration test: enhanced filtering correctly includes/excludes vehicles

**Technical Notes:**
- Files to modify: `apps/api/src/scripts/translate.ts` (main changes in hasRequiredFeatures, run method, parseArgs)
- Configuration: `search-config.json` now includes all 10 klimatyzacja variations from feature-dictionary.json
- Uses existing dictionary infrastructure from Story 2.3 (feature-dictionary.json with 189 Polish→English translations)
- Reference implementation: `apps/api/src/scripts/analyze.ts:337-394` for concurrent processing pattern
- Use p-limit library (already installed and used by analyze.ts)
- Rate limiting: 15 RPM Gemini API limit - concurrency=3 with 4-second batch delay = safe
- No database schema changes required
- No hardcoded Polish keywords - uses search-config.json configuration
- Test file: `apps/api/src/scripts/__tests__/translate.test.ts` (create if doesn't exist)

**Dependencies:**
- No blocking dependencies
- Complements Story 4.3 (Features Management) - automated fix before manual UI
- Uses same concurrent processing pattern as Story 4.1 (Parallel Analysis)

**Testing Considerations:**
- Test enhanced filtering with vehicles having A/C in description only
- Test concurrent processing with various concurrency levels (1, 3, 5)
- Verify rate limiting compliance (monitor API calls, should not exceed 15 RPM)
- Test error isolation (one failed translation doesn't block others)
- Performance comparison: sequential vs concurrent (expect ~3x improvement)
- Test all existing CLI flags continue working (--vehicle-id, --limit, --force)

---

## Epic Summary

**Total Stories:** 10

**Key Outcomes:**
- Dashboard performance fixed (stable for 100+ vehicles)
- Location features integrated (distance calculation, maps)
- Advanced sorting capabilities (compound/stacked sorting)
- Clear status differentiation (processed/skipped workflow)
- Vehicle availability verification (auto-check on detail page visit)
- Resource efficiency (existence verification before AI operations prevents wasted credits)
- Improved UX (two-tier hiding for not_interested/deleted, inline placeholder feedback, dynamic page titles)
- AI analysis transparency (visual indicators for analysis completeness, on-demand full report generation)
- Translation quality improvements (enhanced feature filtering with description search)
- Translation performance improvements (3x faster with concurrent processing)

**Database Changes Required:**
- New field: `distanceFromWroclaw: number | null`
- New field: `isRemovedFromSource: boolean`
- New field: `lastExistenceCheck: Date | null`
- New statuses: `processed`, `skipped`
- Migration to backfill distance and update existing "new" vehicles
- Migration to add `lastExistenceCheck` field

**Dependencies:**
- Story 3.1 (Performance fix) should be completed first (CRITICAL)
- Story 3.2 (Location) adds sortable field used by Story 3.3 (Sorting)
- Story 3.5 (Status management) adds field used by Story 3.7 and 3.8 (Existence checks)
- Story 3.7 (Existence check) adds endpoint/fields used by Story 3.8 (AI operation verification)
- Story 3.10 (Translation improvements) should be completed before Story 4.3 (Features Management)
  - Story 3.10 fixes automated feature detection (reduces volume of vehicles needing manual correction)
  - Story 4.3 provides manual feature management UI (handles remaining edge cases)
- Other stories are relatively independent

**Future Enhancements Deferred:**
- Visual sort stack indicator
- 3+ level sorting
- Automatic periodic background checks for removed vehicles
