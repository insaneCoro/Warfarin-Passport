# Warfarin Passport

An anticoagulation (warfarin) clinic workspace for staff: patient registry, INR results and dosing history,
follow-ups, team messages and reviewed patient messages.

> **Synthetic data only.** This is a development system. It has not had clinical or security validation and
> must not hold real patient information.

## How it fits together

```
Browser (GitHub Pages, app/)
   │  Firebase sign-in → ID token
   ▼
Cloudflare Worker (gateway/)        verifies the token, signs the request (HMAC)
   ▼
Google Apps Script (backend/)       checks signature + staff role, reads/writes the Google Sheet
   ▼
Google Sheet (existing database)
```

## Repository layout

| Folder       | What it is                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `app/`       | Frontend published to GitHub Pages (`index.html`, `css/`, `js/`)           |
| `backend/`   | Apps Script source: `API.gs`, `Database.gs`, `Security.gs`                 |
| `gateway/`   | Cloudflare Worker that sits between the browser and Apps Script            |
| `scripts/`   | Deployment tooling for the existing Apps Script project                    |
| `tests/`     | `unit/` (Node), `browser/` (Playwright), `helpers/` (fake Google Sheet)    |
| `docs/`      | Guides and `screenshots/`                                                  |
| `.github/`   | CI: tests, browser tests, Pages publish, Apps Script deploy                 |

The root `index.html` only forwards to `app/`.

## Development

```sh
npm ci                      # installs Playwright + Prettier (dev only)
npm run serve               # http://localhost:8000/  (demo mode; staff mode: ?mode=connected)
npm test                    # unit tests
npm run test:browser        # browser tests (desktop, iPad, phone)
npm run format              # format code; CI fails on unformatted code
```

`npm run test:browser -- --update-screenshots` refreshes `docs/screenshots/`; otherwise screenshots go to a
temporary folder. Set `CHROMIUM_PATH` to use a system Chromium.

## Deployment

- **Frontend:** every merge to `main` runs the tests and publishes `app/` to GitHub Pages.
- **Backend:** the **Deploy existing Apps Script** workflow updates the existing deployment from `main`
  (read-only check first, then publish). See [automated deployment](docs/AUTOMATED_DEPLOYMENT.md).
  Never re-run `setupDatabase` or `bootstrapAdmin` against the existing installation.
- **Gateway:** Cloudflare Workers Builds deploys `gateway/` from `main`.

No credential, signing key, OAuth token or real patient data belongs in this repository.

## Documentation

- [Everyday user guide](docs/USER_GUIDE.md)
- [Staff access and administration](docs/STAFF_ACCESS.md)
- [Clinical methods (TTR, dose references)](docs/CLINICAL_METHODS.md)
- [Automated deployment](docs/AUTOMATED_DEPLOYMENT.md) · [First-time setup](docs/DEPLOYMENT.md)
- [Rules for AI agents](AGENTS.md) · [Current handoff](HANDOFF.md)

## Known limits

- Google Sheets has no multi-sheet transactions; a partial save may need administrator reconciliation.
  App-level append-only guards do not stop Sheet owners from editing cells directly.
- Dose suggestions are conditional UW maintenance references, not prescriptions. Clinical review, escalation
  protocols, backups, retention, MFA and monitoring are still required before any real-patient use.
- WhatsApp opens a staff-reviewed draft; nothing is sent automatically.
