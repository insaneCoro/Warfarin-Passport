# Manual setup: synthetic integration environment

No Firebase, Cloudflare or Google project has been created or deployed as part of these code changes. Do not enter secrets in chat, source files or commits.

## 1. Existing Google Apps Script and database

1. Back up the existing test Sheet and current Apps Script version. Retain its existing `DATABASE_ID` Script Property. Do **not** run `setupDatabase`, change its ID or create a replacement database.
2. Copy the root `API.gs`, `Database.gs`, `Security.gs` files into the existing Apps Script project.
3. Run `migrateDatabase` from the editor. It appends new columns and the `Followup_Attempts` tab without changing existing rows or columns. Unexpected headers stop migration for manual review. Run it again safely after resolving any mismatch. Confirm row counts and old history match the backup.
4. Restrict direct Sheet editor access. Do not give ordinary staff spreadsheet editing rights. API audit events are append-only in application code, but spreadsheet owners retain the ability to alter them.
5. Set `GATEWAY_HMAC_SECRET` in Script Properties to a locally generated, cryptographically random secret of at least 32 characters. Keep it only here and in Cloudflare secret storage.

## 2. Firebase (you must do this in your account)

1. Create/select a dedicated synthetic test project at https://console.firebase.google.com/.
2. Enable Authentication → email/password. Provision approved test users through the console, with no public registration UI. Establish account provisioning/revocation controls; hiding registration UI alone does not enforce an invitation-only Firebase tenant.
3. Register a Web app and obtain its public Web API key and project ID. These identifiers are not the gateway signing secret. Configure API key restrictions appropriate to Identity Toolkit usage and your deployment.
4. Obtain each user's Firebase UID. For a fresh, empty `Users` tab, set `ROOT_ADMIN_UID` and `ROOT_ADMIN_EMAIL` in Apps Script Properties and run `bootstrapAdmin` once. For an already populated `Users` tab, retain existing users and provision through an authorized administrator; do not bootstrap/reset it.
5. Approved Users roles are `admin`, `subadmin`, `clinician`, with `active=true`. Only `clinician` can approve decisions. An admin is not automatically a clinician. Keep the Firebase UID as the identity; do not type a clinician name as a signature.

## 3. Apps Script Web App and Cloudflare Worker

1. Deploy a new Apps Script Web App version. Centralized storage may require Execute as Me / access Anyone so the Worker can reach it. The endpoint rejects requests unless HMAC, timestamp, nonce and staff allowlist checks pass. Verify these checks against synthetic data before enabling the connection.
2. Copy `gateway/wrangler.toml.example` to ignored `gateway/wrangler.toml`. Fill Firebase project ID, Apps Script `/exec` URL and origin `https://insanecoro.github.io` (no path). Do not place the HMAC secret in that file.
3. Install/use Cloudflare Wrangler in your own environment. From `gateway`, run `npx wrangler login`, `npx wrangler secret put GATEWAY_HMAC_SECRET` (the same secret as Apps Script), then `npx wrangler deploy`.
4. Add Cloudflare rate limits and operational monitoring. Worker verifies Firebase RS256 signature, issuer, audience, expiry and identity against Google's keys. The Apps Script Users allowlist is authoritative for staff authorization. Disable a user there for immediate denial; this prototype does not call Firebase revocation APIs on each request.
5. Enable MFA and organizational controls before considering a clinical pilot. No credentials should be sent to the repository or this conversation.

## 4. Frontend integration

1. Set `config.js`: `enabled:true`, public `firebaseApiKey`, HTTPS `gatewayUrl` from Wrangler. Keep it disabled until the backend is migrated and tested. Only the public configuration belongs in source control.
2. Deploy via Pages workflow. Staff & settings shows sign-in. Sign in with an approved synthetic test account; authentication alone does not grant access unless the Users tab also approves it.
3. No demo records are copied to the server. Register `DEMO-` patients via connected mode. The patient list currently loads at most 200 records: pagination is required for larger cohorts.
4. Verify with two test staff accounts and a clinician account: failed attempt stays pending; completed call retains earlier attempts; changed regimen keeps prior schedule; author/approver are correct; unapproved user and tampered requests are denied; stale row versions fail without overwriting; no connected data or tokens appear in localStorage.
5. Verify time zones and calendar values in Sheets. Set date columns to plain ISO text where appropriate; do not convert stored ISO dates to localized display strings.

## Partial writes and audit limits

Apps Script/Sheets cannot transact across tabs. A Pending encounter signals incomplete saving; linked results/dose plans must not be treated as final. Keep its request ID, inspect all linked rows and audit events under restricted administrator access, repair missing linked records without replacing historical entries, and document reconciliation before marking Complete. Follow-up attempt writes can also partially fail; inspect the saved attempt and audit before retrying or completing manually. Automated repair and tamper-proof external audit export are outstanding production requirements.

## Rollback

Disable `config.js` connection first and redeploy the frontend. Restore the prior Apps Script deployment if necessary. Preserve new columns/tabs and every appended history/audit row; never roll back by deleting clinical history. Keep backups restricted to authorized accounts.

## Load fictional sample patients after sign-in

The administrator can add the same four built-in fictional patients to the connected test database. This is a deliberate database write, not a browser-demo overlay or an upload of edited localStorage records.

1. Update the existing Apps Script project's `API.gs`, `Security.gs` and `Database.gs` from this repository. The new `demo.seed` action requires the updated API and dispatch, and the database helper hides incomplete imports.
2. Save, then choose **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy** for the existing Web App. Keep Execute as Me / access Anyone and the existing `/exec` URL. Keep all existing Script Properties, including `DATABASE_ID` and `GATEWAY_HMAC_SECRET`. No new schema fields are required for this feature; do not run `setupDatabase` or `bootstrapAdmin` again.
3. Refresh the site, choose Staff sign-in and use the approved **admin** account.
4. Open **Staff & settings → Load sample patients** (also reachable through the dashboard's Sample patients button).
5. Open Patients. The four `DEMO-001`–`DEMO-004` fictional patients include six INR results each, one baseline dosing schedule, tablet inventory and a pending follow-up. Historical INR values are linked to an explicitly labelled fixture-import encounter. No earlier dosing schedule or clinician approval is invented. Entries and audits identify the staff member who actually imported them.

Only an authenticated, approved admin can invoke `demo.seed`, and the endpoint accepts only the fixed built-in fixture set. Repeated imports preserve existing samples, subsequent edits, inventory updates, completed calls and clinical history. A different record already using a sample MRN is skipped without changing it. The browser demo remains separate.

If an import fails partway, an incomplete patient has `Importing` status and is unavailable to the ordinary patient workflow. Retry the same Load sample patients operation: deterministic fixture IDs prevent duplicate rows, and original dates and entry attribution are retained. Already completed imports are skipped. Never delete or recreate the database to retry. As with all Sheets operations, recovery after manual cell modifications needs administrator review.

If the site says the sample loader needs an updated Apps Script deployment, the current Web App version still lacks the new action. Update the three files and deploy a new version as above; changing source code alone does not update an existing Web App deployment.
