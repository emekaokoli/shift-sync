# ShiftSync - Agent Documentation

## Project Overview

**ShiftSync** is a multi-location staff scheduling platform for Coastal Eats restaurant group. It's a full-stack monorepo with:

- **Backend**: Node.js + Express + Knex.js + PostgreSQL + Socket.io
- **Frontend**: React 19 + Vite + TanStack Router + TanStack Query + Zustand + shadcn/ui
- **Shared**: Zod schemas + TypeScript types + constants

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend Runtime | Node.js |
| Backend Framework | Express.js |
| Database | PostgreSQL |
| Query Builder | Knex.js |
| Real-time | Socket.io |
| Auth | JWT |
| Frontend Build | Vite |
| Frontend Framework | React 19 |
| Routing | TanStack Router |
| Data Fetching | TanStack Query |
| State Management | Zustand |
| UI Components | shadcn/ui |
| Validation | Zod |

---

## Folder Structure

### Root
```
prioritysoft/
├── apps/
│   ├── backend/        # Express API server
│   ├── web/            # React SPA
│   └── shared/         # Shared types, schemas, constants
├── package.json        # Monorepo scripts
├── pnpm-workspace.yaml
└── AGENTS.md           # This file
```

---

### apps/backend/src/
```
backend/src/
├── index.ts                    # Entry point - creates Express app + HTTP server
├── api/                       # Express route handlers
│   ├── index.ts               # Re-exports all routers
│   ├── auth.ts                # POST /login, /register, /me
│   ├── shifts.ts              # CRUD shifts + assign/validate + publish
│   ├── staff.ts               # CRUD staff + skills/locations/availability
│   ├── swaps.ts               # Swap/drop requests + respond
│   ├── locations.ts           # CRUD locations
│   ├── skills.ts              # CRUD skills
│   ├── notifications.ts       # User notifications
│   ├── audit.ts               # Audit log viewing + export
│   └── middleware/
│       └── auth.ts            # JWT authentication middleware
├── application/               # Use cases with transactions
│   ├── assignShift.ts        # Assign staff with validation + optimistic locking
│   ├── createShift.ts         # Create new shift
│   ├── updateShift.ts         # Update shift (auto-cancel pending swaps)
│   ├── requestSwap.ts         # Request swap/drop with validation
│   ├── approveSwap.ts         # Approve/reject swap state machine
│   ├── auditLog.ts            # Create audit log entry
│   └── index.ts
├── domain/                    # Business logic (pure functions)
│   ├── rules/                 # Constraint validation rules
│   │   ├── index.ts
│   │   ├── availabilityCheck.ts   # Check if within availability windows
│   │   ├── consecutiveDays.ts     # Check 7th consecutive day
│   │   ├── locationCheck.ts       # Check location certification
│   │   ├── minRest.ts             # Check 10-hour minimum rest
│   │   ├── noOverlap.ts           # Check time overlap
│   │   ├── overtime.ts            # Check weekly/daily overtime
│   │   ├── premiumShift.ts        # Check premium shift bonus
│   │   └── skillMatch.ts          # Check skill requirement
│   ├── engine/                # Validation & suggestion engines
│   │   ├── validateAssignment.ts    # Run all constraint checks
│   │   ├── suggestAlternatives.ts   # Suggest qualified staff
│   │   └── index.ts
│   ├── swap/                  # State machine
│   │   ├── swapMachine.ts
│   │   └── index.ts
│   └── index.ts
├── infrastructure/            # External integrations
│   ├── auth.ts               # JWT: hashPassword/verifyPassword/signToken/verifyToken
│   ├── database/             # Knex setup
│   │   ├── index.ts         # Knex instance export (db)
│   │   ├── migrations/      # Migration files (001-014)
│   │   └── seeds/           # Seed data
│   ├── repositories/         # Data access layer
│   │   ├── index.ts
│   │   ├── auditRepository.ts
│   │   ├── shiftRepository.ts
│   │   ├── staffRepository.ts
│   │   ├── swapRepository.ts
│   │   ├── locationRepository.ts
│   │   └── skillRepository.ts
│   ├── socket.ts            # Socket.io server setup + emit helpers
│   ├── response.ts          # Express response helpers (success/error/notFound)
│   ├── errorHandler.ts     # Express error boundary middleware
│   ├── logger.ts            # Pino logger
│   ├── rateLimit.ts         # API rate limiting
│   └── error.ts             # Custom error classes
└── env.d.ts                  # Environment type declarations
```

---

### apps/shared/src/
```
shared/src/
├── index.ts         # Re-exports all public APIs
├── types.ts         # TypeScript interfaces
├── schemas.ts       # Zod validation schemas
└── constants.ts    # App constants (roles, statuses, constraints)
```

---

### apps/web/src/
```
web/src/
├── main.tsx                  # Entry point - QueryClientProvider + App
├── App.tsx                   # Root component with RouterProvider
├── router.tsx               # Router creation with type registration
├── routes/                   # TanStack Router file-based routing
│   ├── __root.tsx           # Root route with layout
│   ├── auth/
│   │   └── login.tsx        # Login page
│   ├── (_authenticated)/   # Protected routes layout (beforeLoad auth check)
│   │   ├── _authenticated.tsx
│   │   ├── index.tsx        # Redirect to schedule
│   │   ├── schedule.tsx    # Weekly calendar view
│   │   ├── swaps.tsx       # Swap management
│   │   ├── my-shifts.tsx   # User's shift requests
│   │   └── audit.tsx       # Admin audit log viewer
│   └── unauthorized.tsx    # 403 page
├── pages/                    # Page components
│   ├── auth/index.tsx       # Login form
│   ├── layout/index.tsx     # App layout with nav
│   ├── schedules/index.tsx  # Schedule view
│   ├── swaps/swaps.tsx      # Swap UI
│   └── index.tsx            # Redirect
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── label.tsx
│   │   └── sonner.tsx
│   ├── CreateShiftDialog.tsx
│   ├── Notifications.tsx
│   ├── ErrorBoundary.tsx
│   └── NavigationTracker.tsx
├── hooks/                    # Custom React hooks
│   ├── auth/index.ts        # Auth hooks
│   ├── shifts/index.ts      # Shift data hooks + React Query
│   ├── staff/index.ts       # Staff hooks + React Query
│   ├── swaps/index.ts       # Swap hooks + React Query
│   ├── socket/index.ts      # Socket.io hooks
│   ├── notifications/index.ts
│   ├── locations/index.ts
│   ├── skills/index.ts
│   └── index.ts
├── api/                      # API client functions
│   ├── client.ts            # Base fetch wrapper with auth
│   ├── auth/index.ts        # Auth API
│   ├── shifts/index.ts      # Shifts API
│   ├── staff/index.ts       # Staff API
│   ├── swaps/index.ts       # Swaps API
│   ├── locations/index.ts   # Locations API
│   ├── skills/index.ts      # Skills API
│   ├── notifications/index.ts
│   └── index.ts
└── lib/                      # Utilities
    ├── stores/              # Zustand stores
    │   ├── authStore.ts     # Auth state (user, token, isAuthenticated)
    │   ├── uiStore.ts       # UI state (selected date, location filter)
    │   ├── notificationStore.ts
    │   └── index.ts
    ├── utils.ts             # Utility functions (cn, formatDate, etc.)
    └── toast.ts             # Toast helpers
```

---

## Database Schema

### High-Level Schema

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | Staff, managers, admins | id, email, name, role, timezone, desired_hours, version |
| `locations` | Restaurant locations | id, name, address, timezone, cutoff_hours, version |
| `skills` | Required skills | id, name, description, version |
| `user_skills` | Staff skill certifications | user_id, skill_id |
| `user_locations` | Staff location certifications | user_id, location_id, is_manager |
| `availability` | Staff availability windows | user_id, day_of_week, start_time, end_time, is_recurring, specific_date |
| `shifts` | Scheduled shifts | id, location_id, start_time, end_time, required_skill_id, headcount, status, version |
| `shift_assignments` | Staff assignments | id, shift_id, staff_id, assigned_by, version |
| `swap_requests` | Swap/drop requests | id, shift_id, requester_id, target_id, type, status, version |
| `drop_requests` | Drop requests (legacy) | id, shift_id, requester_id, status |
| `notifications` | User notifications | user_id, type, message, read, data |
| `audit_logs` | All schedule changes | id, user_id, action, entity_type, entity_id, old_value, new_value |

### Version Columns

The following tables use **optimistic locking** with a `version` column:
- `users`
- `locations`
- `skills`
- `shifts`
- `shift_assignments`
- `swap_requests`

This prevents concurrent modification conflicts.

---

## API Endpoints

All endpoints are prefixed with `/api/v1/`

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login with email/password | Public |
| POST | `/auth/register` | Register new user | Public |
| GET | `/auth/me` | Get current user | Bearer |

### Shifts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/shifts` | List shifts (with filters) | Bearer |
| GET | `/shifts/:id` | Get shift by ID | Bearer |
| POST | `/shifts` | Create new shift | Bearer |
| PATCH | `/shifts/:id` | Update shift | Bearer |
| DELETE | `/shifts/:id` | Delete shift | Bearer |
| POST | `/shifts/:id/publish` | Publish shift | Bearer |
| POST | `/shifts/:id/assign` | Assign staff to shift | Bearer |
| POST | `/shifts/:id/validate` | Validate assignment | Bearer |
| GET | `/shifts/:id/suggestions` | Get staff suggestions | Bearer |

### Staff
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/staff` | List staff (with filters) | Bearer |
| GET | `/staff/:id` | Get staff by ID | Bearer |
| PATCH | `/staff/:id` | Update staff | Bearer |
| POST | `/staff/:id/skills` | Add skill to staff | Bearer |
| DELETE | `/staff/:id/skills/:skillId` | Remove skill from staff | Bearer |
| POST | `/staff/:id/locations` | Add location to staff | Bearer |
| POST | `/staff/:id/availability` | Set availability | Bearer |

### Swaps
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/swaps` | List swap requests | Bearer |
| GET | `/swaps/:id` | Get swap by ID | Bearer |
| POST | `/swaps` | Create swap request | Bearer |
| POST | `/swaps/:id/respond` | Approve/reject/cancel | Bearer |
| DELETE | `/swaps/:id` | Cancel swap request | Bearer |

### Locations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/locations` | List locations | Bearer |
| GET | `/locations/:id` | Get location with upcoming shifts | Bearer |
| POST | `/locations` | Create location | Bearer |
| PATCH | `/locations/:id` | Update location | Bearer |
| DELETE | `/locations/:id` | Delete location | Bearer |

### Skills
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/skills` | List skills | Bearer |
| GET | `/skills/:id` | Get skill with users | Bearer |
| POST | `/skills` | Create skill | Bearer |
| DELETE | `/skills/:id` | Delete skill | Bearer |

### Audit
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/audit/shifts/:shiftId` | Get audit history for shift | Manager+ |
| GET | `/audit` | List audit logs (with filters) | Admin only |
| GET | `/audit/export` | Export audit logs as CSV | Admin only |

---

## Socket.io Events

### Server → Client
| Event | Description |
|-------|-------------|
| `shift:created` | New shift created |
| `shift:updated` | Shift modified |
| `shift:deleted` | Shift cancelled |
| `shift:published` | Shift published |
| `assignment:created` | Staff assigned to shift |
| `assignment:removed` | Staff unassigned from shift |
| `assignment:conflict` | Simultaneous assignment conflict |
| `swap:requested` | New swap request |
| `swap:accepted` | Swap accepted |
| `swap:approved` | Swap approved by manager |
| `swap:cancelled` | Swap cancelled |
| `swap:rejected` | Swap rejected |
| `notification` | User notification |

### Client → Server
| Event | Description |
|-------|-------------|
| `auth` | Authenticate socket (send userId, locations) |
| `subscribe:shifts` | Join location room for shift updates |
| `unsubscribe:shifts` | Leave location room |
| `subscribe:swaps` | Join swap notification room |

---

## Hard Rules

### Rule 1: Types in `apps/shared`

Always define shared types in `apps/shared/src/types.ts`. Never define types in `apps/backend` or `apps/web`.

```typescript
// ✅ GOOD: Define in apps/shared/src/types.ts
export interface User {
  id: string;
  name: string;
  role: Role;
}

// ❌ BAD: Define in apps/backend/src/api/users.ts
interface User {
  id: string;
  name: string;
}
```

### Rule 2: No Hardcoded Business Data

Never hardcode users, locations, skills, or shifts. Always fetch from APIs/database.

```typescript
// ✅ GOOD: Fetch from API
const shifts = await shiftsApi.getById(id);

// ❌ BAD: Hardcoded data
const DEMO_USER = { id: '123', name: 'John' };
```

### Rule 3: No `any`

Use `unknown` at trust boundaries, then narrow using Zod or type guards. Never bypass with `as` assertions.

```typescript
// ✅ GOOD: Narrow with type guards
function handleResponse(data: unknown) {
  if (isUser(data)) {
    console.log(data.name); // TypeScript knows data is User
  }
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

// ✅ GOOD: Zod validation
const result = userSchema.safeParse(data);
if (result.success) {
  console.log(result.data.name); // TypeScript knows data is User
}

// ❌ BAD: Using as to bypass narrowing
const user = data as User;
```

### Rule 4: No Unused Imports

Strict TypeScript: run `pnpm typecheck` before submitting. Remove all unused imports.

```typescript
// ✅ GOOD: Only import what's used
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores';

// ❌ BAD: Unused imports
import { useState } from 'react';  // Never used
import { useNavigate } from '@tanstack/react-router';  // Never used
```

### Rule 5: Tests Use Real Local DB

Not mocks. Run `pnpm db-reset` before testing to ensure clean state.

```typescript
// ✅ GOOD: Reset DB before test
beforeEach(async () => {
  await db('audit_logs').del();
  await db('shifts').del();
});

test('should create audit log', async () => {
  await createShift({ ... });
  const logs = await db('audit_logs').select();
  expect(logs).toHaveLength(1);
});

// ❌ BAD: Mocking the database
jest.mock('../infrastructure/database', () => ({
  db: {
    insert: jest.fn().mockResolvedValue([{ id: '1' }]),
    select: jest.fn().mockResolvedValue([]),
  },
}));
```

### Rule 6: No Duplicate Files

Check existing files before creating. Use glob/search to find existing implementations.

```typescript
// ✅ GOOD: Check for existing before creating
// Search for: "findById" in repositories
const existing = await db('users').where({ id }).first();

// ❌ BAD: Creating duplicate functionality
// Created another getUser function when findById already exists
```

### Rule 7: Fix Lint/Type Errors

Always run `pnpm lint && pnpm typecheck` before submitting.

```bash
# Run both commands before submitting
pnpm lint && pnpm typecheck
```

---

## Common Errors & Troubleshooting

### Database Connection Errors

**Error: `ECONNREFUSED localhost:5432`**
- PostgreSQL is not running
- Fix: Start PostgreSQL or check connection string in `.env`

**Error: `relation "users" does not exist`**
- Migrations haven't run
- Fix: Run `pnpm db:migrate`

### Authentication Errors

**Error: `No token provided`**
- Request missing `Authorization: Bearer <token>` header
- Fix: Add token from login response to request headers

**Error: `Invalid token`**
- Token is expired or malformed
- Fix: Re-login to get fresh token

### TypeScript Errors

**Error: `Cannot find module '@/lib/stores'`**
- Path alias not configured
- Fix: Check `tsconfig.json` has `"@/*": ["./src/*"]` in paths

**Error: `Property does not exist on type`**
- Type not exported from shared package
- Fix: Export type from `apps/shared/src/index.ts`

### Runtime Errors

**Error: `CONFLICT: Shift was modified by another user`**
- Optimistic locking - version mismatch
- Fix: Refetch the shift and retry with current version

**Error: `Maximum 3 pending swap requests allowed`**
- User has too many pending swaps
- Fix: Wait for pending swaps to be resolved

### Frontend Errors

**Error: `Router not registered`**
- Router type not registered
- Fix: Add `declare module '@tanstack/react-router'` with router registration

**Error: `Query already running`**
- TanStack Query mutation called twice
- Fix: Disable button during pending state

---

## Common Tasks

### Running the App
```bash
pnpm install              # Install all dependencies
pnpm db:migrate          # Run Knex migrations
pnpm db:seed             # Seed database
pnpm dev                 # Start all apps
pnpm dev:backend         # Start backend only
pnpm dev:web             # Start frontend only
```

### Adding a New API Endpoint
1. Add route in appropriate file in `apps/backend/src/api/`
2. Use repository methods from `apps/backend/src/infrastructure/repositories/`
3. Return responses using `ResponseUtils`
4. Add Zod validation schema in `apps/shared/src/schemas.ts`
5. Export type in `apps/shared/src/index.ts`

### Adding a New Frontend Page
1. Create route file in `apps/web/src/routes/`
2. Use React Query hooks from `apps/web/src/hooks/`
3. Access auth state via Zustand store: `useAuthStore()`
4. Follow existing page patterns

### Running Tests
```bash
pnpm test                # Run all tests
pnpm test:watch         # Run tests in watch mode
```

---

## Seed Data

The database is seeded with:
- 3 locations (Downtown, Uptown, Beach)
- Multiple skills (Server, Bartender, Host, Manager)
- Sample users for each role (ADMIN, MANAGER, STAFF)
- Sample shifts for the current week
- Sample availability windows

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@coastaleats.com | password123 |
| Manager | manager@coastaleats.com | password123 |
| Staff | staff@coastaleats.com | password123 |

---

## Architecture Notes

### Transaction Pattern

All write operations use Knex transactions with proper rollback:

```typescript
await db.transaction(async (trx) => {
  await trx('shifts').where({ id }).update({ ... });
  await trx('audit_logs').insert({ ... });
});
```

### Conflict Detection

Optimistic locking uses version checks:

```typescript
const current = await trx('shifts').where({ id }).first();
if (current.version !== expectedVersion) {
  throw new Error('CONFLICT: Shift was modified by another user');
}
await trx('shifts').where({ id }).update({ version: current.version + 1, ... });
```

### Real-time Updates

Socket.io emits events on database changes:
- Location-based rooms (`location:{id}`)
- User-based rooms (`user:{id}`)
- Swap notifications (`swaps`)
