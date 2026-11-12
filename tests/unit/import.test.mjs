import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../helpers/sheets.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));

const admin = { uid: 'admin', role: 'admin', displayName: 'Admin' };
const clinician = { uid: 'doc', role: 'clinician' };
// Fictional rows only: shaped like the clinic register (real MRN format, age text, no DOB).
const rows = [
  {
    mrn: 'TEST00000000001',
    name: 'Fictional Import One',
    ageText: '79 years',
    phone: '0500000001',
    caregiver: 'Daughter (fictional)',
    diagnosis: 'Fictional indication',
    testingSite: 'Home Care',
    targetLow: 2,
    targetHigh: 3,
    enrollmentDate: '2026-09-08',
    enrollmentInr: 1.9,
    results: [
      { date: '2026-09-28', inr: 2.6 },
      { date: '2026-09-14', inr: 2.5 },
    ],
    nextInrDate: '2026-10-12',
    planNotes: '1st: No; 2nd: No',
  },
  { mrn: 'TEST00000000002', name: 'Fictional Import Two', ageText: '48 years', targetLow: 2, targetHigh: 3 },
  { mrn: '', name: 'Missing MRN' },
];
function setup(mode = 'empty') {
  const b = storage();
  b.c.plusCalendarDays_ = (iso, n) => {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  if (mode) b.c.saveWorkspaceState_({ id: 'real-1', mode, preparedRelease: '' });
  return b;
}

test('import is admin-only and refused while the fictional development workspace is active', () => {
  const { c } = setup('development');
  assert.throws(() => c.patientsImport_({ rows, expectedWorkspace: 'real-1' }, admin), /Reset the fictional/);
  const empty = setup().c;
  assert.throws(() => empty.patientsImport_({ rows, expectedWorkspace: 'real-1' }, clinician), /Admin/);
});

test('import creates patients and dated INR history without inventing DOB, dose or approval', () => {
  const { c } = setup();
  const r = c.patientsImport_({ rows, expectedWorkspace: 'real-1' }, admin);
  assert.deepEqual(plain(r.created), ['TEST00000000001', 'TEST00000000002']);
  assert.equal(r.errors.length, 1);
  const p = c.allRows_('Patients').find((x) => x.mrn === 'TEST00000000001');
  assert.equal(p.status, 'Active');
  assert.equal(p.dob, '');
  assert.equal(p.ageText, '79 years');
  assert.equal(p.testingSite, 'Home Care');
  const results = c.allRows_('INR_Results').filter((x) => x.patientId === p.id);
  assert.deepEqual(
    plain(results).map((x) => [x.testDate, x.inr]),
    [
      ['2026-09-14', 2.5],
      ['2026-09-28', 2.6],
    ],
  );
  const encounter = c.allRows_('Encounters').find((x) => x.patientId === p.id);
  assert.equal(encounter.status, 'Complete');
  assert.match(encounter.note, /no dose or clinician approval/);
  assert.equal(c.allRows_('Dose_Plans').length, 0);
  assert.equal(c.allRows_('Follow_Ups').find((x) => x.patientId === p.id).inrCheckDate, '2026-10-12');
  assert.ok(c.allRows_('Audit_Log').some((a) => a.action === 'patient.import'));
  const bundle = c.patientGet_({ patientId: p.id }, admin);
  assert.equal(bundle.results.length, 2);
});

test('uploading the same file again skips existing MRNs', () => {
  const { c } = setup();
  c.patientsImport_({ rows, expectedWorkspace: 'real-1' }, admin);
  const again = c.patientsImport_({ rows: rows.slice(0, 2), expectedWorkspace: 'real-1' }, admin);
  assert.deepEqual(plain(again.created), []);
  assert.deepEqual(plain(again.skipped), ['TEST00000000001', 'TEST00000000002']);
  assert.equal(c.allRows_('Patients').length, 2);
});

test('real record numbers are accepted for manual registration only after the reset', () => {
  const dev = setup('development').c;
  assert.throws(
    () => dev.patientInput_({ mrn: 'TEST1', name: 'X', dob: '1960-01-01', diagnosis: 'Y' }),
    /DEMO-/,
  );
  const live = setup().c;
  assert.equal(
    live.patientInput_({ mrn: 'TEST1', name: 'X', dob: '1960-01-01', diagnosis: 'Y' }).mrn,
    'TEST1',
  );
});
