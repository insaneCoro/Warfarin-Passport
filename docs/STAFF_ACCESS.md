# Administrator and staff access

There is **one sign-in page** for both administrators and clinicians:
https://insanecoro.github.io/Warfarin-Passport/?mode=connected&view=staff

Use the Firebase email/password account approved in the clinic database. The approved role controls access. Browser demo mode has no real administrator account and does not grant access to the database.

## Administrator area

After an approved administrator signs in, the navigation shows **Admin & staff**. That page displays the account's Administrator badge, approved staff list, staff-access form and sample-loader controls. Ordinary staff cannot list or change approved users; authorization is checked in Apps Script.

## Add a staff member

1. As the Firebase project owner, open **Firebase Console → Authentication → Users → Add user** and create the person's email/password account. Keep account passwords private.
2. Copy that person's Firebase User UID.
3. In Warfarin Passport, open **Admin & staff → Add a staff member**.
4. Enter the UID, the same account email, a display name and the intended role. Leave Active access checked, then save.
5. The person signs in through the same Staff sign-in page using their own Firebase credentials.

The app form approves clinic access; it does not create a Firebase account or password. Roles are Administrator (account/settings management), Clinician (clinical approval), and Staff (entry/follow-up). Admin status alone is not a clinician signature. Administrators cannot disable or remove their own administrator access, and the backend protects the final active administrator.

## Sample loading and busy responses

The loader imports at most one patient per API request and reports progress. It resumes incomplete fixtures using deterministic IDs and preserves existing records. Short replay-protection locking is separate from database-write locking for the execute-as-owner Web App. A busy database returns a fixed English message; the client makes a bounded retry only when lock acquisition failed before a mutation began. Never reset or recreate the database to recover from a busy response.
