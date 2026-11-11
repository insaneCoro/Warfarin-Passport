# Warfarin Passport

Responsive anticoagulation clinic prototype. **Synthetic patients only; not validated for clinical use.**

The default GitHub Pages demo stores fictional records in the browser. Optional connected mode uses Firebase Authentication → Cloudflare Worker → signed Google Apps Script requests → the existing Google Sheet. Connection is disabled in `config.js`; no accounts or services are provisioned by this repository.

## Implemented

- Recall-focused dashboard with patient registry, pending calls, last contact and out-of-range review list. Inspired by the supplied dashboard reference; unsupported TTR/refill metrics are omitted.
- **Open Patient** from the follow-up worklist. Document attempts, clinical actions, notes and a link to a saved INR/dose encounter in the passport. Saving a failed contact never closes the task. Completion is explicit and preserves all attempts and prior tasks.
- Append-only longitudinal regimens with INR, previous/new weekly totals and Sun–Sat schedules, percentage change, reason, author/time and next INR date. Unknown legacy fields stay unknown.
- Separate authenticated clinician approval of a saved decision. Admin/subadmin status does not imply clinical credentials; demo records never receive authenticated signatures.
- Backend append-only audit events for INR entry, dose decisions, note creation/amendment, follow-up attempts/completion and approval. Note amendments append a new note linked to the original.
- Additive migration for the existing Sheets database. No tab, historical row or existing database is deleted/recreated.
- Optional sign-in and in-memory API connection; connected records/tokens are never saved to localStorage. Sessions expire and require sign-in again. Approved staff authorization is checked on every Apps Script request.
- Source-linked conservative clinical review prompts and urgent escalation reminders. Dose suggestions never populate or apply a schedule.

## Clinical reference scope

[UW Medicine warfarin guidance](https://sites.uw.edu/anticoag/drugs/warfarin/) was retrieved on 11 November 2026. It includes individualized targets, maintenance nomograms, interacting drugs and reversal guidance. The application currently provides contextual review prompts rather than implementing its dose nomograms.

The requested [Anticoagulation Forum PDF URL](https://acforum-excellence.org/Resource-Center/resource_files/-2021-02-10-125746.pdf) returned a website HTML response during verification, not a PDF. Its link is retained, but no recommendation is attributed to unverified contents. Integrating and validating that document and advanced nomograms is a subsequent clinical review stage.

## Run and test

Serve this directory with a static HTTP server, e.g. `python3 -m http.server 8000`. Open `http://localhost:8000`.

```sh
node --test tests/*.test.mjs
```

Tests cover dose snapshots/calculations, failed-contact completion, preserved history, identity/approval, disabled-user authorization, signed Firebase tokens and gateway origin rejection. Desktop (1366px) and iPad portrait (820px) Chromium smoke checks exercised patient opening, unsuccessful attempt, successful completion and an INR encounter; screenshots are in `docs/`. These do not replace live Firebase/Worker/Apps Script integration tests or native iPad Safari/Windows browser acceptance.

## Setup and deployment

Follow [the deployment guide](docs/DEPLOYMENT.md). **The existing Sheet must be retained. Run `migrateDatabase`, not `setupDatabase`.** Backend source files are at the repository root, not an `apps-script/` folder.

`.github/workflows/pages.yml` tests pull requests and publishes only explicit public frontend files on pushes to `main`. Choose GitHub Actions in repository Settings → Pages. Merging this branch publishes the synthetic demo if Pages is enabled; it does not deploy the Worker or Apps Script.

## Limits requiring review

Sheets is not an ACID database. A partial encounter is marked `Pending`, excluded from active clinical results/regimens, and requires administrator reconciliation; retries use the same request ID. Never blindly submit a new request ID after an uncertain save. Do not manually mark a partial encounter complete until all records and audits have been verified. Concurrent encounter saves use the patient row version.

The application prevents updates to append-only record types, but Sheet owners can still edit/delete cells: this is **not tamper-proof audit storage**. Restrict direct editor access and establish independent immutable audit export, backups and retention before any clinical pilot. Gateway rate limiting, Firebase revocation checks/MFA, production alerting and full integration/security/clinical validation remain deployment work. No real patient information should be used in this prototype.

To repeat browser smoke checks, install Playwright in your development environment, start the local server and run `node tests/browser-smoke.cjs`. Set `CHROMIUM_PATH` for a system Chromium or use Playwright's installed browser. Optional `TEST_URL` overrides localhost. All browser test inputs are synthetic.
