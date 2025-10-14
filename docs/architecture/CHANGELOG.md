# Architecture Changelog

## 2025-10-14: Story 2.4c - Translation Extraction & Pipeline Optimization

### Change Summary
Extracted translation into standalone pipeline with automatic feature filtering and on-demand API endpoints.

### What Changed

**New Vehicle Status:**
- Added `'not_interested'` to VehicleStatus enum
- Used to mark vehicles automatically filtered during translation

**Translation Pipeline:**
- Created standalone `translate.ts` script (separate from `analyze.ts`)
- Feature filtering happens BEFORE translation (saves API costs)
- Uses `sourceEquipment` (Polish) for matching, not translated `features`
- Filtered vehicles marked as `'not_interested'` status
- Uses faster model (gemini-2.5-flash-lite) vs analysis model

**Analysis Pipeline:**
- Removed translation step from `analyze.ts`
- Now assumes vehicles are pre-translated
- Two-step workflow: `translate → analyze`

**API Endpoints:**
- Added `POST /api/vehicles/:id/translate` - Force re-translation with optional `force` query parameter
- Added `POST /api/vehicles/:id/analyze` - Force re-analysis with optional `force` query parameter
- Both return 202 Accepted with updated vehicle data

**AIService Enhancement:**
- Now accepts optional model parameter for per-operation model selection
- Backward compatible (defaults to `process.env.GEMINI_MODEL`)

**VehicleRepository:**
- Added `findVehiclesNeedingTranslation()` method
- Excludes `'not_interested'` status from translation query
- Added field mappings for `description` and `features`

### Rationale

**Cost Optimization:**
- Feature filtering BEFORE translation saves unnecessary AI API calls
- Vehicles without required features don't consume translation credits

**Pipeline Separation:**
- Translation can use faster/cheaper model (flash-lite)
- Analysis can use more powerful model (pro)
- Independent execution allows better control

**UI Integration:**
- API endpoints enable manual override from frontend
- Users can force re-translate/analyze specific vehicles
- Useful for vehicles marked `'not_interested'` by mistake

### Files Updated

**Code:**
- Created: `apps/api/src/scripts/translate.ts` - Translation script with VehicleTranslator class
- Modified: `apps/api/src/scripts/analyze.ts` - Removed translation step, added force flag
- Modified: `apps/api/src/services/AIService.ts` - Added optional model parameter
- Modified: `packages/ai/src/factory/AIProviderFactory.ts` - Added model parameter
- Modified: `packages/db/src/repositories/vehicleRepository.ts` - Added methods and field mappings
- Modified: `packages/db/src/schema.ts` - Confirmed 'not_interested' status in CHECK constraint
- Modified: `apps/api/src/routes/vehicles.ts` - Added POST /translate and /analyze endpoints
- Modified: `search-config.json` - Added translationModel and requiredFeatures
- Created: `apps/api/src/scripts/migrate-status-constraint.ts` - Database migration script

**Documentation:**
- `docs/architecture/data-models.md` - Updated VehicleStatus enum, added status field notes
- `docs/architecture/core-workflows.md` - Added Translation workflow diagram, renumbered sections
- `docs/architecture/api-specification.md` - Added POST /translate and /analyze endpoint specs
- `docs/architecture/CHANGELOG.md` - This entry
- `docs/stories/2.4c.story.md` - Completion notes and post-QA fixes

### Impact on Story 2.5

**Card-Based Vehicle Dashboard needs to:**
1. Display `'not_interested'` status badge
2. Add "Force Translate" and "Force Analyze" action buttons to VehicleCard
3. Show buttons for vehicles with `status='not_interested'` or missing AI data
4. Call new API endpoints with confirmation dialogs
5. Update tests to include new status and API interactions

See `docs/stories/2.4c-impact-checklist.md` for detailed Story 2.5 updates.

---

## 2025-10-08: Scripts Consolidated into API App

### Change Summary
Moved background processing scripts from `packages/scripts` to `apps/api/src/scripts/` to create a unified backend application.

### Rationale
- **Eliminated fragile imports**: Scripts were using `../../../apps/api/src/services/` to access business logic
- **Single backend app**: Both HTTP API and CLI scripts are part of the same Node.js application
- **Cleaner architecture**: Scripts and API routes share services through local relative imports
- **Maintained package structure**: Truly shared packages (`@car-finder/types`, `@car-finder/db`, `@car-finder/ai`, `@car-finder/services`) remain in `packages/`

### What Changed

**Before:**
```
packages/scripts/
├── src/
│   ├── ingest.ts
│   └── analyze.ts
├── package.json
└── tsconfig.json
```

**After:**
```
apps/api/
├── src/
│   ├── scripts/          # NEW: Background scripts moved here
│   │   ├── ingest.ts
│   │   └── analyze.ts
│   ├── services/         # Shared by routes and scripts
│   └── routes/           # HTTP endpoints
├── package.json          # Now includes script dependencies
└── tsconfig.json         # Updated with package references
```

### Import Pattern Changes

**Scripts now use clean local imports for business logic:**

```typescript
// Before (fragile):
import { AIService } from '../../../apps/api/src/services/AIService';

// After (clean):
import { AIService } from '../services/AIService';

// Package imports unchanged:
import { DatabaseService } from '@car-finder/db';         // ✅ Still clean
import { Vehicle } from '@car-finder/types';              // ✅ Still clean
import { AIError } from '@car-finder/ai';                 // ✅ Still clean
import { WorkspaceUtils } from '@car-finder/services';    // ✅ Still clean
```

### Command Changes

**No change to user-facing commands:**
- `pnpm analyze` - Still works the same way
- `pnpm ingest` - Still works the same way

**Internal routing updated:**
- Root `package.json`: Routes to `@car-finder/api` instead of `@car-finder/scripts`
- API `package.json`: Added `ingest` and `analyze` script definitions

### Files Updated

**Code:**
- Moved: `packages/scripts/src/*.ts` → `apps/api/src/scripts/*.ts`
- Updated: `apps/api/package.json` (added scripts and dependencies)
- Updated: `apps/api/tsconfig.json` (added package references)
- Updated: `package.json` (updated script routing)
- Removed: `packages/scripts/` directory

**Documentation:**
- `docs/architecture/source-tree.md` - Updated package structure
- `docs/architecture/backend-architecture.md` - Documented unified backend app
- `docs/architecture/development-workflow.md` - Updated script locations
- `docs/architecture/environment-configuration.md` - Updated script paths
- `docs/architecture/components.md` - Added background scripts section

**Note for Story Updates:**
Stories that reference `packages/scripts` should be interpreted as `apps/api/src/scripts` going forward. The architectural principle remains the same - scripts are background processing tools that share business logic with the API.

### Package Structure Philosophy

**packages/** now contains **only genuinely shared code**:
- `@car-finder/types` - Used by both web and api ✅
- `@car-finder/db` - Database layer used by api
- `@car-finder/ai` - AI provider abstraction used by api
- `@car-finder/services` - Service contracts used by api (for testing)

**apps/** contains **complete applications**:
- `apps/web` - Next.js frontend (imports only `@car-finder/types`)
- `apps/api` - Complete backend with HTTP API + CLI scripts (imports all packages)

This aligns with standard monorepo conventions where `apps/` contains deployable applications and `packages/` contains shared libraries.

