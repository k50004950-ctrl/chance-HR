import { test, expect } from '@playwright/test';

test('로그인 페이지 렌더링', async ({ page }) => {
  await page.goto('/#/login');
  await expect(page.getByRole('heading', { name: 'ChanceHR' })).toBeVisible();
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test('빈 로그인 시도 시 에러', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: /^(로그인|Login)$/ }).click();
  await expect(page.locator('input[name="username"]')).toBeVisible();
});

test('회원가입 페이지 이동', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByRole('button', { name: /(사업주 회원가입|Business Owner Sign Up)/ }).click();
  await expect(page).toHaveURL(/signup-v2\?role=owner/);
});
