# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (scan QR with Expo Go app)
npm start

# Target a specific platform
npm run android
npm run ios

# Build Android APK via EAS
npx eas build --platform android --profile preview
```

There is no lint script or test runner configured in this project.

## Architecture

**Budget Tracker** is an offline-only React Native + Expo app (SDK 52). No backend, no auth — all data lives in a local SQLite database via `expo-sqlite`.

### Data flow

```
lib/db.ts  ──async calls──▶  context/AppContext.tsx  ──▶  app/*.tsx screens
   (SQLite ops)                 (global state + refresh)      (UI)
```

- **`lib/db.ts`** — single module for all database access. Initialises the DB (WAL mode) and seeds default categories/settings on first run. All exported functions are `async` and accept/return typed values from `types/index.ts`.
- **`context/AppContext.tsx`** — wraps the entire app. Exposes `transactions`, `categories`, `settings`, `summary`, `currentMonth`, and a `refresh()` callback. Screens call `refresh()` after any mutation to re-fetch all data.
- **`app/_layout.tsx`** — root layout. Wraps everything in `<SafeAreaProvider>` and `<AppProvider>`, then renders a bottom tab navigator. The `add-transaction` screen is tab-hidden (`href: null`) and navigated to programmatically.
- **`lib/utils.ts`** — pure helpers: amount formatting (`fmtAmount`), date formatting with French locale, month progress calculations, end-of-month projection, and the shared color `PALETTE`.
- **`types/index.ts`** — all shared TypeScript types: `Transaction`, `Category`, `Settings`, `MonthSummary`.

### Key conventions

- **Refresh pattern**: after any write (add/update/delete), call `const { refresh } = useApp()` then `await refresh()`. No local optimistic updates.
- **Month scope**: `currentMonth` is always `'YYYY-MM'`. Transactions are filtered with a `LIKE 'YYYY-MM%'` SQL pattern. Pass it through `AppContext` to switch months.
- **Category type** can be `'expense'`, `'income'`, or `'both'`. Income categories have `budget: 0` and are excluded from budget tracking.
- **Currency defaults** to MAD (Moroccan Dirham, symbol `د.م`). All amounts are stored as `REAL` and formatted with `fmtAmount(amount, settings.currencySymbol)`.
- **Date format** stored as `YYYY-MM-DD` strings. Use `todayISO()` from `lib/utils.ts` to get today's date.
- **Routing**: Expo Router v4 file-based routing. All screens are in `app/`. Navigate to `add-transaction` with `router.push('/add-transaction')`.