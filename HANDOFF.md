# Handoff
**Status:** READY
**Last agent:** Codex
**Date:** 2026-11-12
**Last PR:** #29 (merged: yes)
**Backend (.gs) changed:** no — live deployment version: 14 (previous: 13, for rollback)
**Live backend matches main:** yes

## What was done this turn
- Owner asked Codex to review everything and propose improvements. Reviewed latest main `9bd582be` and Claude's last merged PR #28, plus the preceding staff-only, repository, session, design and test changes. This turn is review/documentation only; no application behavior, schema, sign-in, Worker or records were changed. Patient access remains removed and fictional records/demo mode remain available.
- [PR #29](https://github.com/insaneCoro/Warfarin-Passport/pull/29) adds `docs/REVIEW_2026-11-12.md` with reproduced findings, exact code locations, prioritized product improvements and a suggested sequence of focused implementation turns, plus this handoff. Documentation only; implementation findings remain open. READY means the requested review is complete; Claude must wait for the owner to announce its turn.
- Re-ran `npm test`: **75/75 passed, zero skipped**; `npm run test:browser`: **14/14 passed**; `npm run format:check`: passed. Reviewed English iPad/Arabic phone screenshots. Additional synthetic reproductions found gaps in current regression coverage; they are documented honestly, not presented as already fixed.
- Confirmed public staff login renders without JavaScript errors or clinic navigation before authentication. Checked the current module has main's stamped asset version. Reviewed API authorization/signing/replay/history/cache logic and deployment workflows without accessing real patient data or owner credentials.
- [Read-only deployment check](https://github.com/insaneCoro/Warfarin-Passport/actions/runs/43250402582) confirmed active backend **14** and `Deployed source matches this release: yes`. No backend publication was needed. Prior rollback version **13** is preserved.
- Review findings are proposals, not authority to change schema, roles, sign-in, Worker/build settings or data. No setup/bootstrap/reset or actual patient messaging occurred.

## Not finished / known issues / risks
- **New review findings (not implemented):** backdated approved entries can make the frontend show an old regimen/INR date as current and block otherwise approved messaging; completed telephone contact still leaves the dashboard awaiting a care plan; encounter notes render twice; generic INR dialogs allow keyboard navigation to change the patient behind the form and save the entry to that second patient (reproduced in isolated synthetic demo; connected submission also uses the current selection). See the review document for synthetic reproductions and code locations. Fix these before adding features, with regression tests. The passing baseline suite does not yet cover these cases.
- **Review scope:** the owner requested ideas this turn. No fixes were silently shipped; do not infer permission for the report's proposed clinical/workflow policy changes.
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
- Read `docs/REVIEW_2026-11-12.md` first. First fix clinical forms bound to the wrong current selection; then prioritize consistent clinical chronology, current-plan display and phone-contact completion before further design/features. Preserve all existing records and add regression coverage. Clarify historical-entry policy with the owner if the fix requires new fields or treatment-workflow decisions.
- Fix duplicate/amended-note display and clinical dialog identity, focus and unsaved-edit protection in focused PRs. No clinical local-storage caching.
- Then simplify the patient page for iPad: compact identity/INR/approved dose/next test, one main next action, less repeated content and a concise reference summary. Keep design work separate from bug fixes/refactors.
- Owner approval is required before Cloudflare/build or sign-in/session changes; Pages currently has two publishers but the live asset stamp is correct. No settings were changed this turn.
- Keep the app staff-only and retain fictional patients/demo mode. Run formatting, all unit tests and all browser tests for any change. Claude must wait for the owner to announce its turn.

## Turn history
| Date | Agent | PR | Summary | Backend version |
|------|-------|----|---------|-----------------|
| 2026-11-12 | Codex | #15 (merged) | Standalone login and staff requests; guided care; reviewed bilingual messaging; isolated patient portal; exhaustive 80-unit/12-browser verification; republished from main | 10 (previous 9) |
| 2026-11-12 | Codex | #16 (merged) | Shared turn-taking/approval rules, exact Claude instruction, tested feature inventory, deployment evidence and READY handoff; documentation only | 10 (unchanged; previous 9) |
| 2026-11-12 | Claude | #17–#23 (merged) | Date-cell fix; repo reorganized + Prettier + browser tests in CI; patient login removed; per-request backend cache, single-patient refresh, asset versioning, redundancy cleanup; sign-in persistence + one-call login; full Arabic interface; handoff + conventions | 14 (previous 13) |
| 2026-11-12 | Claude | #25–#27 (merged) | Design overhaul: design system, readable type, compact urgent alerts, phone bottom tab bar, bottom-sheet dialogs | 14 (unchanged; previous 13) |
| 2026-11-12 | Claude | #28 (merged) | Button audit: removed duplicate/unneeded buttons, simpler dashboard | 14 (unchanged) |
| 2026-11-12 | Codex | #29 (merged) | Review only: 75 unit/14 browser tests pass; four reproduced findings including wrong-patient form context and chronology, prioritized staff/iPad roadmap and READY handoff; no app/data/config changes | 14 (unchanged; previous 13) |
