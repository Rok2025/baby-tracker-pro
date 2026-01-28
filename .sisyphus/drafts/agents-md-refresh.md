# Draft: AGENTS.md Refresh

## Requirements (confirmed)

- User requests analyzing the codebase and creating/improving `AGENTS.md` in `/Users/freeman/Documents/00-Project/yoyo`.
- Include build/lint/test commands, especially single-test invocation guidance.
- Include code style guidelines (imports, formatting, types, naming, error handling, etc.).
- If Cursor/Copilot rules exist, include them.
- Target length ~150 lines.

## Technical Decisions

- None yet.

## Changes Drafted

- Rewrote `AGENTS.md` to consolidate verified commands, lint/format configs, TS settings, and test guidance.

## Research Findings

- Existing `AGENTS.md` already present with monorepo commands and style guidance (needs review for improvements).
- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.
- Lint/format configs located in:
  - `apps/web/eslint.config.mjs` (Next.js ESLint)
  - `apps/mini/.eslintrc` (Taro ESLint)
  - `apps/mini/stylelint.config.mjs` (Stylelint standard)
  - `apps/mini/commitlint.config.mjs` (Conventional commits)
  - `tsconfig.base.json` (strict TS base config)
  - Root formatting via `pnpm format` (Prettier on ts/tsx/md)
- Root scripts: `turbo` build/dev/lint; Prettier format.
- Web scripts: `next dev/build/start`, `eslint`.
- Mini scripts: Taro build/dev targets; Husky + lint-staged present.
- Mobile scripts: Expo start/android/ios/web.
- No test scripts, no test configs, and no test files found.
- `apps/mini/.editorconfig` enforces 2-space indentation and trims trailing whitespace.
- `apps/mini/tsconfig.json` sets `noImplicitAny: false`, `strictNullChecks: true`, `noUnusedLocals/Parameters: true`, and `@/*` alias to `src/*`.
- `apps/web/tsconfig.json` extends base and defines `@/*` alias to `apps/web/src/*`.
- `apps/mobile/tsconfig.json` extends Expo base with `strict: true`.

## Open Questions

- Confirm scope focus across apps vs a primary app emphasis.
- Determine whether any single-test command exists or if we should document absence and suggest a convention.

## Scope Boundaries

- INCLUDE: Update or rewrite `AGENTS.md` with accurate commands, rules, and style guidance.
- EXCLUDE: Any code changes outside markdown planning artifacts.
