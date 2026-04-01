# ShiftSync Web Application

Frontend application for the ShiftSync multi-location staff scheduling platform.

## Technology Stack

| Category | Technology |
|----------|------------|
| Build | Vite (Rolldown) |
| Framework | React 19 |
| Routing | TanStack Router |
| Data Fetching | TanStack React Query |
| State Management | Zustand |
| UI Components | shadcn/ui |
| Real-time | Socket.io-client |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

## Project Structure

```
src/
├── routes/              # TanStack Router routes
│   ├── __root.tsx      # Root route with auth
│   ├── index.tsx       # Home/redirect
│   ├── schedule.tsx    # Weekly schedule view
│   ├── my-shifts.tsx   # User's shift swaps
│   └── swaps.tsx       # Swap management
├── components/         # React components
│   └── ui/            # shadcn/ui components
└── lib/               # Utilities
    ├── api.ts         # API client with auth
    ├── socket.ts      # Socket.io client
    ├── queries.ts     # React Query hooks
    └── stores/        # Zustand stores
        ├── authStore.ts
        ├── uiStore.ts
        └── index.ts
```

## State Management

### Zustand Stores

**authStore.ts** - Authentication state
- User info (id, name, email, role)
- JWT token
- Login/logout actions

**uiStore.ts** - UI state
- Selected date
- Active location filter
- Loading states
- Notifications

## Data Fetching

React Query hooks are defined in `lib/queries.ts`:
- `useShifts()` - Fetch shifts with filtering
- `useShift(id)` - Fetch single shift
- `useSwapRequests()` - Fetch swap requests
- `useStaff()` - Fetch staff list
- `useLocations()` - Fetch locations

All hooks integrate with Socket.io for real-time updates.

## API Client

Base URL: `/api`

Authentication via JWT Bearer token in `Authorization` header.

```typescript
// Example API call
const response = await fetch('/api/shifts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## Real-time Events

Socket.io events from server:

| Event | Action |
|-------|--------|
| `shift:created` | Invalidate shifts query |
| `shift:updated` | Update local cache |
| `shift:deleted` | Remove from cache |
| `assignment:created` | Refetch shift |
| `assignment:removed` | Refetch shift |
| `swap:requested` | Show notification |
| `swap:approved` | Refetch swaps |
| `swap:rejected` | Refetch swaps |

## Environment Variables

```env
VITE_API_URL=/api
VITE_WS_URL=ws://localhost:3001
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Preview production build |