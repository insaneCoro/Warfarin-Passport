import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
function storage() {
  const properties = { DATABASE_ID: 'existing-database' },
    grids = {};
  let seq = 0;
  const c = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => properties[k] || null,
        setProperty: (k, v) => (properties[k] = v),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { getUuid: () => `uuid-${++seq}` },
  });
  for (const file of ['Database.gs', 'API.gs', 'Security.gs'])
    vm.runInContext(fs.readFileSync(new URL('../../backend/' + file, import.meta.url), 'utf8'), c);
  vm.runInContext('globalThis.schema=SCHEMA', c);
  for (const [name, cols] of Object.entries(c.schema)) grids[name] = [Array.from(cols)];
  const sheet = (name) => ({
    getLastRow: () => grids[name].length,
    getRange: (row, col, nr, nc) => ({
      getValues: () =>
        Array.from({ length: nr }, (_, i) =>
          Array.from({ length: nc }, (_, j) => grids[name][row + i - 1]?.[col + j - 1] ?? ''),
        ),
      setValues: (values) =>
        values.forEach((r, i) =>
          r.forEach((v, j) => {
            (grids[name][row + i - 1] ||= [])[col + j - 1] = v;
          }),
        ),
    }),
    appendRow: (r) => grids[name].push([...r]),
  });
  c.database_ = () => ({ getSheetByName: sheet });
  c.now_ = () => '2026-11-12T10:00:00Z';
  c.today_ = () => '2026-11-12';
  return { c, properties, grids };
}
test('reset is admin-only, confirmed, preserves history and staff, and never repopulates', () => {
  const { c, properties, grids } = storage(),
    admin = { uid: 'actual-admin', role: 'admin' },
    params = {
      requestId: '1234567890123456',
      confirmation: 'RESET DEVELOPMENT DATA',
      confirmArchive: true,
      expectedWorkspace: '',
    };
  c.append_('Patients', { id: 'old-p', mrn: 'DEMO-001', name: 'Fictional', status: 'Active' });
  c.append_('Team_Messages', { id: 'm', body: 'Fictional message' });
  c.append_('INR_Results', { id: 'r', patientId: 'old-p', inr: 6.2 });
  c.append_('Follow_Ups', { id: 'f', patientId: 'old-p', status: 'Pending' });
  c.append_('Encounters', { id: 'e', patientId: 'old-p', status: 'Complete' });
  c.append_('Users', { firebaseUid: admin.uid, role: 'admin', active: true });
  const original = JSON.stringify(grids);
  assert.throws(() => c.workspaceReset_(params, { uid: 'staff', role: 'clinician' }), /Admin/);
  assert.throws(() => c.workspaceReset_({ ...params, confirmation: 'reset' }, admin), /Type RESET/);
  assert.equal(JSON.stringify(grids), original);
  const result = c.workspaceReset_(params, admin);
  assert.ok(result.workspaceId);
  assert.equal(properties.DATABASE_ID, 'existing-database');
  assert.equal(c.patientsList_({}, admin).length, 0);
  assert.equal(c.messagesList_({}, admin).messages.length, 0);
  assert.equal(c.followupList_({}, admin).length, 0);
  for (const name of ['Patients', 'INR_Results', 'Encounters', 'Follow_Ups', 'Team_Messages', 'Users'])
    assert.equal(JSON.stringify(grids[name]), JSON.stringify(JSON.parse(original)[name]));
  assert.throws(() => c.patientGet_({ patientId: 'old-p' }, admin), /not found/);
  assert.throws(
    () => c.followupRecord_({ followupId: 'f', expectedWorkspace: result.workspaceId }, admin),
    /not found/,
  );
  assert.throws(
    () =>
      c.decisionApprove_(
        { encounterId: 'e', expectedWorkspace: result.workspaceId },
        { uid: 'doctor', role: 'clinician' },
      ),
    /not found/,
  );
  assert.equal(c.workspacePrepare_({ expectedWorkspace: result.workspaceId }, admin).disabled, true);
  assert.throws(() => c.demoSeed_({ confirmSynthetic: true }, admin), /disabled/);
  assert.equal(c.workspaceReset_(params, admin).alreadyReset, true);
  assert.equal(c.allRows_('Audit_Log').filter((a) => a.action === 'workspace.reset.complete').length, 1);
  assert.throws(
    () => c.messageCreate_({ body: 'stale', requestId: '3333333333333333', expectedWorkspace: '' }, admin),
    /Workspace was reset/,
  );
  assert.throws(
    () => c.messageCreate_({ body: 'omitted scope', requestId: '4444444444444444' }, admin),
    /Workspace was reset/,
  );
  c.messageCreate_(
    { body: 'new workspace', requestId: '5555555555555555', expectedWorkspace: result.workspaceId },
    admin,
  );
  assert.equal(c.messagesList_({}, admin).messages.length, 1);
  assert.equal(grids.Team_Messages.length, 3);
  assert.equal(c.allRows_('Users')[0].firebaseUid, admin.uid);
});
test('reset completion audit recovers after a storage interruption without a second reset', () => {
  const { c } = storage(),
    admin = { uid: 'admin', role: 'admin' },
    params = {
      requestId: '1234567890123456',
      confirmation: 'RESET DEVELOPMENT DATA',
      confirmArchive: true,
      expectedWorkspace: '',
    };
  c.append_('Patients', { id: 'p', mrn: 'DEMO-001' });
  const append = c.append_;
  let fail = true;
  c.append_ = (name, record) => {
    if (name === 'Audit_Log' && record.action === 'workspace.reset.complete' && fail) {
      fail = false;
      throw Error('storage interruption');
    }
    return append(name, record);
  };
  assert.throws(() => c.workspaceReset_(params, admin), /storage interruption/);
  const id = c.workspaceState_().id;
  assert.equal(c.workspaceReset_(params, admin).alreadyReset, true);
  assert.equal(c.workspaceState_().id, id);
  assert.equal(c.allRows_('Audit_Log').filter((a) => a.action === 'workspace.reset.complete').length, 1);
});
