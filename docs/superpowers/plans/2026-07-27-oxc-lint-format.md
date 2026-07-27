# OXC Lint + Format Implementation Plan

> **For agentic workers:** Execute inline in this session.

**Goal:** Add oxlint (type-aware) and oxfmt with scripts, configs, and a green first pass.

**Architecture:** Root `.oxlintrc.json` + `.oxfmtrc.json`; scripts in `package.json`; scope excludes `docs/`.

**Tech Stack:** oxlint 1.75, oxfmt 0.60, oxlint-tsgolint 7.x, pnpm

## Global Constraints

- App/config only (not docs Markdown)
- Type-aware linting enabled
- Match existing style: single quotes, semis, 2-space

---

### Task 1: Tooling + configs

- Create: `.oxlintrc.json`, `.oxfmtrc.json`
- Modify: `package.json` scripts + deps
- Verify: `pnpm format:check`, `./node_modules/.bin/oxlint .`

### Task 2: Make lint green

- Disable `react/react-in-jsx-scope` (automatic JSX runtime)
- Fix remaining correctness/type-aware findings (or narrowly disable noise that is not actionable)
- Re-run lint until exit 0

### Task 3: Docs

- Update README, AGENTS.md, ARCHITECTURE.md commands + checklist
