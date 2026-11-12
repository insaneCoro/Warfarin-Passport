/** Warfarin Passport — Google Sheets storage. Prototype only, no real patient data. */
const SCHEMA = {
  Patients: [
    'id',
    'mrn',
    'name',
    'dob',
    'phone',
    'caregiver',
    'caregiverPhone',
    'diagnosis',
    'targetLow',
    'targetHigh',
    'enrollmentDate',
    'enrollmentInr',
    'status',
    'createdAt',
    'updatedAt',
    'createdBy',
    'rowVersion',
    'warfarinStartDate',
    'riskLevel',
    'riskCategory',
    'riskReason',
    'riskReviewDate',
    'riskUpdatedAt',
    'riskUpdatedBy',
    'workspaceId',
    'preferredLanguage',
    'contactMethod',
    'communicationConsent',
    'phoneVerifiedAt',
    'phoneVerifiedBy',
    'confirmedTabletStrength',
    'tabletStrengthVerifiedAt',
    'tabletStrengthVerifiedBy',
  ],
  INR_Results: [
    'id',
    'patientId',
    'testDate',
    'inr',
    'enteredAt',
    'enteredBy',
    'encounterId',
    'targetLow',
    'targetHigh',
  ],
  Encounters: [
    'id',
    'requestId',
    'patientId',
    'testDate',
    'inr',
    'note',
    'nextInrDate',
    'status',
    'createdAt',
    'createdBy',
    'holdInstruction',
    'patientInstructions',
    'reviewFactors',
    'holdInstructionAr',
    'patientInstructionsAr',
  ],
  Dose_Plans: [
    'id',
    'patientId',
    'encounterId',
    'effectiveDate',
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'weeklyMg',
    'createdAt',
    'createdBy',
    'previousDaily',
    'previousWeeklyMg',
    'percentChange',
    'inr',
    'reason',
    'nextInrDate',
    'approvedBy',
    'approvedAt',
  ],
  Follow_Ups: [
    'id',
    'patientId',
    'encounterId',
    'inrCheckDate',
    'callDueDate',
    'status',
    'completedAt',
    'outcome',
    'completedBy',
    'createdAt',
  ],
  Followup_Attempts: [
    'id',
    'requestId',
    'followupId',
    'patientId',
    'outcome',
    'actions',
    'note',
    'encounterId',
    'completed',
    'createdAt',
    'createdBy',
  ],
  Inventory: ['id', 'patientId', 'strengthMg', 'quantity', 'confirmedDate', 'updatedAt', 'updatedBy'],
  Inventory_Log: [
    'id',
    'patientId',
    'strengthMg',
    'oldQuantity',
    'newQuantity',
    'confirmedDate',
    'actorUid',
    'createdAt',
  ],
  Clinical_Notes: [
    'id',
    'patientId',
    'encounterId',
    'noteDate',
    'text',
    'createdAt',
    'createdBy',
    'supersedes',
  ],
  Team_Messages: [
    'id',
    'requestId',
    'threadId',
    'replyTo',
    'patientId',
    'body',
    'createdAt',
    'createdBy',
    'authorName',
    'authorRole',
    'workspaceId',
  ],
  Message_Drafts: [
    'id',
    'patientId',
    'kind',
    'language',
    'body',
    'planId',
    'approvalId',
    'phone',
    'canWhatsApp',
    'createdBy',
    'createdAt',
    'expiresAt',
    'workspaceId',
  ],
  Communications: [
    'id',
    'draftId',
    'patientId',
    'kind',
    'language',
    'body',
    'planId',
    'outcome',
    'note',
    'createdBy',
    'createdAt',
    'workspaceId',
    'recipient',
    'staleAtRecording',
  ],
  Clinic_Settings: ['key', 'value', 'updatedAt', 'updatedBy'],
  Users: ['firebaseUid', 'email', 'role', 'active', 'displayName', 'createdAt', 'updatedAt'],
  Audit_Log: ['id', 'timestamp', 'actorUid', 'action', 'recordType', 'recordId', 'detail'],
};

/** Run manually from the Apps Script editor once; creates an EMPTY test database. */
function setupDatabase() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('DATABASE_ID'))
    throw new Error('DATABASE_ID already configured. Do not recreate the database.');
  const ss = SpreadsheetApp.create('Warfarin Passport — Prototype Database');
  Object.keys(SCHEMA).forEach((name, index) => {
    const sh = index === 0 ? ss.getSheets()[0].setName(name) : ss.insertSheet(name);
    sh.getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
    sh.getRange(1, 1, 1, SCHEMA[name].length)
      .setBackground('#17394a')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, Math.min(SCHEMA[name].length, 8));
  });
  props.setProperty('DATABASE_ID', ss.getId());
  console.log('Database created. Spreadsheet ID saved in Script Properties. Do not share with public users.');
  return ss.getUrl();
}

/** Run after setting ROOT_ADMIN_UID + ROOT_ADMIN_EMAIL in Script Properties. */
function bootstrapAdmin() {
  const props = PropertiesService.getScriptProperties();
  const uid = props.getProperty('ROOT_ADMIN_UID');
  const email = props.getProperty('ROOT_ADMIN_EMAIL');
  if (!uid || !email) throw new Error('Set ROOT_ADMIN_UID and ROOT_ADMIN_EMAIL in Script Properties first.');
  const existing = allRows_('Users');
  if (existing.length) throw new Error('Users already exist. Bootstrap is only permitted once.');
  append_('Users', {
    firebaseUid: uid,
    email,
    role: 'admin',
    active: 'true',
    displayName: 'Clinic administrator',
    createdAt: now_(),
    updatedAt: now_(),
  });
  audit_({ uid }, 'admin.bootstrap', 'Users', uid, 'First administrator provisioned');
  return 'Administrator added to approved user list';
}

function database_() {
  const id = PropertiesService.getScriptProperties().getProperty('DATABASE_ID');
  if (!id) throw new Error('DATABASE_ID is not configured. Run setupDatabase first.');
  return SpreadsheetApp.openById(id);
}
function tab_(name) {
  const sh = database_().getSheetByName(name);
  if (!sh || !SCHEMA[name]) throw new Error('Missing database tab: ' + name);
  const headers = sh.getRange(1, 1, 1, SCHEMA[name].length).getValues()[0];
  if (SCHEMA[name].some((h, i) => headers[i] !== h)) throw Error('Schema migration required: ' + name);
  return sh;
}
function now_() {
  return Utilities.formatDate(new Date(), 'Asia/Riyadh', "yyyy-MM-dd'T'HH:mm:ssXXX");
}
function today_() {
  return Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyyy-MM-dd');
}
function allRows_(name) {
  const workspace = ['Patients', 'Team_Messages', 'Message_Drafts', 'Communications'].includes(name)
    ? workspaceState_().id
    : null;
  const sh = tab_(name),
    last = sh.getLastRow();
  if (last < 2) return [];
  const grid = sh.getRange(2, 1, last - 1, SCHEMA[name].length).getValues();
  return grid
    .map((v, i) => ({
      __row: i + 2,
      ...Object.fromEntries(SCHEMA[name].map((k, j) => [k, sheetValue_(v[j])])),
    }))
    .filter((o) => SCHEMA[name].some((k) => o[k] !== '' && o[k] !== null))
    .filter((o) => workspace === null || String(o.workspaceId || '') === workspace);
}
/**
 * Google Sheets turns text such as "2026-11-20" into date cells and getValues() returns Date objects.
 * Normalize them back to the plain strings the rest of the code expects: calendar dates (midnight in the
 * spreadsheet's time zone) become yyyy-MM-dd, other date-times become ISO 8601 with offset.
 */
let sheetTimeZone_ = null;
function sheetValue_(v) {
  if (Object.prototype.toString.call(v) !== '[object Date]') return v;
  if (isNaN(v.getTime())) return '';
  if (!sheetTimeZone_) {
    try {
      sheetTimeZone_ = database_().getSpreadsheetTimeZone() || 'Asia/Riyadh';
    } catch (e) {
      sheetTimeZone_ = 'Asia/Riyadh';
    }
  }
  return Utilities.formatDate(v, sheetTimeZone_, 'HH:mm:ss') === '00:00:00'
    ? Utilities.formatDate(v, sheetTimeZone_, 'yyyy-MM-dd')
    : Utilities.formatDate(v, sheetTimeZone_, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
function cell_(x) {
  if (x === null || x === undefined) return '';
  if (typeof x === 'string' && /^[=+@\-\t\r]/.test(x)) return "'" + x;
  return x;
}
function append_(name, obj) {
  if (['Patients', 'Team_Messages', 'Message_Drafts', 'Communications'].includes(name))
    obj = { ...obj, workspaceId: workspaceState_().id };
  const sh = tab_(name);
  const values = SCHEMA[name].map((k) => cell_(obj[k]));
  sh.appendRow(values);
  return obj;
}
function replace_(name, record) {
  if (
    [
      'Audit_Log',
      'Dose_Plans',
      'INR_Results',
      'Clinical_Notes',
      'Followup_Attempts',
      'Team_Messages',
      'Message_Drafts',
      'Communications',
    ].includes(name)
  )
    throw Error('Append-only record');
  const row = Number(record.__row);
  if (!(row >= 2)) throw Error('Missing row reference');
  tab_(name)
    .getRange(row, 1, 1, SCHEMA[name].length)
    .setValues([SCHEMA[name].map((k) => cell_(record[k]))]);
  return record;
}
function findRow_(name, key, value) {
  return allRows_(name).find((o) => String(o[key]) === String(value));
}
function requirePatient_(id) {
  const p = findRow_('Patients', 'id', id);
  if (!p || p.status === 'Archived' || p.status === 'Importing') throw new Error('Patient not found');
  return p;
}
function audit_(user, action, kind, id, detail) {
  append_('Audit_Log', {
    id: Utilities.getUuid(),
    timestamp: now_(),
    actorUid: user.uid,
    action,
    recordType: kind,
    recordId: id,
    detail: JSON.stringify({
      actor: {
        uid: user.uid,
        email: user.email || '',
        role: user.role || '',
        displayName: user.displayName || '',
      },
      data: detail || null,
    }),
  });
}
function plusCalendarDays_(iso, days) {
  requireDate_(iso);
  const date = new Date(iso + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}
function requireDate_(iso) {
  if (
    typeof iso !== 'string' ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(iso) ||
    new Date(iso + 'T12:00:00Z').toISOString().slice(0, 10) !== iso
  )
    throw new Error('Invalid ISO calendar date');
  return iso;
}
function clean_(str, max) {
  return String(str ?? '')
    .trim()
    .slice(0, max || 1000);
}
function numericOrBlank_(x) {
  if (x === undefined || x === null || x === '') return '';
  const n = Number(x);
  if (!Number.isFinite(n)) throw Error('Invalid numeric value');
  return n;
}

/** Existing database only: append missing columns/tabs, never reorder or delete data. */
function migrateDatabase() {
  return withLock_(() => {
    const ss = database_();
    // Validate the entire header layout before changing any tab.
    const plan = Object.keys(SCHEMA).map((name) => {
      const sh = ss.getSheetByName(name);
      let old = sh ? sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0] : [];
      if (old.length === 1 && old[0] === '') old = [];
      if (old.some((h, i) => h !== SCHEMA[name][i]))
        throw Error('Unexpected schema in ' + name + '; manual review required');
      return { name, sh, old };
    });
    plan.forEach(({ name, sh, old }) => {
      if (!sh) {
        ss.insertSheet(name).getRange(1, 1, 1, SCHEMA[name].length).setValues([SCHEMA[name]]);
        return;
      }
      if (old.length < SCHEMA[name].length)
        sh.getRange(1, old.length + 1, 1, SCHEMA[name].length - old.length).setValues([
          SCHEMA[name].slice(old.length),
        ]);
    });
    return 'Additive migration complete';
  });
}
const CLINIC_RELEASE = 'clinic-staff-care-v5';
function ensureSchemaForRelease_(user) {
  if (user.role !== 'admin') return;
  const cache = CacheService.getScriptCache(),
    key = 'schema-' + CLINIC_RELEASE;
  if (!cache.get(key)) {
    migrateDatabase();
    cache.put(key, '1', 21600);
  }
}

/** A reset starts an empty active workspace; historical clinical/audit rows remain intact. */
function workspaceState_() {
  const raw = PropertiesService.getScriptProperties().getProperty('CLINIC_WORKSPACE');
  if (!raw) return { id: '', mode: 'development', preparedRelease: '' };
  const state = JSON.parse(raw);
  if (typeof state.id !== 'string' || !['development', 'empty'].includes(state.mode))
    throw Error('Invalid workspace configuration');
  return state;
}
function assertWorkspace_(p) {
  if (
    (workspaceState_().id || p.expectedWorkspace !== undefined) &&
    p.expectedWorkspace !== workspaceState_().id
  )
    throw Error('Workspace was reset. Sign out and sign in again.');
}
