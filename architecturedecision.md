# Architecture Decision Document - ShiftSync

## 1. Project Overview

**Project Name:** ShiftSync  
**Purpose:** Multi-location staff scheduling platform for Coastal Eats restaurant group  
**Evaluation Period:** 72 hours

---

## 2. Technology Stack

| Layer              | Technology            |
| ------------------ | --------------------- |
| Frontend Build     | Vite (Rolldown)       |
| Frontend Framework | React 19              |
| State Management   | Zustand               |
| Routing            | TanStack Router       |
| Data Fetching      | TanStack React Query  |
| UI Components      | shadcn/ui             |
| Backend            | Node.js + Express     |
| Query Builder      | Knex.js               |
| Database           | PostgreSQL            |
| Real-time          | Socket.io             |
| Authentication     | JWT                   |
| Date/Time          | Day.js v2 (immutable) |
| Validation         | Zod                   |

---

## 3. Architecture Layers

### Frontend Layer

**Responsibilities:**

- UI rendering & user interactions
- TanStack Router for routing
- TanStack Query for data fetching with cache invalidation
- Zustand for client-side state management
- WebSocket client (Socket.io-client) for real-time updates
- Basic UX validation (format, required fields)

---

### Backend Layer

**Core Domain Services:**

- Shift scheduling engine
- Constraint validation & enforcement
- Swap workflow state machine
- Overtime calculation engine
- Audit logging service
- Concurrency control (transactions + optimistic locking)

**API Layer:**

- REST endpoints (CRUD operations)
- Socket.io server (real-time events)
- Authentication/Authorization (JWT)
- Request validation (Zod)

**Repository Layer:**

- Transaction support with Knex.js
- Conflict detection via optimistic locking (version fields)
- Re-validation inside transactions for data integrity
- Query builders for all database operations

---

### Data Layer

**PostgreSQL Features:**

- ACID transactions via Knex.js
- Referential integrity constraints
- Complex JOIN queries
- Row-level locking (SELECT FOR UPDATE)
- Optimistic locking (version columns)
- Consistent reads (SERIALIZABLE isolation)

**Knex.js Features:**

- Query builder API for type-safe queries
- Migration management
- Seed data handling
- Transaction support with rollback
- Raw SQL for complex queries (JSON_BUILD_OBJECT, JSON_AGG)

---

### Real-time Layer

**Server → Client Events:**

- `shift:created` - New shift published
- `shift:updated` - Shift modified
- `shift:deleted` - Shift cancelled
- `assignment:created` - Staff assigned
- `assignment:removed` - Staff unassigned
- `swap:requested` - Swap request created
- `swap:approved` - Swap approved
- `swap:rejected` - Swap rejected
- `swap:cancelled` - Swap cancelled

**Client → Server Events:**

- `subscribe:shifts` - Join room for real-time
- `subscribe:swaps` - Join swap notifications

---

## 4. Shared Package

```
┌─────────────────────────────────────────────────────────────┐
│                    SHARED PACKAGE                           │
│                  apps/shared (npm package)                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Contents:                                          │    │
│  │  • Zod validation schemas                          │    │
│  │  • TypeScript interfaces                           │    │
│  │  • Constants (roles, statuses, error codes)         │    │
│  │  • Utility types                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                 │
│              Exported to: frontend + backend                │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
         ┌─────────────────────┴─────────────────────┐
         │                                           │
         ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│     FRONTEND          │               │      BACKEND          │
│   apps/web            │               │    apps/backend       │
│                       │               │                       │
│  • Imports Zod for    │               │  • Imports Zod for    │
│    form validation    │               │    API validation    │
│  • Imports types      │               │  • Imports types     │
│  • Imports constants  │               │  • Imports constants │
│  • Zustand stores     │               │  • Knex queries      │
│  • React Query hooks  │               │  • Repositories      │
└───────────────────────┘               └───────────────────────┘
```

---

## 5. Directory Structure

```
prioritysoft/
├── pnpm-workspace.yaml
├── package.json
│
├── apps/
│   ├── web/                   # Vite + React + TanStack Router + Zustand
│   │   ├── src/
│   │   │   ├── routes/        # TanStack Router routes
│   │   │   ├── components/    # React components (shadcn/ui)
│   │   │   ├── lib/           # Utilities, API client, stores
│   │   │   │   ├── api.ts     # Fetch wrapper with auth
│   │   │   │   ├── socket.ts  # Socket.io client
│   │   │   │   ├── queries.ts # React Query hooks
│   │   │   │   └── stores/    # Zustand stores
│   │   │   └── router.tsx     # Router configuration
│   │   └── package.json
│   │
│   ├── backend/               # Express + Knex.js
│   │   ├── src/
│   │   │   ├── domain/        # Constraint engine (pure functions)
│   │   │   │   ├── rules/     # Individual constraint rules
│   │   │   │   ├── engine/    # Validation & suggestion engines
│   │   │   │   └── swap/      # State machine
│   │   │   ├── application/   # Use cases with transactions
│   │   │   │   ├── assignShift.ts
│   │   │   │   ├── updateShift.ts
│   │   │   │   ├── requestSwap.ts
│   │   │   │   ├── approveSwap.ts
│   │   │   │   └── auditLog.ts
│   │   │   ├── infrastructure/ # DB, auth, socket
│   │   │   │   ├── database/   # Knex setup + migrations
│   │   │   │   ├── repositories/ # Data access layer
│   │   │   │   │   ├── shiftRepository.ts
│   │   │   │   │   ├── staffRepository.ts
│   │   │   │   │   ├── swapRepository.ts
│   │   │   │   │   ├── locationRepository.ts
│   │   │   │   │   └── skillRepository.ts
│   │   │   │   ├── auth.ts     # JWT utilities
│   │   │   │   └── socket.ts  # Socket.io server
│   │   │   └── api/           # Express routes
│   │   │       ├── auth.ts
│   │   │       ├── shifts.ts
│   │   │       ├── staff.ts
│   │   │       ├── swaps.ts
│   │   │       ├── locations.ts
│   │   │       └── skills.ts
│   │   ├── knexfile.ts        # Knex configuration
│   │   └── package.json
│   │
│   └── shared/                # Shared types, schemas
│       ├── src/
│       │   ├── types.ts
│       │   ├── schemas.ts
│       │   └── constants.ts
│       └── package.json
│
└── architecturedecision.md
```

---

## 6. Repository Architecture

All repositories support:

### Transaction Support

```typescript
// All methods accept optional transaction parameter
const shift = await shiftRepository.findById(id, transaction);
const result = await shiftRepository.updateWithVersion(
  id,
  data,
  version,
  transaction,
);
```

### Conflict Detection (Optimistic Locking)

```typescript
// Update with version check
const result = await shiftRepository.updateWithVersion(
  id,
  { status: 'CANCELLED' },
  expectedVersion, // If version mismatch, returns { success: false, error: 'CONFLICT' }
  transaction,
);
```

### Re-validation Inside Transactions

```typescript
// Validation methods that check data integrity within transaction
const result = await locationRepository.deleteWithValidation(id, transaction);
// Validates: no active shifts, no assigned users before deletion
```

### Available Methods per Repository

| Repository           | Standard Methods                                  | Transaction Methods                                  | Validation Methods                                                               |
| -------------------- | ------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `shiftRepository`    | findMany, findById, create, update, delete        | findVersion, updateWithVersion, deleteWithVersion    | -                                                                                |
| `staffRepository`    | findMany, findById, update, addSkill, removeSkill | findVersion, updateWithVersion                       | addSkillWithValidation, addLocationWithValidation, addAvailabilityWithValidation |
| `swapRepository`     | findMany, findById, create, update, delete        | findVersion, createWithValidation, updateWithVersion | updateStatusWithValidation                                                       |
| `locationRepository` | findMany, findById, create, update, delete        | findVersion, createWithValidation, updateWithVersion | deleteWithValidation                                                             |
| `skillRepository`    | findMany, findById, create, update, delete, count | findVersion, createWithValidation, updateWithVersion | deleteWithValidation                                                             |

---

## 7. Edge Cases Handled

| Category        | Edge Case                   | Solution                                             |
| --------------- | --------------------------- | ---------------------------------------------------- |
| **Timezone**    | Overnight shifts (11pm-3am) | Single shift record, cross-date boundary             |
| **Timezone**    | DST transitions             | Day.js with IANA timezone plugin                     |
| **Timezone**    | Cross-timezone staff        | Availability checked in shift's location timezone    |
| **Constraints** | Double booking              | Time overlap check across all locations              |
| **Constraints** | Rest period < 10h           | Gap calculation between shifts                       |
| **Constraints** | 7th consecutive day         | Hard block with override reason required             |
| **Concurrency** | Simultaneous assignment     | Optimistic locking with version field + transactions |
| **Concurrency** | Race conditions             | Knex transactions with SERIALIZABLE isolation        |
| **Swap**        | Pending swap + shift edit   | Auto-cancel pending swaps                            |
| **Swap**        | Max 3 pending requests      | Reject new request if count >= 3                     |

---

## 8. Key Design Decisions

| Decision                                 | Rationale                                                             |
| ---------------------------------------- | --------------------------------------------------------------------- |
| Knex.js over Prisma                      | More control over SQL, better transaction handling, migration support |
| 1-hour shift counts for consecutive days | Yes - any shift counts                                                |
| Keep historical on decertification       | Yes - preserve audit trail                                            |
| Availability = hard constraint           | Yes - cannot override                                                 |
| 7th day requires reason                  | Yes - logged in audit                                                 |
| Store times in UTC                       | Yes - convert to location timezone on display                         |
| Optimistic locking                       | Yes - prevents race conditions                                        |
| Zustand for client state                 | Lightweight, simple, no boilerplate                                   |
| Single quotes in code                    | ESLint/Prettier preference                                            |

---

## 9. Constraint Engine

The constraint engine is the core product. All validation happens in the backend.

```typescript
// Validation result type
type ValidationResult = { ok: true } | { ok: false; violations: Violation[] };

// Each violation has:
type Violation = {
  code: string; // e.g., 'OVERLAP', 'INSUFFICIENT_REST'
  message: string; // Human-readable
  details?: Record<string, unknown>;
};
```

### Constraint Rules

1. **noOverlap** - Check for time conflicts across all locations
2. **minRest** - 10-hour minimum between shifts
3. **skillMatch** - Staff must have required skill
4. **locationCheck** - Staff must be certified for location
5. **availabilityCheck** - Within availability windows
6. **consecutiveDays** - Warning at 6th day, block at 7th
7. **overtime** - Warning at 35h, block at 40h weekly; block at 12h daily

---

## 10. State Machine (Swap/Drop)

```
PENDING → ACCEPTED → APPROVED
    ↓         ↓
  CANCELLED  REJECTED
    ↓
  EXPIRED (if drop, 24h before shift)
```

---

## 11. Database Schema (Knex Migrations)

### Tables

1. **users** - Staff, managers, admins
2. **locations** - Restaurant locations
3. **skills** - Required skills (Server, Bartender, etc.)
4. **user_skills** - Staff skill certifications
5. **user_locations** - Staff location certifications
6. **availability** - Staff availability windows
7. **shifts** - Scheduled shifts with version for optimistic locking
8. **shift_assignments** - Staff assignments
9. **swap_requests** - Swap/drop requests with version
10. **drop_requests** - Drop requests (legacy)
11. **notifications** - User notifications
12. **audit_logs** - Audit trail

---

## 12. Commit Strategy

| Order | Type  | Description                        |
| ----- | ----- | ---------------------------------- |
| 1     | chore | Setup monorepo structure           |
| 2     | chore | Setup shared package               |
| 3     | chore | Setup backend package              |
| 4     | chore | Setup frontend package             |
| 5     | chore | Add Knex configuration             |
| 6     | chore | Add database migrations            |
| 7     | chore | Add seed data                      |
| 8     | feat  | Add repositories with transactions |
| 9     | feat  | Add domain rules                   |
| 10    | feat  | Add validation engine              |
| 11    | feat  | Add suggestion engine              |
| 12    | feat  | Add swap state machine             |
| 13    | feat  | Add application use cases          |
| 14    | feat  | Add API routes                     |
| 15    | feat  | Add Socket.io realtime             |
| 16    | feat  | Add frontend routes                |
| 17    | feat  | Add Zustand stores                 |
| 18    | feat  | Add React Query hooks              |

---

## Summary

This architecture prioritizes:

1. **Constraint engine correctness** (25%) - All rules in backend domain
2. **Edge case handling** (20%) - Comprehensive coverage above
3. **Concurrency control** (15%) - Optimistic locking + Knex transactions
4. **Real-time** (15%) - Socket.io integration
5. **Code organization** (10%) - Layered architecture with shared package
6. **Repository pattern** (10%) - Transaction support, conflict detection, re-validation

---

## Status

| Item                  | Status |
| --------------------- | ------ |
| Architecture defined  | ✅     |
| Edge cases documented | ✅     |
| Shared package        | ✅     |
| Knex.js migrations    | ✅     |
| Repository layer      | ✅     |
| Backend domain layer  | ✅     |
| Frontend routes       | ✅     |
| Ready to implement    | ✅     |
