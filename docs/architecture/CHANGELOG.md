# Architecture Changelog

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

