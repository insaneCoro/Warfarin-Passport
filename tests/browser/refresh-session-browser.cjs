const { chromium } = require('playwright');
// Sign-in needs one backend call (patients arrive with auth.me), and a page refresh keeps the user signed in
// without storing any patient data in the browser.
(async () => {
  const { storage } = await import('../helpers/sheets.mjs');
  const { c } = storage();
  c.CacheService = { getScriptCache: () => ({ get: () => '1', put() {} }) };
  const doc = { uid: 'doctor', email: 'doctor@example.test', displayName: 'Dr Synthetic' };
  c.append_('Users', {
    firebaseUid: doc.uid,
    email: doc.email,
    displayName: doc.displayName,
    role: 'clinician',
    active: true,
  });
  c.append_('Patients', {
    id: 'p1',
    mrn: 'DEMO-101',
    name: 'Fictional Patient One',
    dob: '1960-01-01',
    diagnosis: 'Synthetic AF',
    targetLow: 2,
    targetHigh: 3,
    status: 'Active',
    rowVersion: 1,
  });
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage(),
      errors = [],
      calls = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await context.route('https://identitytoolkit.googleapis.com/**', (r) =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ idToken: 'token-1', refreshToken: 'refresh-1', expiresIn: 3600 }),
      }),
    );
    await context.route('https://securetoken.googleapis.com/**', (r) =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ id_token: 'token-2', refresh_token: 'refresh-2', expires_in: 3600 }),
      }),
    );
    await context.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**', (r) => {
      const payload = r.request().postDataJSON();
      calls.push(payload.action);
      try {
        const result = c.dispatch_({
          ...payload,
          user: { uid: doc.uid, email: doc.email, emailVerified: true },
        });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
      } catch (err) {
        return r.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: err.message }),
        });
      }
    });
    const base = process.env.TEST_URL || 'http://127.0.0.1:8000/';
    await page.goto(base);
    await page.locator('[name=email]').fill(doc.email);
    await page.locator('[name=password]').fill('synthetic-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.locator('#dashboard-registry [data-open="DEMO-101"]').waitFor();
    if (calls.join() !== 'auth.me')
      throw Error('Sign-in should need one backend call, made: ' + calls.join());
    calls.length = 0;
    await page.reload();
    await page.locator('#dashboard-registry [data-open="DEMO-101"]').waitFor();
    if (await page.locator('[name=password]').count()) throw Error('Refresh showed the login form');
    if (calls.join() !== 'auth.me')
      throw Error('Restore should need one backend call, made: ' + calls.join());
    const stored = await page.evaluate(
      () => JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage }),
    );
    if (/Fictional Patient|DEMO-101|token-/.test(stored))
      throw Error('Patient data or ID token stored in the browser');
    if (errors.length) throw Error(errors.join('; '));
    console.log('one-call sign-in, refresh keeps session, no patient data stored: passed');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
