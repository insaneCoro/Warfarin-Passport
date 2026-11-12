# Warfarin Passport: everyday use

This development release uses fictional records only. The clinic and patient pages share the existing authenticated API and database; the isolated browser preview is still separate.

## Staff: the short workflow

1. The main website opens a standalone staff/administrator login screen. Clinic navigation appears only after sign-in; logging out clears the patient view and returns to that screen. Sign in with your approved clinic account. **What needs doing today?** shows INR tests due, results waiting for review, patients waiting to be informed, and patient requests. Urgent clinical results appear above these tasks. Patient-reported concerning values have a separate **unverified** warning.
2. Open a patient. The **Next steps** panel shows progress. The **Current clinician-approved care plan** is separate from conditional reference suggestions and historical regimens.
3. **Enter a new INR** opens three steps: result/safety checks, dosing decision, and instructions/next test. Nothing from a reference is automatically prescribed. Staff choose the actual daily schedule and document the reason. Daily doses must equal the weekly total.
4. **Save draft care plan** stores the entry without a clinician signature. Staff can **Request clinician review**, which posts an attributed review request to the clinic team. Only an authenticated clinician can explicitly approve the saved plan. Administrator status alone cannot approve a clinical decision.
5. Choose **INR reminder** or **Prepare care-plan message**. A care-plan draft requires the latest result to have an approved plan. Choose English or Arabic and review the preview. Arabic hold/instruction text must have been entered and approved with the clinical plan; the app does not invent translations of clinical instructions.
6. Check the recipient, language, schedule, holds and dates. **Open WhatsApp** opens a draft; staff must press Send in WhatsApp themselves. If opening is blocked, the preview can be selected and copied manually through the clinic's approved process. Opening WhatsApp is not proof of sending or delivery.
7. If the plan or recipient changed after preparation, prepare a fresh message. A failed historical attempt can still be recorded. Recording an actual past send against an outdated draft requires the explicit historical confirmation and a note; it does not approve that old plan as current.

Record the real outcome: **Not sent**, **Sent manually**, or **Failed contact**. This does not close follow-up. Once the patient is actually informed, use **Record patient informed / contact attempt**, document actions and the relevant saved encounter, then explicitly complete that task. Failed contact remains pending.

Messages are reminders and approved plans, not automated prescriptions or guaranteed delivery notifications. The next INR is arranged at the patient's PHC laboratory. Date-change requests do not change the approved date automatically.

## Communication preferences

In the patient passport, open **Communication preferences**. Choose the preferred language and method, confirm the actual telephone number, and record patient consent for clinical messaging. Saudi local mobile numbers can be entered with the explicit Saudi +966 country selection; other countries need the full international + number.

Tablet counts appear only if staff explicitly confirm the tablet strength. The display supports exact whole/half-tablet combinations; otherwise it tells staff/patients to confirm the tablet combination. Doses always remain in mg. Reconfirm these preferences when the patient changes telephone number or tablets.

## Patient and caregiver setup

1. An administrator signs in once after this release to apply the additive database migration. No Google Sheet or tab is deleted.
2. Administrators can set English/Arabic clinic names and the international contact number in **Admin & staff → Clinic contact details**. Configuration survives a development workspace reset.
3. An administrator or clinician opens the patient's **Patient / caregiver access**. Confirm identity and consent through the clinic's process, then add the person's own email and access type. Caregivers have their own account and require the patient's explicit authorization; they do not share a patient password.
4. Share `https://insanecoro.github.io/Warfarin-Passport/portal.html`. The person selects **Create my account**, sets their own password (at least 12 characters), verifies the email, then signs in. Existing accounts can use the same page. No Firebase-console work or User UID copying is required.
5. Test with fictional patients first. Staff can remove access from the same patient screen; removal blocks future portal API requests, even if an authentication token remains valid.

Only linked passports are visible. The portal never offers patient dose editing or approval. It shows the last clinician-approved plan, its date/approver, approved instructions, the next PHC test date, and reviewed INR measurements. If a newer result is awaiting review, that is labelled clearly; an unapproved draft is never displayed as a prescription.

Patients/caregivers can submit a measured INR with test date and PHC lab name, ask a question, or request another test date. These are structured submissions, not lab-report file attachments. Submissions do not change clinical INR history or doses by themselves. Staff check the source, enter the actual result and obtain clinical approval before a clinician links the matching encounter as verified. A clinician can request correction of an inaccurate submission with a documented reason, without fabricating a verified result.

Replies appear in the submitting account's own thread. Caregiver access to a care plan does not automatically expose another account's private questions. Questions are not an emergency service. Serious bleeding or head injury requires emergency assessment.

## iPad and language

Large touch targets and responsive layouts support iPad, phone and Windows. The staff language switch translates common navigation/actions and enables RTL layout. Source clinical guidance and free-text notes remain in their original language; they are not automatically translated. The patient interface and standard messages support English and Arabic. Unfinished patient requests stay in memory when switching languages or refreshing; no patient health information is stored in local browser storage.

Normal staff login skips completed fictional initialization. Read requests can recover from temporary connection errors and authentication tokens renew in memory. Open forms remain intact on tab return; uncertain writes are not blindly retried. If iPadOS fully discards a page, sign in again. A full page discard can also lose unsaved, in-memory form edits.

New patient-reported INR values must be checked before a routine care-plan draft is sent. Concerning readings appear as unverified triage alerts; contact/verify promptly rather than waiting for a routine reminder. Patient portal submissions contain the measured value, date and PHC laboratory, not uploaded image/PDF attachments.


## New staff who already verified their email

Ask them to sign in again on the new main login page. A verified person without clinic access gets **Waiting for administrator approval**, not a patient workspace. Their request appears under **Admin & staff → Staff awaiting approval**. Confirm their identity, enter their name, choose their role and approve. They select **Check my access** to enter; no account recreation or Firebase-console work is needed. Existing administrators can also invite staff directly by email. Email verification alone never grants clinical access. Declined/disabled accounts cannot approve themselves.
