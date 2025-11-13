# App Improvements - Discussion Summary & Context

## 🎯 Overview

User provided comprehensive feedback on the Car Finder AI app after using it. All items are **high priority MVP improvements**. User wants to refine the app before doing a full re-scrape and re-analysis of all vehicles.

**Key Goal:** Fix critical UX issues, improve performance, and add missing functionality before the next full data refresh.
**Key Principle:** Make stories complete and substantial. Avoid creating stories only for trivial changes. Try to bundle changes in one story if possible.

---

## 💬 Conversation Flow & Key Decisions

### Initial Request
User shared detailed feedback document covering:
- Location features (distance from Wrocław, maps)
- Dashboard improvements (features display, sorting, filtering, performance crash)
- Vehicle detail page redesign (images, layout, virtual mechanic report)
- Status management
- Performance concerns (4-hour processing time)

### Discussion Highlights

#### **Performance Crash Issue**
- **Problem:** App crashes when scrolling past ~30-40 vehicles in dashboard
- **Root Cause:** Each VehicleCard has 8 React state variables (currentImageIndex, isTranslating, isAnalyzing, isUpdatingStatus, isSavingNotes, notes, isNotesExpanded, actionError, actionSuccess, imageError)
  - 40 cards × 8 states = 320 state variables → memory issues
- **Initial Suggestion:** Remove personal notes from dashboard cards
- **User Response:** "No, I want the personal notes in the dashboard card"
- **Final Solution:** Refactor state management - move operation states to shared context, keep only essential local states, implement debounced autosave

#### **Save/Discard Pattern Discussion**
- **User Question:** "Should we implement a 'save/discard' button for dashboard changes?"
- **Discovery:** VehicleContext already syncs dashboard and detail page automatically
- **Decision:** No save/discard bar needed. Use autosave everywhere:
  - Status dropdown: immediate save
  - Personal notes: debounced autosave (500ms after typing stops)
  - Changes in detail page automatically reflect in dashboard via context

#### **Multi-Level Sorting**
- **User Need:** "If I sort by price low to high, and then by priority high to low, the high to low sort should also be sorted by price low to high"
- **Solution:** Stacked/compound sorting - last sort wins, but equal values use previous sort as tiebreaker
- **UI Decision:** No visual indicator of sort stack for MVP (too complex), but add to future enhancements

#### **Status Management Discussion**
- **Current statuses:** `new | to_contact | contacted | to_visit | visited | not_interested | deleted`
- **User Need:** Differentiate between vehicles that have been "processed" (AI analysis done) vs "skipped" (user chose not to analyze)
- **Key Question:** "Do we really need 'new' in the dropdown in the UI? This is probably only when scraped, but once scraped, the app would either process it or skip it."
- **Decision:**
  - Keep "new" as system-only status (not in UI dropdown)
  - Add "processed" and "skipped" for user-facing workflow
  - Add new statuses to type definition

#### **Removed from Source - Not a Status**
- **User Question:** "If I have been 'working' on that car, I would still want to view it, so not sure I want to change the 'visited' status. Maybe it should be a new field?"
- **Decision:** Create `isRemovedFromSource: boolean` field (NOT a status)
  - Appears as prominent badge/banner on vehicle
  - Doesn't interfere with user's workflow status
  - Manual check button + batch background job

#### **Existence Check Implementation**
- **User Need:** "Could we also add it in the dashboard? And have a background process that checks all non-deleted vehicles?"
- **Updated from initial proposal:** Not just nightly batch job
  - Manual "Check all" button in dashboard header
  - Manual check button on detail page
  - Note: User emphasized speed ("we don't have that many cars anyway, it should be fast")

#### **Parallel Processing for Speed**
- **User Question:** "Is there a way to run some works in parallel? Like analysing 3 or 4 vehicles at the same time?"
- **Current:** Sequential processing, 4 hours for ~200-300 vehicles
- **Solution:** Process 3-4 vehicles concurrently, still respect 15 RPM Gemini limit
- **Expected improvement:** 4 hours → 1-1.5 hours

#### **Virtual Mechanic Report Redesign**
- **User Feedback:** "The rendering is really bad. Everything is packed and difficult to read. Also, I think the report is way too detailed."
- **User Need:** "I am looking for a good overview of whether it is a good engine, good model and if there are any serious issues mentioned in the description."
- **Desired Format Example:**
  ```
  - This model and engine is known for _____
  - Main issues are ___
  - Based on the description, it seems like ___
  ```
- **Decision:**
  - Redesign prompt for concise summary (editable, stored in DB)
  - Move full detailed report to separate tab/section (also editable)
  - Speeds up AI processing (can skip full report generation initially)

#### **Manual Feature Addition**
- **User Discovery:** "I just realised that sometimes, the car lists the A/C in the description, but not really in the features of the car."
- **Need:** Ability to manually add features on vehicle detail page
- **Context:** Scraped features from Otomoto are incomplete - sometimes important features only mentioned in description text
- **Decision:** Add UI on detail page to manually add/edit vehicle features
  - Features should be stored in database (update existing features array)
  - Should sync back to dashboard automatically (via VehicleContext)

#### **Location Features**
- **User Context:** "I don't know Poland, so the actual location we showcase is not that helpful for me."
- **Decisions:**
  - Driving distance in km from Wrocław (sortable/filterable)
  - Clickable location → Google Maps in new tab
  - Interactive map embed on detail page (city-level pin, no exact address)

#### **Epic Organization**
- **Initial proposal:** 5 separate epics (one per feature category)
- **User Response:** "Do we really need one epic for section? Wouldn't one single epic (or maybe 2 or 3) be enough?"
- **Discussion on best practices:** Epic = cohesive user-facing improvement (5-15 stories, 1-3 weeks work)
- **Final decision:** 3 epics (later reduced to 2 after user removed re-scrape optimization story)

#### **Story Granularity Guidance**
- **User:** "Let's try to make the stories as complete as possible. Not create a story for a simple change in UX (unless it is really necessary)"
- **Principle:** Bundle related changes together, avoid micro-stories for trivial changes

---

## 🎨 Proposed Epic Structure

### **Epic 1: Dashboard & Core UX Improvements**
Focus: Performance, filtering, sorting, status management, existence checking

**Potential story consolidation opportunities:**
- Location (distance calculation + clickable maps) could be one story
- Features (expand/collapse) is simple, could bundle with another UX change
- Status changes (add processed/skipped, remove "new" from UI, add isRemovedFromSource field) could be bundled as "Status Management Improvements"
- Existence check (manual buttons + background job) could be one comprehensive story

**Performance crash fix is critical** - should be early in epic sequence

### **Epic 2: Vehicle Detail Page Redesign**
Focus: Layout improvements, image viewer, virtual mechanic report, maps integration, manual data editing

**Potential story consolidation opportunities:**
- Images (square thumbnails + modal viewer) with Scores repositioning could be bundled as "Visual Layout Improvements"
- Location features same as dashboard (bundle with Epic 1 location work?)
- Virtual mechanic summary + full report could be bundled as "Virtual Mechanic Report Redesign"
- Sticky sidebar + autosave could be bundled as "Detail Page UX Improvements"
- Manual feature addition could be bundled with features reposition/expand-collapse work

### **Epic 3: Performance Optimization** (REMOVED - see note below)
**Note:** User removed the re-scrape optimization story because:
- "pnpm scrape will only scrape the vehicles, without doing analysis, so it is not needed"
- User wants to speed up re-analysis process for full database refresh (parallel processing story remains valid)

**Decision needed:** With only one story (parallel processing), should this be a standalone epic, or bundled into Epic 1 as a performance story?

---

## 🔍 Important Technical Context

### Current Architecture Discoveries
- **VehicleContext syncs dashboard ↔ detail page** automatically (line 67-76 in VehicleContext.tsx)
- **Infinite scroll already implemented** (50 vehicles per load)
- **Lazy loading already implemented** for images
- **Current status types defined** in `packages/types/src/index.ts:4`

### Database Migrations Needed
1. Add new statuses: `processed`, `skipped`, `removed_from_source`
2. Add field: `isRemovedFromSource: boolean`
3. Add field: `virtualMechanicSummary: string | null` (for editable summary)
4. Add field: `distanceFromWroclaw: number | null` (in km)

### Key Files Referenced
- `apps/web/src/components/VehicleCard.tsx` - Dashboard cards (performance issue here)
- `apps/web/src/context/VehicleContext.tsx` - Shared state management
- `packages/types/src/index.ts` - Type definitions
- `apps/api/src/scripts/analyze.ts` - AI analysis processing

---

## 🚫 Explicit Decisions: What NOT to Do

1. **No save/discard bar** - Use debounced autosave instead
2. **Don't remove personal notes from dashboard** - User explicitly wants them
3. **Don't remove "new" status entirely** - Keep as system status, just hide from UI dropdown
4. **Don't make removed_from_source a status** - Separate boolean field
5. **Don't complicate sort UI** - No visual stack indicator for MVP
6. **Don't create --skip-ai-analysis flag** - Not needed, scrape already separate from analysis
7. **Don't over-engineer mobile layout** - Quick solution for MVP, defer proper mobile UX

---

## ❓ Questions Answered During Discussion

**Q: Should we have save/discard buttons when making changes in dashboard?**
A: No. Implement autosave. VehicleContext already syncs dashboard and detail page automatically.

**Q: Are we always checking for duplicates based on URL?**
A: Yes, confirmed this works correctly for overlapping radius searches.

**Q: Is 4-hour processing time normal?**
A: Yes, due to Gemini 15 RPM rate limit. Parallel processing will reduce to 1-1.5 hours.

**Q: What would be the fastest implementation for existence checking?**
A: Manual button is fastest (~1-2 hours). Background job is more efficient long-term (~4-6 hours). Do both.

---

## 🎯 Context for PO Agent

When creating epics and stories:

1. **Bundle related changes** - Follow user's guidance about complete, substantial stories
2. **Consider story sequencing** - Performance crash fix should be early priority
3. **Explain the "why"** - Include user context (e.g., "User doesn't know Poland geography")
4. **Database migrations** - Flag stories that require schema changes
5. **Epic organization** - Consider if Epic 3 should exist or be merged into Epic 1
6. **Technical dependencies** - Some stories may need to be sequenced (e.g., status changes before filters)

### Suggested Story Consolidations to Consider:
- **Location features** (dashboard + detail + distance calculation + maps) → 1-2 stories instead of separate per epic
- **Status management** (add processed/skipped, hide "new", add isRemovedFromSource field + migration) → 1 story
- **Existence checking** (manual buttons + background job + API endpoint) → 1 comprehensive story
- **Virtual mechanic** (redesign prompt, make editable, move full report to tab) → 1 story
- **Images + Scores layout** (square thumbnails, modal viewer, reposition scores) → 1 story

### Open Questions for PO to Resolve:
1. Should Epic 3 exist with only parallel processing story, or merge into Epic 1?
2. Should location features be split across Epic 1 and Epic 2, or consolidated into one epic?
3. What's the optimal sequencing within each epic (dependencies, priorities)?
4. Are there other micro-stories that should be bundled together?

---

## 📝 User's Original Feedback Categories

For reference, user organized feedback into:
1. Location (distance, maps)
2. Features on dashboard (expandable list)
3. Sorting (multi-level)
4. Scrolling crash
5. Hide deleted cars
6. Status differentiation (processed vs skipped)
7. Vehicle card page (images, scores, workflow, virtual mechanic, features position)
8. Other issues (existence checking, processing speed, duplicate handling)

These categories don't necessarily map 1:1 to epics/stories - they're user pain points to address.
