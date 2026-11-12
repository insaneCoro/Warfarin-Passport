# Shared agent rules

These instructions apply to Codex and Claude throughout this repository.

## Turn taking

1. Read `HANDOFF.md` first, before changing files or starting a task. Start a new turn only when its status is `READY`. If it says `IN PROGRESS – Codex` or `IN PROGRESS – Claude`, the other agent must stop and wait. An agent may continue its own interrupted turn.
2. Before starting, change the status to `IN PROGRESS – <agent>` in the shared checkout. Only one agent works at a time; do not delegate work to another coding agent concurrently.
3. Read the previous agent's last merged PR, its checks, the known issues in the handoff, and the live app. Check for breakage and fix it before adding new work. Do not enter real patient information or use production credentials for tests.
4. Finish the entire turn, including tests, PR merge and any backend publication, before handing over. Update the handoff and leave the merged `main` copy at `READY`. Never report an unmerged or unverified change as complete.
5. If blocked, keep the status `IN PROGRESS – <agent>`, document the blocker, and ask the owner. Do not silently hand unfinished deployment or failing tests to the next agent as ready.

## Branches and PRs

- Fetch and branch from the latest `origin/main` for every new PR. Codex uses `codex/<task>`; Claude uses `claude/<task>`.
- Never work on, commit to, or merge changes into the other agent's branch. Do not overwrite another agent's uncommitted files. The already merged `feature/patient-centred-workspace` branch is historical.
- Use this workflow: branch → change → all tests pass → PR with a clear description → merge → publish backend from `main` if `.gs` changed → update `HANDOFF.md` through a PR and merge it.
- Keep design changes, refactors and new features in separate PRs. Describe the concrete problem, resulting behavior, test evidence and material limitations. Do not bypass protected checks or conceal failing external checks.
- Use normal reviewed GitHub PR history; do not force push `main`. The owner has authorized each agent to finish and merge its own turn, without waiting for the owner to review ordinary changes. This does not waive the approval boundaries below.

## Ask the owner first

Obtain explicit approval before:

- Changing the database schema, including Sheet columns or tabs and migration behavior.
- Deleting or archiving records, including invoking reset functionality.
- Changing sign-in, authorization roles, the Cloudflare Worker, or the signing key.
- Anything involving real patient data. Until explicitly authorized, development and tests use synthetic records only.

Existing approval for a specific change in the conversation counts; do not ask for it again. Do not infer approval for an unrelated change from permission to merge or deploy. PR #15's already authorized implementation and its final publication precede these rules; future extensions need approval at these boundaries.

## Never

- Re-run `setupDatabase` or `bootstrapAdmin`, delete or recreate the existing database, or replace the existing Apps Script project or deployment.
- Commit or print `CLASPRC_JSON`, `GATEWAY_HMAC_SECRET`, authentication tokens, private keys, or Script Properties values. Do not download Actions secrets to inspect them. Public Firebase Web configuration is not a private credential.
- Use real patient data in source, screenshots, fixtures, test accounts, logs or PRs.
- Skip, disable, weaken or remove tests to make CI pass. Fix failures, including meaningful browser coverage, before merging.
- Fabricate clinician signatures, automatically prescribe/apply reference suggestions, mark a WhatsApp draft as delivered, or complete a follow-up merely because contact was attempted.

## Architecture

The GitHub Pages HTML/CSS/JavaScript frontend obtains a Firebase ID token and sends it to the Cloudflare Worker. The Worker verifies Firebase identity and forwards an HMAC-signed request to Google Apps Script (`API.gs`, `Security.gs`, `Database.gs`). Apps Script validates the signature, checks the approved staff role or patient access link server-side, and reads/writes the existing Google Sheet. Do not trust a frontend role or signature label.

Staff use the root site; the separate `portal.html` serves approved patient/caregiver accounts. Email verification alone grants neither staff membership nor patient access. Verified staff can request access and an administrator approves the request in-app. Clinical approval requires an actual authenticated clinician role. Internal notes and team discussions must remain private.

Database migrations are additive and preserve historical regimens and audit events. Staff-request metadata is stored in private Script Properties; do not print those values. Connected-mode clinical data and authentication tokens must not be persisted in browser local storage. See `docs/PATIENT_ACCESS_SECURITY.md`, `docs/CLINICAL_METHODS.md` and `docs/USER_GUIDE.md`.

## Tests and app review

Run the entire unit suite from the repository root:

```sh
node --test tests/*.test.mjs
```

Run **every** browser script, including the smoke test. Use a separate terminal for a local server:

```sh
python3 -m http.server 8010 --bind 127.0.0.1
```

With Node.js, Playwright and Chromium installed, run:

```sh
export TEST_URL=http://127.0.0.1:8010/
export CHROMIUM_PATH=/usr/bin/chromium
for test in tests/*-browser.cjs tests/browser-smoke.cjs; do
  node "$test" || exit 1
done
```

`require('playwright')` must resolve, using `NODE_PATH` if dependencies live outside the checkout. Some existing scripts explicitly use `/usr/bin/chromium`; supply that browser in a compatible Linux environment. In this managed workspace Playwright is available through `NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules`. Do not commit dependency caches or local credentials. Review desktop, iPad and phone layouts; the tests cover those sizes using synthetic/mock identities and a fake Sheets backend. They do not prove delivery of real Google email or WhatsApp messages.

Browser runs overwrite review screenshots under `docs/`. Inspect relevant screenshots, then restore unrelated generated image changes before a documentation-only PR. Never restore someone else's work. Keep all browser tests passing even though the current GitHub Actions test job runs only the unit suite. Check GitHub test CI and main Pages deployment; report external Cloudflare preview failures separately and do not claim they passed.

## Backend publication and rollback

If `.gs` changed, merge first, then run **Deploy existing Apps Script** (`apps-script.yml`) from `main`, first with `publish=false`, then with `publish=true`. Use the existing Actions secret and variables; do not read their values. See `docs/AUTOMATED_DEPLOYMENT.md` for details; its initial-setup branch examples are historical, and routine releases must use `main`.

```sh
gh workflow run apps-script.yml --ref main -f publish=false
# Wait for that exact run to succeed, then:
gh workflow run apps-script.yml --ref main -f publish=true
# Wait for publication to succeed, then verify:
gh workflow run apps-script.yml --ref main -f publish=false
```

Confirm the final read-only run reports `Deployed source matches this release: yes`, and record the actual previous/new version numbers and workflow links in `HANDOFF.md`. The previous version is not necessarily the new version minus one. Preserve the existing URL, Script Properties, accounts and database. Do not create a second deployment or blindly republish after an uncertain result. Use the workflow's existing version rollback only when needed and approved for the intended recovery. Documentation-only changes do not require another publication.

## Handoff

Use the owner's established `HANDOFF.md` headings and metadata. State what shipped, files changed, exact test results, merged PRs, live/rollback backend versions, source-match verification, incomplete work, shortcuts and risks. Include known failed external checks and approval boundaries. Add a turn-history row and concrete suggested next tasks. Set `READY` only in the final handoff update when the implementation is merged, tested and published as required.
