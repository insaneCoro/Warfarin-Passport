# Administrator and staff access

There is **one sign-in page** for both administrators and clinicians:
https://insanecoro.github.io/Warfarin-Passport/?mode=connected&view=staff

The main website opens this same staff sign-in page. Use your approved clinic account. The approved role controls access. The isolated `?mode=demo` browser preview has no real administrator account and does not grant access to the database.

## Administrator area

After an approved administrator signs in, the navigation shows **Admin & staff**. That page displays the account's Administrator badge, approved staff list, staff-access form and administrator-only reset control. Ordinary staff cannot list or change approved users; authorization is checked in Apps Script.

## Add a staff member

1. Sign in as an administrator and open **Admin & staff → Add a staff member**.
2. Enter their email, display name and role. Leave Active access checked, then save.
3. Share the staff sign-in URL at the top of this guide with them. Saving access does not send an invitation email automatically.
4. The staff member enters that email and their own password (at least 12 characters), then selects **Create my account**.
5. They open the verification email and verify their address, then return to the app and **Sign in**.

No Firebase console, User UID or shared password is needed. If the person already has an account, they can sign in after email verification; use **Resend verification email** or **Reset password** on the same page when needed. Firebase remains the authentication provider behind the scenes. Verification and password-reset emails are sent by Firebase; check spam if necessary. Existing approved accounts remain supported.

New accounts do not receive clinic access by signing up. Apps Script binds one active email approval to one verified Firebase UID, using only the signed gateway identity. A second UID cannot claim that approval. Disabling staff access blocks clinic requests even if a Firebase session remains valid. Account role and acceptance events record authenticated actors in the audit log. Invitation rows use `invite:` identifiers in the existing Users schema and become bound UIDs on first verified login; no database is recreated.

Roles are Administrator (account/settings management), Clinician (clinical approval), and Staff (entry/follow-up). Admin status alone is not a clinician signature. Administrators cannot disable or remove their own administrator access, and the backend protects the final active administrator.

## Fictional workspace and reset

After an administrator signs in, the app prepares seven fixed fictional patients and labelled team handovers automatically, one patient per request. Previously entered records and edits are preserved. Ordinary staff never invoke initialization. A preparation error is shown in Admin & staff with a retry control. There is no Load sample patients button.

**Reset development workspace** is available only to authenticated administrators. It requires typing `RESET DEVELOPMENT DATA` and checking the archival confirmation. It starts a fresh, empty active workspace, disables further automatic fixtures, and signs the browser out. Existing Users, credentials, configuration and immutable clinical/audit history remain intact. Staff sign in again; reset does not remove administrators or require recreating Firebase accounts.

Reset appends request/completion audit events and changes the private `CLINIC_WORKSPACE` setting. Additive `workspaceId` columns on Patients and Team_Messages scope active views; legacy rows with blank scope remain in the initial workspace. Child clinical records remain attached to their original patients and cannot be accessed through active patient endpoints after reset. Old form submissions are rejected after a workspace change. No spreadsheet or tab is deleted, and no historical dose is overwritten. Archive rows remain inspectable by the database owner in the existing Sheet; this is not a data-erasure function. Reset does not enable real-patient use or remove the synthetic-identifier guard.

A busy database returns a fixed English message with a bounded retry only when lock acquisition failed before mutation began. Never recreate the database to recover from a busy response.

## Deployment

Deploy the Worker change along with Apps Script and the frontend. The Worker must forward `emailVerified` from the verified Firebase token claim (`email_verified === true`); browser parameters never supply it. An older Worker cannot accept new email approvals, but existing UID approvals still work. Use the existing backend deployment workflow and Cloudflare repository deployment; no new credentials or service account are required. Firebase Email/Password authentication and email templates remain configured in the existing project. Test the complete email-delivery flow with synthetic staff before clinical use.

## Login and tab recovery

A ready workspace is reported with the authenticated account response, so normal sign-in skips fictional initialization. Preparation is independent of application release numbers and only resumes when unfinished. Patient details load with at most three concurrent requests. An interrupted read has a bounded retry; an uncertain mutation is never automatically repeated. A transient initial data-read failure keeps the authenticated session and shows Refresh clinic rather than forcing another sign-in. Tokens renew through Firebase Secure Token using an in-memory refresh token; tokens and patient data are not persisted to browser storage. Returning from a background tab refreshes clinical views when no form is open. If iPadOS fully discards the page, signing in again is still required.
