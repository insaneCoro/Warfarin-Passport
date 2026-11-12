const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--no-sandbox'],
  });
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 820, height: 1180 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto((process.env.TEST_URL || 'http://127.0.0.1:8000/') + '?mode=demo');
    await page.locator('[data-nav=followups]').click();
    await page.getByRole('button', { name: 'Open Patient' }).first().click();
    await page.getByRole('button', { name: 'Record contact with patient' }).click();
    await page.locator('[name=actions]').fill('No answer; callback planned');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('No answer; callback planned', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Record contact with patient' }).click();
    await page.locator('[name=outcome]').selectOption('Contacted');
    await page.locator('[name=actions]').fill('Reviewed plan and confirmed next test');
    await page.locator('[name=complete]').check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByText('Reviewed plan and confirmed next test', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Enter a new INR' }).click();
    await page.locator('[name=inr]').fill('2.5');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('[name=reason]').fill('Continue reviewed regimen');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.locator('[name=nextInrDate]').fill('2027-01-01');
    await page.getByRole('button', { name: 'Save draft care plan' }).click();
    await page.locator('#history').getByText('Continue reviewed regimen', { exact: false }).first().waitFor();
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR || 'docs/screenshots'}/passport-${viewport.width}.png`,
      fullPage: true,
    });
    if (errors.length) throw Error(errors.join(';'));
    console.log(`Passed ${viewport.width}: open, failed attempt, completion, dose history; no JS errors`);
    await page.close();
  }
  await browser.close();
})();
