const { chromium } = require('playwright');
// Arabic mode translates the interface (including dates and phrases with numbers), keeps the phone layout
// within the screen, and switching back restores the original English exactly.
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    for (const width of [1366, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }),
        errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto((process.env.TEST_URL || 'http://127.0.0.1:8000/') + '?mode=demo');
      await page.getByRole('heading', { name: 'Clinic dashboard' }).waitFor();
      const english = await page.locator('#app').innerText();
      await page.locator('#interface-language').click();
      await page.getByRole('heading', { name: 'لوحة متابعة العيادة' }).waitFor();
      if ((await page.locator('html').getAttribute('dir')) !== 'rtl')
        throw Error('Arabic is not right-to-left');
      if ((await page.locator('#interface-language').innerText()) !== 'English')
        throw Error('Toggle label translated');
      const arabic = await page.locator('#app').innerText();
      for (const phrase of ['مراجعات سريرية عاجلة', 'ما المطلوب اليوم؟', 'نوفمبر'])
        if (!arabic.includes(phrase)) throw Error('Missing Arabic: ' + phrase);
      for (const phrase of [
        'What needs doing today?',
        'urgent clinical review',
        'Nov 2026',
        'Enrolled patients',
      ])
        if (arabic.includes(phrase)) throw Error('Still English in Arabic mode: ' + phrase);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
        throw Error('Arabic layout overflows at ' + width);
      await page.locator('[data-open]').first().click();
      await page.getByText('الخطوات التالية لهذا المريض').waitFor();
      await page.locator('[data-nav=dashboard]').click();
      await page.locator('#interface-language').click();
      await page.getByRole('heading', { name: 'Clinic dashboard' }).waitFor();
      if ((await page.locator('#app').innerText()) !== english) throw Error('English not fully restored');
      if (errors.length) throw Error(errors.join('; '));
      await page.evaluate(() => localStorage.clear());
      await page.close();
      console.log(width + ': Arabic interface and English restore passed');
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
