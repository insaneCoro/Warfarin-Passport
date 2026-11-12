import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { storage } from '../helpers/sheets.mjs';
import { buildPatientMessage } from '../../app/js/care-messages.mjs';
import { careStatus, todayTasks } from '../../app/js/care-ui.mjs';
const admin = { uid: 'clinic-admin', role: 'admin', displayName: 'Clinic admin' },
  doctor = { uid: 'real-doctor', role: 'clinician', displayName: 'Dr Synthetic' },
  staff = { uid: 'staff', role: 'subadmin' };
function setup() {
  const b = storage(),
    c = b.c;
  c.plusCalendarDays_ = (iso, n) => {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  c.append_('Users', { firebaseUid: admin.uid, email: 'admin@example.test', active: true, role: 'admin' });
  c.append_('Users', {
    firebaseUid: doctor.uid,
    email: 'doctor@example.test',
    active: true,
    role: 'clinician',
    displayName: doctor.displayName,
  });
  c.append_('Patients', {
    id: 'p1',
    mrn: 'DEMO-101',
    name: 'Fictional person',
    status: 'Active',
    rowVersion: 1,
    targetLow: 2,
    targetHigh: 3,
    phone: '+966500000001',
  });
  c.append_('Patients', {
    id: 'p2',
    mrn: 'DEMO-102',
    name: 'Other fictional person',
    status: 'Active',
    rowVersion: 1,
  });
  return b;
}
function encounter(c, inr = 2.5, approve = true) {
  const p = c.requirePatient_('p1');
  const saved = c.encounterCreate_(
    {
      patientId: 'p1',
      expectedVersion: p.rowVersion,
      requestId: 'request-' + Math.random().toString(16).slice(2).padEnd(20, '0'),
      testDate: '2026-11-12',
      nextInrDate: '2026-11-19',
      inr,
      daily: [5, 5, 5, 5, 5, 5, 5],
      reason: 'Fictional reviewed decision',
      note: 'PRIVATE_INTERNAL_NOTE',
    },
    staff,
  );
  if (approve) c.decisionApprove_({ encounterId: saved.id }, doctor);
  return saved.id;
}
function invite(c, kind = 'patient') {
  c.patientAccessSave_(
    {
      patientId: 'p1',
      email: 'person@example.test',
      displayName: 'Fictional person',
      kind,
      confirmConsent: true,
    },
    admin,
  );
  return { uid: 'verified-person', email: 'person@example.test', emailVerified: true };
}
test('patient and caregiver access require verified email and staff-approved consent, and cannot cross patients or become staff', () => {
  for (const kind of ['patient', 'caregiver']) {
    const { c } = setup();
    assert.throws(
      () =>
        c.patientAccessSave_(
          { patientId: 'p1', email: 'x@example.test', displayName: 'X', kind, confirmConsent: true },
          staff,
        ),
      /clinician/,
    );
    assert.throws(
      () => c.patientAccessSave_({ patientId: 'p1', email: 'x@example.test', displayName: 'X', kind }, admin),
      /consent/,
    );
    const identity = invite(c, kind);
    assert.throws(() => c.portalDispatch_('portal.me', {}, { ...identity, emailVerified: false }), /Verify/);
    assert.throws(() => c.portalDispatch_('portal.passport', { patientId: 'p2' }, identity), /denied/);
    assert.throws(() => c.dispatch_({ action: 'patients.list', params: {}, user: identity }), /not approved/);
    const me = c.portalDispatch_('portal.me', {}, identity);
    assert.equal(me.links.length, 1);
    assert.equal(me.links[0].kind, kind);
    assert.throws(
      () => c.portalDispatch_('portal.decisions.approve', { patientId: 'p1' }, identity),
      /not permitted/,
    );
    c.patientAccessSave_(
      { patientId: 'p1', email: identity.email, displayName: 'Fictional person', kind, active: false },
      admin,
    );
    assert.throws(() => c.portalDispatch_('portal.me', {}, identity), /No active/);
  }
});
test('portal exposes approved plans and reviewed results only, never internal notes, suggestions or staff records', () => {
  const { c } = setup(),
    id = invite(c);
  encounter(c, 2.5, true);
  encounter(c, 4, false);
  const r = c.portalDispatch_('portal.passport', { patientId: 'p1' }, id);
  assert.equal(r.plan.inr, 2.5);
  assert.equal(r.plan.approvedByName, doctor.displayName);
  assert.equal(r.results.length, 1);
  assert.equal(r.awaitingReview, true);
  assert.ok(!JSON.stringify(r).includes('PRIVATE_INTERNAL_NOTE'));
  assert.ok(!JSON.stringify(r).includes(doctor.uid));
  assert.throws(
    () => c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'en' }, staff),
    /latest result/,
  );
});
test('patient INR submissions are idempotent and unverified; only a clinician can link a matching approved encounter', () => {
  const { c } = setup(),
    identity = invite(c);
  const request = {
    patientId: 'p1',
    requestId: '1234567890123456',
    kind: 'inr',
    inr: 3,
    testDate: '2026-11-12',
    lab: 'Synthetic PHC laboratory',
    details: 'Synthetic',
    status: 'Verified',
    createdBy: 'forged',
  };
  const created = c.portalDispatch_('portal.request', request, identity);
  c.portalDispatch_('portal.request', request, identity);
  assert.equal(c.allRows_('Patient_Requests').length, 1);
  assert.equal(c.allRows_('INR_Results').length, 0);
  const r = c.allRows_('Patient_Requests')[0];
  assert.equal(r.status, 'Awaiting review');
  assert.equal(r.createdBy, identity.uid);
  assert.throws(() => c.patientRequestVerify_({ id: created.id }, staff), /Clinician/);
  const wrong = encounter(c, 2.5, true);
  assert.throws(() => c.patientRequestVerify_({ id: created.id, encounterId: wrong }, doctor), /matching/);
  const matching = encounter(c, 3, true);
  c.patientRequestVerify_({ id: created.id, encounterId: matching }, doctor);
  assert.equal(c.allRows_('Patient_Requests')[0].verifiedBy, doctor.uid);
  assert.equal(c.allRows_('Patient_Requests')[0].status, 'Verified');
  assert.throws(() => c.portalDispatch_('portal.request', { ...request, inr: 4 }, identity), /collision/);
});
test('date changes and secure questions do not modify appointments or dosing; replies stay in the correct patient and author scope', () => {
  const { c } = setup(),
    id = invite(c);
  encounter(c);
  const r = c.portalDispatch_(
    'portal.request',
    {
      patientId: 'p1',
      requestId: '1234567890123456',
      kind: 'appointment',
      requestedDate: '2026-11-20',
      details: 'Fictional date request',
    },
    id,
  );
  c.patientRequestReply_(
    {
      id: r.id,
      requestId: '2234567890123456',
      body: 'We will contact you to confirm. Your approved date is unchanged.',
    },
    staff,
  );
  const passport = c.portalDispatch_('portal.passport', { patientId: 'p1' }, id);
  assert.equal(passport.plan.nextDate, '2026-11-19');
  assert.equal(passport.requests[0].replies.length, 1);
  assert.equal(c.allRows_('Follow_Ups')[0].status, 'Pending');
  assert.equal(c.portalPassport_({ patientId: 'p1' }, { uid: 'another-person' }).requests.length, 0);
});
test('bilingual drafts come from approved data and outcomes cannot forge message text or close follow-up', () => {
  const { c } = setup();
  assert.throws(
    () => c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'en' }, staff),
    /approved/,
  );
  encounter(c);
  c.communicationPreferences_(
    {
      patientId: 'p1',
      expectedVersion: c.requirePatient_('p1').rowVersion,
      language: 'ar',
      contactMethod: 'whatsapp',
      phone: '+966500000001',
      consent: true,
      phoneVerified: true,
    },
    staff,
  );
  const draft = c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'ar' }, staff);
  assert.ok(draft.body.includes('5 ملغ يوميًا'));
  assert.ok(draft.body.includes('الرعاية الصحية الأولية'));
  assert.equal(draft.canWhatsApp, true);
  assert.throws(
    () => c.communicationRecord_({ draftId: draft.id, outcome: 'Sent manually' }, staff),
    /Review/,
  );
  c.communicationRecord_(
    { draftId: draft.id, outcome: 'Failed contact', reviewed: true, body: 'forged dose 100mg' },
    staff,
  );
  assert.equal(c.allRows_('Communications')[0].body, draft.body);
  assert.equal(c.allRows_('Communications')[0].createdBy, staff.uid);
  assert.equal(c.allRows_('Follow_Ups')[0].status, 'Pending');
  assert.throws(
    () => c.communicationRecord_({ draftId: draft.id, outcome: 'Sent manually', reviewed: true }, staff),
    /already recorded/,
  );
  const draft2 = c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'en' }, staff);
  encounter(c, 3, true);
  assert.throws(
    () => c.communicationRecord_({ draftId: draft2.id, outcome: 'Sent manually', reviewed: true }, staff),
    /changed/,
  );
});
test('template source matches backend exactly, variable schedules show all weekdays, and no unapproved translation is invented', () => {
  const { c } = setup();
  const args = {
    kind: 'care-plan',
    language: 'en',
    name: 'Fictional',
    nextDate: '2026-11-19',
    testDate: '2026-11-12',
    inr: 2.5,
    target: '2–3',
    daily: [5, 2.5, 5, 2.5, 5, 2.5, 5],
  };
  assert.equal(c.buildPatientMessage(args), buildPatientMessage(args));
  for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
    assert.ok(buildPatientMessage(args).includes(day));
  const e = encounter(c),
    row = c.findRow_('Encounters', 'id', e);
  c.replace_('Encounters', { ...row, holdInstruction: 'Approved English hold' });
  assert.throws(
    () => c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'ar' }, staff),
    /Arabic/,
  );
});
test('sent manually does not count as patient informed until documented successful follow-up', () => {
  const p = {
    encounters: [{ id: 'e' }],
    dosePlans: [{ id: 'd', encounterId: 'e', approvedBy: 'clinician', nextInrDate: '2026-11-19' }],
    communications: [{ planId: 'd', kind: 'care-plan', outcome: 'Sent manually' }],
    followups: [{ encounterId: 'e', status: 'Pending', inrDate: '2026-11-19' }],
  };
  assert.equal(careStatus(p).informed, false);
  assert.equal(todayTasks([p], '2026-11-12').inform.length, 1);
  p.followups[0] = {
    ...p.followups[0],
    status: 'Completed',
    attempts: [{ outcome: 'Contacted', completed: true }],
  };
  assert.equal(careStatus(p).informed, true);
});
test('revoked messaging consent or a changed target invalidates a prepared WhatsApp draft', () => {
  const { c } = setup();
  encounter(c);
  let patient = c.requirePatient_('p1');
  c.communicationPreferences_(
    {
      patientId: 'p1',
      expectedVersion: patient.rowVersion,
      language: 'en',
      contactMethod: 'whatsapp',
      phone: '+966500000001',
      phoneVerified: true,
      consent: true,
    },
    staff,
  );
  const draft = c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'en' }, staff);
  assert.equal(
    c.communicationValidate_({ draftId: draft.id, forWhatsApp: true }, staff).phone,
    '+966500000001',
  );
  patient = c.requirePatient_('p1');
  c.replace_('Patients', { ...patient, communicationConsent: false });
  assert.throws(() => c.communicationValidate_({ draftId: draft.id, forWhatsApp: true }, staff), /consent/);
  c.replace_('Patients', { ...patient, targetLow: 2.5, targetHigh: 3.5 });
  assert.throws(() => c.communicationValidate_({ draftId: draft.id, forWhatsApp: true }, staff), /changed/);
});
test('batched staff loading reads each source once and retains patient isolation', () => {
  const { c } = setup();
  encounter(c);
  const calls = {},
    allRows = c.allRows_;
  c.allRows_ = (name) => {
    calls[name] = (calls[name] || 0) + 1;
    return allRows(name);
  };
  const result = c.patientsWorkspace_({}, staff);
  assert.equal(result.length, 2);
  assert.equal(result[0].results.length, 1);
  assert.equal(result[1].results.length, 0);
  assert.ok(Object.values(calls).every((n) => n === 1));
});
test('workspace reset revokes portal links and hides requests/drafts but retains clinic contact settings', () => {
  const { c } = setup(),
    id = invite(c);
  encounter(c);
  c.clinicSettingsSave_(
    { nameEn: 'Fictional clinic', nameAr: 'عيادة افتراضية', telephone: '+966500000099' },
    admin,
  );
  c.portalDispatch_(
    'portal.request',
    { patientId: 'p1', kind: 'question', requestId: '1234567890123456', details: 'Synthetic request' },
    id,
  );
  c.workspaceReset_(
    {
      requestId: '2234567890123456',
      confirmation: 'RESET DEVELOPMENT DATA',
      confirmArchive: true,
      expectedWorkspace: '',
    },
    admin,
  );
  assert.throws(() => c.portalDispatch_('portal.me', {}, id), /No active/);
  assert.equal(c.allRows_('Patient_Requests').length, 0);
  assert.equal(c.clinicSettingsRead_().telephone, '+966500000099');
});
test('inaccurate submissions require explicit clinician correction and never become verified clinical measurements', () => {
  const { c } = setup(),
    identity = invite(c),
    created = c.portalDispatch_(
      'portal.request',
      {
        patientId: 'p1',
        requestId: '1234567890123456',
        kind: 'inr',
        inr: 15,
        testDate: '2026-11-12',
        lab: 'Synthetic PHC',
        details: 'Synthetic',
      },
      identity,
    );
  assert.throws(
    () =>
      c.patientRequestCorrect_(
        {
          id: created.id,
          reason: 'The source was checked; value transcribed incorrectly.',
          confirmInaccurate: true,
        },
        staff,
      ),
    /Clinician/,
  );
  assert.throws(
    () =>
      c.patientRequestCorrect_(
        { id: created.id, reason: 'The source was checked; value transcribed incorrectly.' },
        doctor,
      ),
    /Confirm/,
  );
  c.patientRequestCorrect_(
    {
      id: created.id,
      reason: 'The source was checked; value transcribed incorrectly. Please submit the correct result.',
      confirmInaccurate: true,
    },
    doctor,
  );
  assert.equal(c.allRows_('INR_Results').length, 0);
  assert.equal(c.allRows_('Patient_Requests')[0].status, 'Correction requested');
  assert.equal(c.portalPassport_({ patientId: 'p1' }, { uid: identity.uid }).requests[0].replies.length, 1);
});
test('an uncertain save cannot approve a different edited plan using the original request ID', () => {
  const { c } = setup(),
    p = {
      patientId: 'p1',
      expectedVersion: 1,
      requestId: '1234567890123456',
      testDate: '2026-11-12',
      nextInrDate: '2026-11-19',
      inr: 2.5,
      daily: Array(7).fill(5),
      reason: 'Fictional reviewed regimen',
    };
  c.encounterCreate_(p, staff);
  assert.equal(c.encounterCreate_(p, staff).alreadyExists, true);
  assert.throws(() => c.encounterCreate_({ ...p, daily: Array(7).fill(10) }, staff), /different plan/);
  assert.equal(c.allRows_('Dose_Plans').length, 1);
});
test('new unverified INR blocks stale care-plan messaging but failed historical attempts remain documentable', () => {
  const { c } = setup(),
    identity = invite(c);
  encounter(c);
  const d = c.communicationPrepare_({ patientId: 'p1', kind: 'care-plan', language: 'en' }, staff);
  c.portalDispatch_(
    'portal.request',
    {
      patientId: 'p1',
      requestId: '1234567890123456',
      kind: 'inr',
      inr: 15,
      testDate: '2026-11-12',
      lab: 'Synthetic PHC',
      details: 'Synthetic',
    },
    identity,
  );
  assert.throws(() => c.communicationValidate_({ draftId: d.id }, staff), /verification/);
  assert.throws(
    () => c.communicationPrepare_({ patientId: 'p1', kind: 'reminder', language: 'en' }, staff),
    /verification/,
  );
  assert.throws(
    () => c.communicationRecord_({ draftId: d.id, reviewed: true, outcome: 'Sent manually' }, staff),
    /changed/,
  );
  c.communicationRecord_(
    {
      draftId: d.id,
      reviewed: true,
      outcome: 'Failed contact',
      note: 'Actual earlier failed attempt; no message sent.',
    },
    staff,
  );
  assert.equal(c.allRows_('Communications')[0].staleAtRecording, true);
  assert.equal(c.allRows_('Follow_Ups')[0].status, 'Pending');
  assert.equal(c.allRows_('INR_Results').length, 1);
});
test('ordinary verified portal reads do not take the clinical mutation lock', () => {
  const { c } = setup(),
    identity = invite(c);
  c.portalDispatch_('portal.me', {}, identity);
  c.LockService = {
    getScriptLock: () => ({
      tryLock: () => {
        throw Error('Should not take mutation lock on bound read');
      },
      releaseLock() {},
    }),
  };
  assert.equal(c.portalDispatch_('portal.me', {}, identity).links.length, 1);
  assert.ok(c.portalDispatch_('portal.passport', { patientId: 'p1' }, identity));
});
