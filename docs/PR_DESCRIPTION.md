# Preserve follow-up attempts and longitudinal dosing decisions

Follow-up previously closed on a single “Mark contacted” click. The worklist now opens the passport, where staff save attributed attempts and explicitly complete a documented action. Failed contact stays pending and all attempts remain visible.

Dose history displays immutable regimen snapshots, previous/new schedules and weekly totals, percentage change, reason, INR, next test date and author/timestamps. Authenticated clinician approval is separate from entry and is represented by append-only audit events. Note amendments preserve originals. An additive migration retains the existing database and extends its schema.

The dashboard follows the supplied recall-focused reference. Optional Firebase sign-in, an RS256-verifying Worker and HMAC Apps Script connection are included but disabled by default. Connected mode keeps tokens and records out of localStorage. Setup instructions explicitly retain the existing Sheet.

Validation: 12 automated tests pass; Chromium smoke checks pass at 1366px and 820px for opening patients, failed contact, completion and INR/dose-history saving. Screenshots are included. No live services were configured or deployed and no real patient records were used.

Remaining validation: live Firebase/Cloudflare/Apps Script integration, native iPad Safari/Windows acceptance, operational security and clinical review. The UW source was retrieved; the Anticoagulation Forum URL returned HTML, so advanced nomograms and unverified recommendations are deferred. Sheets has no ACID transactions or tamper-proof audit storage; partial saves need restricted administrator reconciliation. This remains a synthetic-data prototype.
