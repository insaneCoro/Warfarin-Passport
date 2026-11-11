# Warfarin Passport

**Virtual warfarin clinic prototype — synthetic data only.**

Repository target: https://github.com/insaneCoro/Warfarin-Passport

This starter project includes a responsive GitHub Pages demo, a Google Apps Script backend that provisions a Google Sheets database, and a Cloudflare Worker gateway for Firebase-authenticated requests. **These components are not yet deployed or connected, and they have not undergone clinical/security validation.**

## What works now

The browser demo (`index.html`, `app.js`, `styles.css`, `date-utils.mjs`) supports:

- Search fictional patients by `DEMO-` MRN, name, or telephone number
- Register synthetic patients with required MRN, name, DOB and diagnosis
- View chronological INR trend against a patient-specific target range
- Enter a result, seven-day clinician-confirmed dose schedule, and note
- Automatically schedule a routine call **two calendar days after the next INR test**
- Mark follow-up calls completed, update confirmed patient tablet counts, and add notes
- Restore demo records on refresh from local browser storage, or reset fictional records

**Important:** The demo has no real authentication. Browser storage is **not** a medical-record database. Never enter real names, MRNs, phone numbers, diagnoses or other health information in the demo.

## Suggested sequence

### A. Publish the demo on GitHub Pages (no real patient data)

1. Upload project files to the `main` branch of `insaneCoro/Warfarin-Passport`, preserving folder paths.
2. On GitHub go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. GitHub Actions workflow `.github/workflows/pages.yml` publishes **only** the four public frontend files, not backend source or config.
4. Expected demo website (after Pages is successfully enabled): `https://insanecoro.github.io/Warfarin-Passport/`.
5. Open that URL on iPad or Windows. It is a synthetic-data demo, not the production clinic.

### B. Create the Google Sheets database automatically

1. Visit https://script.google.com and create a new **standalone Apps Script project** titled `Warfarin Passport Backend` under the authorized organizational account.
2. In the Apps Script editor, create 3 `.gs` files and copy the source files from `apps-script/` into `Database.gs`, `Security.gs`, and `API.gs` (the editor may default to `Code.gs`, which you can rename).
3. Select function `setupDatabase` and run it **once**, authorizing the requested Google Sheets and Drive scopes. It creates one new empty Google Sheet with all linked tabs and saves its ID as the `DATABASE_ID` Script Property.
4. Find the database in Drive (`Warfarin Passport — Prototype Database`). Restrict sharing to approved staff. The Google Sheet is initially empty; no patient records are generated.
5. In the [Firebase Console](https://console.firebase.google.com/), create an authentication project and provision your first test staff user. Copy the **Firebase UID** from Authentication → Users. In Apps Script **Project Settings → Script properties**, set `ROOT_ADMIN_UID` and `ROOT_ADMIN_EMAIL` to your test user. Run `bootstrapAdmin` **once**.
6. Do **not** deploy the backend openly until the gateway is configured and tested. Scripts are source code, not a live database connection until you do these steps.

### C. Configure the protected API gateway

1. Set up Firebase Authentication. For the first prototype, use approved test accounts and password sign-in, and disable public self-registration. Real user provisioning and account revocation require an approved procedure.
2. In Apps Script project settings, set `GATEWAY_HMAC_SECRET` to a cryptographically random secret of at least 32 characters. Generate this in your own environment; **do not paste it into ChatGPT or GitHub**.
3. Deploy Apps Script as a Web App. For centralized sheet access, it may need **Execute as: Me** and **Who has access: Anyone** so the Worker can call it; this is acceptable **only after the gateway security has been reviewed and verified**, because that grants the endpoint owner privileges. The gateway HMAC checks, allowlist, auditing, and rate limiting need a security review before actual clinical use.
4. Copy `gateway/wrangler.toml.example` to `gateway/wrangler.toml` and fill only non-secret values. Keep the Apps Script URL in Worker configuration. Set `ALLOWED_ORIGIN=https://insanecoro.github.io` (origin only; no `/Warfarin-Passport/` suffix).
5. From the `gateway` directory, run `npm install` and `npx wrangler secret put GATEWAY_HMAC_SECRET`; paste **the same secret** as in Apps Script, then `npx wrangler deploy`.
6. The gateway verifies Firebase ID tokens (RS256, Firebase project audience/issuer), signs the data envelope with HMAC-SHA256, and forwards it to Apps Script. Apps Script checks the HMAC, timestamp/nonce, and approved Users table role before data access.
7. **The browser demo is intentionally not yet wired to this gateway.** Integrating Firebase login and live API calls is the next development milestone. Do not claim a secure clinic login is functional at this stage.

### D. First live integration milestone

Implement: Firebase login view, `auth.me`, patients list/create, patient get, encounter save, follow-ups, stock update. Use **synthetic records only** until organizational security and clinical approvals are complete. Confirm each actor is allowed in the Apps Script `Users` sheet. Admin provisioning requires both Firebase account creation and an authorized `users.upsert` operation in the backend.

## Database schema

`setupDatabase()` creates these tabs:

| Tab | Purpose |
| --- | --- |
| `Patients` | MRN, demographics, diagnosis, target INR, enrollment, row version |
| `INR_Results` | Time-stamped INR result history |
| `Encounters` | Clinical review/notes, next INR, idempotency key |
| `Dose_Plans` | Seven daily doses and total weekly dose |
| `Follow_Ups` | INR check dates, routine calls (+2 calendar days), completion |
| `Inventory` | Confirmed patient-held tablet count by strength |
| `Inventory_Log` | Stock adjustment history |
| `Clinical_Notes` | Attributed, dated clinician notes |
| `Users` | Approved Firebase UID, email, role, active status |
| `Audit_Log` | Dated actions and actors |

MRN uniquely identifies a patient clinically, while internal immutable UUIDs link records between tabs. `Patients.rowVersion` supports optimistic concurrency, with a server-side write lock for critical mutations. Encounters are append-only; failed multi-sheet transactions can leave an encounter as `Pending` and require reconciliation.

## Backend operations

- `auth.me`
- `patients.list`, `patients.get`, `patients.create`, `patients.update`
- `encounters.create`
- `followups.list`, `followups.complete`
- `inventory.set`, `notes.create`
- `users.list`, `users.upsert` (admin-only)

Request envelope: a POST to the gateway with `{ "action":"patients.list", "params":{"query":"DEMO-"} }`, `Authorization: Bearer <Firebase ID token>`, and the allowed `Origin`. The gateway forwards a timestamped HMAC-authenticated payload to Apps Script. No client can send a trusted UID or role directly to Apps Script.

## Clinical and information-security limitations

- No automatic dose adjustment, INR treatment recommendation, or universal critical-INR threshold. Abnormal results need qualified clinician review and locally approved escalation rules.
- The two-day call scheduling rule **must not delay urgent INR/bleeding escalation**.
- This prototype does not include tested emergency alerts, MFA enforcement, end-to-end audit immutability, rate limits, monitored backups, retention policies, change management, or validated disaster recovery.
- A shared spreadsheet is **not an inherently compliant clinical database**; production use needs Saudi health-data residency, PDPL, organizational approval, appropriate Google contracts, access control, and technical risk review.
- GitHub Pages itself is public and suitable only for static frontend assets, never private records or credentials.
- The Apps Script Content Service uses a redirect for responses; the Worker follows it server-side.
- Script quotas, Sheets concurrency, and lack of multi-table ACID transactions make this starter inappropriate for high-volume clinical production without further validation/redesign.

## Testing

Run frontend calendar tests:

```bash
node --test tests/*.test.mjs
```

For production, add backend unit/integration tests, security pen testing, and clinician-approved test cases before a pilot with real patients.
