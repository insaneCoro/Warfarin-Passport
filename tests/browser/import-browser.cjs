const { chromium } = require('playwright');
const path = require('node:path');
// Admin imports the clinic Excel register (fictional fixture with the real column layout) after the reset:
// preview, import, skip on re-upload, and the imported patient shows age text and dated INR results.
(async () => {
  const { storage } = await import('../helpers/sheets.mjs');
  const { c } = storage();
  c.CacheService = { getScriptCache: () => ({ get: () => '1', put() {} }) };
  c.plusCalendarDays_ = (iso, n) => {
    const d = new Date(iso + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const admin = { uid: 'admin', email: 'admin@example.test', displayName: 'Clinic admin' };
  c.append_('Users', {
    firebaseUid: admin.uid,
    email: admin.email,
    displayName: admin.displayName,
    role: 'admin',
    active: true,
  });
  c.saveWorkspaceState_({ id: 'real-1', mode: 'empty', preparedRelease: '' });
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await context.route('https://identitytoolkit.googleapis.com/**', (r) =>
      r.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ idToken: 't', refreshToken: 'r', expiresIn: 3600 }),
      }),
    );
    await context.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**', (r) => {
      try {
        const result = c.dispatch_({
          ...r.request().postDataJSON(),
          user: { uid: admin.uid, email: admin.email, emailVerified: true },
        });
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
      } catch (err) {
        return r.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, error: err.message }),
        });
      }
    });
    await page.goto((process.env.TEST_URL || 'http://127.0.0.1:8000/') + '?view=staff');
    await page.locator('[name=email]').fill(admin.email);
    await page.locator('[name=password]').fill('synthetic-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('heading', { name: 'Import patients from Excel' }).waitFor();
    const fixture = path.join(__dirname, '..', 'fixtures', 'register-fictional.xlsx');
    await page.locator('#import-file').setInputFiles(fixture);
    await page.getByRole('button', { name: 'Import 3 patients' }).waitFor();
    if (!(await page.locator('.import-card').innerText()).includes('5 INR results'))
      throw Error('Preview count wrong');
    await page.getByRole('button', { name: 'Import 3 patients' }).click();
    await page.getByText(/Imported 3 patients/).waitFor();
    const one = c.allRows_('Patients').find((p) => p.mrn === 'TEST00000000001');
    if (one.phone !== '0500000001') throw Error('Mobile leading zero lost: ' + one.phone);
    const two = c.allRows_('Patients').find((p) => p.mrn === 'TEST00000000002');
    const next = c.allRows_('Follow_Ups').find((f) => f.patientId === two.id);
    if (next?.inrCheckDate !== '2026-11-10')
      throw Error('"2 WEEKS" next INR not converted: ' + next?.inrCheckDate);
    // Uploading the same file again is safe.
    await page.locator('#import-file').setInputFiles(fixture);
    await page.getByRole('button', { name: 'Import 3 patients' }).click();
    await page.getByText(/Imported 0 patients. 3 already existed/).waitFor();
    if (c.allRows_('Patients').length !== 3) throw Error('Duplicate patients created');
    await page.locator('[data-nav=patients]').click();
    await page.locator('[data-open="TEST00000000001"]').first().click();
    await page.getByRole('heading', { name: 'FICTIONAL ONE' }).waitFor();
    const passport = await page.locator('#screen').innerText();
    for (const want of ['79 years', 'Home Care', '2.9'])
      if (!passport.includes(want)) throw Error('Passport missing ' + want);
    if (errors.length) throw Error(errors.join('; '));
    console.log('Excel import: preview, import, safe re-upload and imported passport passed');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
