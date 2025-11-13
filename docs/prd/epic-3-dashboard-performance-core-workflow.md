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

### **Story 3.4: Filtering - Hide Deleted Vehicles by Default**

**As a** user, **I want** deleted vehicles hidden by default, **so that** I can focus on active vehicles unless I explicitly want to review deleted ones.

**Acceptance Criteria:**
1. **Default Behavior:**
   - Dashboard hides vehicles with status="deleted" by default
   - User sees only active/relevant vehicles on initial load

2. **Show Deleted Toggle (Option A):**
   - UI includes a "Show Deleted" checkbox or toggle button
   - When enabled, deleted vehicles are shown in the list
   - Toggle state persists during user session

   **OR**

   **Status Filter Approach (Option B):**
   - Deleted vehicles only visible when explicitly filtering by status="Deleted"
   - When any other status filter is active, deleted vehicles remain hidden
   - When no status filter is active, deleted vehicles remain hidden

3. **Existing Filter Integration:**
   - New behavior works seamlessly with existing status filter
   - No regression in other filtering functionality

**Technical Notes:**
- Current status filter implementation: `apps/web/src/context/VehicleContext.tsx`
- Decision between Option A and Option B should be made during story refinement
- Option A is simpler UX, Option B is more explicit

---

### **Story 3.5: Status Management - Comprehensive Update**

**As a** user, **I want** clear status differentiation between system-processed vehicles and my workflow stages, **so that** I can track which vehicles have been analyzed and manage my evaluation workflow effectively.

**Context:**
- Need to differentiate between vehicles that are "processed" (AI analysis done) vs "skipped" (user chose not to analyze)
- "new" status should be system-only, not user-facing
- "removed_from_source" represents vehicles no longer on Otomoto, but should NOT interfere with user's workflow status

**Acceptance Criteria:**
1. **Type Definition Update:**
   - Update VehicleStatus type in `packages/types/src/index.ts`:
     ```typescript
     type VehicleStatus = 'new' | 'processed' | 'skipped' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted' | 'removed_from_source'
     ```

2. **New Status Behaviors:**
   - `new`: System-only status, assigned when vehicle is scraped, NOT visible in UI dropdown
   - `processed`: User-facing status, indicates AI analysis is complete
   - `skipped`: User-facing status, indicates user chose not to analyze
   - `removed_from_source`: System status, indicates vehicle no longer exists on Otomoto

3. **Database Schema:**
   - Add new field: `isRemovedFromSource: boolean` (default: false)
   - Add database migration for new statuses and field
   - Update existing "new" vehicles to "processed" if they have AI analysis

4. **UI Changes:**
   - Remove "new" from status dropdown options in dashboard and detail page
   - Add "processed" and "skipped" to status dropdown
   - Status dropdown in `apps/web/src/components/VehicleCard.tsx` reflects new options

5. **User Workflow:**
   - Vehicle scraped → status = "new" (system-only)
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

### **Story 3.7: Existence Check - Manual Verification**

**As a** user, **I want** to manually check if vehicles are still available on Otomoto, **so that** I can identify removed listings and avoid wasting time on unavailable vehicles.

**Context:**
- Vehicles may be removed from Otomoto after scraping (sold, expired, etc.)
- User wants to verify availability without re-scraping
- Field `isRemovedFromSource` should NOT interfere with user's workflow status (separate concern)
- No scheduled/cron jobs - manual verification only

**Acceptance Criteria:**
1. **Database Field:**
   - Field `isRemovedFromSource: boolean` exists (added in Story 3.5)
   - Default value is `false` for all vehicles

2. **Manual Check - Dashboard:**
   - Dashboard header includes "Check All Vehicles" button
   - When clicked, checks all vehicles where `isRemovedFromSource = false` AND status != 'deleted'
   - Button shows loading state during check (e.g., "Checking... (5/120)")
   - On completion, shows summary (e.g., "Checked 120 vehicles. 3 are no longer available.")
   - Updates `isRemovedFromSource = true` for vehicles that return 404/410

3. **Manual Check - Individual Vehicle:**
   - Detail page includes "Check if removed" button
   - When clicked, verifies current vehicle's availability
   - Button shows loading state during check
   - Updates `isRemovedFromSource` field based on result
   - Shows success/failure message

4. **Visual Indicator:**
   - Vehicles with `isRemovedFromSource = true` display prominent badge/banner
   - Badge visible in both dashboard and detail view
   - Example text: "⚠️ No longer available on Otomoto"
   - Badge styled to be noticeable but not obstructive

5. **API Implementation:**
   - Create new API endpoint: `POST /api/vehicles/:id/check-existence`
   - Endpoint makes HEAD request to vehicle's `sourceUrl`
   - Returns 404/410 → sets `isRemovedFromSource = true`
   - Returns 200 → sets `isRemovedFromSource = false`
   - Handles errors gracefully (network issues, timeouts)

6. **Batch Check Implementation:**
   - Create API endpoint: `POST /api/vehicles/check-all-existence`
   - Processes vehicles in batches to avoid rate limiting
   - Includes appropriate delays between requests
   - Returns progress updates (if using streaming/polling)
   - Logs results for monitoring

7. **Performance Considerations:**
   - Current vehicle count: ~200-300
   - Check all operation should complete reasonably fast
   - Include delay between requests to respect Otomoto rate limits
   - Provide clear progress feedback to user

**Technical Notes:**
- Files to modify: `packages/types/src/index.ts`, vehicle repository, create new API routes
- Use HEAD request instead of GET to minimize bandwidth
- Handle redirects appropriately (may indicate vehicle moved, not removed)
- Consider Otomoto's rate limiting policies

---

## Epic Summary

**Total Stories:** 7

**Key Outcomes:**
- Dashboard performance fixed (stable for 100+ vehicles)
- Location features integrated (distance calculation, maps)
- Advanced sorting capabilities (compound/stacked sorting)
- Clear status differentiation (processed/skipped workflow)
- Vehicle availability verification (manual check system)
- Improved UX (hide deleted by default, dynamic page titles)

**Database Changes Required:**
- New field: `distanceFromWroclaw: number | null`
- New field: `isRemovedFromSource: boolean`
- New statuses: `processed`, `skipped`, `removed_from_source`
- Migration to backfill distance and update existing "new" vehicles

**Dependencies:**
- Story 3.1 (Performance fix) should be completed first (CRITICAL)
- Story 3.2 (Location) adds sortable field used by Story 3.3 (Sorting)
- Story 3.5 (Status management) adds field used by Story 3.7 (Existence check)
- Other stories are relatively independent

**Future Enhancements Deferred:**
- Visual sort stack indicator
- 3+ level sorting
- Automatic periodic background checks for removed vehicles
