# Learnings - Yoyo Theme Implementation

## Conventions and Patterns

(Subagents will append findings here)

## Research Findings - Mon Jan 26 00:04:09 CST 2026

### 1. useTheme Usage Locations

Found 4 files using the `useTheme` hook:

- `apps/web/src/components/ThemeToggle.tsx`: Used for switching between light and dark.
- `apps/web/src/app/page.tsx`: Used to access current theme.
- `apps/web/src/components/dashboard/ElderlyExportView.tsx`: Used to access current theme.
- `apps/web/src/components/ui/sonner.tsx`: Used for toast notifications theme.

### 2. ThemeProvider Configuration

Located in `apps/web/src/app/layout.tsx`:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="light"
  enableSystem={false}
  disableTransitionOnChange
>
```

- `attribute="class"`: Themes are applied via CSS classes on the `html` or `body` element.
- `defaultTheme="light"`: Initial theme is light.
- `enableSystem={false}`: System theme detection is disabled.

### 3. Segmented Button Style Pattern

Found in `apps/web/src/app/settings/page.tsx` (lines 200-215) for font-size selector:

- Container: `flex p-1 bg-background/50 rounded-xl gap-1 border border-muted`
- Button: `flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all`
- Active State: `bg-primary text-primary-foreground shadow-md`
- Inactive State: `text-muted-foreground hover:bg-background/80`

### 4. Theme Switching Implementation

- `ThemeToggle.tsx` currently uses a simple toggle: `setTheme(theme === "dark" ? "light" : "dark")`.
- To support `yoyo` theme, this will need to be updated to handle three states or replaced with a segmented control similar to the font-size selector.

### 2026-01-26 00:21:36 - Task 1: CSS Variables Added

- Added `.yoyo` theme CSS variables to `apps/web/src/app/globals.css`.
- Defined 33 color/style variables and 1 font variable using OKLCH.
- Followed the plan's appendix for exact values.
- Removed unnecessary comments to comply with project hooks.
  [2026-01-26 00:41:03] Updated ThemeProvider in apps/web/src/app/layout.tsx to support 'yoyo' theme.

## [2026-01-26] Nunito Font Integration

- Added Nunito font loading in `apps/web/src/app/layout.tsx` using `next/font/google`.
- Configured `--font-nunito` variable and applied it to the body className.
- Verified `.yoyo` theme in `globals.css` correctly maps `--font-sans` to `var(--font-nunito)`.
- 2026-01-26 04:19:59: Implemented three-way theme selector (Light/Dark/Yoyo) in settings page with mounted guard to prevent hydration mismatch.
- 2026-01-26 04:53:10: Cleaned up unused ThemeToggle import in settings page after replacing it with the three-way selector.
- [2026-01-26 05:21:01] Added subtle yoyo background decoration to globals.css using radial gradients on body::before.

## 2026-01-26 QA: Playwright UI Verification

- Dev server launched on http://localhost:8888 and stopped via `pkill -f "pnpm --filter=@yoyo/web dev -- --port 8888"` after QA.
- /settings and / routes redirect to /baby-tracker-pro/login without auth, so theme selector and dashboard styling could not be verified (blocked by auth).
- Login page verified with manual localStorage override: `document.documentElement.className` updates to `yoyo`.
- Background decoration: `getComputedStyle(document.body,'::before').backgroundImage` returns gradients in yoyo and `none` in light.
- ThemeToggle button toggles yoyo -> dark -> light (confirmed by html class changes).
- Nunito verification inconclusive: computed `font-family` on body/button shows system sans; `--font-sans`/`--font-nunito` not visible in computed style. Needs follow-up once authenticated pages are accessible.

### 2026-01-26 06:32:52

- Fixed Nunito application in yoyo theme by moving font variables (`geistSans.variable`, `geistMono.variable`, `nunito.variable`) from `<body>` to `<html>` element in `apps/web/src/app/layout.tsx`. This ensures CSS variables are available for theme-specific font overrides like `--font-sans: var(--font-nunito)`.
  [2026-01-26 06:34:50] Added .yoyo body { font-family: var(--font-sans); } to globals.css to ensure Nunito applies over Geist defaults.

## 2026-01-26 QA: Playwright UI Verification (Authenticated Bypass)

- Seeded a fake Supabase session in localStorage (`sb-ffarxgtwvbhpextaujuw-auth-token`) to access `/baby-tracker-pro/settings` and `/baby-tracker-pro/`.
- Theme selector buttons (浅色/深色/温馨) toggle theme and show active state; `documentElement.className` updates accordingly.
- Yoyo theme active on `/baby-tracker-pro/`, `/baby-tracker-pro/login`, `/baby-tracker-pro/settings` (checked `--background` and html class).
- Background decoration: yoyo `body::before` returns gradient; light returns `none`.
- ThemeToggle toggles yoyo -> dark -> light (verified html class updates).
- Nunito now applies: `getComputedStyle(document.body).fontFamily` returns `Nunito` with yoyo active and `--font-sans` resolves to Nunito.

## 2026-01-26 Contrast Verification

- Darkened yoyo primary to `oklch(0.45 0.12 20)` to meet WCAG AA.
- Contrast checks (computed in Playwright) now pass:
  - Nav active text vs primary background: 7.57
  - Primary button text vs background: 7.57
  - Summary card number text vs card background: 4.93
    [2026-01-26 06:46:01] Improved yoyo theme contrast: Updated --primary-foreground and --sidebar-primary-foreground to oklch(0.3 0 0) in .yoyo block to fix AA contrast issues (white text on coral background).
- 2026-01-26 06:49:25: Adjusted .yoyo primary colors to oklch(0.65 0.12 20) and foregrounds to oklch(0.99 0 0) to meet AA contrast requirements.
  [2026-01-26 06:50:57] Further darkened yoyo primary to oklch(0.55 0.12 20) to ensure 4.5:1 contrast ratio with white foreground.

[2026-01-26 06:52:31] Adjusted .yoyo primary and sidebar-primary to oklch(0.45 0.12 20) for AA contrast compliance.
