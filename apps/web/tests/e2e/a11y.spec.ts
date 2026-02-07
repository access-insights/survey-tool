import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing page is keyboard accessible and has no critical axe violations', async ({ page }) => {
  await page.goto('/');

  const skipLink = page.locator('a.skip-link');
  await expect(skipLink).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  const critical = accessibilityScanResults.violations.filter((violation) => violation.impact === 'critical');

  expect(critical).toEqual([]);
});
