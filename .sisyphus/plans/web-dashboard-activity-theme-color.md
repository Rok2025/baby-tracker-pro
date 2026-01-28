# Web Dashboard Recent Activity: Unify Colors To Theme Primary

Goal

- Web only: change the Dashboard "Recent Activities" (最近活动) colors to follow the current theme primary color.
- Remove any type-based color differentiation (feeding/sleep/solid_food/poop) in the recent activity UI.
- Apply this consistently across the list rows AND the edit dialog surfaced from the activity feed.

Scope / Target

- Web app only: `apps/web`
- Dashboard page uses activity feed here: `apps/web/src/app/page.tsx`
- Recent activity component to change: `apps/web/src/components/dashboard/ActivityFeed.tsx`

Context (what exists today)

- The project already uses theme tokens like `text-primary`, `bg-primary/10`, `border-primary`, `shadow-primary/...` across the web app.
- Theme primary is defined via CSS variables in `apps/web/src/app/globals.css` (e.g. `--primary`, `--primary-foreground`) for both light and dark.
- `ActivityFeed.tsx` currently uses hard-coded palette classes by activity type:
  - feeding: blue
  - sleep: violet
  - solid_food: amber
  - poop: stone
  - plus special "sleep ongoing" pulse/glow styling in violet

Non-Goals

- Do not change activity semantics, icons, ordering, grouping, or API behavior.
- Do not refactor unrelated styling across the dashboard.
- Do not change other pages/components beyond `ActivityFeed.tsx` unless they are part of the activity feed edit dialog.

Implementation Plan (do in this exact order)

1. Inventory all type-based color branches in ActivityFeed

- File: `apps/web/src/components/dashboard/ActivityFeed.tsx`
- Identify the exact className branches to replace:
  - Row hover background: currently `hover:bg-violet-500/10`, `hover:bg-amber-500/10`, `hover:bg-stone-500/10`, `hover:bg-blue-500/10`
  - Icon container (left pill): currently `bg-*-500/20 text-*-500`
  - Ongoing sleep modifier: currently `animate-pulse bg-violet-500/40 shadow-[...]`
  - Detail pill (right fixed-width data): currently `text-*-600 bg-*-500/10` and ongoing sleep variant
  - Edit dialog title icon colors: currently `text-blue-500/text-violet-500/...`
  - Edit dialog "record type" dot colors: currently `bg-blue-500/bg-violet-500/...`

2. Replace list row hover background with theme primary

- Replace all per-type `hover:bg-...` with a single token, recommended:
  - `hover:bg-primary/10`
- Ensure the hover effect remains subtle and works in both light/dark.

3. Replace activity icon container colors with theme primary

- Replace per-type `bg-.../20 text-...` with:
  - `bg-primary/15 text-primary` (opacity can be tuned to 10/15/20 to match existing visual language)
- Keep sizing/spacing/transition classes unchanged.

4. Keep "ongoing sleep" emphasis but make it theme-primary

- Keep the idea: ongoing sleep should look "active" (pulse/spin) but NOT violet.
- Replace ongoing modifier to use theme primary tokens, recommended:
  - `animate-pulse bg-primary/30 shadow-lg shadow-primary/30 border border-primary/20`
- If a custom shadow like `shadow-[0_0_...]` is required, use `shadow-primary/..` when possible; avoid hard-coded RGB.

5. Replace detail pill colors with theme primary

- Replace all per-type branches on the detail pill with a single baseline:
  - `text-primary bg-primary/10`
- For ongoing sleep (no `end_time`) keep distinct styling via opacity/border/animation only, recommended:
  - `text-primary bg-primary/20 animate-pulse border border-primary/20`
- Preserve exporting-mode additions (`isExporting && ...`) exactly as-is, only change the color tokens.

6. Update edit dialog colors to remove type-based differentiation

- In the edit dialog header icon, replace `text-blue-500/text-violet-500/...` with:
  - `text-primary`
- In the "记录类型" row (read-only), replace the dot `bg-...` branches with:
  - `bg-primary`
- Keep the type label text (feeding/sleep/...) unchanged; only unify color.

7. Consistency check: ensure no remaining hard-coded palette classes for ActivityFeed UI

- Search within `ActivityFeed.tsx` for any of:
  - `text-blue-`, `text-violet-`, `text-amber-`, `text-stone-`
  - `bg-blue-`, `bg-violet-`, `bg-amber-`, `bg-stone-`
- If they are still present and relate to activity feed UI, replace with theme tokens.
- If they are unrelated (e.g., other exports or non-activity UI), keep unchanged, but confirm they are out of scope.

Verification Plan

Visual verification (manual)

- In web dashboard, confirm that for all four activity types:
  - Row hover background uses the same color.
  - Left icon pill background/text uses the same color.
  - Detail pill uses the same color.
  - Ongoing sleep is still visually distinct (pulse/spin) but uses theme primary.
- Toggle theme (light/dark) and confirm all above follows the theme primary in both modes.

Programmatic checks

- `pnpm --filter=@yoyo/web lint`
- `pnpm --filter=@yoyo/web build`

Acceptance Criteria

- No type-based palette differences remain in the recent activity list UI or its edit dialog.
- All relevant colors are expressed via theme tokens (`*-primary*`) so they follow the current theme.
- No behavior regressions (editing/deleting still works, export view still renders).

Rollback Plan

- If the new primary tokens reduce contrast in dark mode, adjust only the opacity values (e.g., `/10` -> `/15` or `/20`) while staying on `primary` tokens.
- If ongoing sleep is not noticeable enough, increase emphasis with `border-primary/30` or `bg-primary/25` (do not reintroduce type colors).

Notes / Hand-off

- I am a planner; I do not implement. After this plan is approved, run `/start-work` to execute it.
