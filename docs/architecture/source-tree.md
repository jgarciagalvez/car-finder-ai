# Source Tree

Complete monorepo structure using Turborepo for workspace management:

```
car-finder-ai/
├── apps/
│   ├── api/                     # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/          # HTTP endpoint handlers
│   │   │   │   ├── vehicles.ts  # GET/PATCH /api/vehicles
│   │   │   │   ├── ai.ts        # POST /api/ai/chat
│   │   │   │   └── index.ts     # Route registration
│   │   │   ├── services/        # Business logic (reusable)
│   │   │   │   ├── ScraperService.ts
│   │   │   │   ├── ParserService.ts
│   │   │   │   └── AIService.ts
│   │   │   ├── middleware/      # Cross-cutting concerns
│   │   │   │   ├── cors.ts
│   │   │   │   ├── errorHandler.ts
│   │   │   │   └── validation.ts
│   │   │   ├── types/           # API-specific types
│   │   │   │   ├── requests.ts
│   │   │   │   └── responses.ts
│   │   │   └── index.ts         # Express server entry
│   │   ├── __tests__/           # Integration tests
│   │   ├── dist/                # Compiled output (gitignored)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                     # Next.js frontend
│       ├── src/
│       │   ├── app/             # Next.js App Router
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx
│       │   │   ├── vehicle/
│       │   │   │   └── [id]/
│       │   │   │       └── page.tsx
│       │   │   ├── globals.css
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/      # UI components
│       │   │   ├── ui/          # Shadcn UI primitives
│       │   │   ├── VehicleCard.tsx
│       │   │   ├── VehicleDashboard.tsx
│       │   │   ├── VehicleDetail.tsx
│       │   │   └── CommunicationAssistant.tsx
│       │   ├── lib/             # Utilities
│       │   │   ├── api.ts       # API client
│       │   │   ├── utils.ts
│       │   │   └── types.ts
│       │   ├── context/         # React Context
│       │   │   ├── VehicleContext.tsx
│       │   │   └── UIContext.tsx
│       │   └── hooks/           # Custom hooks
│       │       ├── useVehicles.ts
│       │       └── useAPI.ts
│       ├── public/              # Static assets
│       ├── __tests__/           # Component tests
│       ├── .next/               # Build output (gitignored)
│       ├── package.json
│       ├── tsconfig.json
│       └── next.config.js
│
├── packages/
│   ├── types/                   # Shared TypeScript types
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                      # Database layer
│   │   ├── src/
│   │   │   ├── database.ts      # LibSQL client setup
│   │   │   ├── schema.ts        # Table definitions
│   │   │   ├── repositories/
│   │   │   │   └── VehicleRepository.ts
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── scripts/                 # Background processing
│   │   ├── src/
│   │   │   ├── ingest.ts        # Scraping script
│   │   │   └── analyze.ts       # AI analysis script
│   │   ├── __tests__/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── services/                # Service abstraction layer
│   │   ├── src/
│   │   │   ├── interfaces/      # Service contracts
│   │   │   ├── mocks/           # Mock implementations
│   │   │   ├── registry/        # Service registry
│   │   │   └── index.ts
│   │   ├── __tests__/
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ai/                      # AI provider abstraction
│       ├── src/
│       │   ├── providers/       # Provider implementations
│       │   │   └── GeminiProvider.ts
│       │   ├── interfaces/      # AI service contracts
│       │   ├── factory/         # Provider factory
│       │   └── index.ts
│       ├── __tests__/
│       ├── dist/
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                        # Documentation
│   ├── architecture.md          # This file
│   ├── prd.md
│   ├── project-brief.md
│   └── stories/                 # User stories
│       ├── 1.1.story.md
│       ├── 1.2.story.md
│       └── ...
│
├── data/                        # Runtime data
│   ├── vehicles.db              # Production database (gitignored)
│   ├── vehicles.test.db         # Test database (committed)
│   └── exports/                 # CSV exports
│
├── .env                         # Environment config (gitignored)
├── .env.example                 # Environment template
├── .gitignore
├── package.json                 # Root workspace config
├── pnpm-workspace.yaml          # pnpm workspace definition
├── pnpm-lock.yaml
├── turbo.json                   # Turborepo pipeline config
├── tsconfig.json                # Root TypeScript config
├── parser-schema.json           # HTML parsing configuration
├── search-config.json           # Search URL configuration
└── README.md
```

