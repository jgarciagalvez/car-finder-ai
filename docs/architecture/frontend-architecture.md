# Frontend Architecture

The frontend follows a modern Next.js App Router architecture with clear separation of concerns and a component-based approach optimized for the local-first, data-rich dashboard experience.

## Component Organization

- **App Router Structure**: Pages in `src/app/` following Next.js 14 conventions (`dashboard/page.tsx`, `vehicle/[id]/page.tsx`)
- **Component Library**: Shadcn UI primitives in `src/components/ui/` for consistent, accessible components
- **Feature Components**: Domain-specific components (`VehicleDashboard`, `VehicleCard`, `VehicleDetail`, `CommunicationAssistant`) in `src/components/`
- **Composition Pattern**: Complex components built from smaller, reusable pieces

## State Management

- **Global State**: React Context (`VehicleContext`) for vehicle data shared across pages
- **Server State**: No external state library - leverage Next.js App Router server components where possible
- **Local State**: Component-level `useState` for UI interactions (filters, sorting, modals)
- **Data Flow**: Unidirectional - API client → Context → Components

## Routing & Navigation

- **File-Based Routing**: Next.js App Router with dynamic routes (`[id]`)
- **Client-Side Navigation**: Next.js `<Link>` for instant transitions (SPA feel per PRD)
- **No Authentication**: Single-user local app, no protected routes needed

## API Integration

- **Centralized Client**: `src/lib/api.ts` wraps all fetch calls with consistent error handling
- **Type Safety**: All API calls use shared types from `packages/types`
- **Error Boundaries**: React error boundaries prevent full app crashes on component failures
- **Loading States**: Explicit loading UI for async operations

