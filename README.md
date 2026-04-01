# ShiftSync - Multi-Location Staff Scheduling Platform

A comprehensive staff scheduling platform for the Coastal Eats restaurant group, enabling managers to create and manage shifts across multiple locations while respecting labor laws, availability constraints, and skill requirements.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pnpm 8+

### Installation & Setup

```bash
# Clone and install dependencies
git clone <repo-url>
cd prioritysoft
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your database credentials

# Run database migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed

# Start development servers
pnpm dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **API**: http://localhost:1964

## Demo Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@coastaleats.com | password123 | Full access, audit logs, CSV export |
| Manager | manager@coastaleats.com | password123 | Schedule management, shift history |
| Staff | staff@coastaleats.com | password123 | View shifts, request swaps |

## Features

### For Staff
- **View Schedule**: See your assigned shifts across all certified locations
- **Request Swaps**: Request shift swaps with other qualified staff
- **Track My Shifts**: View pending, accepted, and completed swap requests
- **Manage Availability**: Set weekly availability and time-off requests

### For Managers
- **Create Shifts**: Create shifts with required skills and headcount
- **Assign Staff**: Assign qualified staff with real-time constraint validation
- **View Audit History**: Track all changes to any shift
- **Handle Swaps**: Approve or reject swap requests

### For Admins
- **Full Schedule Control**: Manage all locations, staff, and schedules
- **Audit Log**: View complete system activity with filters
- **Export Data**: Download audit logs as CSV for compliance
- **Manage Locations & Skills**: Configure restaurant locations and required skills

## Key Concepts

### Constraint Engine
The system enforces labor law compliance automatically:
- **Overlap Detection**: Prevents double-booking across all locations
- **Minimum Rest**: Enforces 10-hour minimum between shifts
- **Consecutive Days**: Warns at 6th day, blocks 7th without override
- **Overtime Prevention**: Alerts when staff approaches 40hr/week or 12hr/day
- **Skill Matching**: Ensures staff have required certifications
- **Location Certification**: Only certified staff can work at locations

### Real-Time Updates
Socket.io provides instant updates:
- Shift changes appear immediately
- Swap requests notify relevant staff
- Assignment conflicts are detected in real-time

### Optimistic Locking
Concurrent modifications are handled gracefully:
- Version tracking prevents lost updates
- Users are notified of conflicts and can retry

## Project Structure

```
prioritysoft/
├── apps/
│   ├── api/              # Express + Knex.js backend
│   │   └── src/
│   │       ├── api/      # REST endpoints
│   │       ├── application/  # Use cases with transactions
│   │       ├── domain/   # Constraint engine (pure functions)
│   │       └── infrastructure/  # DB, repositories, socket
│   │
│   └── web/              # React + Vite frontend
│       └── src/
│           ├── routes/   # TanStack Router pages
│           ├── components/  # UI components
│           ├── hooks/    # React Query hooks
│           ├── api/      # API client functions
│           └── lib/      # Stores, utilities
│
├── shared/               # Shared types, schemas, constants
│   └── src/
│       ├── types.ts      # TypeScript interfaces
│       ├── schemas.ts    # Zod validation schemas
│       └── constants.ts  # App constants
│
├── AGENTS.md             # Developer documentation
└── architecturedecision.md  # Architecture decisions
```

## API Documentation

All endpoints are prefixed with `/api/v1/`

### Key Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/login` | Login and get JWT token | Public |
| GET | `/shifts` | List shifts with filters | All authenticated |
| POST | `/shifts` | Create new shift | Manager+ |
| POST | `/shifts/:id/assign` | Assign staff to shift | Manager+ |
| GET | `/swaps` | List swap requests | All authenticated |
| POST | `/swaps` | Request a swap | Staff |
| GET | `/audit/shifts/:id` | View shift history | Manager+ |
| GET | `/audit/export` | Export audit logs CSV | Admin only |

See `apps/api/src/api/` for complete endpoint documentation.

## Development

### Common Commands

```bash
pnpm dev                 # Start all apps
pnpm dev:api             # Start backend only
pnpm dev:web             # Start frontend only
pnpm build               # Build all apps
pnpm lint                # Run ESLint
pnpm typecheck           # Run TypeScript checks
pnpm db:migrate          # Run database migrations
pnpm db:seed             # Seed demo data
pnpm db:rollback         # Rollback last migration
pnpm test                # Run tests
```

### Adding New Features

1. **New API Endpoint**: Add route in `apps/api/src/api/`, use repositories, return via ResponseUtils
2. **New Frontend Page**: Create route in `apps/web/src/routes/`, use React Query hooks
3. **New Type**: Define in `shared/src/types.ts`, export from `shared/src/index.ts`
4. **New Database Table**: Create migration, update repositories

### Architecture Patterns

- **Repositories**: Use transaction parameter (`trx`) for data access
- **Application Layer**: Handle business logic with proper rollback
- **Domain Rules**: Pure functions for constraint validation
- **React Query**: Server state management with Socket.io invalidation

## Environment Variables

### apps/api/.env

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shiftsync

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server
PORT=1964
NODE_ENV=development
APP_NAME=ShiftSync
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `ECONNREFUSED localhost:5432` | Start PostgreSQL |
| `relation "users" does not exist` | Run `pnpm db:migrate` |
| `No token provided` | Login again to get fresh token |
| `CONFLICT: Shift was modified` | Refresh and retry - optimistic lock |
| Toast not showing colors | Call as function: `showSuccessToast("msg")` |
| CSV export shows HTML | Check audit router is registered |

## License

Proprietary - Coastal Eats Restaurant Group
