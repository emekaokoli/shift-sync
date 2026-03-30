# Architecture Decision Document - ShiftSync

## 1. Project Overview

**Project Name:** ShiftSync  
**Purpose:** Multi-location staff scheduling platform for Coastal Eats restaurant group  
**Evaluation Period:** 72 hours

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend Build | Vite (Rolldown) |
| Frontend Framework | React 19 |
| Routing | TanStack Router |
| Data Fetching | TanStack React Query |
| UI Components | shadcn/ui |
| Backend | Node.js + Express |
| ORM | Prisma |
| Database | PostgreSQL |
| Real-time | Socket.io |
| Date/Time | Day.js v2 (immutable) |
| Validation | Zod |

---

## 3. Architecture Layers

### Frontend Layer

**Responsibilities:**
- UI rendering & user interactions
- React Router for routing
- Data fetching (TanStack Query)
- WebSocket client (Socket.io-client)
- Basic UX validation (format, required fields)

**Strictly NO:**
- ❌ Business logic
- ❌ Domain rules
- ❌ Complex validation beyond UX
- ❌ Direct database access

---

### Backend Layer

**Core Domain Services:**
- Shift scheduling engine
- Constraint validation & enforcement
- Swap workflow state machine
- Overtime calculation engine
- Audit logging service
- Concurrency control (transactions + locks)

**API Layer:**
- REST endpoints (CRUD operations)
- Socket.io server (real-time events)
- Authentication/Authorization
- Request validation

---

### Data Layer

**PostgreSQL Features:**
- ACID transactions
- Referential integrity constraints
- Complex JOIN queries
- Row-level locking (SELECT FOR UPDATE)
- Optimistic locking (version columns)
- Consistent reads (REPEATABLE READ)

---

### Real-time Layer

**Server → Client Events:**
- `shift:assigned` - Invalidate shifts query
- `shift:unassigned` - Invalidate shifts query
- `shift:updated` - Update local cache
- `swap:requested` - Show notification
- `swap:status_changed` - Update swap list
- `conflict:detected` - Show warning banner

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
│   apps/frontend      │               │    apps/backend       │
│                       │               │                       │
│  • Imports Zod for    │               │  • Imports Zod for    │
│    form validation    │               │    API validation    │
│  • Imports types      │               │  • Imports types      │
│  • Imports constants  │               │  • Imports constants  │
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
│   ├── frontend/           # Vite + React + TanStack Router
│   │   ├── src/
│   │   │   ├── routes/     # TanStack Router routes
│   │   │   ├── components/ # React components
│   │   │   ├── lib/       # Utilities, API client
│   │   │   └── router.tsx  # Router configuration
│   │   └── package.json
│   │
│   ├── backend/            # Express + Prisma
│   │   ├── src/
│   │   │   ├── domain/    # Constraint engine (pure functions)
│   │   │   │   ├── rules/ # Individual constraint rules
│   │   │   │   ├── engine/ # Validation & suggestion engines
│   │   │   │   └── swap/  # State machine
│   │   │   ├── application/ # Use cases
│   │   │   ├── infrastructure/ # DB, socket
│   │   │   └── api/       # Express routes
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   │
│   └── shared/            # Shared types, schemas
│       ├── src/
│       └── package.json
│
└── architecturedecision.md
```

---

## 6. Edge Cases Handled

| Category | Edge Case | Solution |
|----------|-----------|----------|
| **Timezone** | Overnight shifts (11pm-3am) | Single shift record, cross-date boundary |
| **Timezone** | DST transitions | Day.js with IANA timezone plugin |
| **Timezone** | Cross-timezone staff | Availability checked in shift's location timezone |
| **Constraints** | Double booking | Time overlap check across all locations |
| **Constraints** | Rest period < 10h | Gap calculation between shifts |
| **Constraints** | 7th consecutive day | Hard block with override reason required |
| **Concurrency** | Simultaneous assignment | Optimistic locking with version field |
| **Swap** | Pending swap + shift edit | Auto-cancel pending swaps |
| **Swap** | Max 3 pending requests | Reject new request if count >= 3 |

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 1-hour shift counts for consecutive days | Yes - any shift counts |
| Keep historical on decertification | Yes - preserve audit trail |
| Availability = hard constraint | Yes - cannot override |
| 7th day requires reason | Yes - logged in audit |
| Store times in UTC | Yes - convert to location timezone on display |
| Optimistic locking | Yes - prevents race conditions |

---

## 8. Constraint Engine

The constraint engine is the core product. All validation happens in the backend.

```typescript
// Validation result type
type ValidationResult = 
  | { ok: true }
  | { ok: false; violations: Violation[] }

// Each violation has:
type Violation = {
  code: string           // e.g., 'OVERLAP', 'INSUFFICIENT_REST'
  message: string        // Human-readable
  details?: Record<string, unknown>
}
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

## 9. State Machine (Swap/Drop)

```
PENDING → ACCEPTED → APPROVED
    ↓         ↓
  CANCELLED  REJECTED
    ↓
  EXPIRED (if drop, 24h before shift)
```

---

## 10. Commit Strategy

| Order | Type | Description |
|-------|------|-------------|
| 1 | chore | Setup monorepo structure |
| 2 | chore | Setup shared package |
| 3 | chore | Setup backend package |
| 4 | chore | Setup frontend package |
| 5 | feat | Add Prisma schema |
| 6 | feat | Add domain rules |
| 7 | feat | Add validation engine |
| 8 | feat | Add suggestion engine |
| 9 | feat | Add swap state machine |
| 10 | feat | Add application use cases |
| 11 | feat | Add API routes |
| 12 | feat | Add Socket.io realtime |
| 13 | feat | Add frontend routes |

---

## Summary

This architecture prioritizes:
1. **Constraint engine correctness** (25%) - All rules in backend domain
2. **Edge case handling** (20%) - Comprehensive coverage above
3. **Concurrency control** (15%) - Optimistic locking + transactions
4. **Real-time** (15%) - Socket.io integration
5. **Code organization** (10%) - Layered architecture with shared package

---

## Status

| Item | Status |
|------|--------|
| Architecture defined | ✅ |
| Edge cases documented | ✅ |
| Shared package | ✅ |
| Backend domain layer | ✅ |
| Frontend routes | ✅ |
| Ready to implement | ✅ |
