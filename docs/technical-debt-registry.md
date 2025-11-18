# Technical Debt Registry

**Last Updated:** 2025-11-18 (Verified against actual codebase)
**Total Active Items:** 9
**Total Estimated Effort:** 14-23 hours

---

## Purpose

This registry tracks all technical debt, deferred improvements, and post-MVP enhancements identified during story development and QA reviews. Items are prioritized by impact and effort, with clear traceability to originating stories.

**Note:** All items have been verified against the current codebase to ensure they represent actual, unfixed technical debt.

---

## Active Debt (Prioritized Backlog)

### 🟡 MEDIUM Priority

#### TD-002: Extract shouldCheckExistence to Shared Utility (CONSOLIDATED)
- **Origin**: Story 3.8 (QA Review - Code Quality Assessment)
- **Category**: Code Duplication / Refactoring
- **Impact**: MEDIUM - Maintainability concerns, changes require updates in 4 locations
- **Effort**: 3-5 hours
- **Description**: Code duplication exists for `shouldCheckExistence` function across 4 files
  - Frontend components use local implementations (VehicleCard.tsx, VehicleDetail.tsx)
  - Backend scripts duplicate the same logic (analyze.ts, translate.ts)
  - No shared constant for the 4-hour cache duration (magic number: 4)
  - Missing explanatory comments for fail-open strategy
- **Verified Status**: ✅ CONFIRMED - 4 identical copies found in codebase, hardcoded "4" still present
- **Proposed Approach**:
  - Create `packages/services/src/utils/existenceCheck.ts` for shared utilities
  - Create `packages/types/src/constants.ts` for `EXISTENCE_CHECK_CACHE_HOURS = 4`
  - Add JSDoc comments explaining 4-hour cache rationale and fail-open strategy
  - Update all references in analyze.ts, translate.ts, VehicleCard.tsx, VehicleDetail.tsx
- **Tasks Consolidated**:
  - Extract shouldCheckExistence function (2-3 hours)
  - Create EXISTENCE_CHECK_CACHE_HOURS constant (15 minutes)
  - Add fail-open strategy code comments (30 minutes)
  - Update all 4 file references (1-2 hours)
- **Proposed Story**: 3.10
- **Status**: Active
- **Gate Ref**: `docs/qa/gates/3.8-existence-verification-ai-ops.yml`
- **Files Affected**:
  - `apps/api/src/scripts/analyze.ts:98-110`
  - `apps/api/src/scripts/translate.ts:74-86`
  - `apps/web/src/components/VehicleCard.tsx:44-56`
  - `apps/web/src/components/VehicleDetail.tsx:9-21`

#### TD-004: Frontend Component Tests for Force Buttons
- **Origin**: Story 3.8 (QA Review - Testing Enhancements)
- **Category**: Missing Tests
- **Impact**: MEDIUM - Manual testing required for credit-consuming operations
- **Effort**: 3-4 hours
- **Description**: Add React component tests for force translate/analyze buttons
  - Test force translate with existence check (VehicleCard)
  - Test force analyze with existence check (VehicleCard, VehicleDetail)
  - Test toast notifications appear correctly
  - Test operation blocking when vehicle is removed
  - Mock existence check API responses (200, 404, 500)
- **Verified Status**: ⚠️ DEFERRED - Explicitly deferred to future testing cycle per QA recommendation
- **Proposed Story**: Future testing cycle
- **Status**: Deferred - Manual testing sufficient for MVP
- **Gate Ref**: `docs/qa/gates/3.8-existence-verification-ai-ops.yml`
- **Files Affected**:
  - `apps/web/src/components/VehicleCard.tsx:114-183`
  - `apps/web/src/components/VehicleDetail.tsx:155-194`

#### TD-006: Nominatim API Production Scalability
- **Origin**: Story 3.2 (QA Review - Security Review / Performance)
- **Category**: Architectural Concern
- **Impact**: MEDIUM - Production scalability concern
- **Effort**: Research/Planning phase (4-8 hours for investigation)
- **Description**: Nominatim public instance has rate limits (1 req/sec) and may not be suitable for production at scale
  - Current implementation: Uses public Nominatim for geocoding
  - Production concern: Rate limiting may become bottleneck
  - Recommendation: Consider self-hosting OSRM or using commercial geocoding service
- **Verified Status**: ✅ ARCHITECTURAL CONCERN - Valid for production planning
- **Proposed Story**: Pre-production planning / Epic 5 (Production Readiness)
- **Status**: Deferred to production phase
- **Priority Note**: LOW for MVP, MEDIUM for production launch

---

### 🟢 LOW Priority

#### TD-008: Extract checkVehicleExistence Backend Helper
- **Origin**: Story 3.8 (QA Review - Improvements Checklist)
- **Category**: Code Refactoring
- **Impact**: LOW - Minor duplication between two scripts
- **Effort**: 1-2 hours
- **Description**: Extract `checkVehicleExistence` (backend version) to shared script utility
  - Currently duplicated in analyze.ts and translate.ts
  - Different from `shouldCheckExistence` - this one makes actual API calls
  - Can be extracted to shared scripts utility module
- **Verified Status**: ✅ CONFIRMED - Function duplicated in both scripts
- **Proposed Story**: 3.10 (bundled with TD-002)
- **Status**: Active
- **Gate Ref**: `docs/qa/gates/3.8-existence-verification-ai-ops.yml`
- **Files Affected**:
  - `apps/api/src/scripts/analyze.ts:120-150`
  - `apps/api/src/scripts/translate.ts:96-126`

#### TD-010: 4-Hour Cache Strategy Documentation
- **Origin**: Story 3.8 (QA Review - Documentation)
- **Category**: Documentation
- **Impact**: LOW - Knowledge sharing and maintenance
- **Effort**: 1-2 hours
- **Description**: Document the 4-hour cache strategy in architecture docs
  - Explain rationale for 4-hour window
  - Document when checks are skipped (fresh vehicles <4 hours)
  - Document fail-open behavior on errors
  - Include in architecture/data-models.md or create architecture/caching-strategy.md
- **Verified Status**: ⚠️ VALID BUT LOW PRIORITY
- **Proposed Story**: Documentation sprint
- **Status**: Active
- **Gate Ref**: `docs/qa/gates/3.8-existence-verification-ai-ops.yml`
- **Files Affected**: `docs/architecture/` (new or existing doc)

#### TD-012: E2E Test for Existence Check Blocking
- **Origin**: Story 3.8 (QA Review - Testing Enhancements)
- **Category**: Missing Tests
- **Impact**: LOW - Nice-to-have, core functionality tested in unit tests
- **Effort**: 2-3 hours
- **Description**: Add E2E test for existence check blocking AI operations
  - Test full user workflow: open vehicle → force analyze → vehicle removed → operation blocked
  - Test toast notification appears
  - Mock Otomoto API responses
- **Verified Status**: ⚠️ DEFERRED - Post-MVP enhancement
- **Proposed Story**: E2E testing cycle (post-MVP)
- **Status**: Deferred to post-MVP
- **Gate Ref**: `docs/qa/gates/3.8-existence-verification-ai-ops.yml`

#### TD-013: Context Methods JSDoc Documentation
- **Origin**: Story 3.1 (QA Review - Documentation)
- **Category**: Documentation / Code Quality
- **Impact**: LOW - Developer experience
- **Effort**: 2-3 hours
- **Description**: Add JSDoc comments to VehicleContext methods
  - Document setOperationState(), setFeedback(), clearFeedback(), addHiddenVehicle()
  - Explain parameters and usage patterns
  - Improve IDE hints and autocomplete
- **Verified Status**: ✅ CONFIRMED - VehicleContext.tsx methods lack JSDoc (lines 261, 273, 281, 302)
- **Proposed Story**: Documentation sprint
- **Status**: Active
- **Files Affected**: `apps/web/src/context/VehicleContext.tsx`

#### TD-014: React.memo Optimization for VehicleCard
- **Origin**: Story 3.1 (QA Review - Performance Considerations)
- **Category**: Performance Optimization
- **Impact**: LOW - Premature optimization, no current performance issues
- **Effort**: 1-2 hours
- **Description**: Consider React.memo for VehicleCard if re-renders become excessive
  - Only needed if performance profiling shows issues
  - Currently not a bottleneck
- **Verified Status**: ⚠️ DEFERRED - No current performance issues
- **Proposed Story**: Performance optimization cycle (if needed)
- **Status**: Deferred - no current need
- **Files Affected**: `apps/web/src/components/VehicleCard.tsx`

#### TD-015: Google Maps Error Handling
- **Origin**: Story 3.2 (QA Review - Nice-to-Have Improvements)
- **Category**: Error Handling
- **Impact**: LOW - Edge case handling
- **Effort**: 2 hours
- **Description**: Add error handling for Google Maps iframe loading failures
  - Consider error boundary or fallback message
  - Handle case where API key is invalid
  - Display user-friendly error instead of blank map
- **Verified Status**: ✅ CONFIRMED - VehicleDetail.tsx (lines 532-548) has no error boundary or fallback
- **Proposed Story**: Polish/UX improvements cycle
- **Status**: Active
- **Files Affected**: `apps/web/src/components/VehicleDetail.tsx` (Google Maps embed section)

#### TD-016: Performance Benchmarking for Parallel Analysis
- **Origin**: Story 4.1 (QA Review - Performance Considerations)
- **Category**: Validation / Performance Testing
- **Impact**: LOW - Validation task, not blocking
- **Effort**: 1-2 hours (user testing during acceptance)
- **Description**: Performance benchmark with 200-300 vehicles requires production data
  - Expected improvement: Sequential (~15 vehicles/min) vs Concurrent (~45-60 vehicles/min)
  - Can be validated during user acceptance testing
- **Verified Status**: ⚠️ VALIDATION TASK - Not blocking
- **Proposed Story**: N/A - User validation task
- **Status**: Validation task (not blocking)

---

## Deferred Debt (Post-MVP)

### UX/Polish Improvements

#### TD-020: Visual Sort Stack Indicator
- **Origin**: Story 3.3 (Epic 3 - Multi-Level Sorting, Future Enhancement)
- **Category**: UX Enhancement
- **Impact**: LOW - Nice-to-have, not essential for MVP
- **Effort**: 4-6 hours
- **Description**: Add visual indicator showing current sort stack
  - Display applied sorts in order
  - Allow removing individual sorts from stack
- **Proposed Story**: Post-MVP UX improvements
- **Status**: Deferred to post-MVP
- **Reference**: `docs/prd/epic-3-dashboard-performance-core-workflow.md:550-554`

#### TD-021: 3+ Level Sorting Support
- **Origin**: Story 3.3 (Epic 3 - Multi-Level Sorting, Future Enhancement)
- **Category**: Feature Enhancement
- **Impact**: LOW - Current 2-level sorting sufficient for MVP
- **Effort**: 2-3 hours
- **Description**: Extend compound sorting to support 3 or more levels
  - Currently supports 2 levels (primary + secondary)
  - May be needed if users request more complex sorting
- **Proposed Story**: Post-MVP feature enhancements
- **Status**: Deferred to post-MVP
- **Reference**: `docs/prd/epic-3-dashboard-performance-core-workflow.md:550-554`

---

## Pre-existing Issues (Not Originated by Recent Stories)

#### PREEXIST-001: PromptLoader Test Failures in @car-finder/ai
- **Origin**: Story 4.2 (QA Review - Pre-existing Issues)
- **Category**: Pre-existing Test Failures
- **Impact**: LOW - Unrelated to recent stories
- **Effort**: Unknown (requires investigation)
- **Description**: 6 test failures in PromptLoader tests
  - Pre-dates Story 4.2 implementation
  - Does not affect core functionality
  - Requires separate investigation
- **Proposed Story**: Technical debt cleanup cycle
- **Status**: Deferred investigation
- **Files Affected**: `packages/ai/src/__tests__/PromptLoader.test.ts`

---

## Resolved Debt

### 2025-11-18

#### [RESOLVED] TD-001: DistanceCalculationService Test Coverage
- **Origin**: Story 3.2
- **Description**: Missing unit tests for DistanceCalculationService critical business logic
- **Resolved By**: Story 3.2 implementation (already completed)
- **Resolution Date**: 2025-11-18
- **Evidence**: Comprehensive test file exists at `apps/api/src/__tests__/DistanceCalculationService.test.ts` with 424 lines covering:
  - Distance calculation tests
  - API error handling
  - Caching tests (both distance and geocode)
  - Rate limiting tests
  - Haversine formula accuracy
  - Edge cases (special characters, whitespace, malformed responses)

#### [RESOLVED] TD-005: Environment Variable Documentation
- **Origin**: Story 3.2
- **Description**: Missing documentation for NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env
- **Resolved By**: Story 3.2 implementation
- **Resolution Date**: 2025-11-18
- **Evidence**: `.env.example` file exists at project root with comprehensive documentation (lines 22-27):
  - Clear comment explaining optional requirement for interactive maps
  - Link to Google Cloud Console for API key
  - Note about enabling "Maps Embed API"
  - Proper NEXT_PUBLIC_ prefix documentation

#### [RESOLVED] TD-007: Distance Sorting Tests Missing
- **Origin**: Story 3.2
- **Description**: Missing distance sorting tests in utils.test.ts
- **Resolved By**: Story 3.2 implementation
- **Resolution Date**: 2025-11-18
- **Evidence**: Comprehensive test file at `apps/web/__tests__/utils.test.ts` (lines 189-352) covering:
  - distance_asc sorting (closest first)
  - distance_desc sorting (farthest first)
  - Null distance handling for both ascending and descending
  - Compound sort with distance

#### [CONSOLIDATED] TD-009: Create Constant for Cache Duration
- **Origin**: Story 3.8
- **Description**: Magic number "4" for cache hours hardcoded in multiple locations
- **Consolidated Into**: TD-002 (Extract shouldCheckExistence to Shared Utility)
- **Date**: 2025-11-18
- **Reason**: This is part of the larger shouldCheckExistence refactoring task, not a separate item

#### [CONSOLIDATED] TD-011: Fail-Open Strategy Code Comments
- **Origin**: Story 3.8
- **Description**: Missing comments explaining fail-open behavior
- **Consolidated Into**: TD-002 (Extract shouldCheckExistence to Shared Utility)
- **Date**: 2025-11-18
- **Reason**: This is part of the larger shouldCheckExistence refactoring task, not a separate item

#### [REMOVED] TD-003: Backfill Script Integration Tests
- **Origin**: Story 3.2
- **Description**: Missing integration tests for backfill-distances.ts one-time migration script
- **Removed**: 2025-11-18
- **Reason**: One-time migration script that was already run successfully. Tests not needed for temporary scripts that should be deleted after use. Script should be removed from codebase as cleanup.

---

## Priority Summary

| Priority | Count | Total Estimated Effort |
|----------|-------|------------------------|
| HIGH | 0 | 0 hours |
| MEDIUM | 3 | 8-13 hours |
| LOW | 6 | 9-16 hours |
| **TOTAL ACTIVE** | **9** | **17-29 hours** |
| Post-MVP Deferred | 2 | 6-9 hours |
| Pre-existing | 1 | TBD |
| **Resolved** | **6** | - |

---

## Category Breakdown

| Category | Count | Medium Priority Items |
|----------|-------|----------------------|
| Code Duplication / Refactoring | 2 | TD-002 (shouldCheckExistence) |
| Missing Tests | 2 | TD-004 (Frontend tests) |
| Documentation | 2 | - |
| Architectural Concerns | 1 | TD-006 (Nominatim scalability) |
| Error Handling | 1 | - |
| Performance | 2 | - |
| **TOTAL** | **10** | **2** |

---

## Recommended Story Bundles

### Story 3.10: Code Quality - Existence Check Utilities Refactoring
**Estimated Total Effort:** 4-7 hours
**Items Bundled:**
- TD-002: Extract shouldCheckExistence to shared utility (3-5 hours) - CONSOLIDATED
  - Includes creating EXISTENCE_CHECK_CACHE_HOURS constant
  - Includes adding fail-open strategy comments
- TD-008: Extract checkVehicleExistence backend helper (1-2 hours)

### Future Testing Story: Component Test Coverage
**Estimated Total Effort:** 3-4 hours
**Items Bundled:**
- TD-004: Frontend component tests for force buttons (3-4 hours) - Optional/Deferred

### Documentation Sprint: Architecture & API Docs
**Estimated Total Effort:** 3-5 hours
**Items Bundled:**
- TD-010: 4-hour cache strategy documentation (1-2 hours)
- TD-013: Context methods JSDoc documentation (2-3 hours)

---

## Verification Notes

**Codebase Verification Date:** 2025-11-18

All technical debt items have been verified against the actual codebase:
- ✅ **Confirmed Active** - Issue verified to still exist in code
- ⚠️ **Deferred** - Intentionally deferred per QA recommendation
- ✅ **Resolved** - Fixed in implementation, moved to Resolved section

**Files Checked:**
- All story files in `docs/stories/` and `docs/stories/completed/`
- Test files in `apps/api/src/__tests__/` and `apps/web/__tests__/`
- Implementation files referenced in technical debt items
- Configuration files (.env.example, package.json)

**Duplicates Consolidated:**
- TD-009 and TD-011 merged into TD-002 (all part of shouldCheckExistence refactoring)

---

## Notes

- **Gate References**: QA gate files in `docs/qa/gates/` contain detailed technical debt assessments
- **Story References**: Each item links back to the originating story file in `docs/stories/` or `docs/stories/completed/`
- **Update Frequency**: This registry should be updated after each QA review and story completion
- **Verification**: All active items verified against codebase on 2025-11-18
- **Priority Guidelines**:
  - HIGH: Impacts security, data integrity, or core functionality
  - MEDIUM: Impacts maintainability, testing, or developer experience
  - LOW: Nice-to-have improvements, polish, optimizations

---

## Change Log

| Date | Change | Updated By |
|------|--------|------------|
| 2025-11-18 | Initial registry creation with comprehensive debt from Epic 1-4 stories | Sarah (PO) + Quinn (QA) |
| 2025-11-18 | Verified all items against actual codebase, resolved 3 items (TD-001, TD-005, TD-007), consolidated 2 duplicates (TD-009, TD-011 into TD-002), updated counts and effort estimates | Sarah (PO) |
| 2025-11-18 | Removed TD-003 (backfill script tests) - one-time migration script doesn't need tests | Sarah (PO) |
