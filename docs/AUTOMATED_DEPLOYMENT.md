# One-time setup: stop copying Apps Script files

The new **Deploy existing Apps Script** GitHub Actions workflow updates your existing project directly through Google's Apps Script API. It retains the current Web App URL, deployment settings, Script Properties and database. It never runs `setupDatabase` or `bootstrapAdmin`.

This workflow is implemented, but **cannot run until you authorize your own Google account once**. The repository's GitHub connection does not grant access to your Google Apps Script project.

## iPad / Safari: browser-only authorization

Use [Google Cloud Shell](https://shell.cloud.google.com/) under the Google account that owns the existing Apps Script backend. No terminal application is required on the iPad. If the interface is cramped, use Safari’s Request Desktop Website option and landscape orientation. Google documents the standalone browser terminal in its [Cloud Shell launch guide](https://docs.cloud.google.com/shell/docs/launching-cloud-shell).

1. Enable Google Apps Script API at https://script.google.com/home/usersettings.
2. Open Cloud Shell, accept its initial prompt if presented, and wait for the terminal prompt.
3. Run `npx --yes @google/clasp login --no-localhost`. This is clasp’s [supported remote-login flow](https://github.com/google/clasp/blob/master/src/commands/login.ts).
4. Open the authorization link printed by clasp in a separate Safari tab. Sign in with the backend-owner Google account and review/approve the requested permissions.
5. The browser redirects to a localhost URL. With this remote flow, Safari may show that it cannot connect. Copy the **entire resulting address from Safari’s address bar** and paste it into the **Cloud Shell terminal prompt**, not into chat. It contains a temporary authorization code. Clasp validates its state before using it, as implemented in [Google’s remote authorization flow](https://github.com/google/clasp/blob/master/src/auth/serverless_auth_code_flow.ts).
6. Once clasp reports successful login, run `cloudshell edit ~/.clasprc.json` to open the credential file privately in the Cloud Shell editor. Google documents the editor command [here](https://docs.cloud.google.com/shell/docs/using-cloudshell-command). Copy the file contents directly into the repository’s encrypted Actions secret `CLASPRC_JSON` using a separate GitHub tab. Do not paste the credential here, commit it, or include it in a screenshot.
7. Add the two Actions variables and perform the read-only preflight / first publication below. The same workflow then works from your iPad through GitHub’s website.

If Google blocks authorization or the browser terminal is unavailable, stop and report the non-sensitive error text; never work around a Google account-policy restriction or share a sign-in URL/credential for someone else to complete it.

## One-time authorization (Windows or another computer)

1. Open https://script.google.com/home/usersettings under the Google account that owns the existing backend. Enable **Google Apps Script API**.
2. Install Node.js 22 or later from https://nodejs.org/ if needed. In PowerShell/Terminal, run:

   ```sh
   npx @google/clasp login
   ```

   Complete Google's sign-in and authorize your backend-owner account. This creates a private `.clasprc.json` credential file in your user home directory. See [Google's clasp guide](https://developers.google.com/apps-script/guides/clasp).
3. In Windows File Explorer, open `%USERPROFILE%`, then open `.clasprc.json` locally with Notepad. **Do not upload or commit this file, paste it into chat, or send a screenshot of its contents.**
4. On GitHub, open the Warfarin-Passport repository → **Settings → Secrets and variables → Actions → New repository secret**. Name it **`CLASPRC_JSON`** and paste the file contents directly into GitHub's secret field. Save. This credential authorizes backend-code deployment; restrict repository write access and revoke/rotate it if needed.
5. Under the same Actions settings, open **Variables** and add:

   | Variable | Where to find the value |
   | --- | --- |
   | `APPS_SCRIPT_ID` | Existing Apps Script project → Project Settings → **Script ID**. This is not the deployment ID or database ID. |
   | `APPS_SCRIPT_DEPLOYMENT_ID` | Existing `/exec` URL: copy the part between `/s/` and `/exec`, starting `AKfy…`. |

   Keep the existing Web App deployment configured as Execute as Me / access Anyone so the signed Worker can reach it. Do not create a replacement project or database.

## First deployment from GitHub

After this workflow has been merged into `main`:

1. Open repository **Actions → Deploy existing Apps Script → Run workflow**.
2. Keep **Publish** unchecked for a read-only preflight. The workflow checks account access, confirms the deployment belongs to the selected project and validates the existing manifest/source layout. It does not change code or data.
3. Once that succeeds, run the workflow again with **Publish** checked. It updates the managed `API`, `Database` and `Security` source files, retains other non-conflicting project files and the existing manifest, creates a version, and updates the same deployment ID. A duplicate unmanaged function (for example a second old `doPost` in `Code.gs`) stops deployment for manual review rather than silently deleting it.
4. Sign out and back in as the approved **admin** account. New tabs/columns are added automatically on that admin request. Unexpected schema headers stop migration; existing rows are never deleted or reordered. Staff & settings should show backend release **`clinic-workspace-v1`**.
5. Test clinician team messages using synthetic data. Normal staff accounts can then use the new schema.

## Future updates: no file copying

Add the Actions repository variable **`APPS_SCRIPT_AUTO_DEPLOY` = `true`** after the first deployment succeeds. Merges to `main` that change backend source then run the tested deployment workflow automatically. Frontend-only changes continue through Pages and do not redeploy Apps Script. No Google credential or HMAC signing key belongs in source control.

The workflow's optional `apps-script` GitHub environment can use your organization's normal deployment protections. No additional approval gate is required by the code.

## Failure and rollback

- If preflight fails, active code stays unchanged.
- If content upload succeeds but version/deployment publication fails, the previous deployed Web App version remains active unless Google's deployment update completed. Inspect the deployment version before retrying after an uncertain network failure.
- The workflow prints previous/new version numbers, never credentials. It temporarily backs up remote source in the private runner's temporary directory; no source/credential backup is published as a public artifact. Existing immutable Apps Script versions are the persistent rollback path.
- To restore an existing deployment version, run the workflow with **Publish** checked and **rollback_version** set to that version. This switches the Web App version without deleting new database columns, messages or historical rows. Reconcile schema compatibility if rolling back an application version that predates a migration.
- Do not edit the three managed source files manually after enabling automation; merges become their source of truth. Other non-conflicting project files and the manifest are preserved.

## What this does not configure

Firebase accounts, Cloudflare runtime secrets and patient records remain separate. The deployment tool does not read/write the Sheet, change `DATABASE_ID`/`GATEWAY_HMAC_SECRET`, or create a new Web App endpoint. The runtime admin migration only adds missing schema elements to the existing database.
