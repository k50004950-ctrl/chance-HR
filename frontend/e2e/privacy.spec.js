import { test, expect } from '@playwright/test';

test('개인정보처리방침 접근 가능', async ({ page }) => {
  await page.goto('/#/privacy-policy');
  await expect(page.getByRole('heading', { name: '개인정보 처리방침' }).first()).toBeVisible();
});
