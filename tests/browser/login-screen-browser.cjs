const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const width of [1366, 820, 390]) {
      const p = await b.newPage({ viewport: { width, height: 1100 } });
      const errors = [];
      p.on('pageerror', (e) => errors.push(e.message));
      let prepared = 0;
      await p.route('https://identitytoolkit.googleapis.com/**', (r) =>
        r.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ idToken: 'synthetic-token', expiresIn: 3600 }),
        }),
      );
      await p.route('https://warfarin-passport-api.m-k-altaher.workers.dev/**', (r) => {
        const { action } = r.request().postDataJSON();
        let result;
        if (action === 'auth.me')
          result = {
            uid: 'synthetic-admin',
            role: 'admin',
            displayName: 'Synthetic admin',
            workspaceReady: true,
            workspaceId: '',
          };
        else if (action === 'patients.list') result = [];
        else if (action === 'staff.requests.list') result = [];
        else if (action === 'users.list')
          result = [
            {
              uid: 'private-staff',
              email: 'synthetic-private@example.test',
              displayName: 'Synthetic approved staff',
              role: 'clinician',
              active: true,
            },
          ];
        else if (action === 'workspace.prepare') {
          prepared++;
          result = { remaining: 0 };
        } else throw Error('Unexpected ' + action);
        return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, result }) });
      });
      await p.goto((process.env.TEST_URL || 'http://127.0.0.1:8004/') + '?mode=connected&view=staff');
      await p.getByRole('heading', { name: 'Staff & administrator sign-in', exact: true }).waitFor();
      if (
        (await p.locator('.sidebar').isVisible()) ||
        (await p.locator('#breadcrumb').isVisible()) ||
        (await p.locator('.user-pill').isVisible())
      )
        throw Error('Workspace shell visible before login');
      if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw Error('Login overflows viewport');
      await p.screenshot({
        path: `${process.env.SCREENSHOT_DIR || 'docs/screenshots'}/login-${width}.png`,
        fullPage: true,
      });
      await p.locator('[name=email]').fill('admin@example.test');
      await p.locator('[name=password]').fill('synthetic-password');
      await p.getByRole('button', { name: 'Show password', exact: true }).click();
      if ((await p.locator('[name=password]').getAttribute('type')) !== 'text')
        throw Error('Password toggle failed');
      await p.getByRole('button', { name: 'Hide password', exact: true }).click();
      await p.getByRole('button', { name: 'Sign in', exact: true }).click();
      await p.getByRole('heading', { name: 'Admin & staff', exact: true }).waitFor();
      if (!(await p.locator('.sidebar').isVisible()) || prepared)
        throw Error('Authenticated navigation or one-time setup wrong');
      await p.getByText('Synthetic approved staff', { exact: true }).waitFor();
      await p.getByRole('button', { name: 'Sign out', exact: true }).click();
      await p.getByRole('heading', { name: 'Staff & administrator sign-in', exact: true }).waitFor();
      if (
        (await p.locator('.sidebar').isVisible()) ||
        (await p.getByText('Synthetic approved staff', { exact: true }).count()) ||
        (await p.getByText('synthetic-private@example.test', { exact: true }).count())
      )
        throw Error('Logout retained clinic data or navigation');
      if (await p.locator('[name=password]').inputValue()) throw Error('Logout retained password');
      if (errors.length) throw Error(errors.join(';'));
      console.log(
        width +
          ': standalone login, password visibility, approved-role workspace, no repeated setup, and clean logout passed',
      );
      await p.close();
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
