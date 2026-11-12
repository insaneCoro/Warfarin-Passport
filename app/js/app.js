import { applyInterfaceLanguage, toggleInterfaceLanguage, uiText } from './ui-language.mjs?v=care-5';
import { mapLimit } from './async-utils.mjs?v=session-6';
import {
  todayMarkup,
  todayTasks,
  careStatus,
  reportedUrgentCases,
  workflowMarkup,
  approvedPlanMarkup,
  patientToolsMarkup,
  handleCareClick,
  submitCare,
  initInrWizard,
} from './care-ui.mjs?v=care-5';
import { reviewBaseline, latestAssessment, latestResult } from './review-context.mjs?v=care-5';
import { urgentCases, urgentCase } from './urgent-cases.mjs?v=care-5';
import { additionalPatients, mergeAdditionalPatients } from './additional-cases.mjs?v=care-5';
import { ttrForPatient, clinicTTR } from './ttr.mjs';
import { doseReview, UW_SOURCE, ACF_SOURCE } from './dose-review.mjs?v=care-5';
import {
  connectionAvailable,
  connected,
  createStaffAccount,
  sendAccountEmail,
  refreshAccess,
  resendMyVerification,
  signIn,
  signOut,
  api,
  patientFromApi,
} from './api-client.mjs?v=care-5';
import { doseSummary, followupAttempt } from './clinical-utils.mjs';
import { addDays, todayRiyadh, dateLabel, ageFromDOB, sumDose } from './date-utils.mjs';

// DEMO ONLY. This browser store must never be used for real medical records.
const DEMO_KEY = 'warfarin-passport-synthetic-demo-v1';
const TODAY = todayRiyadh();
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const screen = document.querySelector('#screen');
const modalRoot = document.querySelector('#dialog-root');
const nav = document.querySelector('#nav');
let view = 'dashboard',
  selectedMRN = null,
  search = '';
const e = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = (x) => Number(x).toLocaleString('en-US', { maximumFractionDigits: 2 });
const makePatient = (n, age, diagnosis, target, INRs, dose, next, stock = 20) => ({
  mrn: `DEMO-${String(n).padStart(3, '0')}`,
  name: `Sample Patient ${String.fromCharCode(64 + n)}`,
  dob: `${new Date().getUTCFullYear() - age}-01-15`,
  diagnosis,
  phone: `050000000${n}`,
  caregiver: 'Demo caregiver',
  caregiverPhone: `050111000${n}`,
  targetLow: target[0],
  targetHigh: target[1],
  enrollmentDate: addDays(TODAY, -75),
  enrollmentInr: INRs[0],
  status: 'Active',
  results: INRs.map((value, i) => ({
    id: `R${n}-${i}`,
    date: addDays(TODAY, -42 + i * 7),
    value,
    enteredBy: 'Demo clinician',
  })),
  dosePlans: [{ id: `D${n}`, date: addDays(TODAY, -7), daily: dose, enteredBy: 'Demo clinician' }],
  encounters: [
    {
      id: `E${n}`,
      date: addDays(TODAY, -7),
      note: 'Synthetic example encounter. No real patient information.',
      enteredBy: 'Demo clinician',
    },
  ],
  notes: [],
  inventory: [{ strength: 5, quantity: stock, date: addDays(TODAY, -10) }],
  followups: [{ id: `F${n}`, inrDate: next, callDate: addDays(next, 2), status: 'Pending' }],
});
function seeds() {
  return [
    makePatient(
      1,
      74,
      'Atrial fibrillation',
      [2, 3],
      [2.2, 2.6, 3.2, 2.9, 2.5, 2.6],
      [5, 5, 5, 5, 5, 5, 5],
      addDays(TODAY, -2),
      14,
    ),
    makePatient(
      2,
      67,
      'Mechanical mitral valve',
      [2.5, 3.5],
      [3.0, 3.2, 2.3, 2.9, 3.8, 3.4],
      [5, 5, 7.5, 5, 5, 7.5, 5],
      addDays(TODAY, 1),
      8,
    ),
    makePatient(
      3,
      82,
      'Venous thromboembolism',
      [2, 3],
      [2.1, 1.9, 2.4, 2.2, 2.1, 1.8],
      [3, 3, 3, 3, 3, 3, 3],
      addDays(TODAY, -5),
      12,
    ),
    makePatient(
      4,
      78,
      'Atrial fibrillation',
      [2, 3],
      [2.4, 2.9, 2.8, 2.3, 2.6, 2.5],
      [4, 4, 4, 4, 4, 4, 4],
      addDays(TODAY, 4),
      29,
    ),
    ...additionalPatients(TODAY),
  ];
}
function load() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return mergeAdditionalPatients(data, TODAY);
    }
  } catch {}
  return seeds();
}
let patients = connected ? [] : load();
let staff = null,
  workspaceBusy = false,
  workspaceError = '',
  remoteRefreshedAt = '',
  remoteRefreshError = '',
  remoteRefreshBusy = false;
async function refreshRemote() {
  if (staff?.batchPatients) {
    patients = (await api('patients.workspace', {})).map(patientFromApi);
    remoteRefreshedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    remoteRefreshError = '';
    return;
  }
  const rows = await api('patients.list', { query: '' });
  const next = await mapLimit(rows, 3, (p) => api('patients.get', { patientId: p.id }).then(patientFromApi));
  patients = next;
  remoteRefreshedAt = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  remoteRefreshError = '';
}
function save() {
  if (connected) return;
  localStorage.setItem(DEMO_KEY, JSON.stringify(patients));
}
const DEMO_MESSAGES_KEY = 'warfarin-passport-demo-messages-v1';
function demoMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_MESSAGES_KEY) || 'null');
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [
    {
      id: 'demo-message-2',
      threadId: 'demo-message-2',
      replyTo: '',
      patientId: 'DEMO-003',
      body: 'Please review Sample Patient C’s latest INR and confirm the follow-up plan. This is a fictional handover for development.',
      authorName: 'Demo clinician',
      authorRole: 'Unverified demo role',
      createdBy: 'demo',
      createdAt: TODAY + 'T09:00:00Z',
    },
    {
      id: 'demo-message-1',
      threadId: 'demo-message-1',
      replyTo: '',
      patientId: '',
      body: 'Use this shared space for the clinic handover. Save dosing decisions in the patient passport so they remain in the clinical record.',
      authorName: 'Demo clinic team',
      authorRole: 'Unverified demo role',
      createdBy: 'demo',
      createdAt: TODAY + 'T08:00:00Z',
    },
  ];
}
let teamMessages = connected ? [] : demoMessages(),
  teamError = '',
  teamLoaded = !connected,
  teamHasMore = false,
  teamCursor = null,
  teamBusy = false,
  messageDraft = { body: '', patientId: '', replyTo: '', requestId: null };
function messagePatient(id) {
  return patients.find((p) => (connected ? p.id : p.mrn) === id);
}
function pageMessages() {
  if (connected && !staff)
    return `${heading('Team messages', 'Sign in to join the clinic conversation.')}<button class="btn primary" data-navto="staff">Staff sign-in</button>`;
  const reply = teamMessages.find((m) => m.id === messageDraft.replyTo);
  return `${heading('Team messages', 'Shared clinical handover · patient decisions belong in the passport.', `<button class="btn" id="refresh-messages">Refresh messages</button>`)}<div class="messages-layout"><section class="card messages-feed"><div class="card-header"><h2>Clinic conversation</h2><small>${connected ? 'Authenticated staff' : 'Local fictional demonstration'}</small></div>${teamError ? `<div class="warning-box">${e(teamError)}</div>` : ''}${!teamLoaded && !teamError ? '<div class="empty">Open Refresh messages to load the clinic conversation.</div>' : ''}${
    teamMessages
      .map((m) => {
        const p = messagePatient(m.patientId);
        return `<article class="message-item ${m.replyTo ? 'message-reply' : ''}"><div class="message-avatar">${e(m.authorName.slice(0, 1))}</div><div class="message-content"><header><b>${e(m.authorName)}</b><small>${e(m.authorRole)} · ${e(m.createdAt.slice(0, 16).replace('T', ' '))}</small></header>${p ? `<button class="patient-context" data-open="${e(p.mrn)}">${e(p.name)} · ${e(p.mrn)}</button>` : ''}${m.replyTo ? '<span class="reply-label">Reply in conversation</span>' : ''}<p dir="auto">${e(m.body)}</p><button class="inline-action" data-reply="${e(m.id)}">Reply</button></div></article>`;
      })
      .join('') || '<div class="empty">No team messages yet.</div>'
  }${teamHasMore ? '<button class="btn older-messages" id="older-messages">Load older messages</button>' : ''}</section><aside class="card message-composer"><div class="card-header"><h2>${reply ? 'Reply to ' + e(reply.authorName) : 'New message'}</h2></div><form id="message-form" class="composer-body">${reply ? `<div class="reply-preview"><p>${e(reply.body.slice(0, 160))}</p><button class="inline-action" type="button" id="cancel-reply">Cancel reply</button></div>` : ''}<div class="field"><label for="message-patient">Patient context (optional)</label><select name="patientId" id="message-patient" ${reply ? 'disabled' : ''}><option value="">General clinic conversation</option>${patients.map((p) => `<option value="${e(connected ? p.id : p.mrn)}" ${messageDraft.patientId === (connected ? p.id : p.mrn) ? 'selected' : ''}>${e(p.name)} · ${e(p.mrn)}</option>`).join('')}</select></div><div class="field"><label for="message-body">Message</label><textarea id="message-body" dir="auto" name="body" rows="7" maxlength="3000" required placeholder="Share a review request or clinical handover…">${e(messageDraft.body)}</textarea></div><p class="form-help">${connected ? 'Your approved staff identity and timestamp are recorded.' : 'Demo messages stay in this browser.'} Messages do not approve a dose or close a follow-up.</p><p class="message-status" id="message-status" role="status" aria-live="polite"></p><button class="btn primary" type="submit">${connected ? 'Post to team' : 'Post demo message'}</button></form></aside></div>`;
}
async function refreshTeamMessages(older = false) {
  if (!connected || !staff || teamBusy) return;
  teamBusy = true;
  try {
    const page = await api('messages.list', older ? { beforeId: teamCursor } : {});
    teamMessages = older ? [...teamMessages, ...page.messages] : page.messages;
    teamHasMore = page.hasMore;
    teamCursor = page.nextBeforeId;
    teamLoaded = true;
    teamError = '';
  } catch (err) {
    teamError = String(err.message).includes('Unsupported action')
      ? 'Team messages need the new backend deployment. Open Staff & settings for deployment instructions.'
      : err.message;
  } finally {
    teamBusy = false;
    if (view === 'messages') render();
  }
}
async function sendTeamMessage(form) {
  const button = form.querySelector('[type=submit]'),
    status = form.querySelector('#message-status');
  button.disabled = true;
  messageDraft.body = form.querySelector('[name=body]').value.trim();
  if (!messageDraft.replyTo) messageDraft.patientId = form.querySelector('[name=patientId]').value;
  messageDraft.requestId ||= crypto.randomUUID();
  try {
    if (!messageDraft.body) throw Error('Enter a message');
    const payload = { ...messageDraft };
    if (connected) {
      await api('messages.create', payload);
      messageDraft = { body: '', patientId: '', replyTo: '', requestId: null };
      await refreshTeamMessages();
      if (teamError) toast('Message saved. Refresh messages to reload the conversation.');
    } else {
      const id = crypto.randomUUID(),
        parent = teamMessages.find((m) => m.id === payload.replyTo);
      teamMessages.unshift({
        ...payload,
        id,
        threadId: parent?.threadId || id,
        createdAt: new Date().toISOString(),
        createdBy: 'demo',
        authorName: 'Demo staff',
        authorRole: 'Unverified demo role',
      });
      localStorage.setItem(DEMO_MESSAGES_KEY, JSON.stringify(teamMessages));
      messageDraft = { body: '', patientId: '', replyTo: '', requestId: null };
      render();
    }
  } catch (err) {
    status.textContent = err.message;
    button.disabled = false;
  }
}

function getPatient() {
  return patients.find((p) => p.mrn === selectedMRN);
}
function latest(p) {
  return latestResult(p);
}
function currentDose(p) {
  return p.dosePlans?.at(-1)?.daily || [0, 0, 0, 0, 0, 0, 0];
}
function rangeStatus(p, val) {
  if (val === undefined || val === null || p.targetLow == null || p.targetHigh == null)
    return ['Target missing', 'neutral'];
  if (val < p.targetLow) return ['Below target', 'out-of-range'];
  if (val > p.targetHigh) return ['Above target', 'out-of-range'];
  return ['In range', 'good'];
}
function toast(s) {
  const t = document.querySelector('#toast');
  t.textContent = uiText(s);
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 3200);
}
function heading(title, subtitle, action = '') {
  return `<div class="page-heading"><div><p class="eyebrow">WARFARIN PASSPORT / ${e(view)}</p><h1>${e(title)}</h1><p class="subtext">${e(subtitle)}</p></div>${action}</div>`;
}
function tag(label, type = 'neutral') {
  return `<span class="tag ${e(type)}">${e(label)}</span>`;
}
function openPatient(mrn) {
  selectedMRN = mrn;
  view = 'passport';
  render();
}
function tablePatients(list) {
  if (!list.length) return '<div class="empty">No patients match this view.</div>';
  return `<div class="table-wrap"><table class="registry-table"><thead><tr><th>Patient</th><th>Indication / target</th><th>Latest INR</th><th>TTR · 6 mo</th><th>Next INR</th><th>Weekly dose</th><th>Last contact</th></tr></thead><tbody>${list
    .map((p) => {
      const r = latest(p),
        f = p.followups.at(-1),
        t = ttrForPatient(p, TODAY),
        contact = p.followups
          .flatMap((f) => f.attempts || [])
          .sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)))[0];
      return `<tr><td><button class="patient-link" data-open="${e(p.mrn)}">${e(p.name)}</button><small>${e(p.mrn)}</small>${riskBadge(p)}</td><td>${e(p.diagnosis)}<small>Target ${e(p.targetLow ?? '—')}–${e(p.targetHigh ?? '—')}</small></td><td>${r ? `${tag(String(r.value), rangeStatus(p, r.value)[1])}<small>${dateLabel(r.date)}</small>` : '—'}</td><td>${ttrBadge(t)}<small>${t.percent === null ? 'Not enough data' : `${Math.round(t.observedDays)} days observed${t.provisional ? ' · provisional' : ''}`}</small></td><td>${f ? tag(dateLabel(f.inrDate), f.inrDate < TODAY ? 'overdue' : f.inrDate === TODAY ? 'due' : 'neutral') : '—'}</td><td>${p.dosePlans.length ? money(sumDose(currentDose(p))) + ' mg' : '—'}</td><td>${e(contact?.outcome || 'None logged')}<small>${contact ? e(contact.timestamp.slice(0, 10)) : ''}</small></td></tr>`;
    })
    .join('')}</tbody></table></div>`;
}
let dashboardFilter = 'all',
  dashboardSearch = '';
function ttrBadge(t) {
  return t.percent === null
    ? tag('—', 'neutral')
    : tag(t.percent + '%', t.percent >= 65 ? 'good' : t.percent >= 50 ? 'due' : 'overdue');
}
function filteredDashboardPatients() {
  const term = dashboardSearch.toLowerCase();
  return patients.filter((p) => {
    if (
      term &&
      ![p.name, p.mrn, p.phone].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(term),
      )
    )
      return false;
    if (
      ['due', 'review', 'inform'].includes(dashboardFilter) &&
      !todayTasks(patients, TODAY)[dashboardFilter].includes(p)
    )
      return false;
    if (dashboardFilter === 'high-risk') return isHighRisk(p);
    if (dashboardFilter === 'overdue') return p.followups.at(-1)?.inrDate < TODAY;
    if (dashboardFilter === 'out') return rangeStatus(p, latest(p)?.value)[1] !== 'good';
    if (dashboardFilter === 'low-ttr') {
      const t = ttrForPatient(p, TODAY);
      return t.percent !== null && t.percent < 65;
    }
    return true;
  });
}
function ttrDistribution(data) {
  const usable = data.filter((t) => t.percent !== null),
    bands = [
      { label: '< 50%', min: 0, max: 50, color: 'red' },
      { label: '50–65%', min: 50, max: 65, color: 'orange' },
      { label: '65–75%', min: 65, max: 75, color: 'lime' },
      { label: '≥ 75%', min: 75, max: 101, color: 'green' },
    ];
  if (!usable.length) return '<div class="empty">More INR history is needed.</div>';
  return `<div class="distribution-bar">${bands
    .map((b) => {
      const n = usable.filter((t) => t.percent >= b.min && t.percent < b.max).length;
      return `<span class="${b.color}" style="width:${(n / usable.length) * 100}%" title="${b.label}: ${n} patient(s)"></span>`;
    })
    .join(
      '',
    )}</div><div class="distribution-key">${bands.map((b) => `<span><i class="${b.color}"></i>${b.label} (${usable.filter((t) => t.percent >= b.min && t.percent < b.max).length})</span>`).join('')}</div>`;
}
function selectField(name, label, options, value = 'unknown') {
  return `<div class="field"><label for="f-${name}">${e(label)}</label><select id="f-${name}" name="${name}">${options.map(([v, l]) => `<option value="${e(v)}" ${v === value ? 'selected' : ''}>${e(l)}</option>`).join('')}</select></div>`;
}
function reviewResultMarkup(r, weekly) {
  const confirmed = r.percentRange,
    reference = confirmed ? { percentRange: confirmed, weeklyRange: r.weeklyRange } : r.reference,
    range = reference?.percentRange;
  return `<div class="nomogram-result ${e(r.status)}"><div class="nomogram-title"><b>${e(r.title)}</b><span>${confirmed ? 'REFERENCE ONLY' : 'CONDITIONAL · NOT A PRESCRIPTION'}</span></div>${range ? `<div class="reference-band"><p class="reference-dose">${range[0] === 0 && range[1] === 0 ? 'Dose suggestion (conditional): continue the recorded weekly dose if clinically stable' : `Dose suggestion (conditional): ${range[0] >= 0 ? 'increase' : range[1] <= 0 ? 'decrease' : 'change'} weekly dose by ${range[0] < 0 ? Math.abs(range[1]) : range[0]}–${range[0] < 0 ? Math.abs(range[0]) : range[1]}%`}</p>${reference.weeklyRange ? `<p>${reference.baselineVerified || confirmed ? 'Verified' : 'Recorded, unverified'} baseline ${money(weekly)} mg/week → reference range <b>${money(reference.weeklyRange[0])}–${money(reference.weeklyRange[1])} mg/week</b>${range[0] !== range[1] ? ` · <b>midpoint example ${money(r.midpoint ?? reference.midpoint)} mg/week</b> (${Math.abs((range[0] + range[1]) / 2)}% ${range[1] <= 0 ? 'decrease' : 'increase'})` : ''}</p>` : '<p>Verify the actual previous regimen to calculate the corresponding weekly mg range.</p>'}${!confirmed ? `<p class="reference-condition">${e(reference.condition || 'Requires individual clinician assessment')}</p>` : ''}</div>` : ''}${r.managementSteps?.length ? `<details class="clinical-explanation" ${r.status === 'urgent' ? 'open' : ''}><summary>Management considerations</summary><ol class="management-list">${r.managementSteps.map((step) => `<li>${e(step)}</li>`).join('')}</ol></details>` : ''}<p><b>Hold:</b> ${e(r.hold)}</p><p><b>Recheck:</b> ${e(r.recheck)}</p>${r.messages.map((m) => `<p>${e(m)}</p>`).join('')}<div class="management-sources"><a href="${UW_SOURCE}" target="_blank" rel="noopener">UW Medicine: maintenance and monitoring reference</a>${r.extraSource ? ` · <a href="${r.extraSource}" target="_blank" rel="noopener">Reversal / emergency guidance</a>` : ''}</div></div>`;
}
function updateDoseReview() {
  const output = document.querySelector('#reference-output'),
    form = document.querySelector('#modal-form');
  if (!output || !form) return;
  const fd = new FormData(form),
    p = getPatient(),
    weekly = modalReviewing ? reviewBaseline(p, latest(p)).weekly : sumDose(currentDose(p)),
    r = doseReview({
      inr: fd.get('inr'),
      low: p.targetLow,
      high: p.targetHigh,
      weekly,
      testDate: fd.get('inrDate'),
      today: TODAY,
      bleeding: fd.get('bleeding'),
      missed: fd.get('missed'),
      interactions: fd.get('interactions'),
      illness: fd.get('illness'),
      recentChange: fd.get('recentChange'),
      baselineConfirmed: fd.get('baselineConfirmed'),
      mechanicalValve: /mechanical|prosthetic/i.test(p.diagnosis),
      riskLevel: p.riskLevel,
      riskCategory: p.riskCategory,
      riskReason: p.riskReason,
    });
  output.innerHTML = reviewResultMarkup(r, weekly);
  const daily = DAYS.map((_, i) => Number(fd.get('dose' + i))),
    total = sumDose(daily),
    expected = Number(fd.get('weeklyMg'));
  document.querySelector('#daily-total').textContent =
    `Daily doses total ${money(total)} mg/week ${Math.abs(total - expected) < 0.01 ? '✓' : '— does not match entered weekly dose'}`;
}

function isHighRisk(p) {
  return p?.riskLevel === 'high';
}
function riskCategoryLabel(value) {
  return (
    {
      bleeding: 'Bleeding',
      thrombosis: 'Thrombosis',
      both: 'Bleeding & thrombosis',
      other: 'Other clinical risk',
    }[value] || 'Clinical risk'
  );
}
function riskBadge(p) {
  return isHighRisk(p)
    ? `<span class="tag risk-badge" title="${e(p.riskReason || 'High-risk patient')}">High risk · ${e(riskCategoryLabel(p.riskCategory))}</span>`
    : '';
}
function riskFields(p = {}) {
  return `<fieldset class="span-2 risk-fields"><legend>Clinical priority</legend><div class="form-grid">${selectField(
    'riskLevel',
    'Monitoring priority',
    [
      ['routine', 'Routine monitoring'],
      ['high', 'High risk / closer review'],
    ],
    p.riskLevel || 'routine',
  )}${selectField(
    'riskCategory',
    'High-risk category',
    [
      ['', 'Choose category'],
      ['bleeding', 'Bleeding'],
      ['thrombosis', 'Thrombosis'],
      ['both', 'Bleeding and thrombosis'],
      ['other', 'Other clinical risk'],
    ],
    p.riskCategory || '',
  )}<div class="field span-2"><label for="f-riskReason">Reason for the high-risk flag</label><textarea id="f-riskReason" name="riskReason" rows="3" maxlength="1000">${e(p.riskReason || '')}</textarea></div>${field('riskReviewDate', 'Risk review date (optional)', p.riskReviewDate || '', 'date')}</div><p class="form-help">This is a staff-maintained clinical priority flag, not an automatically calculated risk score.</p></fieldset>`;
}
function updateRiskFields() {
  const form = document.querySelector('#modal-form'),
    high = form?.querySelector('[name=riskLevel]')?.value === 'high';
  if (!form?.querySelector('[name=riskLevel]')) return;
  for (const name of ['riskCategory', 'riskReason', 'riskReviewDate']) {
    const input = form.querySelector(`[name=${name}]`);
    if (input) {
      input.disabled = !high;
      input.required = high && name !== 'riskReviewDate';
    }
  }
}
function riskPayload(fd) {
  const riskLevel = fd.get('riskLevel') || 'routine';
  if (riskLevel !== 'high')
    return { riskLevel: 'routine', riskCategory: '', riskReason: '', riskReviewDate: '' };
  const riskCategory = fd.get('riskCategory'),
    riskReason = String(fd.get('riskReason') || '').trim();
  if (!['bleeding', 'thrombosis', 'both', 'other'].includes(riskCategory) || !riskReason)
    throw Error('Choose a high-risk category and document the reason');
  return { riskLevel, riskCategory, riskReason, riskReviewDate: fd.get('riskReviewDate') || '' };
}
function patientManagement(p) {
  return doseReview({
    ...latestAssessment(p, latest(p)),
    inr: latest(p)?.value,
    low: p.targetLow,
    high: p.targetHigh,
    weekly: reviewBaseline(p, latest(p)).weekly,
    testDate: latest(p)?.date,
    today: TODAY,
    mechanicalValve: /mechanical|prosthetic/i.test(p.diagnosis),
    riskLevel: p.riskLevel,
    riskCategory: p.riskCategory,
    riskReason: p.riskReason,
  });
}

function statsCard(label, value, hint, icon, clazz = '') {
  return `<div class="stat ${clazz}"><div class="stat-line"><span class="stat-name">${e(label)}</span><span class="stat-icon">${icon}</span></div><strong class="stat-number">${e(value)}</strong><div class="stat-hint">${e(hint)}</div></div>`;
}
function worklist() {
  return patients
    .flatMap((p) =>
      p.followups
        .filter((f) => f.status !== 'Completed')
        .map((f) => ({
          ...f,
          name: p.name,
          mrn: p.mrn,
          lastInr: latest(p)?.value,
          lastContact: f.attempts?.at(-1),
          riskLevel: p.riskLevel,
          riskCategory: p.riskCategory,
          riskReason: p.riskReason,
          priority: urgentCase(p, TODAY)?.rank ?? 9,
        })),
    )
    .sort(
      (a, b) =>
        a.priority - b.priority ||
        Number(b.callDate <= TODAY) - Number(a.callDate <= TODAY) ||
        Number(isHighRisk(b)) - Number(isHighRisk(a)) ||
        a.callDate.localeCompare(b.callDate),
    );
}
function pageDashboard() {
  const q = worklist(),
    due = q.filter((f) => f.callDate <= TODAY),
    abnormal = patients.filter((p) => rangeStatus(p, latest(p)?.value)[1] !== 'good'),
    inRange = patients.filter((p) => rangeStatus(p, latest(p)?.value)[1] === 'good').length,
    measured = patients.filter((p) => latest(p) && Number(p.targetLow) > 0).length,
    ttr = clinicTTR(patients, TODAY),
    overdueTests = patients.filter((p) => p.followups.at(-1)?.inrDate < TODAY),
    highRisk = patients.filter(isHighRisk),
    attention = [...highRisk, ...abnormal.filter((p) => !isHighRisk(p))];
  return `${heading('Clinic dashboard', 'Anticoagulation service · monitoring, recall and clinical review', `<div class="mini-actions"><button class="btn primary" data-modal="patient">+ New patient</button></div>`)}
 ${todayMarkup(patients, TODAY, connected)}${connected && patients.length >= 200 ? '<div class="warning-box">This view is limited to the first 200 loaded patients. Clinic metrics describe that loaded cohort.</div>' : ''}<section class="stats clinic-stats">${statsCard('Enrolled patients', patients.length, 'On the registry', '♙')}${statsCard('In range now', measured ? Math.round((inRange / measured) * 100) + '%' : '—', `${inRange} of ${measured} latest INRs`, '✓')}${statsCard('Clinic TTR · 6 mo', ttr.mean === null ? '—' : ttr.mean + '%', `${ttr.eligible.length} established · ${ttr.provisional} provisional`, '↗')}${statsCard('Overdue INR', overdueTests.length, 'Planned testing date passed', '◷', 'stat-coral')}${statsCard('Calls due', due.length, 'Pending today or overdue', '☎', 'stat-amber')}${statsCard('High-risk patients', highRisk.length, 'Staff-flagged clinical priority', '!', 'stat-coral')}</section>
 <div class="dashboard-grid"><section class="card recall-card"><div class="card-header"><div><h2>Today’s clinic recall <span class="count-chip">${due.length}</span></h2><small>Open a passport to document contact and clinical actions</small></div><button class="inline-action" data-navto="followups">All follow-ups →</button></div><div class="table-wrap"><table><thead><tr><th>Patient</th><th>Call due</th><th>Last contact</th><th>Last INR</th></tr></thead><tbody>${due
   .slice(0, 5)
   .map(
     (f) =>
       `<tr><td><button class="patient-link" data-open="${e(f.mrn)}">${e(f.name)}</button><small>${e(f.mrn)}</small></td><td>${tag(f.callDate < TODAY ? `${Math.round((Date.parse(TODAY) - Date.parse(f.callDate)) / 86400000)} d overdue` : f.callDate === TODAY ? 'Today' : dateLabel(f.callDate), f.callDate < TODAY ? 'overdue' : 'neutral')}</td><td>${e(f.lastContact?.outcome || 'None logged')}<small>${f.lastContact ? e(f.lastContact.timestamp.slice(0, 10)) : 'No saved call attempt'}</small></td><td>${e(f.lastInr ?? '—')}</td></tr>`,
   )
   .join(
     '',
   )}</tbody></table></div>${!due.length ? '<div class="empty">No calls due today. View all follow-ups for upcoming calls.</div>' : ''}</section>
 <div class="dashboard-side"><section class="card"><div class="card-header"><h2>Needs attention</h2><span class="count-chip">${attention.length}</span></div>${
   attention
     .slice(0, 4)
     .map(
       (p) =>
         `<div class="attention-item"><span class="attention-dot">!</span><div><button class="patient-link" data-open="${e(p.mrn)}">${e(p.name)}</button>${riskBadge(p)}<small>${e(isHighRisk(p) ? p.riskReason : rangeStatus(p, latest(p)?.value)[0])} · INR ${e(latest(p)?.value ?? 'missing')}</small></div></div>`,
     )
     .join('') || '<div class="empty">No results outside target.</div>'
 }</section><section class="card"><div class="card-header"><h2>TTR distribution</h2><small>Available patient estimates</small></div>${ttrDistribution(ttr.all)}<p class="card-caption">Short histories are provisional. Clinic mean includes only established estimates.</p></section></div>
 <section class="card registry-card"><div class="card-header"><div><h2>All active patients</h2><small>INR, time in range and the next monitoring step</small></div><div class="search-wrap"><input id="dashboard-search" class="search-input" value="${e(dashboardSearch)}" placeholder="Filter name, MRN, phone…" aria-label="Filter dashboard patients"></div></div><div class="filter-bar">${[
   ['all', 'All patients', patients.length],
   ['overdue', 'Overdue INR', overdueTests.length],
   ['out', 'Out of range', abnormal.length],
   ['high-risk', 'High risk', highRisk.length],
   ['low-ttr', 'TTR < 65%', ttr.all.filter((t) => t.percent !== null && t.percent < 65).length],
 ]
   .map(
     ([key, label, count]) =>
       `<button class="filter-chip ${dashboardFilter === key ? 'active' : ''}" data-filter="${key}">${label} <span>${count}</span></button>`,
   )
   .join('')}</div><div id="dashboard-registry">${tablePatients(filteredDashboardPatients())}</div></section>
 <section class="card team-preview"><div class="card-header"><div><h2>Team handover</h2><small>Shared clinician discussion; messages do not replace clinical decisions</small></div><button class="inline-action" data-navto="messages">Open team messages →</button></div>${
   teamMessages
     .slice(0, 2)
     .map(
       (m) =>
         `<div class="handover-item"><b>${e(m.authorName)}</b><p dir="auto">${e(m.body)}</p><small>${e(m.createdAt.slice(0, 16).replace('T', ' '))}</small></div>`,
     )
     .join('') || '<div class="empty">Open team messages to start the conversation.</div>'
 }</section></div>`;
}
function pagePatients() {
  const term = search.toLowerCase();
  let found = patients.filter((p) =>
    [p.mrn, p.name, p.phone].some((s) => String(s).toLowerCase().includes(term)),
  );
  return `${heading('Patients', 'Search records by medical record number, name, or contact number.', `<button class="btn primary" data-modal="patient">+ Register patient</button>`)}<div class="toolbar"><div class="search-wrap"><input id="patient-search" class="search-input" placeholder="Search MRN, name or phone" value="${e(search)}" aria-label="Search patients"></div><span class="toolbar-pill">${found.length} patient(s)</span></div><section class="card">${tablePatients(found)}</section>`;
}
function chart(p) {
  const data = [...p.results].sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) return '<div class="empty">No INR results yet.</div>';
  const W = 620,
    H = 230,
    px = 38,
    top = 20,
    bottom = 38;
  const yMin = Math.min(0.5, p.targetLow ?? 2, ...data.map((d) => d.value)) - 0.1,
    yMax = Math.max(4, p.targetHigh ?? 3, ...data.map((d) => d.value)) + 0.1;
  const sx = (i) => px + (W - 2 * px) * (data.length === 1 ? 0.5 : i / (data.length - 1)),
    sy = (n) => top + ((H - top - bottom) * (yMax - n)) / (yMax - yMin),
    points = data.map((d, i) => `${sx(i)},${sy(d.value)}`).join(' ');
  const band =
    p.targetLow != null && p.targetHigh != null
      ? `<rect x="${px}" y="${sy(p.targetHigh)}" width="${W - 2 * px}" height="${sy(p.targetLow) - sy(p.targetHigh)}" fill="#e4f5ed"/>`
      : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="INR trend for the synthetic patient"><line x1="${px}" y1="${H - bottom}" x2="${W - px}" y2="${H - bottom}" stroke="#cfdde1"/>${band}${[
    0, 1, 2, 3, 4,
  ]
    .map((i) => {
      const y = top + ((H - top - bottom) * i) / 4;
      return `<line x1="${px}" y1="${y}" x2="${W - px}" y2="${y}" stroke="#e9eeee"/><text x="5" y="${y + 4}" font-size="12" fill="#8295a0">${(yMax - ((yMax - yMin) * i) / 4).toFixed(1)}</text>`;
    })
    .join(
      '',
    )}<polyline fill="none" stroke="#18858b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>${data.map((d, i) => `<circle cx="${sx(i)}" cy="${sy(d.value)}" r="4.5" fill="#18858b" stroke="white" stroke-width="2"><title>${e(d.date)}: ${e(d.value)}</title></circle>`).join('')}${data
    .filter((_, i) => i === 0 || i === data.length - 1)
    .map((d) => {
      const i = data.indexOf(d);
      return `<text x="${sx(i)}" y="${H - 14}" text-anchor="middle" font-size="12" fill="#8295a0">${e(dateLabel(d.date).slice(0, 6))}</text>`;
    })
    .join('')}</svg>`;
}
function pagePassport() {
  const p = getPatient();
  if (!p) return pagePatients();
  const result = latest(p),
    d = currentDose(p),
    follow = p.followups.at(-1),
    ttr = ttrForPatient(p, TODAY),
    dose = p.dosePlans.at(-1),
    baseline = reviewBaseline(p, result),
    allNotes = [
      ...p.encounters.map((v) => ({ date: v.date, text: v.note, by: v.enteredBy })),
      ...p.notes.map((v) => ({ date: v.date, text: v.text, by: v.by })),
    ]
      .filter((v) => v.text)
      .sort((a, b) => b.date.localeCompare(a.date));
  return `<button class="back-link" data-navto="patients">← Patient registry</button><header class="passport-header"><div><p class="eyebrow">PATIENT PASSPORT</p><h1>${e(p.name)}</h1><p>${e(p.mrn)} · ${ageFromDOB(p.dob, TODAY)} years · ${e(p.phone || 'No telephone')}</p></div><div class="mini-actions"><button class="btn" data-modal="edit">Edit details</button><button class="btn" data-modal="risk">High-risk status</button><button class="btn whatsapp-btn" data-care-message="reminder" aria-label="Prepare WhatsApp message" title="Prepare WhatsApp message"><svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 .8A15.1 15.1 0 0 0 3 23.5L.8 31.2l7.9-2.1A15.2 15.2 0 1 0 16 .8Zm0 27.7a12.5 12.5 0 0 1-6.4-1.8l-.5-.3-4.7 1.3 1.3-4.6-.3-.5A12.6 12.6 0 1 1 16 28.5Zm6.9-9.4c-.4-.2-2.2-1.1-2.5-1.2-.4-.1-.6-.2-.9.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7l-1.1-2.7c-.3-.7-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5s-1.3 1.3-1.3 3.1 1.4 3.6 1.6 3.9c.2.2 2.7 4.1 6.5 5.7.9.4 1.6.6 2.2.8.9.3 1.7.2 2.3.1.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.7-.5Z"/></svg><span class="sr-only">WhatsApp</span></button><button class="btn primary" data-modal="encounter">+ New INR encounter</button></div></header>${isHighRisk(p) ? `<section class="patient-risk-banner"><div><b>High-risk patient · ${e(riskCategoryLabel(p.riskCategory))}</b><p>${e(p.riskReason)}</p><small>Review: ${dateLabel(p.riskReviewDate)}${p.riskUpdatedBy ? ' · Recorded by ' + e(p.riskUpdatedBy) : ''}</small></div><button class="btn" data-modal="risk">Review flag</button></section>` : ''}
 ${workflowMarkup(p, connected, staff?.role)}${approvedPlanMarkup(p)}<section class="passport-metrics"><div><small>Target INR</small><strong>${e(p.targetLow ?? '—')}–${e(p.targetHigh ?? '—')}</strong><span>${e(p.diagnosis)}</span></div><div><small>Latest INR</small><strong>${e(result?.value ?? '—')} ${result ? tag(...rangeStatus(p, result.value)) : ''}</strong><span>${dateLabel(result?.date)}</span></div><div><small>Next INR test</small><strong>${dateLabel(follow?.inrDate)}</strong><span>Call ${dateLabel(follow?.callDate)}</span></div><div><small>Time in range · Rosendaal</small><strong>${ttr.percent === null ? '—' : ttr.percent + '%'}</strong><span>${ttr.percent === null ? ttr.reason : `${Math.round(ttr.observedDays)} days observed · ${ttr.provisional ? 'provisional' : '6-month maintenance'}`}</span></div><div><small>Recorded weekly dose</small><strong>${dose ? money(sumDose(d)) + ' mg' : '—'}</strong><span>${dose?.approvedBy ? 'Approved by ' + e(dose.approvedBy) : 'No authenticated approval'}</span></div></section>
 <nav class="passport-tabs" aria-label="Passport sections"><a href="#dose-review">Dose review</a><a href="#monitoring">INR & TTR</a><a href="#history">Dose history</a><a href="#followup">Follow-up</a><a href="#notes">Notes</a></nav>
 <section class="dose-review-card" id="dose-review"><div class="card-header"><div><h2>Dose review ${result ? '— INR ' + e(result.value) : ''}</h2><small>Source-linked reference support · clinician decisions are saved separately</small></div><button class="btn primary" data-modal="review">Review latest INR</button></div><div class="review-summary"><div class="review-next"><p class="form-help">${e(baseline.kind)}</p>${reviewResultMarkup(patientManagement(p), baseline.weekly)}${baseline.decision ? `<div class="saved-decision"><b>Saved clinician-entered decision: ${money(baseline.decision.weekly ?? sumDose(baseline.decision.daily))} mg/week</b><p>${e(baseline.decision.reason || '')} · ${baseline.decision.approvedBy ? 'Authenticated approval: ' + e(baseline.decision.approvedBy) : 'No authenticated approval'}</p><p>The reference above uses the previous regimen. It does not adjust this saved dose again.</p></div>` : ''}</div><div><span class="label">Recorded Sun–Sat schedule</span><div class="grid-days">${DAYS.map((day, i) => `<div class="dose-day"><small>${day}</small><strong>${e(d[i])} <span>mg</span></strong></div>`).join('')}</div></div></div>${result && result.value >= 4.5 ? '<div class="risk-callout">High INR: prompt clinician review. Do not wait for the routine follow-up date.</div>' : ''}<p class="source-line"><a href="${UW_SOURCE}" target="_blank" rel="noopener">UW Medicine: maintenance nomograms & monitoring</a> · <a href="${ACF_SOURCE}" target="_blank" rel="noopener">Anticoagulation Forum reference link</a> <span>AC Forum PDF contents remain unverified.</span></p></section>
 <section id="monitoring" class="section-grid monitor-grid"><section class="card chart-card"><div class="card-header"><h2>INR trend</h2><small>Patient-specific target range</small></div><div class="chart-container">${chart(p)}</div></section><section class="card ttr-detail"><div class="card-header"><h2>Time in therapeutic range</h2>${ttrBadge(ttr)}</div><div class="ttr-value">${ttr.percent === null ? '—' : ttr.percent + '%'}<span>${ttr.provisional ? 'Provisional estimate' : 'Six-month maintenance estimate'}</span></div><div class="ttr-coverage"><span style="width:${ttr.coverage}%"></span></div><p class="card-caption">${Math.round(ttr.observedDays)} observed days · ${ttr.coverage}% of the six-month window covered.</p><details class="method-details"><summary>Method, coverage & limitations</summary><p>Linear interpolation between results, with no extrapolation beyond them. Intervals over 56 days are excluded. First six weeks excluded only when warfarin start date is known. Current target is used; a changed historical target needs review. Clinic mean excludes provisional estimates.</p><p>${e(ttr.reason || '')}${ttr.excludedGaps ? ' · ' + ttr.excludedGaps + ' long interval(s) excluded.' : ''}</p><a href="https://www.nice.org.uk/guidance/ng196/chapter/recommendations#assessing-anticoagulation-control-with-vitamin-k-antagonists" target="_blank" rel="noopener">NICE: assessing VKA control</a></details></section></section>
 ${patientToolsMarkup(p, staff?.role)}<div id="history">${historyPanel(p)}</div><div id="followup">${followupPanel(p)}</div>
 <div class="section-grid"><section class="card"><div class="card-header"><h2>INR results</h2><button class="inline-action" data-modal="encounter">Add result</button></div><div class="table-wrap"><table><thead><tr><th>Test date</th><th>INR</th><th>Entered by</th></tr></thead><tbody>${[
   ...p.results,
 ]
   .sort((a, b) => b.date.localeCompare(a.date))
   .map(
     (r) =>
       `<tr><td>${dateLabel(r.date)}</td><td>${tag(String(r.value), rangeStatus(p, r.value)[1])}</td><td>${e(r.enteredBy)}</td></tr>`,
   )
   .join(
     '',
   )}</tbody></table></div></section><section id="notes" class="card"><div class="card-header"><h2>Clinical notes</h2><button class="inline-action" data-modal="note">+ Note</button></div>${allNotes.map((n) => `<div class="note-block"><small>${dateLabel(n.date)} · ${e(n.by)}</small>${e(n.text)}</div>`).join('') || '<div class="empty">No clinical notes.</div>'}</section></div>
 <div class="section-grid"><section class="card"><div class="card-header"><h2>Patient details</h2></div><div class="info-list">${[
   ['Date of birth', dateLabel(p.dob)],
   ['Caregiver', p.caregiver || '—'],
   ['Caregiver telephone', p.caregiverPhone || '—'],
   ['Warfarin started', dateLabel(p.warfarinStartDate)],
   ['Enrollment', dateLabel(p.enrollmentDate)],
   ['Initial INR', p.enrollmentInr || '—'],
 ]
   .map(([k, v]) => `<div><small>${k}</small><b>${e(v)}</b></div>`)
   .join(
     '',
   )}</div></section><section class="card"><div class="card-header"><h2>Patient tablet inventory</h2><button class="inline-action" data-modal="inventory">Update</button></div>${(p.inventory || []).map((i) => `<div class="queue-item"><div><b>${e(i.strength)} mg tablets</b><small>Confirmed ${dateLabel(i.date)}</small></div><b>${e(i.quantity)} tablets</b></div>`).join('') || '<div class="empty">No confirmed stock.</div>'}</section></div>`;
}
function historyPanel(p) {
  return `<section class="card history-card"><div class="card-header"><h2>Longitudinal dose history</h2>${connected && staff?.role === 'clinician' && p.encounters.length ? `<button class="btn" data-care-approve="${e(p.encounters.at(-1).id)}">Approve latest saved decision</button>` : ''}<small>Sun–Sat · mg · all regimens retained</small></div><div class="table-wrap"><table><thead><tr><th>Date / INR</th><th>Previous → new weekly</th><th>Change</th><th>Previous → new Sun–Sat</th><th>Reason / next INR</th><th>Entry / approval</th></tr></thead><tbody>${[
    ...p.dosePlans,
  ]
    .reverse()
    .map(
      (d) =>
        `<tr><td>${dateLabel(d.date)} / ${e(d.inr ?? 'Not linked')}</td><td>${e(d.previousWeekly ?? 'Unknown')} → ${e(d.weekly ?? sumDose(d.daily))} mg</td><td>${d.percentChange == null ? 'Not calculable' : e(d.percentChange) + '%'}</td><td>${e(d.previousDaily?.join(' / ') ?? 'Unknown')}<br>→ ${e(d.daily.join(' / '))}</td><td>${e(d.reason || 'Legacy record; reason unavailable')}<br>Next: ${dateLabel(d.nextInrDate)}${p.encounters.find((c) => c.id === d.encounterId)?.holdInstruction ? `<br>Hold: ${e(p.encounters.find((c) => c.id === d.encounterId).holdInstruction)}` : ''}${p.encounters.find((c) => c.id === d.encounterId)?.patientInstructions ? `<br>Instructions: ${e(p.encounters.find((c) => c.id === d.encounterId).patientInstructions)}` : ''}</td><td>${e(d.enteredBy)}<br>${e(d.enteredAt || 'Timestamp unavailable')}<br>${d.approvedBy ? e(d.approvedBy) + ' · ' + e(d.approvedAt) : 'No authenticated approval'}</td></tr>`,
    )
    .join('')}</tbody></table></div></section>`;
}
function followupPanel(p) {
  return `<section class="card history-card"><div class="card-header"><h2>Follow-up record</h2>${p.followups.some((f) => f.status !== 'Completed') ? '<button class="btn" data-modal="followup">Document follow-up</button>' : ''}</div>${p.followups.map((f) => `<div class="note-block"><b>Call ${dateLabel(f.callDate)} · ${e(f.status)}</b>${(f.attempts || []).map((a) => `<p>${e(a.timestamp)} · ${e(a.actor)} · ${e(a.outcome)}<br>${e(a.actions)}<br>${e(a.note)}</p>`).join('') || '<p>No attempts documented.</p>'}</div>`).join('')}</section>`;
}
function pageFollowups() {
  const q = worklist();
  return `${heading('Follow-up worklist', 'Routine calls are scheduled two calendar days after the planned INR check.')}
 <section class="card"><div class="table-wrap"><table><thead><tr><th>Patient</th><th>MRN</th><th>INR check</th><th>Call date</th><th>Last contact</th><th>Status</th><th>Action</th></tr></thead><tbody>${q.map((f) => `<tr><td class="strong">${e(f.name)}${riskBadge(f)}</td><td>${e(f.mrn)}</td><td>${dateLabel(f.inrDate)}</td><td>${dateLabel(f.callDate)}</td><td>${e(f.lastContact?.outcome || 'None logged')}</td><td>${tag(f.callDate < TODAY ? 'Overdue' : f.callDate === TODAY ? 'Due today' : 'Scheduled', f.callDate < TODAY ? 'overdue' : 'due')}</td><td><button class="btn sm" data-followup-open="${e(f.mrn)}|${e(f.id)}">Open Patient</button></td></tr>`).join('')}</tbody></table></div>${!q.length ? '<div class="empty">No pending follow-ups.</div>' : ''}</section><div class="warning-box">The 2-day rule is for routine administrative calls only. A clinically urgent INR or bleeding concern requires prompt review according to an approved clinic protocol.</div>`;
}
function pageInventory() {
  return `${heading('Warfarin inventory', 'Patient-reported tablet stock by strength. Estimates are not physical counts.')}
 <section class="card"><div class="table-wrap"><table><thead><tr><th>Patient</th><th>MRN</th><th>Tablet strength</th><th>Quantity</th><th>Checked</th><th></th></tr></thead><tbody>${patients.flatMap((p) => (p.inventory || []).map((it) => `<tr><td class="strong">${e(p.name)}</td><td>${e(p.mrn)}</td><td>${e(it.strength)} mg</td><td>${e(it.quantity)} tablets</td><td>${dateLabel(it.date)}</td><td><button class="btn sm" data-inventory-for="${e(p.mrn)}">Update</button></td></tr>`)).join('')}</tbody></table></div></section><div class="warning-box">Patient inventory is separate from any future clinic stock module. Do not assume medication has been taken solely because it was prescribed.</div>`;
}
let staffRequests = [],
  approvedStaff = [],
  staffListLoaded = false,
  staffListError = '',
  staffListBusy = false,
  staffDraft = { uid: '', email: '', displayName: '', role: 'subadmin', active: true };
function roleLabel(role) {
  return { admin: 'Administrator', clinician: 'Clinician', subadmin: 'Staff' }[role] || role;
}
async function loadApprovedStaff() {
  if (!connected || staff?.role !== 'admin' || staffListBusy) return;
  staffListBusy = true;
  try {
    const result = await Promise.all([api('users.list', {}), api('staff.requests.list', {})]);
    approvedStaff = result[0];
    staffRequests = result[1];
    staffListLoaded = true;
    staffListError = '';
  } catch (err) {
    staffListError = err.message;
  } finally {
    staffListBusy = false;
    if (view === 'staff') render();
  }
}
function clinicAccess() {
  return !!staff && ['admin', 'clinician', 'subadmin'].includes(staff.role);
}
function pageAccessStatus() {
  const pending = staff.role === 'pending',
    verify = staff.role === 'verify-email';
  return `<section class="login-layout"><div class="login-intro"><div class="login-brand"><span class="login-logo">W<sup>+</sup></span><span>Warfarin<br>Passport</span></div><h2>Clinic access, made simple.</h2></div><section class="card login-card"><h1>${pending ? 'Waiting for administrator approval' : verify ? 'Verify your email' : 'Contact your administrator'}</h1><p><b>${e(staff.email)}</b></p><p>${pending ? 'Your email is verified. Your access request is now in the administrator’s staff page. Patient records stay locked until they approve your role.' : verify ? 'Open the verification email, then select Check my access.' : 'Your clinic access is not active. Contact your administrator; you do not need to create another account.'}</p><p id="access-status" role="status"></p><div class="mini-actions"><button class="btn primary" id="check-access">Check my access</button>${verify ? '<button class="btn" id="resend-my-verification">Resend verification email</button>' : ''}<button class="btn" id="sign-out">Sign out</button></div><div class="login-patient-link"><a href="./portal.html">Patient or caregiver? Open your passport →</a></div></section></section>`;
}
function staffRequestPanel() {
  return `<section class="card pad"><h2>Staff awaiting approval <span class="count-chip">${staffRequests.length}</span></h2><p>These people verified their email and requested clinic access. Confirm their identity and choose their role here.</p>${
    staffRequests
      .map(
        (r) =>
          `<form class="staff-request-form" data-request-id="${e(r.id)}"><b>${e(r.email)}</b><small>Requested ${dateLabel(r.requestedAt.slice(0, 10))}</small><div class="form-grid">${field('displayName', 'Confirm staff name *', '', 'text', 'required maxlength="120"')}${selectField(
            'role',
            'Clinic role',
            [
              ['subadmin', 'Staff'],
              ['clinician', 'Clinician'],
              ['admin', 'Administrator'],
            ],
            'subadmin',
          )}</div><label class="checkbox-line"><input type="checkbox" name="confirmIdentity" required> I confirmed this person’s identity and clinic role</label><p class="request-status" role="status"></p><div class="mini-actions"><button class="btn primary" type="submit">Approve access</button><button class="btn" type="button" data-reject-staff="${e(r.id)}">Decline request</button></div></form>`,
      )
      .join('') ||
    '<p>No verified requests waiting. New staff appear here after verifying their email and signing in.</p>'
  }</section>`;
}
function pageLogin() {
  return `<section class="login-layout"><div class="login-intro"><div class="login-brand"><span class="login-logo">W<sup>+</sup></span><span>Warfarin<br>Passport</span></div><p class="eyebrow">ANTICOAGULATION SERVICE</p><h2>Your clinic, in one place.</h2><p>Review results, coordinate follow-up and share clear care plans with your patients.</p><div class="login-assurance">Authorized clinic access · Your role controls what you can see</div></div><section class="card login-card"><h1>Staff & administrator sign-in</h1><p class="login-subtitle">Welcome back. Sign in with your clinic account.</p><form id="login-form">${field('email', 'Staff email', '', 'email', 'required autocomplete="username"')}${field('password', 'Password', '', 'password', 'required autocomplete="current-password"')}<button class="login-show-password" type="button" id="login-show-password" aria-pressed="false">Show password</button><p id="login-error" role="alert" class="warning-box" hidden></p><button class="btn primary login-submit" type="submit">Sign in</button><p class="form-help">Administrators and staff use this same sign-in. Your approved role determines access.</p><div class="login-account-actions"><button class="btn" type="button" id="create-account">Create my account</button><button class="inline-action" type="button" id="reset-password">Reset password</button></div><details class="login-help"><summary>First time here?</summary><p>Create your account with a password of at least 12 characters, verify the email, then sign in to request clinic access. Your administrator approves the request inside this app.</p><button class="inline-action" type="button" id="verify-account">Resend verification email</button></details></form><div class="login-patient-link"><span>Patient or caregiver?</span><a href="./portal.html">Open your patient passport →</a></div><p class="login-development">Development workspace · Fictional records only</p></section></section>`;
}
function pageStaff() {
  if (!connected)
    return `${heading('Demo account', 'Demo mode has no administrator login. Use Staff sign-in for the connected database.')}<section class="card pad"><h2>Administrator and staff access</h2><p class="subtext">The same sign-in page is used for everyone. Your approved account role determines your access.</p><a class="btn primary" href="?mode=connected&view=staff">Staff / administrator sign-in</a></section>`;
  if (!staff) return pageLogin();
  const identity = `<section class="card pad"><div class="mini-actions"><b>${e(staff.displayName || staff.email)}</b>${tag(roleLabel(staff.role), 'good')}<button class="btn" id="sign-out">Sign out</button></div>${staff.role === 'admin' ? `<details class="deployment-details"><summary>Technical settings</summary><p class="form-help">Backend: ${e(staff.backendRelease || 'Earlier version')} · <a href="https://github.com/insaneCoro/Warfarin-Passport/blob/main/docs/AUTOMATED_DEPLOYMENT.md" target="_blank" rel="noopener">Deployment guide</a></p></details>` : ''}</section>`;
  if (staff.role !== 'admin')
    return `${heading('My account', 'You are signed into the connected clinic. Administrators manage staff access.')}${identity}`;
  return `${heading('Admin & staff', 'Manage approved access and development samples. This is the administrator area.')}${identity}${staffRequestPanel()}<section class="card pad"><button class="btn" data-care-clinic>Clinic contact details</button></section><div class="admin-layout"><section class="card"><div class="card-header"><div><h2>Approved staff</h2><small>Approve staff email addresses and manage clinic roles</small></div><button class="btn" id="refresh-staff">Refresh staff</button></div>${staffListError ? `<p class="warning-box">${e(staffListError)}</p>` : ''}${staffListLoaded ? `<div class="table-wrap"><table><thead><tr><th>Staff member</th><th>Role</th><th>Access</th><th></th></tr></thead><tbody>${approvedStaff.map((u) => `<tr><td><b>${e(u.displayName || u.email)}</b><small>${e(u.email)}</small>${String(u.uid).startsWith('invite:') ? '<small>Awaiting verified account</small>' : ''}</td><td>${e(roleLabel(u.role))}</td><td>${tag(String(u.active).toLowerCase() === 'true' ? 'Active' : 'Disabled', String(u.active).toLowerCase() === 'true' ? 'good' : 'neutral')}</td><td><button class="inline-action" data-edit-staff="${e(u.uid)}">Edit access</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Loading approved staff…</div>'}</section><section class="card"><div class="card-header"><h2>${staffDraft.uid ? 'Approve / update staff access' : 'Add a staff member'}</h2></div><form class="composer-body" id="staff-form"><p class="form-help">Add the staff member’s email and role here. Share this <a href="?mode=connected&view=staff">staff sign-in link</a> with them. They select Create my account and verify their email. No Firebase console or User UID is needed.</p><input name="uid" type="hidden" value="${e(staffDraft.uid)}">${field('email', 'Staff email *', staffDraft.email, 'email', 'required')}${field('displayName', 'Staff display name *', staffDraft.displayName, 'text', 'required maxlength="120"')}${selectField(
    'role',
    'Clinic role',
    [
      ['subadmin', 'Staff — entry and follow-up'],
      ['clinician', 'Clinician — clinical approval'],
      ['admin', 'Administrator — accounts/settings'],
    ],
    staffDraft.role,
  )}<label class="checkbox-line"><input name="active" type="checkbox" ${staffDraft.active ? 'checked' : ''}> Active access</label><p class="form-help">Administrator access does not add a clinician signature. You cannot disable or remove your own administrator access.</p><p id="staff-result" role="status" aria-live="polite"></p><div class="mini-actions"><button class="btn primary" type="submit">Save staff access</button><button class="btn" type="button" id="new-staff">Clear form</button></div></form></section></div><section class="card pad reset-card"><h2>Reset development workspace</h2><p>Fictional patients and handovers are populated automatically. Reset starts an empty workspace and turns off automatic fictional data. Historical records and audit events remain archived; staff accounts and configuration are preserved.</p>${workspaceError ? `<p class="warning-box" role="alert">${e(workspaceError)}</p><button class="btn" id="retry-workspace">Retry preparation</button>` : ''}${workspaceBusy ? '<p role="status">Preparing fictional workspace…</p>' : ''}<button class="btn danger" id="reset-workspace" ${staff.workspaceMode === 'empty' ? 'disabled' : ''}>Reset development workspace</button></section>`;
}
async function saveStaffAccess(form) {
  if (staff?.role !== 'admin') return;
  const button = form.querySelector('[type=submit]'),
    status = form.querySelector('#staff-result'),
    fd = new FormData(form);
  button.disabled = true;
  try {
    await api('users.upsert', {
      uid: String(fd.get('uid')).trim(),
      email: String(fd.get('email')).trim(),
      displayName: String(fd.get('displayName')).trim(),
      role: fd.get('role'),
      active: fd.has('active'),
    });
    staffDraft = { uid: '', email: '', displayName: '', role: 'subadmin', active: true };
    await loadApprovedStaff();
    toast('Staff access saved. New staff can create their account from the staff sign-in page.');
  } catch (err) {
    status.textContent = err.message;
    button.disabled = false;
  }
}

function render() {
  const locked = connected && !clinicAccess();
  document.body.classList.toggle('auth-screen', locked);
  document.querySelector('.sidebar').hidden = locked;
  if (locked) {
    view = 'staff';
    const alerts = document.querySelector('#urgent-alerts');
    if (alerts) alerts.innerHTML = '';
    modalRoot.innerHTML = '';
    screen.innerHTML = staff ? pageAccessStatus() : pageLogin();
    return;
  }
  let urgentRoot = document.querySelector('#urgent-alerts');
  if (!urgentRoot) {
    urgentRoot = document.createElement('section');
    urgentRoot.id = 'urgent-alerts';
    screen.before(urgentRoot);
  }
  urgentRoot.innerHTML = urgentAlertMarkup();
  const staffNav = document.querySelector('[data-nav=staff]');
  staffNav.innerHTML = `<span class="nav-ico">⚙</span>${connected && staff?.role === 'admin' ? 'Admin & staff' : connected && !staff ? 'Staff sign-in' : 'Staff & settings'}`;
  if (connected)
    document.querySelector('.user-pill').textContent = staff
      ? `${staff.displayName || staff.email} · ${uiText(roleLabel(staff.role))}`
      : 'Staff sign-in required';
  document.querySelector('#today-label').textContent = dateLabel(TODAY);
  document.querySelector('#nav-followups').textContent = worklist().filter((f) => f.callDate <= TODAY).length;
  nav
    .querySelectorAll('[data-nav]')
    .forEach((b) =>
      b.classList.toggle('active', b.dataset.nav === (view === 'passport' ? 'patients' : view)),
    );
  document.querySelector('#breadcrumb').textContent =
    `Clinic / ${view === 'passport' ? 'Patient passport' : view[0].toUpperCase() + view.slice(1)}`;
  screen.innerHTML = (
    {
      dashboard: pageDashboard,
      patients: pagePatients,
      passport: pagePassport,
      followups: pageFollowups,
      inventory: pageInventory,
      staff: pageStaff,
      messages: pageMessages,
    }[view] || pageDashboard
  )();
}
function field(name, label, value = '', type = 'text', attrs = '') {
  return `<div class="field"><label for="f-${name}">${e(label)}</label><input id="f-${name}" name="${name}" type="${type}" value="${e(value)}" ${attrs}></div>`;
}
function textArea(name, label, value = '') {
  return `<div class="field span-2"><label for="f-${name}">${e(label)}</label><textarea id="f-${name}" name="${name}" rows="3">${e(value)}</textarea></div>`;
}
function modal(title, form, submitLabel = 'Save') {
  modalRoot.innerHTML = `<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${e(title)}"><div class="modal-header"><h2>${e(title)}</h2><button class="modal-close" data-dismiss aria-label="Close">×</button></div><form id="modal-form"><div class="modal-body">${form}<p id="modal-save-error" role="alert"></p></div><div class="modal-actions"><button type="button" class="btn" data-dismiss>Cancel</button><button class="btn primary" type="submit">${e(submitLabel)}</button></div></form></div></div>`;
}
let modalType = '',
  modalReviewing = false;
function openModal(type) {
  const reviewing = type === 'review';
  modalReviewing = reviewing;
  if (reviewing) type = 'encounter';
  modalType = type;
  if (type === 'reset-workspace') {
    if (!connected || staff?.role !== 'admin') return;
    modal(
      'Reset development workspace',
      `<p>This starts an empty active workspace and disables automatic fictional data. Existing clinical history and audit events remain archived. Staff accounts, passwords and configuration are preserved.</p>${field('confirmation', 'Type RESET DEVELOPMENT DATA', '', 'text', 'required autocomplete="off"')}<label class="checkbox-line"><input name="confirmArchive" type="checkbox" required> I understand development records will leave the active workspace.</label>`,
      'Reset development workspace',
    );
    return;
  }
  const p = getPatient();
  if (type === 'risk') {
    modal('High-risk patient status', `<div class="form-grid">${riskFields(p)}</div>`, 'Save risk status');
    updateRiskFields();
    return;
  }
  if (type === 'patient' || type === 'edit') {
    const editing = type === 'edit';
    modal(
      editing ? 'Edit patient information' : 'Register synthetic patient',
      `<div class="form-grid">${field('mrn', 'MRN *', editing ? p.mrn : 'DEMO-', 'text', editing ? 'readonly' : 'required')}${field('name', 'Patient name *', editing ? p.name : '', 'text', 'required')}${field('dob', 'Date of birth *', editing ? p.dob : '', 'date', 'required')}${field('diagnosis', 'Diagnosis / indication *', editing ? p.diagnosis : '', 'text', 'required')}${field('phone', 'Contact number', editing ? p.phone : '')}${field('caregiver', 'Caregiver', editing ? p.caregiver : '')}${field('caregiverPhone', 'Caregiver phone', editing ? p.caregiverPhone : '')}${field('warfarinStartDate', 'Warfarin start date (if known)', editing ? p.warfarinStartDate : '', 'date')}${field('enrollmentDate', 'Enrollment date', editing ? p.enrollmentDate : TODAY, 'date')}${field('enrollmentInr', 'INR on enrollment', editing ? p.enrollmentInr : '', 'number', 'step="0.1" min="0" max="20"')}${field('targetLow', 'Target INR lower', editing ? p.targetLow : '', 'number', 'step="0.1" min="0" max="20"')}${field('targetHigh', 'Target INR upper', editing ? p.targetHigh : '', 'number', 'step="0.1" min="0" max="20"')}${riskFields(editing ? p : {})}</div><div class="warning-box">Demonstration only: enter fictional identifiers and patient information.</div>`,
    );
    updateRiskFields();
    return;
  }
  if (type === 'encounter') {
    const doses = currentDose(p),
      r = latest(p),
      contextOptions = [
        ['unknown', 'Not assessed'],
        ['no', 'No'],
        ['yes', 'Yes'],
      ];
    modal(
      reviewing ? 'Review INR and dosing decision' : 'New INR encounter',
      `<div class="form-grid review-form">${field('inrDate', 'Measured INR date *', reviewing ? r?.date || TODAY : TODAY, 'date', `required max="${TODAY}"`)}${field('inr', 'INR result *', reviewing ? r?.value || '' : '', 'number', 'min="0.1" max="20" step="0.1" required')}<fieldset id="review-context" class="span-2"><legend>Clinical context for reference suggestions</legend><div class="context-grid">${selectField('bleeding', 'Bleeding / emergency symptoms?', contextOptions)}${selectField('missed', 'Missed doses?', contextOptions)}${selectField('interactions', 'Medicine / diet changes?', contextOptions)}${selectField('illness', 'Acute illness / clinical risk?', contextOptions)}${selectField('recentChange', 'Dose changed in past 2 weeks?', contextOptions)}${selectField('baselineConfirmed', 'Previous regimen verified?', contextOptions)}</div></fieldset><div id="reference-output" class="span-2"></div><div class="decision-divider span-2"><h3>Clinician-entered decision</h3><p>Reference values above are never inserted into these fields.</p></div>${field('weeklyMg', 'New weekly dose (mg) *', sumDose(doses), 'number', 'min="0" max="700" step="0.01" required')}${field('nextInrDate', 'Next INR test date *', '', 'date', 'required')}${field('holdInstruction', 'Hold instruction (if clinically ordered)')}${field('callPreview', 'Routine call date', '', 'text', 'readonly')}<div class="field span-2"><label>Daily doses in mg · Sunday to Saturday</label><div class="dose-entry">${DAYS.map((day, i) => `<label>${day}<input aria-label="${day} dose" name="dose${i}" type="number" min="0" max="100" step="0.5" required value="${e(doses[i])}"></label>`).join('')}</div><p class="schedule-total" id="daily-total"></p></div>${textArea('reason', 'Reason for this dosing decision *')}${textArea('patientInstructions', 'Patient instructions — English (approved with this plan)')}${textArea('holdInstructionAr', 'Temporary hold — Arabic (if applicable)')}${textArea('patientInstructionsAr', 'Patient instructions — Arabic (for Arabic messages)')}${textArea('note', 'Clinical assessment and notes')}${connected && staff?.role === 'clinician' ? `<label class="checkbox-line span-2"><input type="checkbox" name="approveDecision">Save and approve this decision as ${e(staff.displayName || staff.uid)}</label>` : '<p class="form-help span-2">Saving does not add a clinician signature. Authenticated approval is recorded separately.</p>'}</div>`,
      'Save draft care plan',
    );
    updateDoseReview();
    initInrWizard(document.querySelector('#modal-form'));
    return;
  }
  if (type === 'whatsapp') {
    modal(
      'WhatsApp · setup pending',
      '<div class="empty"><h3>Patient messaging</h3><p>The WhatsApp button is ready for the next setup step. Arabic/English dosing messages and manual sending will be configured later.</p></div>',
      'Close',
    );
    return;
  }
  if (type === 'followup') {
    modal(
      'Document follow-up',
      `<div class="form-grid"><div class="field"><label for="f-followupId">Pending task</label><select id="f-followupId" name="followupId">${p.followups
        .filter((f) => f.status !== 'Completed')
        .map((f) => `<option value="${e(f.id)}">Call ${dateLabel(f.callDate)}</option>`)
        .join(
          '',
        )}</select></div><div class="field"><label for="f-outcome">Call outcome</label><select id="f-outcome" name="outcome"><option>No answer</option><option>Unable to contact</option><option>Contacted</option><option>Escalated</option></select></div><div class="field span-2"><label for="f-encounterId">Link saved INR / dosing decision (optional)</label><select id="f-encounterId" name="encounterId"><option value="">No INR or dosing change this call</option>${p.encounters.map((c) => `<option value="${e(c.id)}">${dateLabel(c.date)} · ${e(c.inr ?? 'Legacy encounter')}</option>`).join('')}</select></div>${textArea('actions', 'Clinical actions / contact attempt *')}${textArea('note', 'Call notes')}<label><input type="checkbox" name="complete"> Complete this task after saving the documented action</label></div><div class="warning-box">Record INR and dosing changes using New INR encounter before completing the call. Failed contact remains pending.</div>`,
    );
    return;
  }
  if (type === 'inventory') {
    modal(
      'Update patient tablet inventory',
      `<div class="form-grid">${field('strength', 'Tablet strength (mg) *', 5, 'number', 'min="0.5" max="20" step="0.5" required')}${field('quantity', 'Confirmed tablets remaining *', '', 'number', 'min="0" step="1" required')}${field('confirmedDate', 'Stock confirmation date', TODAY, 'date')}</div><div class="warning-box">Record a confirmed stock count. Do not calculate adherence from prescribed doses alone.</div>`,
    );
    return;
  }
  if (type === 'note') {
    modal(
      'Add dated clinical note',
      `<div class="form-grid">${field('noteDate', 'Note date', TODAY, 'date')}<div class="field"><label for="f-supersedes">Amend prior note (optional)</label><select id="f-supersedes" name="supersedes"><option value="">New note</option>${p.notes.map((n) => `<option value="${e(n.id)}">${dateLabel(n.date)} · ${e(n.text.slice(0, 55))}</option>`).join('')}</select></div>${textArea('note', 'Clinical note *')}</div>`,
    );
    return;
  }
}
async function submitForm(fd) {
  if (modalType === 'reset-workspace') {
    if (!connected || staff?.role !== 'admin') throw Error('Administrator required');
    await api('workspace.reset', {
      requestId: resetRequestId || (resetRequestId = crypto.randomUUID()),
      confirmation: fd.get('confirmation'),
      confirmArchive: fd.has('confirmArchive'),
    });
    modalRoot.innerHTML = '';
    signOut();
    staff = null;
    patients = [];
    teamMessages = [];
    teamLoaded = false;
    selectedMRN = null;
    view = 'staff';
    render();
    toast('Empty workspace ready. Sign in again. Historical records and staff access are preserved.');
    return;
  }
  if (modalType === 'risk' && !connected) {
    Object.assign(getPatient(), riskPayload(fd), {
      riskUpdatedBy: 'Unverified demo staff',
      riskUpdatedAt: new Date().toISOString(),
    });
    save();
    modalRoot.innerHTML = '';
    render();
    toast('Synthetic risk flag saved locally');
    return;
  }
  if (modalType === 'whatsapp') {
    modalRoot.innerHTML = '';
    return;
  }
  if (modalType === 'encounter') {
    const total = DAYS.reduce((sum, _, i) => sum + Number(fd.get('dose' + i)), 0);
    if (Math.abs(total - Number(fd.get('weeklyMg'))) > 0.01)
      throw Error('Daily doses must match the entered weekly dose');
  }
  if (connected) {
    await submitRemote(fd);
    return;
  }
  if (modalType === 'patient' || modalType === 'edit') {
    const updating = modalType === 'edit';
    const mrn = String(fd.get('mrn') || '')
        .trim()
        .toUpperCase(),
      name = String(fd.get('name') || '').trim(),
      dob = fd.get('dob'),
      diagnosis = String(fd.get('diagnosis') || '').trim();
    if (!mrn || !name || !dob || !diagnosis)
      throw Error('MRN, name, date of birth, and diagnosis are required.');
    if (!updating && patients.some((p) => p.mrn === mrn)) throw Error('This MRN already exists.');
    if (dob > TODAY) throw Error('Date of birth cannot be in the future.');
    if (!mrn.startsWith('DEMO-')) throw Error('Use a DEMO- MRN in this prototype, never a real MRN.');
    const targetLow = fd.get('targetLow') === '' ? null : Number(fd.get('targetLow')),
      targetHigh = fd.get('targetHigh') === '' ? null : Number(fd.get('targetHigh'));
    if ((targetLow === null) !== (targetHigh === null) || (targetLow !== null && targetLow >= targetHigh))
      throw Error('Enter a valid INR target range, or leave both fields empty.');
    const obj = {
      mrn,
      name,
      dob,
      diagnosis,
      phone: fd.get('phone'),
      caregiver: fd.get('caregiver'),
      caregiverPhone: fd.get('caregiverPhone'),
      enrollmentDate: fd.get('enrollmentDate'),
      enrollmentInr: fd.get('enrollmentInr'),
      targetLow,
      targetHigh,
      warfarinStartDate: fd.get('warfarinStartDate') || '',
      ...riskPayload(fd),
    };
    if (updating) Object.assign(getPatient(), obj);
    else
      patients.push({
        ...obj,
        status: 'Active',
        results: [],
        dosePlans: [],
        encounters: [],
        notes: [],
        inventory: [],
        followups: [],
      });
    selectedMRN = mrn;
    view = 'passport';
  } else if (modalType === 'encounter') {
    const p = getPatient(),
      inr = Number(fd.get('inr')),
      inrDate = fd.get('inrDate'),
      nextInrDate = fd.get('nextInrDate'),
      daily = DAYS.map((_, i) => Number(fd.get('dose' + i)));
    if (!Number.isFinite(inr) || inr <= 0 || inr > 20) throw Error('Enter a valid INR result.');
    if (!inrDate || !nextInrDate) throw Error('Enter both INR test and next test dates.');
    if (nextInrDate < inrDate) throw Error('Next INR must not precede the current INR test.');
    if (daily.some((x) => !Number.isFinite(x) || x < 0 || x > 100))
      throw Error('Enter valid non-negative daily dose values.');
    if (!String(fd.get('reason') || '').trim()) throw Error('Enter the reason for the dose decision.');
    const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
    p.results.push({
      id: 'R-' + id,
      date: inrDate,
      value: inr,
      encounterId: 'E-' + id,
      enteredAt: new Date().toISOString(),
      enteredBy: 'Unverified demo staff',
      targetLow: p.targetLow,
      targetHigh: p.targetHigh,
    });
    const reason = String(fd.get('reason') || '').trim();
    if (!reason) throw Error('Enter the reason for the dose decision.');
    p.dosePlans.push({
      id: 'D-' + id,
      encounterId: 'E-' + id,
      date: inrDate,
      ...doseSummary(p.dosePlans.at(-1)?.daily ?? null, daily),
      inr,
      reason,
      nextInrDate,
      enteredAt: new Date().toISOString(),
      enteredBy: 'Unverified demo staff',
      approvedBy: null,
      approvedAt: null,
    });
    p.encounters.push({
      id: 'E-' + id,
      date: inrDate,
      note: String(fd.get('note') || ''),
      inr,
      nextInrDate,
      holdInstruction: String(fd.get('holdInstruction') || ''),
      patientInstructions: String(fd.get('patientInstructions') || ''),
      holdInstructionAr: String(fd.get('holdInstructionAr') || ''),
      patientInstructionsAr: String(fd.get('patientInstructionsAr') || ''),
      reviewFactors: JSON.stringify(
        Object.fromEntries(
          ['bleeding', 'missed', 'interactions', 'illness', 'recentChange', 'baselineConfirmed'].map((k) => [
            k,
            fd.get(k),
          ]),
        ),
      ),
      enteredBy: 'Unverified demo staff',
    });
    p.followups.push({
      id: 'F-' + id,
      inrDate: nextInrDate,
      callDate: addDays(nextInrDate, 2),
      status: 'Pending',
    });
  } else if (modalType === 'followup') {
    const p = getPatient(),
      f = p.followups.find((x) => x.id === fd.get('followupId'));
    if (!f) throw Error('Select a pending follow-up');
    const attempt = followupAttempt(
      f,
      {
        id: crypto.randomUUID(),
        outcome: fd.get('outcome'),
        actions: fd.get('actions'),
        note: fd.get('note'),
        encounterId: fd.get('encounterId'),
        complete: fd.has('complete'),
      },
      'Unverified demo staff',
      new Date().toISOString(),
    );
    (f.attempts ||= []).push(attempt);
    if (attempt.completed) {
      f.status = 'Completed';
      f.completedAt = attempt.timestamp;
    }
  } else if (modalType === 'inventory') {
    const p = getPatient(),
      strength = Number(fd.get('strength')),
      quantity = Number(fd.get('quantity'));
    if (!(strength > 0 && quantity >= 0 && Number.isInteger(quantity)))
      throw Error('Enter a valid strength and whole-tablet quantity.');
    const old = p.inventory.find((x) => x.strength === strength);
    if (old) {
      old.quantity = quantity;
      old.date = fd.get('confirmedDate');
    } else p.inventory.push({ strength, quantity, date: fd.get('confirmedDate') });
  } else if (modalType === 'note') {
    const note = String(fd.get('note') || '').trim();
    if (!note) throw Error('Note cannot be blank.');
    getPatient().notes.push({
      id: String(Date.now()),
      date: fd.get('noteDate'),
      text: note,
      supersedes: fd.get('supersedes') || null,
      by: 'Unverified demo staff',
    });
  }
  save();
  modalRoot.innerHTML = '';
  render();
  toast('Saved in synthetic browser demo only.');
}
document.addEventListener('click', (ev) => {
  const b = ev.target.closest('button,[data-open]');
  if (!b) return;
  if (b.id === 'check-access') {
    b.disabled = true;
    refreshAccess()
      .then(async (user) => {
        staff = user;
        if (clinicAccess()) {
          await prepareWorkspace();
          await refreshRemote();
          view = 'dashboard';
        }
        render();
      })
      .catch((err) => {
        const status = document.querySelector('#access-status');
        if (status) status.textContent = err.message;
        b.disabled = false;
      });
    return;
  }
  if (b.id === 'resend-my-verification') {
    b.disabled = true;
    resendMyVerification()
      .then(() => {
        document.querySelector('#access-status').textContent =
          'Verification email sent. Open it, then select Check my access.';
      })
      .catch((err) => toast(err.message))
      .finally(() => (b.disabled = false));
    return;
  }
  if (b.dataset.rejectStaff) {
    b.disabled = true;
    api('staff.requests.review', { id: b.dataset.rejectStaff, decision: 'reject' })
      .then(loadApprovedStaff)
      .catch((err) => toast(err.message))
      .finally(() => (b.disabled = false));
    return;
  }
  if (b.id === 'login-show-password') {
    const input = document.querySelector('#login-form [name=password]'),
      show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Hide password' : 'Show password';
    b.setAttribute('aria-pressed', String(show));
    return;
  }
  if (b.id === 'interface-language') {
    toggleInterfaceLanguage();
    return;
  }
  if (handleCareClick(b, careContext())) return;
  if (['create-account', 'verify-account', 'reset-password'].includes(b.id)) {
    handleAccountAction(b);
    return;
  }
  if (b.id === 'refresh-clinic') {
    refreshClinic();
    return;
  }
  if (b.id === 'refresh-staff') {
    loadApprovedStaff();
    return;
  }
  if (b.id === 'new-staff') {
    staffDraft = { uid: '', email: '', displayName: '', role: 'subadmin', active: true };
    render();
    return;
  }
  if (b.dataset.editStaff) {
    const u = approvedStaff.find((u) => u.uid === b.dataset.editStaff);
    staffDraft = { ...u, active: String(u.active).toLowerCase() === 'true' };
    render();
    document.querySelector('#staff-form').scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }
  if (b.id === 'refresh-messages') {
    refreshTeamMessages();
    return;
  }
  if (b.id === 'older-messages') {
    refreshTeamMessages(true);
    return;
  }
  if (b.dataset.reply) {
    const m = teamMessages.find((m) => m.id === b.dataset.reply);
    messageDraft.replyTo = m.id;
    messageDraft.patientId = m.patientId || '';
    render();
    document.querySelector('#message-body').focus();
    return;
  }
  if (b.id === 'cancel-reply') {
    messageDraft.replyTo = '';
    messageDraft.requestId = null;
    render();
    return;
  }
  if (b.dataset.filter) {
    dashboardFilter = b.dataset.filter;
    render();
    return;
  }
  if (b.id === 'reset-workspace') {
    openModal('reset-workspace');
    return;
  }
  if (b.id === 'retry-workspace') {
    prepareWorkspace().then(refreshRemote).then(render);
    return;
  }
  if (b.dataset.nav) {
    view = b.dataset.nav;
    selectedMRN = null;
    render();
    if (view === 'messages') refreshTeamMessages();
    if (view === 'staff' && staff?.role === 'admin') loadApprovedStaff();
  } else if (b.dataset.navto) {
    view = b.dataset.navto;
    render();
    if (view === 'messages') refreshTeamMessages();
    if (view === 'staff' && staff?.role === 'admin') loadApprovedStaff();
  } else if (b.dataset.open) {
    openPatient(b.dataset.open);
  } else if (b.dataset.modal) {
    openModal(b.dataset.modal);
  } else if (b.hasAttribute('data-dismiss')) {
    modalRoot.innerHTML = '';
  } else if (b.dataset.inventoryFor) {
    selectedMRN = b.dataset.inventoryFor;
    openModal('inventory');
  } else if (b.dataset.followupOpen) {
    const [mrn] = b.dataset.followupOpen.split('|');
    openPatient(mrn);
  } else if (b.id === 'approve-decision') {
    api('decisions.approve', { encounterId: b.dataset.encounter })
      .then(refreshRemote)
      .then(render)
      .catch((err) => toast(err.message));
  } else if (b.id === 'sign-out') {
    signOut();
    modalRoot.innerHTML = '';
    staff = null;
    patients = [];
    staffRequests = [];
    approvedStaff = [];
    staffListLoaded = false;
    staffListError = '';
    staffDraft = { uid: '', email: '', displayName: '', role: 'subadmin', active: true };
    search = '';
    dashboardSearch = '';
    dashboardFilter = 'all';
    remoteRefreshedAt = '';
    remoteRefreshError = '';
    selectedMRN = null;
    view = 'staff';
    teamMessages = [];
    teamLoaded = false;
    messageDraft = { body: '', patientId: '', replyTo: '', requestId: null };
    render();
  }
});
document.addEventListener('submit', async (ev) => {
  if (ev.target.matches('.staff-request-form')) {
    ev.preventDefault();
    const form = ev.target,
      fd = new FormData(form),
      button = form.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await api('staff.requests.review', {
        id: form.dataset.requestId,
        decision: 'approve',
        displayName: fd.get('displayName'),
        role: fd.get('role'),
        confirmIdentity: fd.has('confirmIdentity'),
      });
      await loadApprovedStaff();
      toast('Clinic access approved. They can select Check my access or sign in again.');
    } catch (err) {
      form.querySelector('.request-status').textContent = err.message;
      button.disabled = false;
    }
    return;
  }
  if (ev.target.id === 'care-form') {
    ev.preventDefault();
    await submitCare(ev.target, careContext());
    return;
  }
  if (ev.target.id === 'staff-form') {
    ev.preventDefault();
    await saveStaffAccess(ev.target);
    return;
  }
  if (ev.target.id === 'message-form') {
    ev.preventDefault();
    await sendTeamMessage(ev.target);
    return;
  }
  if (ev.target.id === 'login-form') {
    ev.preventDefault();
    const submit = ev.target.querySelector('[type=submit]');
    submit.disabled = true;
    const message = ev.target.querySelector('#login-error');
    message.hidden = true;
    try {
      const fd = new FormData(ev.target);
      staff = await signIn(fd.get('email'), fd.get('password'));
      if (!clinicAccess()) {
        render();
        return;
      }
      await prepareWorkspace();
      await refreshRemote();
      view = new URLSearchParams(location.search).get('view') === 'staff' ? 'staff' : 'dashboard';
      render();
      if (view === 'staff' && staff.role === 'admin') loadApprovedStaff();
    } catch (err) {
      if (staff) {
        remoteRefreshError = err.message;
        view = 'dashboard';
        render();
        return;
      }
      staff = null;
      patients = [];
      signOut();
      message.textContent = err.message;
      message.hidden = false;
      submit.disabled = false;
    }
    return;
  }
  if (ev.target.id === 'modal-form') {
    ev.preventDefault();
    try {
      const button = ev.target.querySelector('[type=submit]');
      button.disabled = true;
      await submitForm(new FormData(ev.target));
    } catch (err) {
      toast(err.message);
      const status = ev.target.querySelector('#modal-save-error');
      if (status) status.textContent = err.message;
      ev.target.querySelector('[type=submit]').disabled = false;
    }
  }
});
document.addEventListener('input', (ev) => {
  if (ev.target.closest('#care-form')) {
    if (ev.target.name === 'phone') {
      const check = ev.target.form.elements.phoneVerified;
      if (check) check.checked = false;
    }
    if (ev.target.name === 'confirmedTabletStrength') {
      const check = ev.target.form.elements.tabletStrengthConfirmed;
      if (check) check.checked = false;
    }
    return;
  }
  if (ev.target.name === 'riskLevel') {
    updateRiskFields();
    return;
  }
  if (ev.target.closest('#staff-form')) {
    staffDraft[ev.target.name] = ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value;
    return;
  }
  if (ev.target.id === 'message-body') {
    messageDraft.body = ev.target.value;
    return;
  }
  if (ev.target.id === 'message-patient') {
    messageDraft.patientId = ev.target.value;
    return;
  }
  if (ev.target.id === 'patient-search') {
    const pos = ev.target.selectionStart;
    search = ev.target.value;
    const term = search.toLowerCase();
    const found = patients.filter((p) =>
      [p.mrn, p.name, p.phone].some((s) => String(s).toLowerCase().includes(term)),
    );
    screen.querySelector('.card').innerHTML = tablePatients(found);
    ev.target.setSelectionRange(pos, pos);
  } else if (ev.target.id === 'dashboard-search') {
    dashboardSearch = ev.target.value;
    document.querySelector('#dashboard-registry').innerHTML = tablePatients(filteredDashboardPatients());
  } else if (document.querySelector('#reference-output')) {
    updateDoseReview();
    if (ev.target.name === 'nextInrDate') {
      try {
        document.querySelector('[name=callPreview]').value = dateLabel(addDays(ev.target.value, 2));
      } catch {}
    }
  }
});
async function submitRemote(fd) {
  const p = getPatient();
  let action, params;
  const values = Object.fromEntries(fd);
  if (modalType === 'risk') {
    action = 'patients.update';
    params = { patientId: p.id, expectedVersion: p.rowVersion, ...riskPayload(fd) };
  } else if (modalType === 'patient' || modalType === 'edit') {
    action = modalType === 'edit' ? 'patients.update' : 'patients.create';
    params = { ...values, patientId: p?.id, expectedVersion: p?.rowVersion };
    if (!values.mrn.startsWith('DEMO-')) throw Error('Synthetic DEMO- identifiers only');
  } else if (modalType === 'encounter') {
    action = 'encounters.create';
    params = {
      patientId: p.id,
      expectedVersion: p.rowVersion,
      requestId: requestKey(),
      testDate: values.inrDate,
      inr: values.inr,
      nextInrDate: values.nextInrDate,
      daily: DAYS.map((_, i) => Number(values['dose' + i])),
      reason: values.reason,
      note: values.note,
      weeklyMg: values.weeklyMg,
      holdInstruction: values.holdInstruction,
      patientInstructions: values.patientInstructions,
      holdInstructionAr: values.holdInstructionAr,
      patientInstructionsAr: values.patientInstructionsAr,
      reviewFactors: JSON.stringify(
        Object.fromEntries(
          ['bleeding', 'missed', 'interactions', 'illness', 'recentChange', 'baselineConfirmed'].map((k) => [
            k,
            values[k],
          ]),
        ),
      ),
    };
  } else if (modalType === 'followup') {
    action = 'followups.record';
    params = { ...values, requestId: requestKey(), complete: fd.has('complete') };
  } else if (modalType === 'note') {
    action = 'notes.create';
    params = { patientId: p.id, noteDate: values.noteDate, text: values.note, supersedes: values.supersedes };
  } else if (modalType === 'inventory') {
    action = 'inventory.set';
    params = {
      patientId: p.id,
      strengthMg: values.strength,
      quantity: values.quantity,
      confirmedDate: values.confirmedDate,
    };
  }
  const saved = await api(action, params);
  if (action === 'encounters.create' && fd.has('approveDecision')) {
    try {
      await api('decisions.approve', { encounterId: saved.id });
    } catch {
      await refreshRemote();
      throw Error(
        'Encounter saved; approval did not complete. Review the saved decision before trying approval again.',
      );
    }
  }
  await refreshRemote();
  if (modalType === 'patient') {
    selectedMRN = values.mrn.toUpperCase();
    view = 'passport';
  }
  modalRoot.innerHTML = '';
  render();
  toast('Saved to authenticated synthetic database');
}
function requestKey() {
  const form = document.querySelector('#modal-form');
  return (form.dataset.requestId ||= crypto.randomUUID());
}

if (connected) {
  view = 'staff';
  document.querySelector('.sidebar-foot').textContent = 'Clinic workspace · Synthetic records only';
  document.querySelector('.demo-banner').innerHTML =
    '<span class="demo-pulse"></span><b>STAFF SIGN-IN</b><span>Clinic workspace · Fictional records for development.</span>';
  document.querySelector('.footnote').textContent =
    'Warfarin Passport · Connected test environment · Clinical validation pending.';
}
if (!connected && connectionAvailable) {
  document
    .querySelector('.demo-banner')
    .insertAdjacentHTML('beforeend', '<a class="btn sm" href="?mode=connected">Staff sign-in</a>');
}
render();

async function handleAccountAction(button) {
  const form = document.querySelector('#login-form'),
    fd = new FormData(form),
    message = form.querySelector('#login-error');
  if (!form.querySelector('[name=email]').reportValidity()) return;
  if (button.id !== 'reset-password' && !form.querySelector('[name=password]').reportValidity()) return;
  const buttons = [...form.querySelectorAll('button')];
  buttons.forEach((b) => (b.disabled = true));
  message.hidden = false;
  try {
    if (button.id === 'create-account') {
      await createStaffAccount(fd.get('email'), fd.get('password'));
      message.textContent =
        'Verification email sent. Open it, verify your email, then return here and sign in. Your administrator must approve this email for clinic access.';
    } else {
      await sendAccountEmail(fd.get('email'), fd.get('password'), button.id === 'verify-account');
      message.textContent =
        button.id === 'verify-account'
          ? 'Verification email sent. Verify your email, then sign in again.'
          : 'If the account exists, a password-reset email will arrive shortly.';
    }
    form.querySelector('[name=password]').value = '';
  } catch (err) {
    message.textContent = err.message;
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

let resetRequestId = null;
async function prepareWorkspace() {
  if (
    !connected ||
    staff?.role !== 'admin' ||
    staff.workspaceReady === true ||
    staff.workspaceMode === 'empty'
  )
    return;
  workspaceBusy = true;
  workspaceError = '';
  try {
    for (let i = 0; i < 25; i++) {
      const status = document.querySelector('#login-error');
      if (status) {
        status.hidden = false;
        status.textContent = 'Preparing the fictional clinic workspace… ' + (i + 1);
      }
      const result = await api('workspace.prepare', {});
      if (!result.remaining) {
        staff.workspaceReady = true;
        return;
      }
    }
    throw Error('Workspace preparation paused. Retry from Admin & staff.');
  } catch (err) {
    workspaceError = err.message;
  } finally {
    workspaceBusy = false;
  }
}
function urgentAlertMarkup() {
  if (connected && !staff) return '';
  const refresh = connected
    ? `${workspaceError && staff?.role === 'admin' ? `<div class="warning-box" role="alert">Fictional workspace preparation paused: ${e(workspaceError)} <button class="btn sm" data-navto="staff">Open Admin & staff</button></div>` : ''}<div class="clinic-refresh"><button class="btn sm" id="refresh-clinic">Refresh clinic</button><span>${remoteRefreshError ? 'Refresh failed: ' + e(remoteRefreshError) : 'Last refreshed ' + e(remoteRefreshedAt || '—') + ' · checks every 60 seconds while this page is visible'}</span></div>`
    : '';
  const reports = reportedUrgentCases(patients);
  const reportMarkup = reports.length
    ? `<div class="urgent-banner reported-results" role="region" aria-label="Unverified patient reports"><h2>Patient-reported results need prompt verification</h2><p>These readings are unverified and have not changed the clinical INR or dose.</p>${reports.map((r) => `<div class="urgent-row"><span>${e(r.name)} · Patient-reported INR ${e(r.inr)} · ${dateLabel(r.date)}</span><button class="btn" data-care-inbox>Review patient requests</button></div>`).join('')}</div>`
    : '';
  const cases = urgentCases(patients, TODAY);
  if (!cases.length) return refresh + reportMarkup;
  return `${refresh}${reportMarkup}<div class="urgent-banner" role="region" aria-label="Urgent clinical reviews"><h2>⚠ ${cases.length} urgent clinical review${cases.length === 1 ? '' : 's'} — action required</h2><p>Review symptoms and arrange clinician assessment. Emergency symptoms require emergency care; do not wait for routine recall. Alerts reflect the latest recorded INR and remain until a newer result changes the risk.</p>${cases.map((c) => `<div class="urgent-row"><div><b>${e(c.name)} · INR ${e(c.inr)}</b><span>${e(c.reason)} · ${dateLabel(c.date)}${c.stale ? ' · Historical result: confirm current status promptly' : ''}</span></div><button class="btn" data-open="${e(c.mrn)}">Open patient</button></div>`).join('')}</div>`;
}

async function refreshClinic() {
  if (!connected || !clinicAccess() || remoteRefreshBusy || workspaceBusy || modalRoot.innerHTML) return;
  remoteRefreshBusy = true;
  try {
    await refreshRemote();
  } catch (err) {
    remoteRefreshError = err.message;
  } finally {
    remoteRefreshBusy = false;
    render();
  }
}
setInterval(() => {
  if (document.visibilityState === 'visible' && view !== 'staff' && view !== 'messages') refreshClinic();
}, 60000);

function careContext() {
  return {
    connected,
    staff,
    patients,
    scopePatient: getPatient(),
    patient: getPatient,
    api,
    modal,
    openFollowup: () => {
      openModal('followup');
      const p = getPatient(),
        latest = careStatus(p).latest,
        f = p.followups.find((f) => f.encounterId === latest?.id && f.status !== 'Completed');
      if (f) {
        document.querySelector('[name=followupId]').value = f.id;
        const link = document.querySelector('[name=encounterId]');
        if (link) link.value = latest.id;
      }
    },
    refresh: refreshRemote,
    close: () => {
      modalRoot.innerHTML = '';
    },
    render,
    toast,
    filter: (key) => {
      dashboardFilter = key;
      view = 'dashboard';
      render();
      document.querySelector('#dashboard-registry')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    open: (id) => {
      modalRoot.innerHTML = '';
      const p = patients.find((p) => (connected ? p.id : p.mrn) === id);
      if (p) openPatient(p.mrn);
    },
  };
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && view !== 'staff' && view !== 'messages') refreshClinic();
});

new MutationObserver(() => applyInterfaceLanguage()).observe(document.querySelector('#app'), {
  childList: true,
  subtree: true,
});
new MutationObserver(() => applyInterfaceLanguage()).observe(modalRoot, { childList: true, subtree: true });
applyInterfaceLanguage();
