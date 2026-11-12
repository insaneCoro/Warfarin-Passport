import { dateLabel } from './date-utils.mjs?v=__BUILD__';
import { buildPatientMessage } from './care-messages.mjs?v=__BUILD__';
const esc = (x) =>
  String(x ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const readableDate = (x) => (x ? dateLabel(String(x).slice(0, 10)) : 'Not set');
const truth = (v) => v === true || String(v).toLowerCase() === 'true';
export function careStatus(p) {
  const latest = p.encounters?.at(-1),
    plan = latest && p.dosePlans.find((d) => d.encounterId === latest.id),
    approved = !!plan?.approvedBy,
    sent =
      approved &&
      (p.communications || []).some(
        (c) =>
          c.planId === plan.id &&
          c.kind === 'care-plan' &&
          c.outcome === 'Sent manually' &&
          !truth(c.staleAtRecording),
      );
  const informed =
    sent &&
    (p.followups || []).some(
      (f) =>
        f.encounterId === latest?.id &&
        f.status === 'Completed' &&
        (f.attempts || []).some((a) => a.outcome === 'Contacted' && a.completed),
    );
  return { latest, plan, approved, sent, informed };
}
export function todayTasks(patients, today) {
  return {
    due: patients.filter((p) => p.followups.some((f) => f.status !== 'Completed' && f.inrDate <= today)),
    review: patients.filter((p) => {
      const s = careStatus(p);
      return s.latest && !s.approved;
    }),
    inform: patients.filter((p) => {
      const s = careStatus(p);
      return s.approved && !s.informed;
    }),
  };
}
export function todayMarkup(patients, today, allowShared = false) {
  const tasks = todayTasks(patients, today);
  return `<section class="card today-work"><div class="card-header"><div><h2>What needs doing today?</h2><small>Choose a task. The passport shows the next step.</small></div></div><div class="today-actions">${[
    ['due', 'INR due', tasks.due.length, 'Arrange PHC testing'],
    ['review', 'Results awaiting review', tasks.review.length, 'Review and approve a plan'],
    ['inform', 'Patients awaiting a care plan', tasks.inform.length, 'Prepare the patient message'],
  ]
    .map(
      ([key, label, count, hint]) =>
        `<button class="today-task" data-care-filter="${key}"><strong>${count}</strong><b>${label}</b><small>${hint}</small></button>`,
    )
    .join('')}</div></section>`;
}
function tabletLine(dose, p) {
  const strength = Number(p.confirmedTabletStrength),
    count = Number(dose) / strength;
  if (!(strength > 0) || !p.tabletStrengthVerifiedAt || !Number.isFinite(count)) return '';
  return Number.isInteger(count * 2)
    ? `<small>${count} × ${strength} mg tablet${count === 1 ? '' : 's'}</small>`
    : '<small>Confirm tablet combination with clinic</small>';
}
export function approvedPlanMarkup(p) {
  const plans = (p.dosePlans || []).filter((d) => d.approvedBy),
    plan = plans.at(-1),
    s = careStatus(p);
  return `<section class="card current-plan"><div class="card-header"><div><h2>Current clinician-approved care plan</h2><small>${plan ? 'Approved ' + esc(readableDate(plan.approvedAt)) : 'No clinician-approved plan yet'}</small></div></div>${plan ? `<div class="pad">${!s.approved ? '<p class="warning-box">New information needs clinic review. This is the last approved plan; seek clinician instructions before communicating a new dose.</p>' : ''}<div class="grid-days" dir="ltr">${days.map((day, i) => `<div class="dose-day"><small>${day}</small><strong>${esc(plan.daily[i])} mg</strong>${tabletLine(plan.daily[i], p)}</div>`).join('')}</div><p><b>Weekly total: ${esc(plan.weekly)} mg</b> · Next INR: <b>${esc(readableDate(plan.nextInrDate))}</b></p>${p.encounters.find((e) => e.id === plan.encounterId)?.holdInstruction ? `<p class="warning-box">Temporary hold: ${esc(p.encounters.find((e) => e.id === plan.encounterId).holdInstruction)}</p>` : ''}</div>` : '<p class="pad">Save the measured INR and a proposed plan, then request clinician review. Reference suggestions are never an approved prescription.</p>'}</section>`;
}
export function workflowMarkup(p, connected, role) {
  const s = careStatus(p);
  return `<section class="card workflow-card"><div class="card-header"><h2>Next steps for this patient</h2></div><ol class="workflow-steps">${[
    ['Enter INR', !!s.latest],
    ['Clinician review', s.approved],
    ['Inform patient', s.informed],
    ['Arrange next INR', s.informed && !!s.plan?.nextInrDate],
  ]
    .map(
      ([label, done], i) =>
        `<li class="${done ? 'done' : ''}"><span>${done ? '✓' : i + 1}</span>${label}</li>`,
    )
    .join(
      '',
    )}</ol><div class="mini-actions pad"><button class="btn primary" data-modal="encounter">Enter a new INR</button>${s.latest && !s.approved ? `<button class="btn" data-care-review ${connected ? '' : 'disabled'}>Request clinician review</button>${connected && role === 'clinician' ? `<button class="btn primary" data-care-approve="${esc(s.latest.id)}">Approve saved care plan</button>` : ''}` : ''}<button class="btn" data-care-message="reminder">INR reminder</button><button class="btn" data-care-message="care-plan" ${!s.approved ? 'disabled' : ''}>Prepare care-plan message</button><button class="btn" data-care-informed ${!p.followups?.some((f) => f.status !== 'Completed') ? 'disabled' : ''}>Record patient informed / contact attempt</button></div><p class="card-caption">Opening WhatsApp is not proof of delivery. Failed contact stays pending.</p></section>`;
}
export function patientToolsMarkup(p, role) {
  return `<section class="card pad patient-tools"><h2>Contact preferences</h2><p>${esc(p.preferredLanguage === 'ar' ? 'Arabic' : 'English')} · ${esc(p.contactMethod || 'Phone')} · ${truth(p.communicationConsent) ? 'Messaging consent recorded' : 'Messaging consent not recorded'}</p><div class="mini-actions"><button class="btn" data-care-preferences>Communication preferences</button></div><details class="communication-history"><summary>Patient message history (${(p.communications || []).length})</summary>${(p.communications || []).map((c) => `<article class="request-item"><b>${esc(c.kind)} · ${esc(c.outcome)}</b><p>${esc(readableDate(c.createdAt))} · ${esc(c.createdByName || c.createdBy)}${truth(c.staleAtRecording) ? ' · Historical attempt' : ''}</p><p>${esc(c.note)}</p><details><summary>Original message — historical, not the current prescription</summary><pre class="message-preview" dir="${c.language === 'ar' ? 'rtl' : 'ltr'}">${esc(c.body)}</pre></details></article>`).join('') || '<p>No message attempts recorded yet.</p>'}</details></section>`;
}
const input = (name, label, value = '', type = 'text', extra = '') =>
  `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
function dialog(ctx, title, body, action, button = 'Save') {
  const patient = ctx.scopePatient,
    identity =
      patient && ['prepare', 'record', 'preferences', 'approve'].includes(action)
        ? `<div class="care-patient-identity"><b>${esc(patient.name)}</b><span>${esc(patient.mrn || '')}</span></div>`
        : '';
  ctx.modal(title, identity + body + '<p id="care-status" role="status" aria-live="polite"></p>', button);
  const f = document.querySelector('#modal-form');
  f.id = 'care-form';
  f.dataset.action = action;
  f.dataset.requestId = crypto.randomUUID();
  return f;
}
async function remote(ctx, action, p) {
  if (!ctx.connected) throw Error('Use staff sign-in for shared patient access and communication records.');
  return ctx.api(action, p);
}
export function handleCareClick(b, ctx) {
  if (
    !b.matches(
      '[data-care-filter],[data-care-message],[data-care-preferences],[data-care-review],[data-care-approve],[data-care-open],[data-care-whatsapp],[data-care-clinic],[data-care-informed]',
    )
  )
    return false;
  b.disabled = true;
  (async () => {
    const p = ctx.patient();
    if (b.hasAttribute('data-care-informed')) {
      ctx.openFollowup();
      return;
    }
    if (b.hasAttribute('data-care-clinic')) {
      const settings = await remote(ctx, 'clinic.read', {});
      dialog(
        ctx,
        'Clinic contact details',
        input('nameEn', 'Clinic name — English', settings.nameEn, 'text', 'required') +
          input('nameAr', 'Clinic name — Arabic', settings.nameAr, 'text', 'required') +
          input('telephone', 'Clinic telephone (international)', settings.telephone, 'tel'),
        'clinic',
      );
      return;
    }
    if (b.dataset.careFilter) {
      ctx.filter(b.dataset.careFilter);
      return;
    }
    if (b.hasAttribute('data-care-open')) {
      ctx.open(b.dataset.careOpen);
      return;
    }
    if (b.hasAttribute('data-care-message')) {
      if (!ctx.connected) {
        const approved = p.dosePlans.filter((d) => d.approvedBy).at(-1),
          kind = b.dataset.careMessage;
        if (kind === 'care-plan' && !approved)
          throw Error(
            'The preview contains no authenticated approvals. Use an approved care plan in the shared app.',
          );
        dialog(
          ctx,
          'Example INR reminder',
          `<pre class="message-preview">${esc(buildPatientMessage({ kind, language: p.preferredLanguage || 'en', name: p.name, nextDate: p.followups.at(-1)?.inrDate }))}</pre><p>Fictional preview only; no message is sent or recorded.</p>`,
          'close',
          'Close',
        );
        return;
      }
      const f = dialog(
        ctx,
        'Prepare patient message',
        `<p>Choose the patient’s language. The care plan must already be approved.</p><input type="hidden" name="kind" value="${esc(b.dataset.careMessage)}"><label class="field">Language<select name="language"><option value="en" ${p.preferredLanguage !== 'ar' ? 'selected' : ''}>English</option><option value="ar" ${p.preferredLanguage === 'ar' ? 'selected' : ''}>العربية</option></select></label>`,
        'prepare',
        'Prepare draft',
      );
      f.dataset.patientId = p.id;
      return;
    }
    if (b.hasAttribute('data-care-preferences')) {
      const f = dialog(
        ctx,
        'Patient communication preferences',
        `<div class="form-grid"><label class="field">Preferred language<select name="language"><option value="en">English</option><option value="ar">العربية</option></select></label><label class="field">Preferred contact method<select name="contactMethod"><option value="phone">Phone</option><option value="whatsapp">WhatsApp</option></select></label><label class="field">Country code for a local number<select name="countryCode"><option value="+966">Saudi Arabia +966</option><option value="international">Another country — enter the full + number</option></select></label>${input('phone', 'Telephone (+ number, or Saudi 05…)', p.phone, 'tel', 'placeholder="+9665…"')}${input('confirmedTabletStrength', 'Confirmed tablet strength (mg)', p.confirmedTabletStrength || '', 'number', 'min="0.5" max="20" step="0.5"')}<label class="checkbox-line"><input name="phoneVerified" type="checkbox" ${p.phoneVerifiedAt ? 'checked' : ''}> I confirmed this number with the patient</label><label class="checkbox-line"><input name="consent" type="checkbox" ${truth(p.communicationConsent) ? 'checked' : ''}> Patient consent for clinical messaging confirmed</label><label class="checkbox-line"><input name="tabletStrengthConfirmed" type="checkbox" ${p.tabletStrengthVerifiedAt ? 'checked' : ''}> I checked the actual tablet strength with the patient</label></div><p>Tablet counts appear only for a confirmed strength and whole/half-tablet combinations. Doses remain in mg.</p>`,
        'preferences',
      );
      f.dataset.patientId = p.id;
      f.dataset.version = p.rowVersion;
      f.elements.language.value = p.preferredLanguage || 'en';
      f.elements.contactMethod.value = p.contactMethod || 'phone';
      return;
    }
    if (b.hasAttribute('data-care-review')) {
      await remote(ctx, 'workflow.requestReview', {
        patientId: p.id,
        encounterId: careStatus(p).latest.id,
        requestId: crypto.randomUUID(),
      });
      ctx.toast('Review request posted to the clinic team. The plan is not approved yet.');
      return;
    }
    if (b.hasAttribute('data-care-approve')) {
      const f = dialog(
        ctx,
        'Approve saved care plan',
        `<p>Review the saved schedule, any hold instructions, both language versions, and next INR date before approving.</p><label class="checkbox-line"><input name="confirmed" type="checkbox" required> I have reviewed this plan and approve it as ${esc(ctx.staff.displayName || ctx.staff.uid)}</label>`,
        'approve',
        'Approve care plan',
      );
      f.dataset.id = b.dataset.careApprove;
      return;
    }
    if (b.hasAttribute('data-care-whatsapp')) {
      const f = document.querySelector('#care-form');
      if (!f.elements.reviewed.reportValidity()) return;
      const d = JSON.parse(f.dataset.draft);
      if (!truth(d.canWhatsApp)) throw Error('Confirm the WhatsApp number and patient consent first');
      const popup = window.open('about:blank', '_blank');
      if (!popup) throw Error('Please allow the WhatsApp window to open, then try again');
      popup.opener = null;
      try {
        const verified = await remote(ctx, 'communications.validate', { draftId: d.id, forWhatsApp: true });
        popup.location.replace(
          'https://wa.me/' + verified.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent(verified.body),
        );
      } catch (err) {
        popup.close();
        throw err;
      }
      return;
    }
  })()
    .catch((err) => ctx.toast(err.message))
    .finally(() => {
      b.disabled = false;
    });
  return true;
}
export async function submitCare(form, ctx) {
  const fd = new FormData(form),
    action = form.dataset.action,
    status = form.querySelector('#care-status'),
    submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  try {
    let result;
    if (action === 'close') {
      ctx.close();
      return;
    }
    if (action === 'prepare') {
      result = await remote(ctx, 'communications.prepare', {
        patientId: form.dataset.patientId,
        kind: fd.get('kind'),
        language: fd.get('language'),
      });
      const f = dialog(
        { ...ctx, scopePatient: { name: result.patientName, mrn: result.patientMrn } },
        'Review patient message',
        `<p>Check the approved plan, recipient and language. Instructions are reproduced exactly as approved.</p><label class="field">Message preview<textarea class="message-preview" dir="${result.language === 'ar' ? 'rtl' : 'ltr'}" rows="15" readonly>${esc(result.body)}</textarea></label><p>Recipient: <b dir="ltr">${esc(result.phone || 'No verified telephone')}</b></p><label class="checkbox-line"><input name="reviewed" type="checkbox" required> I checked the recipient, language and approved plan</label><button class="btn whatsapp-btn" type="button" data-care-whatsapp ${truth(result.canWhatsApp) ? '' : 'disabled'}>Open WhatsApp</button>${truth(result.canWhatsApp) ? '' : '<p>For WhatsApp, confirm the number and consent in Communication preferences first.</p>'}<label class="field">What happened?<select name="outcome"><option>Not sent</option><option>Sent manually</option><option>Failed contact</option></select></label><label class="field">Contact note<textarea name="note" maxlength="1000"></textarea></label><details><summary>Recording a past attempt after the plan changed?</summary><label class="checkbox-line"><input name="confirmHistorical" type="checkbox"> This records an actual past send, not a new message. I documented the timing and circumstances in the note.</label></details><p>Opening WhatsApp does not send automatically. Record the actual outcome; this does not close follow-up.</p>`,
        'record',
        'Record outcome',
      );
      f.dataset.draft = JSON.stringify(result);
      return;
    }
    if (action === 'clinic') await remote(ctx, 'clinic.save', Object.fromEntries(fd));
    if (action === 'preferences')
      await remote(ctx, 'communications.preferences', {
        patientId: form.dataset.patientId,
        expectedVersion: Number(form.dataset.version),
        ...Object.fromEntries(fd),
        phoneVerified: fd.has('phoneVerified'),
        consent: fd.has('consent'),
        tabletStrengthConfirmed: fd.has('tabletStrengthConfirmed'),
      });
    if (action === 'approve') await remote(ctx, 'decisions.approve', { encounterId: form.dataset.id });
    if (action === 'record')
      await remote(ctx, 'communications.record', {
        draftId: JSON.parse(form.dataset.draft).id,
        reviewed: fd.has('reviewed'),
        outcome: fd.get('outcome'),
        note: fd.get('note'),
        confirmHistorical: fd.has('confirmHistorical'),
      });
    await ctx.refresh();
    ctx.close();
    ctx.render();
    ctx.toast(
      action === 'record'
        ? 'Contact outcome saved. Follow-up remains open until documented completion.'
        : 'Saved successfully.',
    );
  } catch (err) {
    status.textContent = err.message;
    submit.disabled = false;
  }
}
export function initInrWizard(form) {
  const grid = form.querySelector('.review-form');
  if (!grid) return;
  let current = 0;
  const titles = [
    '1. Result and safety checks',
    '2. Review the dosing decision',
    '3. Instructions and next test',
  ];
  const progress = document.createElement('div');
  progress.className = 'inr-progress';
  progress.setAttribute('role', 'status');
  grid.before(progress);
  const panes = titles.map((title, index) => {
    const section = document.createElement('section');
    section.className = 'form-grid inr-step';
    section.dataset.step = index;
    section.setAttribute('aria-label', title);
    return section;
  });
  for (const node of [...grid.children]) {
    const name = node.querySelector('[name]')?.name;
    let step = 2;
    if (['inrDate', 'inr'].includes(name) || node.id === 'review-context') step = 0;
    else if (
      node.id === 'reference-output' ||
      node.classList.contains('decision-divider') ||
      ['weeklyMg', 'dose0', 'reason', 'holdInstruction', 'holdInstructionAr'].includes(name)
    )
      step = 1;
    panes[step].append(node);
  }
  grid.replaceChildren(...panes);
  const footer = form.querySelector('.modal-actions'),
    submit = footer.querySelector('[type=submit]'),
    back = document.createElement('button'),
    next = document.createElement('button'),
    status = document.createElement('p');
  status.className = 'wizard-status';
  status.setAttribute('role', 'alert');
  grid.after(status);
  back.type = next.type = 'button';
  back.className = next.className = 'btn';
  next.classList.add('primary');
  back.textContent = 'Back';
  next.textContent = 'Next';
  footer.insertBefore(back, submit);
  footer.insertBefore(next, submit);
  function show() {
    panes.forEach((pane, i) => (pane.hidden = i !== current));
    progress.textContent = titles[current];
    back.hidden = current === 0;
    next.hidden = current === 2;
    submit.hidden = current !== 2;
    status.textContent = '';
    form.querySelector('.modal-body').scrollTop = 0;
  }
  form.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && current < 2) {
      ev.preventDefault();
      next.click();
    }
  });
  back.onclick = () => {
    current = Math.max(0, current - 1);
    show();
  };
  next.onclick = () => {
    for (const input of panes[current].querySelectorAll('input,select,textarea'))
      if (!input.reportValidity()) return;
    if (current === 1) {
      const data = new FormData(form),
        total = Array.from({ length: 7 }, (_, i) => Number(data.get('dose' + i))).reduce((a, b) => a + b, 0);
      if (Math.abs(total - Number(data.get('weeklyMg'))) > 0.01) {
        status.textContent = 'The seven daily doses must match the weekly dose before continuing.';
        return;
      }
    }
    current = Math.min(2, current + 1);
    show();
  };
  show();
}
