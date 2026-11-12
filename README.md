# Warfarin Passport

A responsive anticoagulation clinic workspace. **Synthetic patient data only; clinical/security validation is still required.**

GitHub Pages hosts the frontend. The main website opens staff sign-in; the explicit `?mode=demo` preview keeps fictional records locally. Staff sign-in uses Firebase → Cloudflare Worker → signed Apps Script requests → the existing Google Sheet. The modes do not upload or mix records. The public connection configuration is in `config.js`.

## Clinic workspace

- Compact dashboard modeled on the supplied clinic reference: recall list, last contact, attention list, searchable/filterable patient registry, TTR distribution and team handover.
- Patient passport with INR trend, longitudinal regimen history, explicit follow-up completion, preserved unsuccessful attempts, notes/amendments and confirmed tablet counts.
- Focused INR/dose review: assessed clinical context, source-linked UW maintenance reference ranges, conditional hold/recheck guidance, independently entered schedule/weekly total, patient instructions and optional explicit authenticated clinician approval. Suggestions never populate or approve the decision.
- Patient TTR from linear interpolation over the last six calendar months, visible coverage/limitations and provisional-history flags. Clinic mean excludes provisional estimates. See [clinical methods](docs/CLINICAL_METHODS.md).
- Shared authenticated team conversation with patient context, replies, older-history pagination, approved staff identity/time, idempotent sends and append-only audit events. Demo conversation remains local. Refresh is on demand.
- WhatsApp button on the passport; **sending and Arabic/English drafting intentionally remain unconfigured**, as requested.
- Admin-only fixed fictional sample loader; repeated loading preserves existing patients, subsequent edits and prior history.

## Stop copying three Apps Script files

Use the new **Deploy existing Apps Script** workflow. After [one-time Google authorization and GitHub secret/variable setup](docs/AUTOMATED_DEPLOYMENT.md), it can update the existing deployment from approved merges. It retains the existing URL, manifest, other non-conflicting source files, Script Properties and database. A read-only preflight and version rollback are included. The workflow is not active until the owner configures its credential and explicitly enables automatic deployment.

New schema elements are added on the first admin request after backend deployment. Unexpected existing headers stop migration. No database is deleted or recreated; never rerun `setupDatabase` or `bootstrapAdmin` against the existing installation. Original service setup is documented in [deployment settings](docs/DEPLOYMENT.md).

## Development and validation

Serve the repository with `python3 -m http.server 8000`, then open `http://localhost:8000/`. Staff mode is `?mode=connected`; demo is the default.

```sh
node --test tests/*.test.mjs
```

With Playwright and Chromium installed, the `tests/*-browser.cjs` scripts exercise demo/staff mode, authentication errors, sample loading and the redesigned clinical workspace. Set `CHROMIUM_PATH` for a system browser and optionally `TEST_URL`. Browser checks use only synthetic records and mocked staff API responses; never put credentials into tests. Responsive screenshots are in `docs/`.

Pages workflow publishes only explicitly allowlisted frontend assets. Backend deployment runs independently with its private Google authorization. No credential, HMAC key, OAuth refresh token or real patient data belongs in the repository.

## Practical limits

No ACID multi-sheet transactions or tamper-proof spreadsheet storage. Pending encounters/imports remain unavailable until complete; administrator reconciliation may be required after partial writes. Application append-only guards do not prevent Sheet owners from editing cells. Direct editor access, immutable audit export, backups, retention, MFA/revocation, monitoring and security/clinical acceptance remain operational work before any real-patient pilot.

The requested Anticoagulation Forum PDF remains unverified; the new numeric reference is based on the retrieved UW source only. Historical target periods and treatment-interruption exclusions are not yet complete. Native iPad Safari/Windows browser and live multi-account integration acceptance remain necessary even when Chromium tests pass.


Staff setup and the administrator-only pre-live workspace reset are documented in [Staff access](docs/STAFF_ACCESS.md). Fictional records and handovers initialize automatically on an administrator's first sign-in after this release; no sample-loading button is required. The passport displays conditional maintenance-dose reference calculations and urgent review alerts directly; [Clinical methods](docs/CLINICAL_METHODS.md) documents the limits. Reset archives development data from active views and preserves accounts, configuration and history. It does not enable clinical production use.


The task-based staff workflow, reviewed English/Arabic patient messages and separately authorized patient/caregiver portal are described in [Everyday user guide](docs/USER_GUIDE.md). See [Patient-access security](docs/PATIENT_ACCESS_SECURITY.md) for endpoint isolation, consent, approval and reset behavior. Patient sign-in is at `portal.html`; staff must approve an email-to-patient link before access is possible. Patient-submitted INR values require clinical verification and never change a dose automatically.
