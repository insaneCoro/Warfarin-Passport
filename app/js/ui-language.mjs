let language = localStorage.getItem('warfarin-staff-language') === 'ar' ? 'ar' : 'en';
const ar = {
  'Measured INR date *': 'تاريخ قياس INR *',
  'INR result *': 'نتيجة INR *',
  'Bleeding / emergency symptoms?': 'هل يوجد نزيف أو أعراض طارئة؟',
  'Missed doses?': 'هل فاتت جرعات؟',
  'Medicine / diet changes?': 'هل تغيرت الأدوية أو التغذية؟',
  'Acute illness / clinical risk?': 'هل يوجد مرض حاد أو خطر سريري؟',
  'Dose changed in past 2 weeks?': 'هل تغيرت الجرعة خلال الأسبوعين الماضيين؟',
  'Previous regimen verified?': 'هل تحققت من الجرعات السابقة؟',
  'New weekly dose (mg) *': 'الجرعة الأسبوعية الجديدة (ملغ) *',
  'Next INR test date *': 'موعد INR القادم *',
  'Reason for this dosing decision *': 'سبب قرار الجرعة *',
  'Clinical assessment and notes': 'التقييم السريري والملاحظات',
  'Preferred language': 'اللغة المفضلة',
  'Preferred contact method': 'وسيلة التواصل المفضلة',
  'Message preview': 'معاينة الرسالة',
  'Record patient informed / contact attempt': 'تسجيل إبلاغ المريض أو محاولة التواصل',
  'Show password': 'إظهار كلمة المرور',
  'Hide password': 'إخفاء كلمة المرور',
  'Your clinic, in one place.': 'عيادتك في مكان واحد.',
  'First time here?': 'هل هذه زيارتك الأولى؟',
  Back: 'السابق',
  Next: 'التالي',
  Administrator: 'مسؤول الإدارة',
  Clinician: 'الطبيب',
  Staff: 'الموظف',
  Dashboard: 'لوحة المتابعة',
  Patients: 'المرضى',
  'Follow-ups': 'المتابعات',
  'Team messages': 'رسائل الفريق',
  Inventory: 'مخزون المريض',
  'Staff & settings': 'الحساب والإعدادات',
  'Admin & staff': 'الإدارة والموظفون',
  'Staff sign-in': 'دخول الموظفين',
  'Staff & administrator sign-in': 'دخول الموظفين والإدارة',
  'Sign in': 'تسجيل الدخول',
  'Sign out': 'تسجيل الخروج',
  Password: 'كلمة المرور',
  'Staff email': 'بريد الموظف',
  'Create my account': 'إنشاء حسابي',
  'Reset password': 'إعادة تعيين كلمة المرور',
  'Resend verification email': 'إعادة إرسال التحقق',
  'Patient / caregiver sign-in': 'دخول المريض ومقدم الرعاية',
  'Clinic dashboard': 'لوحة متابعة العيادة',
  'What needs doing today?': 'ما المطلوب اليوم؟',
  'INR due': 'فحص INR مستحق',
  'Results awaiting review': 'نتائج بانتظار المراجعة',
  'Patients awaiting a care plan': 'مرضى بانتظار إبلاغهم بالخطة',
  'Next steps for this patient': 'الخطوات التالية لهذا المريض',
  'Enter INR': 'إدخال INR',
  'Clinician review': 'مراجعة الطبيب',
  'Inform patient': 'إبلاغ المريض',
  'Arrange next INR': 'ترتيب الفحص القادم',
  'Enter a new INR': 'إدخال فحص INR جديد',
  'Request clinician review': 'طلب مراجعة الطبيب',
  'Approve saved care plan': 'اعتماد الخطة المحفوظة',
  'INR reminder': 'تذكير بفحص INR',
  'Prepare care-plan message': 'إعداد رسالة الخطة',
  'Record patient informed / contact attempt': 'تسجيل إبلاغ المريض أو محاولة التواصل',
  'Current clinician-approved care plan': 'الخطة الحالية المعتمدة من الطبيب',
  'Communication preferences': 'تفضيلات التواصل',
  'Refresh clinic': 'تحديث العيادة',
  'Review latest INR': 'مراجعة آخر نتيجة INR',
  'High-risk status': 'حالة الخطورة المرتفعة',
  'Edit details': 'تعديل البيانات',
  Cancel: 'إلغاء',
  Save: 'حفظ',
  Close: 'إغلاق',
  'Save draft care plan': 'حفظ مسودة الخطة',
  'Save risk status': 'حفظ حالة الخطورة',
  'Open patient': 'فتح جواز المريض',
  'Open passport': 'فتح جواز المريض',
  Reply: 'رد',
  'Patient communication preferences': 'تفضيلات التواصل مع المريض',
  'Prepare patient message': 'إعداد رسالة للمريض',
  'Review patient message': 'مراجعة رسالة المريض',
  'Prepare draft': 'إعداد المسودة',
  'Record outcome': 'تسجيل النتيجة',
  'Open WhatsApp': 'فتح واتساب',
  'Approve care plan': 'اعتماد الخطة',
  'My account': 'حسابي',
  'Saved successfully.': 'تم الحفظ بنجاح.',
  'Clinic contact details': 'بيانات التواصل مع العيادة',
};
export function uiText(text) {
  return language === 'ar' ? ar[text] || text : text;
}
export function toggleInterfaceLanguage() {
  language = language === 'en' ? 'ar' : 'en';
  localStorage.setItem('warfarin-staff-language', language);
  applyInterfaceLanguage();
}
export function applyInterfaceLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  const button = document.querySelector('#interface-language');
  if (button && button.textContent !== (language === 'ar' ? 'English' : 'العربية'))
    button.textContent = language === 'ar' ? 'English' : 'العربية';
  for (const element of document.querySelectorAll(
    'button,h1,.card-header h2,.today-task b,.workflow-steps li,.field,label,.nav-item',
  )) {
    for (const node of element.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE) continue;
      const original = node.__uiEnglish || node.textContent.trim();
      if (!ar[original]) continue;
      node.__uiEnglish = original;
      const translated = uiText(original);
      if (node.textContent.trim() !== translated) node.textContent = translated;
    }
  }
  for (const node of document.querySelectorAll('.nomogram-result,.dose-entry,.grid-days,.chart-container'))
    node.setAttribute('dir', 'ltr');
}
