# App Improvements - Epic Planning Summary

This document summarizes all discussed improvements for the Car Finder AI app, ready for epic/story creation.

---

## 🎯 Context & Priorities

**All items discussed are HIGH PRIORITY** - User only included must-have improvements for MVP.

**Key Principle:** Make stories complete and substantial. Avoid creating stories only for trivial changes. Try to bundle changes in one story if possible.

---

## 📋 Proposed Epic Structure

### **Epic 1: Dashboard & Core UX Improvements** (~8 stories)

#### Story 1: Performance - Refactor VehicleCard State Management
**Problem:** App crashes when scrolling past ~30-40 vehicles due to excessive React state management.

**Current Issue:** Each VehicleCard has 8 state variables:
- `currentImageIndex`, `isTranslating`, `isAnalyzing`, `isUpdatingStatus`, `isSavingNotes`, `notes`, `isNotesExpanded`, `actionError`, `actionSuccess`, `imageError`
- 40 cards × 8 states = 320 state variables causing memory issues

**Solution:**
1. Keep only essential local state in each card:
   - `currentImageIndex` (carousel)
   - `imageError` (broken images)
   - `isNotesExpanded` (notes UI)
2. Move operation states (`isTranslating`, `isAnalyzing`, `isUpdatingStatus`, `isSavingNotes`) to shared context/manager
3. Implement debounced autosave for personal notes (500ms delay after typing stops)
4. Keep personal notes in dashboard cards (user requirement)

**Files to modify:**
- `apps/web/src/components/VehicleCard.tsx`
- `apps/web/src/context/VehicleContext.tsx`

---

#### Story 2: Location - Distance from Wrocław
**Requirements:**
- Calculate driving distance in km from Wrocław to vehicle location
- Display distance in dashboard cards and detail page
- Make distance sortable/filterable
- Location should be clickable → opens Google Maps in new tab (both dashboard and detail page)
- City-level precision only (no exact addresses available)

**Technical Notes:**
- Use Google Maps Distance Matrix API or similar
- Store calculated distance in database for performance
- Update distance calculation when new vehicles are scraped

---

#### Story 3: Sorting - Multi-Level/Compound Sorting
**Requirements:**
- Implement stacked sorting: Last sort wins, but equal values use previous sort as tiebreaker
- Example: Sort by Priority (High→Low), then by Price (Low→High) = Primarily by Price, but equal prices sub-sorted by Priority
- Sort order should persist ("fixed" sort once run)
- No visual UI for sort stack (keep simple for MVP)
- No "Clear all sorting" button needed

**Current Sort Options:**
- Priority, Personal Fit, Price, Year, Mileage, Date Added

---

#### Story 4: Features - Expandable/Collapsible List
**Requirements:**
- Currently shows first 5 features + "(+N more)"
- Change "(+N more)" to clickable button that expands/collapses all features
- Expanded state should persist during scrolling
- Reset to collapsed on page refresh
- Apply same pattern to both dashboard cards and detail page (after name/basic info section)

**Current Implementation:**
- `apps/web/src/components/VehicleCard.tsx` lines 398-421

---

#### Story 5: Filtering - Hide Deleted Vehicles by Default
**Requirements:**
- Two approaches needed:
  1. UI toggle to "Show Deleted" (checkbox or button)
  2. Deleted vehicles only visible when explicitly filtering by status="Deleted"
- Default view: Deleted vehicles hidden

**Current Status Filter:**
- `apps/web/src/context/VehicleContext.tsx` - statusFilter state

---

#### Story 6: Status - Add Processed and Skipped Status
**Current Status Types:**
```typescript
type VehicleStatus = 'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted'
```

**Updated Status Types:**
```typescript
type VehicleStatus = 'new' | 'processed' | 'skipped' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted' | 'removed_from_source'
```

**UI Changes:**
- Remove "new" from status dropdown (system-only status, assigned when scraped)
- Add "processed" (AI analysis complete)
- Add "skipped" (user chose not to analyze)
- Add "removed_from_source" (no longer on Otomoto - see Story 7)

**User Workflow:**
1. Vehicle scraped → status = "new"
2. AI processes or user skips → status = "processed" or "skipped"
3. User workflow: `to_contact → contacted → to_visit → visited → not_interested → deleted`

**Files to modify:**
- `packages/types/src/index.ts:4`
- `apps/web/src/components/VehicleCard.tsx` (dropdown options)
- Database migration needed

---

#### Story 7: Existence Check - Add isRemovedFromSource Flag
**Requirements:**
- Add new boolean field: `isRemovedFromSource: boolean`
- NOT a status - separate field that doesn't interfere with user workflow
- Display as prominent badge/banner on vehicle (e.g., "⚠️ No longer available on Otomoto")
- Visible in both dashboard and detail view
- Manual "Check if removed" button on dashboard cards
- Manual "Check if removed" button on detail page

**Technical Implementation:**
- Make HEAD request to vehicle's `sourceUrl`
- If 404/410 → set `isRemovedFromSource = true`
- Field persists even if status changes (user may have already worked on the car)

**Files to modify:**
- `packages/types/src/index.ts` (add field to Vehicle type)
- `packages/db/src/repositories/vehicleRepository.ts` (database schema)
- Database migration needed
- Create new API endpoint: `POST /api/vehicles/:id/check-existence`

---

#### Story 8: Existence Check - Background Job
**Requirements:**
- Manual button in dashboard and vehicle details card (dashboards checks all cars, vehicle details confirms current car)
- Checks all vehicles where `isRemovedFromSource = false` AND status != 'deleted'
- Avoids Otomoto rate limiting (batch processing with delays)
- Logs results for monitoring

**Technical Implementation:**
- Create new script: `apps/api/src/scripts/check-removed-vehicles.ts`
- Add to package.json scripts
- Create UX/UI buttons

**User Note:**
- "We don't have that many cars anyway, it should be fast"
- Current vehicle count: ~200-300

---

### **Epic 2: Vehicle Detail Page Redesign** (~8 stories)

#### Story 1: Performance - Debounced Autosave for Notes
**Requirements:**
- Personal notes autosave 500ms after user stops typing
- Show subtle "Saving..." indicator during save
- No save/discard buttons
- Works for both dashboard cards and detail page

**Context Synchronization:**
- VehicleContext already syncs between dashboard and detail page (lines 67-76 in VehicleContext.tsx)
- `UPDATE_VEHICLE` action updates both `vehicles` array and `selectedVehicle`
- Changes in detail page automatically reflect in dashboard

---

#### Story 2: Images - Square Thumbnails + Modal Viewer
**Current Implementation:**
- Fixed size aspect ratio causes images to be cut off
- `apps/web/src/components/VehicleCard.tsx` lines 188-241

**Requirements:**
- Change thumbnails to square format (same height as current)
- On click → open full-size image in modal/lightbox viewer
- Viewer should have prev/next navigation
- Apply to detail page only (dashboard keeps current carousel)

---

#### Story 3: Scores - Dedicated Section + Layout
**Requirements:**
- Move scores to right side of images (currently empty space)
- Keep color-coded badges as they are
- Change Personal Fit Score display from N/100 to N/10 scale
- Resize if needed to fit space

**Current Score Display:**
- `apps/web/src/components/VehicleCard.tsx` lines 302-328
- AI Priority, Personal Fit, Market Value

---

#### Story 4: Location - Distance + Google Maps Integration
**Requirements:**
- Display distance from Wrocław (same as dashboard)
- Clickable location → opens Google Maps in new tab
- Add interactive Google Maps embed showing vehicle location
- Pin shows city location (no exact address available)

**Map Embed:**
- Use Google Maps Embed API
- Show just location pin (not route from Wrocław - keep it simple)

---

#### Story 5: Layout - Sticky Workflow Sidebar
**Requirements:**
- Desktop: Sticky sidebar for "My Workflow" section (visible while scrolling)
  - Include workflow buttons (status dropdown)
  - Personal notes and status autosave (from Story 1)
- Mobile: Simple sticky header (avoid blocking screen)
  - Note: Mobile UX is temporary solution for MVP
  - Add to future enhancements: proper mobile layout

**Current Workflow Section:**
- Status dropdown (lines 424-443 in VehicleCard.tsx)
- Action buttons for translate/analyze (lines 445-490)

---

#### Story 6: Virtual Mechanic - Concise Summary (Editable)
**Current Problem:**
- Report is too detailed and exhaustive
- Rendering is poor (markdown packed, difficult to read)
- User wants quick overview, not full diagnostic

**New Requirements:**
- Redesign AI prompt for concise summary format:
  ```
  - This model and engine is known for _____
  - Main issues are ___
  - Based on the description, it seems like ___
  ```
- Bullet points, easy to scan
- Summary should be editable by user
- Store edited summary in database (new field: `virtualMechanicSummary`)

**Technical Notes:**
- Update prompt in `packages/ai/src/prompts/` (check for existing virtual mechanic prompt)
- Add new database field for editable summary
- Fix markdown rendering issues

**Files to check:**
- `apps/api/src/services/AIService.ts`
- `packages/ai/src/prompts/virtual-mechanic-report.md` (if exists)

---

#### Story 7: Virtual Mechanic - Full Report in Separate Section
**Requirements:**
- Keep current detailed report available
- Move to separate tab/collapsible section (e.g., "Full Report" tab)
- Also make editable
- Store in database (keep existing field, add editability)

**Purpose:**
- User can generate detailed report via AI Assistant if needed
- Or manually copy/paste detailed notes
- Speeds up AI processing (can skip generating full report during initial analysis)

---

#### Story 8: Features - Reposition + Expand/Collapse + Manual Addition
**Requirements:**
- Move features section higher in detail page view
- Position: Right after name and basic info (year, mileage, location)
- Add expand/collapse functionality (same as dashboard - Story 4 in Epic 1)
- **Add ability to manually add/edit features on detail page**
  - User discovered: "Sometimes the car lists the A/C in the description, but not really in the features"
  - Scraped features from Otomoto are incomplete
  - UI to add new features or edit existing ones
  - Store changes in database (update features array)
  - Sync back to dashboard automatically via VehicleContext

---

### **Epic 3: Performance & Processing** (~2 stories)

#### Story 1: Parallel Analysis - Concurrent Processing
**Current Performance:**
- 4 hours to process ~200-300 vehicles
- Gemini API rate limit: 15 RPM
- Sequential processing: 1 vehicle at a time × 4 AI calls = 4 vehicles/minute

**Solution:**
- Process 3-4 vehicles concurrently
- Still respects 15 RPM limit: 3-4 concurrent × 4 calls = 12-16 RPM
- **Expected improvement: 4 hours → 1-1.5 hours**

**Technical Implementation:**
- Modify `apps/api/src/scripts/analyze.ts`
- Use Promise.all() or p-limit library for concurrency control
- Maintain 4-second delay between batches to respect rate limits

**Files to modify:**
- `apps/api/src/scripts/analyze.ts`

---


---

## 🔍 Technical Context & Constraints

### Current Architecture
- **Monorepo structure:** `apps/api`, `apps/web`, `packages/db`, `packages/types`, `packages/ai`
- **Database:** Check schema in `packages/db/`
- **AI Provider:** Gemini API (15 RPM rate limit)
- **Frontend:** Next.js, React, TypeScript
- **State Management:** React Context (`apps/web/src/context/VehicleContext.tsx`)

### Key Files
- **Vehicle Types:** `packages/types/src/index.ts`
- **Dashboard:** `apps/web/src/app/dashboard/page.tsx`
- **Vehicle Card:** `apps/web/src/components/VehicleCard.tsx`
- **Vehicle Detail:** `apps/web/src/app/vehicle/[id]/page.tsx`
- **Vehicle Hook:** `apps/web/src/hooks/useVehicles.ts`
- **Vehicle Context:** `apps/web/src/context/VehicleContext.tsx`
- **API Service:** `apps/api/src/services/AIService.ts`
- **Vehicle Repository:** `packages/db/src/repositories/vehicleRepository.ts`
- **Analyze Script:** `apps/api/src/scripts/analyze.ts`

### Database Schema Notes
- Vehicle statuses currently: `'new' | 'to_contact' | 'contacted' | 'to_visit' | 'visited' | 'not_interested' | 'deleted'`
- Need migrations for:
  - New statuses: `processed`, `skipped`, `removed_from_source`
  - New field: `isRemovedFromSource: boolean`
  - New field: `virtualMechanicSummary: string | null`
  - New field: `distanceFromWroclaw: number | null` (in km)

### Performance Considerations
- **Infinite scroll:** Already implemented (50 vehicles per page)
- **Lazy loading:** Already implemented for images (`loading="lazy"`)
- **Main bottleneck:** Too many React states per card (8 states × 40 cards = 320 states)

---

## 🚫 Decisions Made (What NOT to do)

1. **No Save/Discard bar for dashboard** - Use debounced autosave instead
2. **No complex sort stack UI** - Keep sorting simple, no visual indicator of sort order
3. **No "Clear all sorting" button** - Not needed for MVP
4. **"New" status not in UI dropdown** - System-only, users shouldn't manually set it
5. **removed_from_source is NOT a status** - Separate boolean field to preserve user's workflow status
6. **Mobile UX for sticky sidebar** - Quick/simple solution for MVP, proper mobile layout deferred

---

## ❓ Questions Addressed

**Q: Are we always checking for duplicates based on URL?**
A: Yes. When running overlapping radius searches (e.g., Wrocław +50km, then +100km), the system correctly handles duplicates by URL. No duplicate entries should occur.

**Q: Is 4-hour processing time normal?**
A: Yes. With Gemini's 15 RPM rate limit and 4 AI calls per vehicle, 4 hours for 200-300 vehicles is expected. Epic 3 will reduce this to 1-1.5 hours with parallel processing.

**Q: Why does the app crash when scrolling?**
A: Too many React state variables (8 per card × 40 cards = 320 states) causes memory issues. Epic 1, Story 1 fixes this by refactoring state management.

**Q: Will changes in detail page update the dashboard?**
A: Yes. VehicleContext already synchronizes both views. The `UPDATE_VEHICLE` action updates both the vehicles array (dashboard) and selectedVehicle (detail page).

---

## 📝 Future Enhancements (Deferred from MVP)

These were discussed but explicitly moved to post-MVP:

1. **Visual sort stack indicator** - Show active sort criteria like "Priority ↓ → Price ↑"
2. **More than 2-level sorting** - Allow 3+ sort criteria
3. **Proper mobile layout** for detail page sticky sidebar
4. **Automatic periodic background check** for removed vehicles (we have nightly batch, but could add more frequent checks)

---

## ✅ Ready for Epic Creation

This document contains all information needed to create:
- 3 Epics
- ~18 Stories total
- Comprehensive acceptance criteria
- Technical implementation details
- Database migration requirements

**Next Step:** Use BMAD agent `/po` to create formal epic and story documents using this summary.
