# Administrator and staff access

There is **one sign-in page** for both administrators and clinicians:
https://insanecoro.github.io/Warfarin-Passport/?mode=connected&view=staff

Use the Firebase email/password account approved in the clinic database. The approved role controls access. Browser demo mode has no real administrator account and does not grant access to the database.

## Administrator area

After an approved administrator signs in, the navigation shows **Admin & staff**. That page displays the account's Administrator badge, approved staff list, staff-access form and sample-loader controls. Ordinary staff cannot list or change approved users; authorization is checked in Apps Script.

## Add a staff member

1. Sign in as an administrator and open **Admin & staff → Add a staff member**.
2. Enter their email, display name and role. Leave Active access checked, then save.
3. Share the staff sign-in URL at the top of this guide with them. Saving access does not send an invitation email automatically.
4. The staff member enters that email and their own password (at least 12 characters), then selects **Create my account**.
5. They open the verification email and verify their address, then return to the app and **Sign in**.

No Firebase console, User UID or shared password is needed. If the person already has an account, they can sign in after email verification; use **Resend verification email** or **Reset password** on the same page when needed. Firebase remains the authentication provider behind the scenes. Verification and password-reset emails are sent by Firebase; check spam if necessary. Existing approved accounts remain supported.

New accounts do not receive clinic access by signing up. Apps Script binds one active email approval to one verified Firebase UID, using only the signed gateway identity. A second UID cannot claim that approval. Disabling staff access blocks clinic requests even if a Firebase session remains valid. Account role and acceptance events record authenticated actors in the audit log. Invitation rows use `invite:` identifiers in the existing Users schema and become bound UIDs on first verified login; no database is recreated.

Roles are Administrator (account/settings management), Clinician (clinical approval), and Staff (entry/follow-up). Admin status alone is not a clinician signature. Administrators cannot disable or remove their own administrator access, and the backend protects the final active administrator.

## Sample loading and busy responses

The loader imports at most one patient per API request and reports progress. It resumes incomplete fixtures using deterministic IDs and preserves existing records. Short replay-protection locking is separate from database-write locking for the execute-as-owner Web App. A busy database returns a fixed English message; the client makes a bounded retry only when lock acquisition failed before a mutation began. Never reset or recreate the database to recover from a busy response.

## Deployment

Deploy the Worker change along with Apps Script and the frontend. The Worker must forward `emailVerified` from the verified Firebase token claim (`email_verified === true`); browser parameters never supply it. An older Worker cannot accept new email approvals, but existing UID approvals still work. Use the existing backend deployment workflow and Cloudflare repository deployment; no new credentials or service account are required. Firebase Email/Password authentication and email templates remain configured in the existing project. Test the complete email-delivery flow with synthetic staff before clinical use.
