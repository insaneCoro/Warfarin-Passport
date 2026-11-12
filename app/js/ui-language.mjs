/**
 * Staff interface language (English / Arabic).
 *
 * The app's markup is written in English. In Arabic mode, applyInterfaceLanguage() walks the page and
 * translates interface text: whole phrases from the dictionary, phrases built from parts separated by
 * " · " or " — ", dates, and a few patterns with numbers. Anything not in the dictionary (patient names,
 * free-text notes, fictional case descriptions, quoted clinical source guidance) is left as written and
 * marked dir="auto" so English text keeps correct punctuation inside the right-to-left layout.
 * Clinical guidance from sources is intentionally not machine-translated.
 */
const LANGUAGE_KEY = 'warfarin-staff-language';
let language = localStorage.getItem(LANGUAGE_KEY) === 'ar' ? 'ar' : 'en';
let translatedOnce = false;

const ar = {
  // Navigation and shell
  Dashboard: 'لوحة المتابعة',
  Patients: 'المرضى',
  'Follow-ups': 'المتابعات',
  'Team messages': 'رسائل الفريق',
  Inventory: 'مخزون المريض',
  'Staff & settings': 'الحساب والإعدادات',
  'Admin & staff': 'الإدارة والموظفون',
  'Staff sign-in': 'دخول الموظفين',
  'STAFF SIGN-IN': 'دخول الموظفين',
  WORKSPACE: 'مساحة العمل',
  'ANTICOAGULATION SERVICE': 'خدمة مضادات التخثر',
  Warfarin: 'وارفارين',
  Passport: 'باسبورت',
  'Warfarin Passport': 'وارفارين باسبورت',
  'WARFARIN PASSPORT': 'وارفارين باسبورت',
  'PATIENT PASSPORT': 'ملف المريض',
  Clinic: 'العيادة',
  Overview: 'نظرة عامة',
  'Patient passport': 'ملف المريض',
  Followups: 'المتابعات',
  Messages: 'الرسائل',
  Staff: 'الموظفون',
  dashboard: 'لوحة المتابعة',
  patients: 'المرضى',
  followups: 'المتابعات',
  messages: 'الرسائل',
  inventory: 'المخزون',
  staff: 'الموظفون',
  'Open navigation': 'فتح القائمة',
  'Primary navigation': 'القائمة الرئيسية',
  'Passport sections': 'أقسام الملف',
  'Prototype · Synthetic data only': 'نموذج أولي · بيانات افتراضية فقط',
  'Not connected to a clinical database': 'غير متصل بقاعدة بيانات سريرية',
  'Clinic workspace · Synthetic records only': 'مساحة العيادة · سجلات افتراضية فقط',
  'DEMO ENVIRONMENT': 'بيئة تجريبية',
  'Use fictional patient information only. Browser storage is not a secure medical record.':
    'استخدم بيانات مرضى افتراضية فقط. تخزين المتصفح ليس سجلاً طبياً آمناً.',
  'Clinic workspace · Fictional records for development.': 'مساحة العيادة · سجلات افتراضية للتطوير.',
  'Warfarin Passport · Prototype v0.1 · Clinical decisions require authorized clinician review.':
    'وارفارين باسبورت · نموذج أولي · القرارات السريرية تتطلب مراجعة طبيب مخوّل.',
  'Warfarin Passport · Connected test environment · Clinical validation pending.':
    'وارفارين باسبورت · بيئة اختبار متصلة · التحقق السريري لم يكتمل بعد.',
  'Demo clinician': 'طبيب تجريبي',
  'Unverified demo role': 'دور تجريبي غير موثّق',
  'Unverified demo staff': 'موظف تجريبي غير موثّق',
  'Demo account': 'حساب تجريبي',
  'Demo caregiver': 'مقدم رعاية تجريبي',
  'Demo clinic team': 'فريق العيادة التجريبي',
  'Staff sign-in required': 'يلزم تسجيل دخول الموظفين',
  Today: 'اليوم',
  English: 'الإنجليزية',
  'Follow-up': 'المتابعة',
  mg: 'ملغ',

  // Roles
  Administrator: 'مسؤول الإدارة',
  Clinician: 'الطبيب',
  'Sub-administrator': 'مساعد الإدارة',
  admin: 'مسؤول',
  clinician: 'طبيب',
  subadmin: 'مساعد إدارة',

  // Sign-in
  'Sign in': 'تسجيل الدخول',
  'Sign out': 'تسجيل الخروج',
  Password: 'كلمة المرور',
  'Staff email': 'بريد الموظف',
  'Create my account': 'إنشاء حسابي',
  'Reset password': 'إعادة تعيين كلمة المرور',
  'Resend verification email': 'إعادة إرسال رسالة التحقق',
  'Show password': 'إظهار كلمة المرور',
  'Hide password': 'إخفاء كلمة المرور',
  'Your clinic, in one place.': 'عيادتك في مكان واحد.',
  'First time here?': 'هل هذه زيارتك الأولى؟',
  'Staff & administrator sign-in': 'دخول الموظفين والإدارة',
  'Staff / administrator sign-in': 'دخول الموظفين والإدارة',
  'Welcome back. Sign in with your clinic account.': 'مرحباً بعودتك. سجّل الدخول بحساب العيادة.',
  'Review results, coordinate follow-up and share clear care plans with your patients.':
    'راجع النتائج ونسّق المتابعة وشارك خطط علاج واضحة مع مرضاك.',
  'Administrators and staff use this same sign-in. Your approved role determines access.':
    'يستخدم المسؤولون والموظفون صفحة الدخول نفسها، وصلاحياتك تحددها الإدارة.',
  'The same sign-in page is used for everyone. Your approved account role determines your access.':
    'صفحة الدخول واحدة للجميع، وصلاحياتك يحددها الدور المعتمد لحسابك.',
  'Create your account with a password of at least 12 characters, verify the email, then sign in to request clinic access. Your administrator approves the request inside this app.':
    'أنشئ حسابك بكلمة مرور من 12 حرفاً على الأقل، وأكّد بريدك الإلكتروني، ثم سجّل الدخول لطلب الوصول. يعتمد المسؤول طلبك داخل التطبيق.',
  'Development workspace · Fictional records only': 'مساحة تطوير · سجلات افتراضية فقط',
  'Authorized clinic access · Your role controls what you can see': 'وصول مخوّل للعيادة · دورك يحدد ما تراه',
  'Administrator and staff access': 'وصول المسؤولين والموظفين',
  'Demo mode has no administrator login. Use Staff sign-in for the connected database.':
    'الوضع التجريبي بلا دخول للمسؤول. استخدم دخول الموظفين للاتصال بقاعدة البيانات.',
  'Signing you back in…': 'جارٍ إعادة تسجيل دخولك…',
  'Check my access': 'التحقق من صلاحياتي',
  'Waiting for administrator approval': 'بانتظار موافقة المسؤول',
  'Saved to authenticated synthetic database': 'تم الحفظ في قاعدة البيانات',

  // Dashboard
  'Clinic dashboard': 'لوحة متابعة العيادة',
  'Anticoagulation service · monitoring, recall and clinical review':
    'خدمة مضادات التخثر · المتابعة والاستدعاء والمراجعة السريرية',
  'What needs doing today?': 'ما المطلوب اليوم؟',
  'Choose a task. The passport shows the next step.': 'اختر مهمة، وسيعرض ملف المريض الخطوة التالية.',
  'INR due': 'فحص INR مستحق',
  'Arrange PHC testing': 'ترتيب الفحص في مركز الرعاية الأولية',
  'Results awaiting review': 'نتائج بانتظار المراجعة',
  'Review and approve a plan': 'مراجعة الخطة واعتمادها',
  'Patients awaiting a care plan': 'مرضى بانتظار إبلاغهم بالخطة',
  'Prepare the patient message': 'إعداد رسالة المريض',
  'Enrolled patients': 'المرضى المسجّلون',
  'ENROLLED PATIENTS': 'المرضى المسجّلون',
  'On the registry': 'في السجل',
  'In range now': 'ضمن النطاق حالياً',
  'IN RANGE NOW': 'ضمن النطاق حالياً',
  'Clinic TTR · 6 mo': 'TTR العيادة · 6 أشهر',
  'CLINIC TTR · 6 MO': 'TTR العيادة · 6 أشهر',
  'Overdue INR': 'فحوص INR متأخرة',
  'OVERDUE INR': 'فحوص INR متأخرة',
  'Planned testing date passed': 'تجاوز موعد الفحص المخطط',
  'Calls due': 'اتصالات مستحقة',
  'CALLS DUE': 'اتصالات مستحقة',
  'Pending today or overdue': 'مستحقة اليوم أو متأخرة',
  'High-risk patients': 'مرضى عالو الخطورة',
  'HIGH-RISK PATIENTS': 'مرضى عالو الخطورة',
  'Staff-flagged clinical priority': 'أولوية سريرية حددها الفريق',
  'Today’s clinic recall': 'استدعاءات اليوم',
  'Needs attention': 'يحتاج إلى متابعة',
  'Last contact': 'آخر تواصل',
  'TTR distribution': 'توزيع TTR',
  'Team handover': 'تسليم الفريق',
  'All follow-ups →': 'كل المتابعات ←',
  'Open team messages →': 'فتح رسائل الفريق ←',
  'All active patients': 'كل المرضى النشطين',
  'All patients': 'كل المرضى',
  'High risk': 'عالي الخطورة',
  'TTR < 65%': 'TTR أقل من 65%',
  'Out of range': 'خارج النطاق',
  'Due today': 'مستحق اليوم',
  Overdue: 'متأخر',
  'Filter dashboard patients': 'تصفية مرضى اللوحة',
  'Filter name, MRN, phone…': 'تصفية بالاسم أو الرقم الطبي أو الهاتف…',
  '+ New patient': '+ مريض جديد',
  'New patient': 'مريض جديد',
  'Refresh clinic': 'تحديث العيادة',
  'Urgent clinical reviews': 'مراجعات سريرية عاجلة',
  'Review symptoms and arrange clinician assessment. Emergency symptoms require emergency care; do not wait for routine recall. Alerts reflect the latest recorded INR and remain until a newer result changes the risk.':
    'راجع الأعراض ورتّب تقييماً من الطبيب. الأعراض الطارئة تستدعي رعاية طارئة دون انتظار الاستدعاء الروتيني. تعتمد التنبيهات على آخر نتيجة INR مسجلة وتبقى حتى تغيّر نتيجة أحدث مستوى الخطورة.',
  'High INR — prompt clinician review': 'INR مرتفع — مراجعة عاجلة من الطبيب',
  'High INR': 'INR مرتفع',
  'prompt clinician review': 'مراجعة عاجلة من الطبيب',
  'Below-target INR with high thrombotic risk': 'INR أقل من المستهدف مع خطورة تخثر عالية',
  'Open patient': 'فتح ملف المريض',
  'Open Patient': 'فتح ملف المريض',
  'Open passport': 'فتح ملف المريض',

  // Patient registry
  'Search records by medical record number, name, or contact number.':
    'ابحث في السجلات بالرقم الطبي أو الاسم أو رقم التواصل.',
  'Search MRN, name or phone': 'ابحث بالرقم الطبي أو الاسم أو الهاتف',
  'Search patients': 'البحث عن المرضى',
  'Demonstration only: enter fictional identifiers and patient information.':
    'للعرض فقط: أدخل معرّفات وبيانات مرضى افتراضية.',
  '+ Register patient': '+ تسجيل مريض',
  Patient: 'المريض',
  MRN: 'الرقم الطبي',
  'Target INR': 'INR المستهدف',
  'Latest INR': 'آخر INR',
  'Last INR': 'آخر INR',
  'Next INR': 'الفحص القادم',
  Status: 'الحالة',
  Action: 'إجراء',
  'Weekly dose': 'الجرعة الأسبوعية',
  'Above target': 'أعلى من المستهدف',
  'Below target': 'أقل من المستهدف',
  'In range': 'ضمن النطاق',
  Scheduled: 'مجدول',
  'Routine monitoring': 'متابعة روتينية',
  'High risk / closer review': 'خطورة عالية / مراجعة أدق',
  'Not assessed': 'لم يُقيَّم',
  'Not calculable': 'غير قابل للحساب',
  Unknown: 'غير معروف',
  'Timestamp unavailable': 'الوقت غير متاح',

  // Diagnoses and risk
  'Atrial fibrillation': 'رجفان أذيني',
  'Venous thromboembolism': 'انصمام خثاري وريدي',
  'Recurrent venous thromboembolism': 'انصمام خثاري وريدي متكرر',
  'Mechanical mitral valve': 'صمام تاجي ميكانيكي',
  'Mechanical aortic valve': 'صمام أبهري ميكانيكي',
  Bleeding: 'نزيف',
  Thrombosis: 'تخثر',
  'Bleeding and thrombosis': 'نزيف وتخثر',
  'Bleeding & thrombosis': 'نزيف وتخثر',
  'Other clinical risk': 'خطورة سريرية أخرى',
  'High-risk patient': 'مريض عالي الخطورة',
  'High-risk patient status': 'حالة الخطورة المرتفعة',
  'High-risk status': 'حالة الخطورة المرتفعة',
  'High-risk category': 'فئة الخطورة',
  'Choose category': 'اختر الفئة',
  'Reason for the high-risk flag': 'سبب تصنيف الخطورة المرتفعة',
  'Risk review date (optional)': 'تاريخ مراجعة الخطورة (اختياري)',
  'This is a staff-maintained clinical priority flag, not an automatically calculated risk score.':
    'هذا تصنيف أولوية سريرية يحدده الفريق، وليس درجة خطورة محسوبة تلقائياً.',
  'Clinical priority': 'الأولوية السريرية',
  'Monitoring priority': 'أولوية المتابعة',
  'Review flag': 'مراجعة التصنيف',
  'Save risk status': 'حفظ حالة الخطورة',

  // Passport
  '← Patient registry': '→ سجل المرضى',
  'Patient registry': 'سجل المرضى',
  'Edit details': 'تعديل البيانات',
  'Edit patient information': 'تعديل بيانات المريض',
  'New INR encounter': 'فحص INR جديد',
  '+ New INR encounter': '+ فحص INR جديد',
  'Prepare WhatsApp message': 'إعداد رسالة واتساب',
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
  'No clinician-approved plan yet': 'لا توجد خطة معتمدة من الطبيب بعد',
  'Contact preferences': 'تفضيلات التواصل',
  'Communication preferences': 'تفضيلات التواصل',
  'Messaging consent recorded': 'تم تسجيل الموافقة على المراسلة',
  'Messaging consent not recorded': 'لم تُسجَّل الموافقة على المراسلة',
  Phone: 'هاتف',
  phone: 'هاتف',
  WhatsApp: 'واتساب',
  whatsapp: 'واتساب',
  Arabic: 'العربية',
  'No message attempts recorded yet.': 'لم تُسجَّل محاولات مراسلة بعد.',
  'INR & TTR': 'INR و TTR',
  'INR, time in range and the next monitoring step': 'INR والوقت ضمن النطاق والخطوة التالية للمتابعة',
  'INR trend': 'اتجاه INR',
  'INR trend for the synthetic patient': 'اتجاه INR للمريض الافتراضي',
  'INR results': 'نتائج INR',
  'Time in therapeutic range': 'الوقت ضمن النطاق العلاجي',
  'Time in range · Rosendaal': 'الوقت ضمن النطاق · طريقة Rosendaal',
  'TTR · 6 mo': 'TTR · 6 أشهر',
  'Method, coverage & limitations': 'الطريقة والتغطية والقيود',
  'Six-month maintenance estimate': 'تقدير الأشهر الستة',
  'Available patient estimates': 'التقديرات المتاحة للمرضى',
  'Short histories are provisional. Clinic mean includes only established estimates.':
    'السجلات القصيرة مبدئية. متوسط العيادة يشمل التقديرات المكتملة فقط.',
  provisional: 'مبدئي',
  established: 'مكتمل',
  'Dose history': 'سجل الجرعات',
  'Longitudinal dose history': 'سجل الجرعات عبر الزمن',
  'Sun–Sat · mg · all regimens retained': 'الأحد–السبت · ملغ · جميع الجرعات محفوظة',
  'Previous → new weekly': 'الأسبوعية السابقة ← الجديدة',
  'Previous → new Sun–Sat': 'السابقة ← الجديدة (الأحد–السبت)',
  'Reason / next INR': 'السبب / الفحص القادم',
  'Entry / approval': 'الإدخال / الاعتماد',
  'Date / INR': 'التاريخ / INR',
  'Entered by': 'أدخلها',
  'No authenticated approval': 'لا يوجد اعتماد موثّق',
  'Synthetic historical fixture': 'سجل تاريخي افتراضي',
  'Synthetic fixture — no clinical approval': 'سجل افتراضي — بلا اعتماد سريري',
  'Recorded maintenance regimen — verify before use': 'الجرعة المسجلة — تحقّق منها قبل الاستخدام',
  'Recorded weekly dose': 'الجرعة الأسبوعية المسجلة',
  'Recorded Sun–Sat schedule': 'الجدول المسجل (الأحد–السبت)',
  'Patient details': 'بيانات المريض',
  'Date of birth': 'تاريخ الميلاد',
  'Contact number': 'رقم التواصل',
  Caregiver: 'مقدم الرعاية',
  'Caregiver phone': 'هاتف مقدم الرعاية',
  'Caregiver telephone': 'هاتف مقدم الرعاية',
  'Indication / target': 'دواعي الاستعمال / المستهدف',
  Enrollment: 'التسجيل',
  'Enrollment date': 'تاريخ التسجيل',
  'INR on enrollment': 'INR عند التسجيل',
  'Initial INR': 'INR الأولي',
  'Warfarin started': 'بدء الوارفارين',
  'Warfarin start date (if known)': 'تاريخ بدء الوارفارين (إن كان معروفاً)',
  'Patient-specific target range': 'النطاق المستهدف للمريض',
  'Target INR lower': 'الحد الأدنى لـ INR المستهدف',
  'Target INR upper': 'الحد الأعلى لـ INR المستهدف',
  'Clinical notes': 'الملاحظات السريرية',
  'New note': 'ملاحظة جديدة',
  '+ Note': '+ ملاحظة',
  'Add dated clinical note': 'إضافة ملاحظة سريرية مؤرخة',
  'Note date': 'تاريخ الملاحظة',
  'Clinical note *': 'الملاحظة السريرية *',
  'Amend prior note (optional)': 'تعديل ملاحظة سابقة (اختياري)',
  Notes: 'ملاحظات',
  'Follow-up record': 'سجل المتابعة',
  'Pending task': 'مهمة معلّقة',
  'No attempts documented.': 'لا توجد محاولات موثّقة.',
  'No saved call attempt': 'لا توجد محاولة اتصال محفوظة',
  'Document follow-up': 'توثيق المتابعة',
  'Patient tablet inventory': 'مخزون أقراص المريض',
  'Update patient tablet inventory': 'تحديث مخزون أقراص المريض',
  'Tablet strength': 'قوة القرص',
  'Tablet strength (mg) *': 'قوة القرص (ملغ) *',
  Quantity: 'الكمية',
  'Confirmed tablets remaining *': 'عدد الأقراص المتبقية المؤكد *',
  'Stock confirmation date': 'تاريخ تأكيد المخزون',
  'Patient-reported tablet stock by strength. Estimates are not physical counts.':
    'مخزون الأقراص كما أبلغ عنه المريض حسب القوة. التقديرات ليست عدّاً فعلياً.',
  'Record a confirmed stock count. Do not calculate adherence from prescribed doses alone.':
    'سجّل عدداً مؤكداً للمخزون، ولا تحسب الالتزام من الجرعات الموصوفة وحدها.',
  'Patient inventory is separate from any future clinic stock module. Do not assume medication has been taken solely because it was prescribed.':
    'مخزون المريض منفصل عن مخزون العيادة. لا تفترض أن الدواء أُخذ لمجرد أنه وُصف.',
  'Warfarin inventory': 'مخزون الوارفارين',
  Change: 'التغيير',
  Update: 'تحديث',
  Checked: 'تم التحقق',
  'None logged': 'لا يوجد سجل',
  'High-risk patient · Bleeding & thrombosis': 'مريض عالي الخطورة · نزيف وتخثر',
  'Review latest INR': 'مراجعة آخر نتيجة INR',
  'Patient message history': 'سجل رسائل المريض',
  'Original message — historical, not the current prescription':
    'الرسالة الأصلية — سجل سابق وليست الوصفة الحالية',
  'Historical attempt': 'محاولة سابقة',

  // INR encounter / dose review
  'Dose review': 'مراجعة الجرعة',
  'Review INR and dosing decision': 'مراجعة INR وقرار الجرعة',
  '1. Result and safety checks': '1. النتيجة وفحوص السلامة',
  '2. Review the dosing decision': '2. مراجعة قرار الجرعة',
  '3. Instructions and next test': '3. التعليمات والفحص القادم',
  'Enter a measured INR result': 'أدخل نتيجة INR مقاسة',
  'Measured INR date *': 'تاريخ قياس INR *',
  'INR result *': 'نتيجة INR *',
  'Bleeding / emergency symptoms?': 'هل يوجد نزيف أو أعراض طارئة؟',
  'Missed doses?': 'هل فاتت جرعات؟',
  'Medicine / diet changes?': 'هل تغيرت الأدوية أو التغذية؟',
  'Acute illness / clinical risk?': 'هل يوجد مرض حاد أو خطر سريري؟',
  'Dose changed in past 2 weeks?': 'هل تغيرت الجرعة خلال الأسبوعين الماضيين؟',
  'Previous regimen verified?': 'هل تحققت من الجرعات السابقة؟',
  'Patient context (optional)': 'سياق المريض (اختياري)',
  'Clinical context for reference suggestions': 'السياق السريري للمقترحات المرجعية',
  'Confirm the current measured result, test date and individualized target.':
    'أكّد النتيجة المقاسة الحالية وتاريخ الفحص والنطاق المستهدف للمريض.',
  'Review the actual maintenance schedule before choosing a dosing reference.':
    'راجع جدول الجرعات الفعلي قبل اختيار مرجع للجرعة.',
  'Clinician-entered decision': 'القرار الذي أدخله الطبيب',
  'New weekly dose (mg) *': 'الجرعة الأسبوعية الجديدة (ملغ) *',
  'Daily doses in mg · Sunday to Saturday': 'الجرعات اليومية بالملغ · من الأحد إلى السبت',
  'Next INR test date *': 'موعد INR القادم *',
  'Next INR test': 'موعد INR القادم',
  'Reason for this dosing decision *': 'سبب قرار الجرعة *',
  'Clinical assessment and notes': 'التقييم السريري والملاحظات',
  'Hold instruction (if clinically ordered)': 'تعليمات إيقاف مؤقت (إذا طلبها الطبيب)',
  'Temporary hold — Arabic (if applicable)': 'تعليمات الإيقاف المؤقت — بالعربية (عند الحاجة)',
  'Patient instructions — English (approved with this plan)': 'تعليمات المريض — بالإنجليزية (تُعتمد مع الخطة)',
  'Patient instructions — Arabic (for Arabic messages)': 'تعليمات المريض — بالعربية (للرسائل العربية)',
  'Reference values above are never inserted into these fields.':
    'القيم المرجعية أعلاه لا تُدرج في هذه الحقول تلقائياً.',
  'Saving does not add a clinician signature. Authenticated approval is recorded separately.':
    'الحفظ لا يضيف توقيع الطبيب، والاعتماد الموثّق يُسجَّل بشكل منفصل.',
  'Save the measured INR and a proposed plan, then request clinician review. Reference suggestions are never an approved prescription.':
    'احفظ نتيجة INR والخطة المقترحة ثم اطلب مراجعة الطبيب. المقترحات المرجعية ليست وصفة معتمدة.',
  'Source-linked reference support · clinician decisions are saved separately':
    'دعم مرجعي مرتبط بالمصادر · قرارات الطبيب تُحفظ بشكل منفصل',
  'CONDITIONAL · NOT A PRESCRIPTION': 'إرشادي · ليس وصفة طبية',
  'Management considerations': 'اعتبارات العلاج',
  'Reversal / emergency guidance': 'إرشادات العكس / الطوارئ',
  'Clinician must specify any hold': 'يجب أن يحدد الطبيب أي إيقاف',
  'Clinician must set the next INR date': 'يجب أن يحدد الطبيب موعد INR القادم',
  'Routine maintenance percentages are withheld for this result.':
    'لا تُعرض نسب تعديل الجرعة الروتينية لهذه النتيجة.',
  'A measured INR and the prescribed target are needed for a management pathway.':
    'يلزم INR مقاس والنطاق المستهدف الموصوف لعرض مسار العلاج.',
  'Save draft care plan': 'حفظ مسودة الخطة',
  Back: 'السابق',
  Next: 'التالي',
  'Hold:': 'إيقاف:',
  'Recheck:': 'إعادة الفحص:',
  'Add result': 'إضافة نتيجة',
  'Test date': 'تاريخ الفحص',
  'INR check': 'فحص INR',

  // Follow-ups
  'Follow-up worklist': 'قائمة المتابعة',
  'Routine calls are scheduled two calendar days after the planned INR check.':
    'تُجدول الاتصالات الروتينية بعد يومين من موعد فحص INR المخطط.',
  'The 2-day rule is for routine administrative calls only. A clinically urgent INR or bleeding concern requires prompt review according to an approved clinic protocol.':
    'قاعدة اليومين للاتصالات الإدارية الروتينية فقط. أي INR عاجل سريرياً أو قلق من نزيف يتطلب مراجعة فورية وفق بروتوكول العيادة المعتمد.',
  'Open a passport to document contact and clinical actions':
    'افتح ملف المريض لتوثيق التواصل والإجراءات السريرية',
  'Call date': 'تاريخ الاتصال',
  'Call due': 'اتصال مستحق',
  'Routine call date': 'تاريخ الاتصال الروتيني',
  'Call outcome': 'نتيجة الاتصال',
  'Call notes': 'ملاحظات الاتصال',
  Contacted: 'تم التواصل',
  'No answer': 'لا يوجد رد',
  'Unable to contact': 'تعذّر التواصل',
  Escalated: 'تم التصعيد',
  Pending: 'معلّق',
  Completed: 'مكتمل',
  'Clinical actions / contact attempt *': 'الإجراءات السريرية / محاولة التواصل *',
  'No INR or dosing change this call': 'لا تغيير في INR أو الجرعة في هذا الاتصال',
  'Link saved INR / dosing decision (optional)': 'ربط نتيجة INR / قرار جرعة محفوظ (اختياري)',
  'Complete this task after saving the documented action': 'أكمل هذه المهمة بعد حفظ الإجراء الموثّق',
  'Record INR and dosing changes using New INR encounter before completing the call. Failed contact remains pending.':
    'سجّل INR وتغييرات الجرعة من خلال "فحص INR جديد" قبل إكمال الاتصال. محاولة التواصل الفاشلة تبقى معلّقة.',

  // Team messages
  'Clinic conversation': 'محادثة العيادة',
  'General clinic conversation': 'محادثة العيادة العامة',
  'Shared clinician discussion; messages do not replace clinical decisions':
    'نقاش مشترك بين الفريق؛ الرسائل لا تحل محل القرارات السريرية',
  'Shared clinical handover · patient decisions belong in the passport.':
    'تسليم سريري مشترك · قرارات المريض مكانها ملف المريض.',
  'Demo messages stay in this browser. Messages do not approve a dose or close a follow-up.':
    'الرسائل التجريبية تبقى في هذا المتصفح، ولا تعتمد جرعة ولا تغلق متابعة.',
  'Share a review request or clinical handover…': 'شارك طلب مراجعة أو تسليماً سريرياً…',
  'New message': 'رسالة جديدة',
  Message: 'الرسالة',
  'Post demo message': 'نشر رسالة تجريبية',
  'Post message': 'نشر الرسالة',
  'Refresh messages': 'تحديث الرسائل',
  'Load older messages': 'عرض الرسائل الأقدم',
  Reply: 'رد',

  // Staff / admin
  'My account': 'حسابي',
  'Local fictional demonstration': 'عرض افتراضي محلي',
  'Staff awaiting approval': 'موظفون بانتظار الموافقة',
  'Approved staff': 'الموظفون المعتمدون',
  Approve: 'اعتماد',
  Reject: 'رفض',
  Disable: 'تعطيل',
  Enable: 'تفعيل',
  Role: 'الدور',
  Name: 'الاسم',
  Email: 'البريد الإلكتروني',
  Active: 'نشط',
  Disabled: 'معطّل',
  'Clinic contact details': 'بيانات التواصل مع العيادة',

  // Patient form
  'Patient name *': 'اسم المريض *',
  'MRN *': 'الرقم الطبي *',
  'Date of birth *': 'تاريخ الميلاد *',
  'Diagnosis / indication *': 'التشخيص / دواعي الاستعمال *',

  // Patient messages / care dialogs
  'Preferred language': 'اللغة المفضلة',
  'Preferred contact method': 'وسيلة التواصل المفضلة',
  'Message preview': 'معاينة الرسالة',
  'Patient communication preferences': 'تفضيلات التواصل مع المريض',
  'Prepare patient message': 'إعداد رسالة للمريض',
  'Review patient message': 'مراجعة رسالة المريض',
  'Prepare draft': 'إعداد المسودة',
  'Record outcome': 'تسجيل النتيجة',
  'Open WhatsApp': 'فتح واتساب',
  'Approve care plan': 'اعتماد الخطة',
  'Opening WhatsApp is not proof of delivery. Failed contact stays pending.':
    'فتح واتساب ليس دليلاً على وصول الرسالة. محاولة التواصل الفاشلة تبقى معلّقة.',

  // General
  Cancel: 'إلغاء',
  Save: 'حفظ',
  Close: 'إغلاق',
  Yes: 'نعم',
  No: 'لا',
  Language: 'اللغة',
  'Saved successfully.': 'تم الحفظ بنجاح.',
  // Signed-in staff screens
  Access: 'الصلاحية',
  'Not set': 'غير محدد',
  'Clear form': 'مسح النموذج',
  'Clinic role': 'الدور في العيادة',
  'Edit access': 'تعديل الصلاحية',
  'Post to team': 'نشر للفريق',
  'Staff member': 'الموظف',
  'Active access': 'صلاحية فعّالة',
  'Refresh staff': 'تحديث قائمة الموظفين',
  'Staff email *': 'بريد الموظف *',
  'Not enough data': 'لا توجد بيانات كافية',
  'Deployment guide': 'دليل النشر',
  'Saudi Arabia +966': 'السعودية +966',
  'Save staff access': 'حفظ صلاحية الموظف',
  'Add a staff member': 'إضافة موظف',
  'No clinical notes.': 'لا توجد ملاحظات سريرية.',
  'Technical settings': 'الإعدادات التقنية',
  'Authenticated staff': 'موظف موثّق',
  'No INR results yet.': 'لا توجد نتائج INR بعد.',
  'No confirmed stock.': 'لا يوجد مخزون مؤكد.',
  'Provisional estimate': 'تقدير مبدئي',
  'Staff display name *': 'اسم الموظف الظاهر *',
  'No team messages yet.': 'لا توجد رسائل للفريق بعد.',
  'No pending follow-ups.': 'لا توجد متابعات معلّقة.',
  'More INR history is needed.': 'يلزم سجل INR أطول.',
  'Reset development workspace': 'إعادة تعيين مساحة التطوير',
  'Target missing': 'المستهدف غير محدد',
  'INR missing': 'INR غير مسجل',
  'Confirmed tablet strength (mg)': 'قوة القرص المؤكدة (ملغ)',
  'Country code for a local number': 'رمز الدولة للرقم المحلي',
  'Telephone (+ number, or Saudi 05…)': 'الهاتف (رقم دولي بـ + أو رقم سعودي يبدأ بـ 05)',
  'I confirmed this number with the patient': 'تأكدت من هذا الرقم مع المريض',
  'Another country — enter the full + number': 'دولة أخرى — أدخل الرقم الدولي كاملاً بـ +',
  'Open team messages to start the conversation.': 'افتح رسائل الفريق لبدء المحادثة.',
  'Patient consent for clinical messaging confirmed': 'تم تأكيد موافقة المريض على المراسلة السريرية',
  'I checked the actual tablet strength with the patient': 'تحققت من قوة القرص الفعلية مع المريض',
  'clinical approval': 'الاعتماد السريري',
  'entry and follow-up': 'الإدخال والمتابعة',
  'accounts/settings': 'الحسابات والإعدادات',
  'Approve staff email addresses and manage clinic roles': 'اعتماد بريد الموظفين وإدارة أدوار العيادة',
  'No calls due today. View all follow-ups for upcoming calls.':
    'لا توجد اتصالات مستحقة اليوم. اعرض كل المتابعات لمعرفة الاتصالات القادمة.',
  'At least two usable INR results within the permitted gap are needed':
    'يلزم نتيجتا INR صالحتان على الأقل ضمن الفاصل الزمني المسموح',
  'Choose the patient’s language. The care plan must already be approved.':
    'اختر لغة المريض. يجب أن تكون الخطة معتمدة مسبقاً.',
  'Manage approved access and development samples. This is the administrator area.':
    'إدارة الصلاحيات المعتمدة والبيانات التجريبية. هذه منطقة المسؤول.',
  'No verified requests waiting. New staff appear here after verifying their email and signing in.':
    'لا توجد طلبات بانتظار الموافقة. يظهر الموظفون الجدد هنا بعد تأكيد بريدهم وتسجيل الدخول.',
  'Tablet counts appear only for a confirmed strength and whole/half-tablet combinations. Doses remain in mg.':
    'يظهر عدد الأقراص فقط عند تأكيد قوة القرص وإمكانية استخدام قرص كامل أو نصف قرص. الجرعات تبقى بالملغ.',
  'Your approved staff identity and timestamp are recorded. Messages do not approve a dose or close a follow-up.':
    'تُسجَّل هويتك المعتمدة ووقت الرسالة. الرسائل لا تعتمد جرعة ولا تغلق متابعة.',
  'These people verified their email and requested clinic access. Confirm their identity and choose their role here.':
    'هؤلاء أكدوا بريدهم وطلبوا الوصول إلى العيادة. تحقّق من هويتهم واختر دورهم هنا.',
  'Administrator access does not add a clinician signature. You cannot disable or remove your own administrator access.':
    'صلاحية المسؤول لا تضيف توقيع طبيب، ولا يمكنك تعطيل صلاحيتك الإدارية بنفسك.',
  'Fictional patients and handovers are populated automatically. Reset starts an empty workspace and turns off automatic fictional data. Historical records and audit events remain archived; staff accounts and configuration are preserved.':
    'تُضاف بيانات المرضى والتسليمات الافتراضية تلقائياً. إعادة التعيين تبدأ مساحة فارغة وتوقف البيانات الافتراضية. تبقى السجلات التاريخية وسجل التدقيق مؤرشفة، وتُحفظ حسابات الموظفين والإعدادات.',
};

const months = {
  Jan: 'يناير',
  Feb: 'فبراير',
  Mar: 'مارس',
  Apr: 'أبريل',
  May: 'مايو',
  Jun: 'يونيو',
  Jul: 'يوليو',
  Aug: 'أغسطس',
  Sep: 'سبتمبر',
  Sept: 'سبتمبر',
  Oct: 'أكتوبر',
  Nov: 'نوفمبر',
  Dec: 'ديسمبر',
};
const weekdays = {
  Sun: 'الأحد',
  Mon: 'الاثنين',
  Tue: 'الثلاثاء',
  Wed: 'الأربعاء',
  Thu: 'الخميس',
  Fri: 'الجمعة',
  Sat: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
  Saturday: 'السبت',
};
const DATE = /\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) (\d{4})\b/g;
const HAS_DATE = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4}\b/;
const arDate = (s) => s.replace(DATE, (m, d, mon, y) => `${d} ${months[mon]} ${y}`);

/** Phrases that contain numbers or dates. Each returns Arabic, or undefined if it does not apply. */
const patterns = [
  [
    /^⚠ (\d+) urgent clinical reviews? — action required$/,
    (m) => `⚠ مراجعات سريرية عاجلة: ${m[1]} — يلزم إجراء`,
  ],
  [/^(\d+) patient\(s\)$/, (m) => `${m[1]} مريض`],
  [/^(\d+) tablets?$/, (m) => `${m[1]} قرص`],
  [/^(\d+) years?$/, (m) => `${m[1]} سنة`],
  [/^(\d+) d overdue$/, (m) => `متأخر ${m[1]} يوم`],
  [/^(\d+) days? observed$/, (m) => `${m[1]} يوماً من المتابعة`],
  [/^(\d+) observed days$/, (m) => `${m[1]} يوماً من المتابعة`],
  [/^(\d+) of (\d+) latest INRs$/, (m) => `${m[1]} من ${m[2]} من آخر نتائج INR`],
  [/^(\d+) established$/, (m) => `${m[1]} مكتمل`],
  [/^(\d+) provisional$/, (m) => `${m[1]} مبدئي`],
  [/^Target ([\d.]+–[\d.]+)$/, (m) => `المستهدف ${m[1]}`],
  [/^([\d.]+) mg$/, (m) => `${m[1]} ملغ`],
  [/^([\d.]+) mg tablets$/, (m) => `أقراص ${m[1]} ملغ`],
  [/^(.+) dose$/, (m) => (weekdays[m[1]] ? `جرعة ${weekdays[m[1]]}` : undefined)],
  [
    /^Call (\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4})$/,
    (m) => `اتصال ${arDate(m[1])}`,
  ],
  [
    /^Next: (\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4})$/,
    (m) => `القادم: ${arDate(m[1])}`,
  ],
  [
    /^Confirmed (\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4})$/,
    (m) => `تم التأكيد ${arDate(m[1])}`,
  ],
  [
    /^Review: (\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4})$/,
    (m) => `المراجعة: ${arDate(m[1])}`,
  ],
  [/^Recorded by (.+)$/, (m) => `سجّلها ${translatePhrase(m[1])}`],
  [
    /^Approved (\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) \d{4})$/,
    (m) => `اعتُمدت ${arDate(m[1])}`,
  ],
  [/^Dose review — INR ([\d.]+)$/, (m) => `مراجعة الجرعة — INR ${m[1]}`],
  [/^Below target · INR ([\d.]+)$/, (m) => `أقل من المستهدف · INR ${m[1]}`],
  [/^Daily doses total ([\d.]+) mg\/week ✓$/, (m) => `مجموع الجرعات اليومية ${m[1]} ملغ/أسبوع ✓`],
  [/^Patient message history \((\d+)\)$/, (m) => `سجل رسائل المريض (${m[1]})`],
  [/^([<≥]\s?\d+%|\d+–\d+%): (\d+) patient\(s\)$/, (m) => `${m[1]}: ${m[2]} مريض`],
  [/^(\d+)% of the six-month window covered\.$/, (m) => `تغطية ${m[1]}% من فترة الأشهر الستة.`],
  [/^6-month maintenance$/, () => 'متابعة 6 أشهر'],
  [
    /^Last refreshed (\d{1,2}:\d{2}) · checks every 60 seconds while this page is visible$/,
    (m) => `آخر تحديث ${m[1]} · يتم التحقق كل 60 ثانية أثناء عرض الصفحة`,
  ],
  [/^Backend: (.+) ·$/, (m) => `الخادم: ${m[1]} ·`],
];

function translatePart(text) {
  if (ar[text]) return ar[text];
  if (weekdays[text]) return weekdays[text];
  for (const [regex, build] of patterns) {
    const m = text.match(regex);
    if (m) {
      const out = build(m);
      if (out !== undefined) return out;
    }
  }
  if (HAS_DATE.test(text) && !/[A-Za-z]{2,}/.test(text.replace(DATE, ''))) return arDate(text);
  return undefined;
}
/** Translate a whole phrase, or a phrase made of parts joined by " · ", " — ", " / " or " → ". */
function translatePhrase(text) {
  const whole = translatePart(text);
  if (whole !== undefined) return whole;
  for (const separator of [' · ', ' — ', ' / ', ' → ']) {
    if (!text.includes(separator)) continue;
    const parts = text.split(separator);
    let changed = false;
    const translated = parts.map((p) => {
      const t = p.trim() ? translatePhrase(p.trim()) : undefined;
      if (t !== undefined) changed = true;
      return t !== undefined ? t : p;
    });
    // U+200F (right-to-left mark) around separators keeps mixed English/Arabic parts in reading order.
    if (changed) return translated.join('\u200F' + (separator === ' → ' ? ' ← ' : separator) + '\u200F');
  }
  return undefined;
}

export function uiText(text) {
  return language === 'ar' ? (translatePhrase(text) ?? text) : text;
}
export function interfaceLanguage() {
  return language;
}
export function toggleInterfaceLanguage() {
  language = language === 'en' ? 'ar' : 'en';
  localStorage.setItem(LANGUAGE_KEY, language);
  applyInterfaceLanguage();
}

const ATTRIBUTES = ['placeholder', 'aria-label', 'title'];
const LATIN = /[A-Za-z]/;
export function applyInterfaceLanguage() {
  const root = document.documentElement;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
  const button = document.querySelector('#interface-language');
  const label = language === 'ar' ? 'English' : 'العربية';
  if (button && button.textContent !== label) button.textContent = label;
  // Nothing to do in English until Arabic has been used once (then the originals are restored).
  if (language === 'en' && !translatedOnce) return;
  translatedOnce = true;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,textarea,pre,[data-no-translate]')) continue;
    if (node.__uiEnglish === undefined) {
      if (!LATIN.test(node.textContent)) continue;
      node.__uiEnglish = node.textContent;
    }
    const original = node.__uiEnglish,
      trimmed = original.replace(/\s+/g, ' ').trim();
    if (language === 'en') {
      if (node.textContent !== original) node.textContent = original;
      continue;
    }
    const translated = translatePhrase(trimmed);
    if (translated !== undefined) {
      const lead = /^\s/.test(original) ? ' ' : '',
        trail = /\s$/.test(original) ? ' ' : '';
      if (node.textContent !== lead + translated + trail) node.textContent = lead + translated + trail;
    } else if (!parent.hasAttribute('dir') && parent.childNodes.length === 1) {
      // Untranslated English (names, notes, source guidance): keep its own direction so punctuation
      // and numbers stay in the right place inside the Arabic layout.
      parent.setAttribute('dir', 'auto');
    }
  }
  for (const element of document.body.querySelectorAll(ATTRIBUTES.map((a) => `[${a}]`).join(','))) {
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value === null) continue;
      const key = `data-ui-en-${attribute}`;
      if (!element.hasAttribute(key)) {
        if (!LATIN.test(value)) continue;
        element.setAttribute(key, value);
      }
      const original = element.getAttribute(key),
        next = language === 'ar' ? (translatePhrase(original) ?? original) : original;
      if (value !== next) element.setAttribute(attribute, next);
    }
  }
  for (const node of document.querySelectorAll('.nomogram-result,.dose-entry,.grid-days,.chart-container'))
    node.setAttribute('dir', 'ltr');
}
