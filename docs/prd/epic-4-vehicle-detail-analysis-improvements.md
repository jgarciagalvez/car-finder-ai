# Epic 4: Vehicle Detail Page & Analysis Improvements

**Epic Goal:** Optimize AI analysis processing through parallel execution, enhance virtual mechanic reports with concise summaries, redesign the vehicle detail page with improved layout (sidebar, square images, scores), add full-size image viewing, and enable manual feature management for data completeness.

---

### **Story 4.1: Parallel Analysis Processing**

**As a** user, **I want** vehicle analysis to process significantly faster, **so that** I can complete a full re-analysis of all vehicles in 1-1.5 hours instead of 4 hours.

**Context:**
- Current performance: 4 hours to process ~200-300 vehicles
- Gemini API rate limit: 15 RPM (requests per minute)
- Sequential processing: 1 vehicle at a time × 4 AI calls per vehicle = 4 vehicles/minute
- Solution: Process 3-4 vehicles concurrently while still respecting 15 RPM limit
- Expected improvement: 3-4 concurrent × 4 calls = 12-16 RPM (within limit)

**Acceptance Criteria:**
1. **Concurrent Processing:**
   - Analysis script processes 3-4 vehicles concurrently (configurable)
   - Gemini API 15 RPM rate limit is never exceeded
   - 4-second delay between batches is maintained for rate limit compliance

2. **Performance Improvement:**
   - Full analysis of ~200-300 vehicles completes in 1-1.5 hours (down from 4 hours)
   - Progress tracking shows concurrent operations clearly
   - No increase in API errors due to rate limiting

3. **Script Modifications:**
   - Modify `apps/api/src/scripts/analyze.ts` to support concurrency
   - Use Promise.all() or p-limit library for concurrency control
   - Maintain existing command-line flags (--vehicle-id, --limit, --skip-*)
   - Add optional --concurrency flag to control parallel execution count

4. **Error Handling:**
   - Failed vehicle analysis doesn't block other concurrent operations
   - Errors are logged clearly with vehicle ID
   - Script continues processing remaining vehicles on individual failures
   - Comprehensive summary report at completion (success/failure counts)

5. **Backward Compatibility:**
   - Script can still run with concurrency=1 for debugging
   - All existing functionality remains intact (skip flags, vehicle-id targeting, etc.)

**Technical Notes:**
- Files to modify: `apps/api/src/scripts/analyze.ts`
- Consider using p-limit library for clean concurrency control
- Ensure AI service rate limiting is respected across concurrent calls
- Test with various concurrency levels (2, 3, 4) to find optimal setting

---

### **Story 4.2: Virtual Mechanic Report Redesign**

**As a** user, **I want** a concise, scannable virtual mechanic summary with the option to view detailed analysis, **so that** I can quickly assess vehicle quality without being overwhelmed by information.

**Context:**
- Current problem: Report is too detailed, exhaustive, and difficult to read
- User need: Quick overview focusing on model/engine reputation, known issues, and description analysis
- User feedback: "Everything is packed and difficult to read. I think the report is way too detailed."
- Desired format: Bullet points, easy to scan, editable

**Acceptance Criteria:**
1. **Concise Summary (Primary View):**
   - AI prompt redesigned to generate bullet-point summary
   - Summary format follows structure:
     ```
     - This model and engine is known for ___
     - Main issues are ___
     - Based on the description, it seems like ___
     ```
   - Summary limited to 3-5 bullet points for quick scanning
   - Summary displayed prominently on detail page (easily visible without scrolling)

2. **Editable Summary:**
   - User can edit the summary text directly on detail page
   - Edit mode activated by clicking edit icon/button
   - Changes saved to database in new field: `virtualMechanicSummary: string | null`
   - Edited summary persists and overrides AI-generated version
   - Clear indication when summary has been manually edited

3. **Full Detailed Report (Secondary View):**
   - Current detailed report moved to separate tab/collapsible section
   - Labeled as "Full Report" or "Detailed Analysis"
   - Also editable (using existing database field)
   - Can be generated on-demand via AI Assistant if not initially created
   - User can manually add notes or detailed observations

4. **AI Prompt Update:**
   - Update/create prompt file in `packages/ai/src/prompts/` for concise summary
   - Prompt emphasizes brevity, bullet points, and actionable insights
   - Prompt focuses on: model/engine reputation, common issues, description red flags
   - Separate prompt for full detailed report (optional generation)

5. **Database Changes:**
   - Add new field: `virtualMechanicSummary: string | null` (for concise summary)
   - Existing field used for full detailed report
   - Migration to populate summary from existing reports (optional)

6. **Rendering Improvements:**
   - Fix markdown rendering issues (proper spacing, formatting)
   - Bullet points render clearly and are easy to read
   - Mobile-friendly formatting

7. **Analysis Script Update:**
   - By default, only generate concise summary (faster processing)
   - Full report can be skipped during bulk analysis (--skip-full-report flag)
   - Full report can be generated on-demand for individual vehicles

**Technical Notes:**
- Files to modify: `apps/api/src/services/AIService.ts`, `packages/ai/src/prompts/virtual-mechanic-report.md` (or create new)
- Consider using different AI temperature/parameters for concise vs detailed analysis
- Ensure markdown rendering library handles formatting correctly

---

### **Story 4.3: Detail Page Layout Redesign**

**As a** user, **I want** a redesigned vehicle detail page with improved layout and visual hierarchy, **so that** I can efficiently view vehicle information with images on the left and scores/workflow controls in an accessible sidebar.

**Context:**
- Current layout needs reorganization for better information hierarchy
- Images currently use fixed aspect ratio causing cropping issues
- Scores and workflow controls scroll out of view
- Need cohesive layout that works together as a system

**Acceptance Criteria:**

1. **Square Image Thumbnails (Detail Page Only):**
   - Image thumbnails displayed as squares (maintain same height as current)
   - Images fill square area (may crop slightly, but predictably)
   - Maintain image carousel navigation (previous/next arrows)
   - Responsive sizing for different screen sizes
   - Dashboard cards keep current carousel/image display (no changes)

2. **Desktop Sticky Sidebar:**
   - Sticky sidebar positioned on right side of detail page
   - Sidebar remains visible while user scrolls through vehicle details
   - Sidebar content includes:
     - **Scores section** (AI Priority Rating, Personal Fit Score, Market Value)
     - **Workflow section** (status dropdown, action buttons, personal notes)
   - Sidebar has fixed width, appropriate for content
   - Sidebar doesn't overlap main content area
   - Images positioned on left, sidebar on right

3. **Scores in Sidebar:**
   - Scores displayed at top of sidebar, vertically stacked or in grid layout
   - Personal Fit Score scale changed from "N/100" to "N/10"
   - Database value remains 0-100 internally, display converts to 0-10
   - Example: Database value 85 displays as "8.5/10" or "9/10" (decide on decimal)
   - Color-coded badges remain unchanged (good/medium/poor indicators)
   - Scale change applies to both dashboard and detail page
   - Maintain clear labels for each score type

4. **Workflow Controls in Sidebar:**
   - "My Workflow" section positioned below scores in sidebar
   - Includes: status dropdown, action buttons (translate/analyze), personal notes
   - Personal notes maintain existing autosave behavior (saves onBlur)
   - No changes needed to save functionality, only repositioning

5. **Mobile Responsive Layout:**
   - On mobile viewports, use simple sticky header approach (temporary MVP solution)
   - Sticky header includes most critical controls (status dropdown, key actions)
   - Header doesn't block excessive screen space
   - Scores and full workflow section accessible by scrolling
   - **Note:** This is a quick solution for MVP, proper mobile layout deferred to future enhancement

6. **Responsive Breakpoints:**
   - Clear breakpoint between desktop (sticky sidebar) and mobile (sticky header) layouts
   - Typically: desktop >= 768px or 1024px, mobile < breakpoint
   - Smooth transition between layouts when resizing
   - On smaller screens (below breakpoint), sidebar content stacks vertically below images

7. **Visual Design:**
   - Sidebar visually distinct from main content (border, background color, or spacing)
   - Sidebar styling consistent with overall app design
   - Adequate padding and spacing for readability
   - Sticky positioning doesn't cause layout shift or jank
   - Ensure readability and visual hierarchy for scores

**Technical Notes:**
- Files to modify: `apps/web/src/app/vehicle/[id]/page.tsx`, `apps/web/src/components/VehicleDetail.tsx`, `apps/web/src/components/VehicleCard.tsx`
- Use CSS `position: sticky` for sidebar
- Consider using flexbox or grid layout for main content + sidebar structure
- Test scrolling performance with sticky elements
- Ensure sidebar doesn't cover footer or other important content
- VehicleDetail component already has autosave via `handleNotesBlur` (line 62-75) - preserve this behavior
- Score conversion calculation: `(value / 100) * 10` - decide on rounding approach
- Test with various score values and screen sizes

---

### **Story 4.4: Image Modal Viewer**

**As a** user, **I want** to view vehicle images in full size without cropping, **so that** I can see complete images and examine vehicle condition clearly.

**Context:**
- Building on Story 4.3's square thumbnails
- Users need ability to view full, uncropped images
- Modal/lightbox provides better viewing experience than inline carousel

**Acceptance Criteria:**

1. **Modal/Lightbox Viewer:**
   - Clicking any thumbnail opens full-size image in modal overlay
   - Modal displays complete, uncropped image
   - Previous/next navigation buttons in modal (cycle through all vehicle images)
   - Keyboard navigation support (arrow keys, escape to close)
   - Click outside image or X button to close modal
   - Image counter displayed (e.g., "3 / 8")

2. **Image Loading:**
   - Modal images lazy load when opened (not all at once)
   - Loading indicator while image loads
   - Graceful handling of broken/missing images
   - High-resolution images if available, fallback to standard resolution

3. **Mobile Experience:**
   - Modal viewer works on mobile (touch swipe for navigation)
   - Pinch-to-zoom support in modal (optional enhancement)
   - Responsive layout for modal on smaller screens

4. **Detail Page Only:**
   - Changes apply only to vehicle detail page
   - Dashboard cards keep current image display (no modal functionality)

**Technical Notes:**
- Files to modify: `apps/web/src/app/vehicle/[id]/page.tsx`
- Consider using existing lightbox library (e.g., react-image-lightbox, yet-another-react-lightbox)
- Ensure modal has proper z-index layering above sidebar
- Test with various image sizes and aspect ratios

---

### **Story 4.5: Features Management - Complete Feature System**

**As a** user, **I want** to manually add or edit vehicle features on the detail page, **so that** I can capture important features mentioned in descriptions but missing from scraped data.

**Context:**
- User discovery: "Sometimes the car lists the A/C in the description, but not really in the features"
- Scraped features from Otomoto are incomplete
- Need ability to manually supplement feature list
- Features should sync between dashboard and detail page via VehicleContext

**Acceptance Criteria:**

1. **Expand/Collapse Functionality:**
   - Dashboard cards show first 5 features by default
   - Clickable "(+N more)" button expands to show all features
   - Button changes to "Show less" when expanded, collapses back to 5 features
   - Expanded state persists during scrolling within same session
   - Reset to collapsed on page refresh/reload

2. **Features Repositioning (Detail Page):**
   - Features section moved higher in detail page layout
   - Position: Right after name and basic info (year, mileage, location)
   - Same expand/collapse functionality as dashboard (first 5, then expandable)

3. **Manual Feature Addition (Detail Page):**
   - "Add Feature" button visible in features section
   - Clicking opens input field or modal for new feature
   - User enters feature text (e.g., "Air Conditioning", "Leather Seats")
   - Validation: no empty features, reasonable character limit (e.g., 100 chars)
   - New feature added to database (updates features array)
   - New feature immediately visible in list

4. **Manual Feature Editing (Detail Page):**
   - Each feature has edit/delete icons (visible on hover or always visible)
   - Clicking edit allows inline editing of feature text
   - Clicking delete prompts confirmation, then removes feature
   - Changes saved immediately to database
   - Edited/deleted features sync back to dashboard automatically

5. **Database Updates:**
   - Features stored as array in database (existing field, update directly)
   - API endpoint: `PATCH /api/vehicles/:id/features`
   - Accepts full features array or individual add/edit/delete operations
   - Returns updated vehicle data

6. **Context Synchronization:**
   - VehicleContext automatically syncs changes between dashboard and detail page
   - Leverages existing `UPDATE_VEHICLE` action (lines 67-76 in VehicleContext.tsx)
   - Changes in detail page immediately reflect in dashboard card

7. **UI/UX Considerations:**
   - Clear visual distinction between scraped features and manually added features (optional enhancement)
   - Confirmation dialog for destructive actions (delete feature)
   - Loading states during save operations
   - Error handling and user feedback for failed operations

**Technical Notes:**
- Files to modify: `apps/web/src/components/VehicleCard.tsx` (expand/collapse, lines 398-421), `apps/web/src/app/vehicle/[id]/page.tsx` (manual editing), API routes
- Features array already exists in database schema, no migration needed
- Consider adding `manuallyAdded: boolean` flag to features in future enhancement

---

## Epic Summary

**Total Stories:** 5

**Key Outcomes:**
- 3-4x faster AI analysis processing (4 hours → 1-1.5 hours)
- Clearer, more usable virtual mechanic reports (concise summary + detailed report)
- Redesigned detail page layout (square images, sticky sidebar with scores and workflow)
- Enhanced image viewing with full-size modal viewer
- Complete feature management system (manual add/edit on detail page)

**Story Sequence & Rationale:**
1. **4.1 - Parallel Analysis Processing:** Performance improvement, immediate value
2. **4.2 - Virtual Mechanic Report Redesign:** Content improvement, streamlines analysis
3. **4.3 - Detail Page Layout Redesign:** Foundation for improved UI (images + sidebar + scores)
4. **4.4 - Image Modal Viewer:** Enhances 4.3's square thumbnails with full-size viewing
5. **4.5 - Features Management:** Lower priority enhancement, can be deferred if needed

**Database Changes Required:**
- New field: `virtualMechanicSummary: string | null` (concise summary for Story 4.2)
- No migration required for features (existing array field)

**Processing Improvements:**
- Parallel processing reduces full analysis time from 4 hours to 1-1.5 hours
- Concise summary generation speeds up individual vehicle analysis

**Dependencies:**
- Story 4.4 builds directly on Story 4.3's square thumbnail implementation
- Stories 4.1, 4.2, and 4.5 are independent and can be worked on separately
- Story 4.3 is a cohesive unit (layout + sidebar + scores) - do not decompose further

**Existing Functionality Preserved:**
- Personal notes autosave (onBlur) already implemented in VehicleDetail component (line 62-75)
- Dashboard personal notes use save/cancel button pattern - no changes needed

**Future Enhancements Deferred:**
- Proper mobile layout for sticky sidebar (MVP uses simple sticky header)
- Visual distinction between scraped and manually added features
- Pinch-to-zoom in image modal (mobile)
