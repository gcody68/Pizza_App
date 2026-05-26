# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build      # TypeScript check + Vite production build (use this to verify correctness)
npm run dev        # Vite dev server (port 5173) — DO NOT start from Claude
npm run lint       # ESLint
```

TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`). Always run `npm run build` to verify — the `tsc -b` step runs first and will catch type errors before Vite bundles.

Path alias `@/` maps to `src/`. Use it for all internal imports.

## Architecture

Single-page React app (Vite + React 19 + TypeScript). Three routes:

| Route | Component | Purpose |
|---|---|---|
| `/` | `PublicBooking` | Client-facing booking flow (service select → stylist → confirm) |
| `/dashboard` | `Dashboard` | Owner nav hub |
| `/calendar` | `CalendarBooking` | Full salon management: appointment grid, staff panel, analytics |

### State model

**CalendarBooking** owns the `Stylist[]` array (the source of truth for who appears as calendar columns). Each `Stylist` holds `Appointment[]` objects that include a `date: string` (ISO `yyyy-mm-dd`). The grid filters by `selectedISO` on every render — clicking a day pill updates `selectedDate` and the filtered view rebuilds via `useMemo`. New staff added through `StaffCheckInWidget` are pushed back into this array via the `onStaffAdded` callback, making them appear as calendar columns instantly.

**StaffCheckInWidget** (`src/components/StaffCheckInWidget.tsx`) has two view modes:
- **Directory list** — all staff rows with status toggle; tap a row to enter focused view
- **StylistSheet** — individual presence toggle + weekly availability grid for one person

It accepts `seedStylists` (from `CalendarBooking`'s `Stylist[]`) so the panel populates instantly without waiting for the DB. When `initialExpandName` is set (passed when clicking `↔` on a column header), it opens directly into that stylist's `StylistSheet`. The add-staff form only appears in the directory list view — never in the focused sheet.

**DB staff** (from `useStaff`) and **local fallback staff** (synthetic `StaffProfile` objects created when the DB insert fails) are merged in `useMemo`. Seed stylists are shown only when both DB and local lists are empty.

### Data persistence

Supabase (`@supabase/supabase-js`). Client singleton at `src/integrations/supabase/client.ts`. All hooks live in `src/hooks/useStaff.ts` and `src/hooks/useRestaurantSettings.ts`, built on `@tanstack/react-query`.

Key tables: `staff_profiles`, `shift_logs`, `restaurant_settings`.

**Always use `mcp__supabase__apply_migration`** for DDL — never raw `execute_sql` for schema changes.  
**Always enable RLS** on every new table. Never use `USING (true)` policies.

### Shift/payroll timecard

`useToggleClockIn` writes to both `staff_profiles.is_clocked_in` and inserts a row into `shift_logs` (`clock_in`/`clock_out`). `BookkeepingTab` reads logs via `useShiftLogs` and computes per-stylist hours with `computeShiftHours` (pairs clock_in/clock_out chronologically; if still clocked in, counts to `Date.now()`).

### Staff creation fallback

`useCreateStaff` throws on DB error. The widget catches this and creates a synthetic profile with `id: "local-${Date.now()}"`. These local-only members are detected by the `id.startsWith("local-")` or `id.startsWith("seed-")` guard used throughout — they skip DB mutations and use local React state for toggle/delete.

### Responsive layout

Staff panel: **mobile** = full-screen slide-up drawer (`mt-auto rounded-t-3xl animate-slide-in-bottom`), **sm+** = right-side slide-in (`max-w-sm animate-slide-in-right`). Both animations are defined in `src/index.css`. The mobile Staff button appears in the date toolbar; the desktop version is in the navbar.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite`. Custom tokens defined in `@theme {}` block in `src/index.css` (no `tailwind.config.js`). Gold accent: `hsl(38,65%,55%)`. Use inline `style={{ color: "hsl(...)" }}` for the gold color inside JSX when Tailwind class generation is unreliable. `.gradient-gold` utility class defined in `index.css`.

### Public booking page

No bottom navigation bar. Category filter pills at the top. Service grid is 2 columns. All images use `onError` handlers to swap to a `<Scissors>` fallback — never let a broken image show a broken layout.
