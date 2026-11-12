const { chromium } = require('playwright');
function samplePatient(patientId) {
  const n = Number(patientId.slice(-1));
  return {
    patient: {
      id: patientId,
      mrn: 'DEMO-00' + n,
      name: 'Sample Patient ' + String.fromCharCode(64 + n),
      dob: '1950-01-15',
      diagnosis: 'Synthetic test',
      targetLow: 2,
      targetHigh: 3,
      status: 'Active',
    },
    results: [],
    dosePlans: [],
    encounters: [],
    followups: [],
    inventory: [],
    notes: [],
    attempts: [],
    approvals: [],
  };
}
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const role of ['admin', 'subadmin']) {
      const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
      let loaded = false,
        imports = 0;
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route('https://identitytoolkit.googleapis.com/**', (r) =>
        r.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ idToken: 'synthetic-mocked-token', expiresIn: 3600 }),
        }),
      );
      await page.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**', async (route) => {
        const { action, params } = route.request().postDataJSON();
        let result;
        if (action === 'staff.requests.list' || action === 'users.list') result = [];
        else if (action === 'auth.me') result = { uid: 'synthetic-admin', role, displayName: 'Test staff' };
        else if (action === 'patients.workspace')
          result = loaded ? [1, 2, 3, 4, 5, 6, 7].map((n) => samplePatient('sample-' + n)) : [];
        else if (action === 'workspace.prepare') {
          imports++;
          loaded = true;
          result = { created: ['DEMO-001', 'DEMO-002', 'DEMO-003', 'DEMO-004'], skipped: [] };
        } else if (action === 'patients.get') {
          result = samplePatient(params.patientId);
        } else throw Error('Unexpected API action ' + action);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
      });
      await page.goto((process.env.TEST_URL || 'http://127.0.0.1:8000/') + '?mode=connected');
      await page.locator('[name=email]').fill('synthetic@example.test');
      await page.locator('[name=password]').fill('synthetic-mocked-password');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByText('Clinic dashboard', { exact: true }).waitFor();
      await page.locator('[data-nav=staff]').click();
      if (role === 'admin') {
        await page.locator('[data-nav=patients]').click();
        await page.getByText('Sample Patient A', { exact: true }).waitFor();
        if ((await page.locator('[data-open]').count()) !== 7) throw Error('Samples missing');
        if (imports !== 1) throw Error('Unexpected import count');
      } else if (
        (await page.locator('#load-samples').count()) ||
        (await page.locator('#reset-workspace').count()) ||
        imports
      )
        throw Error('Sample import exposed to non-admin');
      if (await page.locator('#load-samples').count()) throw Error('Sample button should be removed');
      if ((await page.evaluate(() => localStorage.length)) !== 0 || errors.length)
        throw Error('Connected data stored locally or JS errors: ' + errors.join(';'));
      console.log(role + ': authenticated sample loader visibility and connected storage checks passed');
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
