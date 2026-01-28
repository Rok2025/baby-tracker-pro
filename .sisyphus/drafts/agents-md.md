# Draft: AGENTS.md refresh

## Requirements (confirmed)

- User wants analysis of codebase and an AGENTS.md file covering build/lint/test commands (including single-test), code style guidelines (imports, formatting, types, naming, error handling, etc.).
- If Cursor rules or Copilot instructions exist, they must be included.
- If AGENTS.md already exists in repo, improve it.
- Target length around 150 lines.

## Technical Decisions

- TBD: Whether to expand existing AGENTS.md vs rewrite structure while preserving content.
- TBD: How to document single-test invocation if no test runner configured.

## Research Findings

- Existing AGENTS.md present at repo root with commands, linting, style, and rules file checks.

## Open Questions

- Should the updated AGENTS.md prioritize any specific app (web/mini/mobile), or keep equal coverage?
- Do you want the file to remain in English only, or bilingual (English + Chinese) like README?

## Scope Boundaries

- INCLUDE: build/lint/test commands, single-test guidance, code style guidelines, rules file references.
- EXCLUDE: implementation changes beyond AGENTS.md.
