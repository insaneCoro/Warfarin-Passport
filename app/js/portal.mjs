import { todayRiyadh } from './date-utils.mjs';
import { signIn, signOut, api, createStaffAccount, sendAccountEmail } from './api-client.mjs?v=care-5';
let language = localStorage.getItem('warfarin-ui-language') === 'ar' ? 'ar' : 'en',
  account = null,
  passport = null,
  selected = '',
  busy = false,
  requestDraft = {},
  refreshPending = null;
const el = document.querySelector('#portal-screen'),
  e = (x) =>
    String(x ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const t = (en, ar) => (language === 'ar' ? ar : en),
  format = (d) =>
    d
      ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', {
          dateStyle: 'long',
          timeZone: 'UTC',
        }).format(new Date(d + 'T12:00:00Z'))
      : '—';
function field(name, label, type = 'text', extra = '') {
  return `<label class="field">${label}<input name="${name}" type="${type}" ${extra}></label>`;
}
function render() {
  document.querySelector('#portal-development').textContent = t(
    'Development · Fictional records only',
    'نسخة للتجربة · بيانات افتراضية فقط',
  );
  document.querySelector('.portal-footer a').textContent = t('Clinic staff sign-in', 'دخول موظفي العيادة');
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.querySelector('#portal-language').textContent = language === 'ar' ? 'English' : 'العربية';
  document.querySelector('#portal-signout').hidden = !account;
  document.querySelector('#portal-signout').textContent = t('Sign out', 'تسجيل الخروج');
  if (!account) {
    el.innerHTML = `<h1>${t('My Warfarin Passport', 'جواز الوارفارين الخاص بي')}</h1><section class="card pad"><h2>${t('Patient and caregiver sign-in', 'دخول المريض ومقدم الرعاية')}</h2><p>${t('Ask your clinic to approve your own email first. New users create a password, verify their email, then sign in.', 'اطلب من العيادة اعتماد بريدك الإلكتروني أولًا. للمستخدم الجديد: أنشئ كلمة مرور، ثم تحقق من بريدك وسجّل الدخول.')}</p><form id="portal-login">${field('email', t('Your email', 'بريدك الإلكتروني'), 'email', 'required autocomplete="username"')}${field('password', t('Password', 'كلمة المرور'), 'password', 'required autocomplete="current-password"')}<p id="portal-status" role="status" aria-live="polite"></p><button class="btn primary" type="submit">${t('Sign in', 'تسجيل الدخول')}</button><div class="mini-actions"><button type="button" class="btn" data-account="create">${t('Create my account', 'إنشاء حسابي')}</button><button type="button" class="btn" data-account="verify">${t('Resend verification', 'إعادة إرسال التحقق')}</button><button type="button" class="btn" data-account="reset">${t('Reset password', 'إعادة تعيين كلمة المرور')}</button></div><p>${t('Use at least 12 characters for a new password. Creating an account alone does not give access to a passport.', 'استخدم ١٢ حرفًا على الأقل لكلمة المرور الجديدة. إنشاء حساب وحده لا يمنح صلاحية الوصول إلى أي جواز.')}</p></form></section>`;
    return;
  }
  if (!passport) {
    el.innerHTML = `<h1>${t('My passport', 'جوازي')}</h1><p id="portal-status" role="status">${t('Your account is connected. Refresh to load your passport.', 'تم الاتصال بحسابك. اضغط التحديث لتحميل جوازك.')}</p><button class="btn primary" id="portal-refresh">${t('Refresh my passport', 'تحديث جوازي')}</button>`;
    return;
  }
  const p = passport?.patient,
    plan = passport?.plan,
    days =
      language === 'ar'
        ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  el.innerHTML = `${passport.clinic?.telephone ? `<p><a href="tel:${e(passport.clinic.telephone)}">${t('Contact my clinic', 'التواصل مع عيادتي')}: <span dir="ltr">${e(passport.clinic.telephone)}</span></a></p>` : ''}<h1>${t('Welcome', 'مرحبًا')} ${e(p?.name || '')}</h1><label class="field">${t('Your authorized passport', 'الجواز المصرح لك بعرضه')}<select id="portal-patient">${account.links.map((l) => `<option value="${e(l.patientId)}" ${l.patientId === selected ? 'selected' : ''}>${e(l.name)} · ${e(l.mrn || '')} · ${l.kind === 'caregiver' ? t('Caregiver access', 'صلاحية مقدم رعاية') : t('Patient', 'المريض')}</option>`).join('')}</select></label><div class="warning-box">${t('Severe bleeding or a head injury: seek emergency care immediately. This portal is not an emergency service.', 'في حال النزيف الشديد أو إصابة الرأس، توجّه للطوارئ فورًا. هذه البوابة ليست خدمة للطوارئ.')}</div><div class="mini-actions"><button class="btn" id="portal-refresh">${t('Refresh my passport', 'تحديث جوازي')}</button></div><p id="portal-status" role="status" aria-live="polite"></p>${passport?.needsPromptVerification ? `<div class="urgent-banner"><b>${t('A submitted INR needs prompt clinic assessment. Contact the clinic now rather than waiting for a portal reply. It is unverified and no new dose has been prescribed here.', 'النتيجة التي أرسلتها تحتاج تقييمًا سريعًا من العيادة. تواصل مع العيادة الآن ولا تنتظر رد البوابة. النتيجة غير متحقق منها ولم تُوصف لك جرعة جديدة هنا.')}</b></div>` : ''}${passport?.awaitingReview ? `<p class="warning-box">${t('A new result is awaiting clinic review. Do not use an unapproved suggestion as a new dose. Contact your clinic if instructions are unclear.', 'توجد نتيجة جديدة بانتظار مراجعة العيادة. لا تستخدم اقتراحًا غير معتمد لتغيير الجرعة. تواصل مع العيادة إذا كانت التعليمات غير واضحة.')}</p>` : ''}
 <section class="card pad"><h2>${t('My clinician-approved care plan', 'خطتي المعتمدة من الطبيب')}</h2>${
   plan
     ? `<p>${t('Last reviewed INR', 'آخر نتيجة INR تمت مراجعتها')}: <b>${e(plan.inr)}</b> · ${format(plan.testDate)}<br>${t('Your target', 'النطاق المستهدف')}: <bdi dir="ltr">${e(plan.targetLow || p.targetLow)}–${e(plan.targetHigh || p.targetHigh)}</bdi></p><div class="portal-schedule">${days
         .map((day, i) => {
           const strength = Number(p.confirmedTabletStrength),
             count = Number(plan.daily[i]) / strength;
           return `<div><b>${day}</b><strong dir="ltr">${e(plan.daily[i])} ${t('mg', 'ملغ')}</strong>${strength > 0 && Number.isInteger(count * 2) ? `<small>${e(count)} × ${strength} ${t('mg tablets', 'ملغ للأقراص')}</small>` : ''}</div>`;
         })
         .join(
           '',
         )}</div><p>${t('Weekly total', 'المجموع الأسبوعي')}: <b>${e(plan.weekly)} ${t('mg', 'ملغ')}</b></p>${plan.hold ? `<div class="warning-box"><b>${t('Temporary hold instructions', 'تعليمات الإيقاف المؤقت')}</b><p class="plan-instructions" dir="auto">${e(language === 'ar' && plan.holdAr ? plan.holdAr : plan.hold)}</p></div>` : ''}${plan.instructions ? `<p class="plan-instructions" dir="auto">${e(language === 'ar' && plan.instructionsAr ? plan.instructionsAr : plan.instructions)}</p>` : ''}<p>${t('Approved by', 'اعتمدها')}: ${e(plan.approvedByName)}</p><h3>${t('Next INR at your PHC laboratory', 'فحص INR القادم في مختبر مركز الرعاية الصحية الأولية')}</h3><strong class="next-test">${format(plan.nextDate)}</strong>`
     : `<p>${t('No approved plan is available yet. Ask your clinic for instructions; this page will never calculate or change your dose.', 'لا توجد خطة معتمدة متاحة حاليًا. اطلب التعليمات من العيادة؛ هذه الصفحة لا تحسب الجرعة ولا تغيّرها.')}</p>`
 }</section>
 <section class="card pad"><h2>${t('Reviewed INR history', 'سجل نتائج INR المراجعة')}</h2>${
   passport?.results.length
     ? `${portalTrend(passport.results)}<div class="portal-results">${passport.results
         .slice(-10)
         .map((r) => `<div><span>${format(r.date)}</span><b>${e(r.inr)}</b></div>`)
         .join('')}</div>`
     : `<p>${t('No clinic-reviewed results yet.', 'لا توجد نتائج راجعتها العيادة حتى الآن.')}</p>`
 }</section>
 <section class="card pad"><h2>${t('Send a result or request', 'إرسال نتيجة أو طلب')}</h2><p>${t('Enter the result exactly as reported by the PHC laboratory. It will not change your clinical record or dose until verified by the clinic.', 'أدخل النتيجة كما وردت من مختبر مركز الرعاية الصحية الأولية. لن تغيّر سجلك السريري أو جرعتك حتى تتحقق منها العيادة.')}</p><form id="portal-request"><label class="field">${t('What do you need?', 'ما الذي تحتاجه؟')}<select name="kind" id="portal-kind"><option value="inr">${t('Submit my INR result', 'إرسال نتيجة INR')}</option><option value="appointment">${t('Request a different test date', 'طلب تغيير موعد الفحص')}</option><option value="question">${t('Ask the clinic a question', 'إرسال سؤال للعيادة')}</option></select></label><div id="inr-fields">${field('testDate', t('PHC test date', 'تاريخ فحص المركز'), 'date', `required max="${todayRiyadh()}"`)}${field('inr', t('Measured INR', 'نتيجة INR'), 'number', 'step="0.1" min="0.1" max="20" required')}${field('lab', t('PHC laboratory name', 'اسم مختبر المركز'), 'text', 'maxlength="160" required')}</div><div id="appointment-fields" hidden>${field('requestedDate', t('Preferred test date', 'التاريخ المطلوب'), 'date', `min="${todayRiyadh()}"`)}</div><label class="field">${t('Your question or extra information', 'سؤالك أو معلومات إضافية')}<textarea name="details" rows="4" maxlength="2000"></textarea></label><p id="request-status" role="status"></p><button class="btn primary" type="submit">${t('Send to clinic', 'إرسال إلى العيادة')}</button></form></section>
 <section class="card pad"><h2>${t('My requests and clinic replies', 'طلباتي وردود العيادة')}</h2>${passport?.requests.length ? passport.requests.map((r) => `<article class="request-item"><b>${e(r.kind === 'inr' ? t('INR submission', 'نتيجة INR') : r.kind === 'appointment' ? t('Date request', 'طلب موعد') : t('Question', 'سؤال'))}</b><span class="tag neutral">${e(r.status === 'Verified' ? t('Verified by clinician', 'تحقق منها الطبيب') : r.status === 'Correction requested' ? t('Corrected result requested', 'طلبت العيادة تصحيح النتيجة') : r.status === 'Replied' ? t('Clinic replied', 'ردت العيادة') : t('Awaiting clinic review', 'بانتظار مراجعة العيادة'))}</span>${r.kind === 'inr' ? `<p>${e(r.inr)} · ${format(r.testDate)} · ${t('Patient submitted; not a prescription', 'أرسلها المريض؛ ليست وصفة علاجية')}</p>` : ''}<p dir="auto">${e(r.details)}</p>${r.requestedDate ? `<p>${format(r.requestedDate)} · ${t('Requested only; the approved test date above stays unchanged until the clinic updates it.', 'تاريخ مطلوب فقط؛ يبقى الموعد المعتمد أعلاه كما هو حتى تعدّله العيادة.')}</p>` : ''}${r.replies.map((x) => `<p dir="auto"><b>${e(x.authorName)}</b>: ${e(x.body)}</p>`).join('')}</article>`).join('') : `<p>${t('No requests yet.', 'لا توجد طلبات حتى الآن.')}</p>`}</section>`;
  const requestForm = document.querySelector('#portal-request');
  if (requestForm) {
    for (const [key, value] of Object.entries(requestDraft))
      if (requestForm.elements[key]) requestForm.elements[key].value = value;
    requestForm.dataset.requestId = requestDraft.requestId || '';
    const kind = requestForm.elements.kind.value;
    document.querySelector('#inr-fields').hidden = kind !== 'inr';
    document.querySelector('#appointment-fields').hidden = kind !== 'appointment';
    for (const name of ['testDate', 'inr', 'lab']) {
      requestForm.elements[name].disabled = kind !== 'inr';
      requestForm.elements[name].required = kind === 'inr';
    }
    requestForm.elements.requestedDate.disabled = kind !== 'appointment';
    requestForm.elements.requestedDate.required = kind === 'appointment';
    requestForm.elements.details.required = kind !== 'inr';
  }
}
function captureRequest() {
  const form = document.querySelector('#portal-request');
  if (form)
    requestDraft = { ...Object.fromEntries(new FormData(form)), requestId: form.dataset.requestId || '' };
}
async function refresh() {
  if (refreshPending?.id === selected) return refreshPending.promise;
  const owner = account,
    id = selected,
    promise = (async () => {
      const next = await api('portal.passport', { patientId: id });
      if (!account || account !== owner || selected !== id) return;
      captureRequest();
      passport = next;
      render();
    })();
  refreshPending = { id, promise };
  try {
    return await promise;
  } catch (err) {
    if (account !== owner) return;
    if (handleEndedAccess(err)) return;
    throw err;
  } finally {
    if (refreshPending?.promise === promise) refreshPending = null;
  }
}
function message(text, id = 'portal-status') {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('button');
  if (!b) return;
  try {
    if (b.id === 'portal-language') {
      captureRequest();
      language = language === 'en' ? 'ar' : 'en';
      localStorage.setItem('warfarin-ui-language', language);
      render();
      return;
    }
    if (b.id === 'portal-signout') {
      signOut();
      account = null;
      passport = null;
      requestDraft = {};
      render();
      return;
    }
    if (b.id === 'portal-refresh') {
      b.disabled = true;
      try {
        await refresh();
      } finally {
        b.disabled = false;
      }
      return;
    }
    if (b.dataset.account) {
      const form = document.querySelector('#portal-login'),
        fd = new FormData(form);
      if (!form.elements.email.reportValidity()) return;
      if (b.dataset.account !== 'reset' && !form.elements.password.reportValidity()) return;
      b.disabled = true;
      try {
        if (b.dataset.account === 'create') await createStaffAccount(fd.get('email'), fd.get('password'));
        else await sendAccountEmail(fd.get('email'), fd.get('password'), b.dataset.account === 'verify');
        form.elements.password.value = '';
        message(
          b.dataset.account === 'reset'
            ? t(
                'If this account exists, a reset email will arrive.',
                'إذا كان الحساب موجودًا، فستصلك رسالة لإعادة تعيين كلمة المرور.',
              )
            : t(
                'Check your email, verify your address, then return and sign in.',
                'افتح بريدك الإلكتروني وتحقق من عنوانك، ثم عد لتسجيل الدخول.',
              ),
        );
      } finally {
        b.disabled = false;
      }
    }
  } catch (err) {
    if (handleEndedAccess(err)) return;
    message(
      language === 'ar'
        ? 'تعذّر إتمام الطلب. تحقق من بياناتك واعتماد بريدك لدى العيادة، أو تواصل معها.'
        : err.message,
    );
  }
});
document.addEventListener('change', async (ev) => {
  try {
    if (ev.target.id === 'portal-patient') {
      selected = ev.target.value;
      requestDraft = {};
      const form = document.querySelector('#portal-request');
      if (form) {
        form.reset();
        form.dataset.requestId = '';
      }
      passport = null;
      await refresh();
    }
    if (ev.target.id === 'portal-kind') {
      const f = ev.target.form,
        inr = ev.target.value === 'inr',
        appointment = ev.target.value === 'appointment';
      document.querySelector('#inr-fields').hidden = !inr;
      document.querySelector('#appointment-fields').hidden = !appointment;
      for (const n of ['testDate', 'inr', 'lab']) {
        f.elements[n].disabled = !inr;
        f.elements[n].required = inr;
      }
      f.elements.requestedDate.disabled = !appointment;
      f.elements.requestedDate.required = appointment;
      f.elements.details.required = !inr;
    }
  } catch (err) {
    if (!handleEndedAccess(err)) message(err.message);
  }
});
document.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (busy) return;
  busy = true;
  const form = ev.target,
    button = form.querySelector('[type=submit]');
  button.disabled = true;
  try {
    if (form.id === 'portal-login') {
      const fd = new FormData(form);
      account = await signIn(fd.get('email'), fd.get('password'), 'portal.me');
      selected = account.links[0].patientId;
      form.elements.password.value = '';
      await refresh();
    }
    if (form.id === 'portal-request') {
      const fd = new FormData(form),
        requestId = form.dataset.requestId || (form.dataset.requestId = crypto.randomUUID());
      await api('portal.request', { ...Object.fromEntries(fd), patientId: selected, requestId });
      form.reset();
      form.dataset.requestId = '';
      requestDraft = {};
      await refresh();
      message(
        t(
          'Received by the clinic. Awaiting verification/review; your dose and test date have not changed.',
          'استلمت العيادة طلبك وهو بانتظار التحقق والمراجعة. لم تتغير جرعتك أو موعدك.',
        ),
      );
    }
  } catch (err) {
    if (handleEndedAccess(err)) return;
    message(
      language === 'ar'
        ? 'تعذّر إتمام الطلب. تحقق من البيانات، ثم حاول مجددًا أو تواصل مع العيادة.'
        : err.message,
      form.id === 'portal-request' ? 'request-status' : 'portal-status',
    );
    if (form.id === 'portal-login' && account) {
      render();
      message(
        t(
          'Your account is connected. Refresh to load the passport.',
          'تم الاتصال بحسابك. اضغط التحديث لتحميل الجواز.',
        ),
      );
    } else if (form.id === 'portal-login') {
      signOut();
      account = null;
    }
  } finally {
    busy = false;
    button.disabled = false;
  }
});
render();

function refreshIfVisible() {
  if (account && !busy && document.visibilityState === 'visible')
    refresh().catch(() =>
      message(
        t(
          'Connection interrupted. Your last loaded plan is still shown. Use Refresh when connected.',
          'انقطع الاتصال. ما زالت آخر خطة محمّلة ظاهرة. اضغط التحديث عند عودة الاتصال.',
        ),
      ),
    );
}
document.addEventListener('visibilitychange', refreshIfVisible);
setInterval(refreshIfVisible, 60000);

function portalTrend(results) {
  if (results.length < 2) return '';
  const data = [...results].sort((a, b) => a.date.localeCompare(b.date)).slice(-10),
    dates = data.map((r) => Date.parse(r.date)),
    minDate = Math.min(...dates),
    span = Math.max(86400000, Math.max(...dates) - minDate),
    values = data.map((r) => Number(r.inr)),
    low = Math.min(...values) - 0.5,
    high = Math.max(...values) + 0.5,
    x = (i) => 30 + ((dates[i] - minDate) / span) * 540,
    y = (i) => 140 - ((values[i] - low) / (high - low)) * 110;
  return `<svg class="portal-trend" viewBox="0 0 600 170" role="img" aria-label="${t('Reviewed INR trend', 'اتجاه نتائج INR التي راجعتها العيادة')}"><polyline points="${data.map((r, i) => x(i) + ',' + y(i)).join(' ')}" fill="none" stroke="#14847b" stroke-width="3"/>${data.map((r, i) => `<circle cx="${x(i)}" cy="${y(i)}" r="5" fill="#14847b"><title>${e(r.date)}: ${e(r.inr)}</title></circle>`).join('')}</svg>`;
}

function handleEndedAccess(err) {
  if (
    !/No active patient access|Patient access (denied|was removed)|session has ended/.test(err.message || '')
  )
    return false;
  signOut();
  account = null;
  passport = null;
  selected = '';
  requestDraft = {};
  render();
  message(
    t(
      'Your access or session changed. Sign in again or contact the clinic.',
      'تغيّرت صلاحية الدخول أو انتهت الجلسة. سجل الدخول مجددًا أو تواصل مع العيادة.',
    ),
  );
  return true;
}
