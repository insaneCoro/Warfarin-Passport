# Handoff
**Status:** IN PROGRESS – Claude
**Last agent:** Claude
**Date:** 2026-11-12
**Last PR:** #23 (merged: yes)
**Backend (.gs) changed:** yes — live deployment version: 14 (previous: 13, for rollback)
**Live backend matches main:** yes

## What was done this turn
Owner requests: fix "Invalid time value", remove patient login, tidy the repo, remove redundancy, speed up the site, run browser tests in CI, fix the Cloudflare preview build.

- **#18 — "Invalid time value" fixed.** Google Sheets turns `yyyy-MM-dd` text into date cells and `getValues()` returns `Date` objects; the message builder appended `T12:00:00Z` to a `Date`. `allRows_` now converts date cells back to `yyyy-MM-dd` (spreadsheet time zone). This also fixes dates reaching the browser as UTC timestamps (one day early in Riyadh). `tests/helpers/sheets.mjs` now mimics Sheets date conversion; it reproduced the bug in 6 existing tests.
- **#19 — Repository reorganized and formatted.** `app/` (frontend, published to Pages as-is), `backend/` (.gs), `tests/unit`, `tests/browser`, `tests/helpers`, `docs/screenshots`. Prettier for all code (`npm run format`; CI fails on unformatted code). `package.json` scripts. `tests/run-browser.mjs` serves `app/` and runs all browser tests; screenshots go to a temp folder unless `--update-screenshots`. **Browser tests now run in CI on every PR.** Root `index.html` forwards to `app/` (Pages also runs GitHub's branch-deploy build). README rewritten.
- **#20 — Patient/caregiver login removed** (owner request). Portal page, `portal.*` actions, patient access management, patient request inbox and "Patient portal" contact method removed. `Patient_Access`, `Patient_Requests`, `Patient_Replies` removed from `SCHEMA`; **the existing Sheet tabs and rows were not touched**. Release `clinic-staff-care-v5`.
- **#21 — Faster, less redundant.** Backend per-request cache (spreadsheet opened once, each tab read once per request; cleared per request and on lock; writes invalidate). After a save the app reloads only the edited patient. One `?v=__BUILD__` asset tag stamped at deploy (fixed `review-context.mjs` loading twice). Translation batched per frame. One `actions_()` table in `dispatch_`. Removed list+get fallback, `async-utils.mjs` and portal CSS.
- **#22 — Stay signed in, faster sign-in, proper Arabic** (owner reports: slow login, refresh logged out, poor Arabic/English). Firebase refresh token kept in `sessionStorage` (survives refresh, cleared on tab close/sign-out; no patient data or ID token stored). `auth.me` with `includeWorkspace: true` returns patients in the same request: sign-in and restore = one Apps Script call. New translation layer in `ui-language.mjs` (~380 phrases, composite phrases, Arabic dates, number patterns, attributes; untranslated English gets `dir="auto"` and RTL marks around separators). New `refresh-session` and `language` browser tests; 3-minute per-test / 15-minute CI job limits.
- **#23 — this handoff** plus AGENTS.md conventions (asset tag, backend cache, file-order rule, Sheets dates).
- Tests at the end of the turn: **unit 75/75, browser 14/14**, formatting clean, GitHub `test` and `browser-test` green on every PR.
- Backend published from `main` after each backend PR: v10 → 11 (#18), → 12 (#20), → 13 (#21), → 14 (#22); final read-only check: `Deployed source matches this release: yes`.

## Not finished / known issues / risks
- **Cloudflare "Workers Builds" PR check still fails** (finishes in 0 s on every PR, also before this turn). Its settings live only in the Cloudflare dashboard; agents cannot see the logs or change them. Owner steps are in the turn summary: Workers & Pages → `warfarin-passport-api` → Settings → Build → set *Non-production branch deploy command* to `npx wrangler versions upload` (root directory `gateway`), or turn off builds for non-production branches. Production Worker deploys from `main` are unaffected. `gateway/worker.mjs` now imports `../app/js/connection-errors.mjs`.
- **GitHub Pages runs two publishers** (the workflow and GitHub's branch build). Recommend owner sets Settings → Pages → Source = *GitHub Actions*. Until then the root `index.html` redirect keeps the site working.
- The old patient-portal tabs remain in the Google Sheet, unused. Delete them only with owner approval.
- `patients.list` remains in the backend (used by tests and the session-retry test) though the app now loads with `patients.workspace`.
- The frontend `care-messages.mjs` duplicates the backend `buildPatientMessage` for the demo preview; a unit test keeps them identical.
- **Owner decision (2026-11-12): keep the fictional sample patients** (`demoSeed_`, `additional-cases.mjs`, demo mode) — the owner is still trying things out. Do not remove them without asking.
- Session persistence uses `sessionStorage` for the Firebase refresh token only (owner-approved sign-in change). Clinical data stays in memory only. Arabic translation covers interface text; clinical source guidance and fictional case text intentionally stay English. New interface text must be added to the dictionary in `app/js/ui-language.mjs` (the `language` browser test catches common gaps).
- Everything from Codex's previous handoff about clinical validation, non-ACID Sheets writes, 200-patient cap, manual WhatsApp and synthetic data only still applies.

## Don't touch without asking
- The fictional sample patients and demo mode (owner wants to keep them for now).
- Database schema, Sheet tabs/columns, migrations; deleting/archiving records (including the unused portal tabs).
- Sign-in, roles, authorization, the Cloudflare Worker/build configuration, the HMAC signing key.
- Anything involving real patient data.
- Never re-run `setupDatabase`/`bootstrapAdmin`, recreate the database/deployment, expose secrets, fabricate signatures, or skip/disable tests. Keep rollback version 13.

## Suggested next tasks
- Owner: fix the Cloudflare preview build setting and switch Pages source to GitHub Actions (steps above).
- Split `app/js/app.js` (~1,600 lines) into view modules (dashboard, passport, staff, messages) — refactor-only PR.
- Measure real request times in the live app (Apps Script cold starts remain ~1–3 s and cannot be removed by code).

## Turn history
| Date | Agent | PR | Summary | Backend version |
|------|-------|----|---------|-----------------|
| 2026-11-12 | Codex | #15 (merged) | Standalone login and staff requests; guided care; reviewed bilingual messaging; isolated patient portal; exhaustive 80-unit/12-browser verification; republished from main | 10 (previous 9) |
| 2026-11-12 | Codex | #16 (merged) | Shared turn-taking/approval rules, exact Claude instruction, tested feature inventory, deployment evidence and READY handoff; documentation only | 10 (unchanged; previous 9) |
| 2026-11-12 | Claude | #17–#23 (merged) | Date-cell fix; repo reorganized + Prettier + browser tests in CI; patient login removed; per-request backend cache, single-patient refresh, asset versioning, redundancy cleanup; sign-in persistence + one-call login; full Arabic interface; handoff + conventions | 14 (previous 13) |
