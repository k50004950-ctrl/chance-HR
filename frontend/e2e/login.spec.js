import { test, expect } from '@playwright/test';

test('로그인 페이지 렌더링', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('아이디')).toBeVisible();
  await expect(page.getByPlaceholder('비밀번호')).toBeVisible();
});

test('빈 로그인 시도 시 에러', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /로그인/ }).click();
  // 에러 메시지 또는 validation 확인
});

test('회원가입 페이지 이동', async ({ page }) => {
  await page.goto('/');
  await page.getByText(/회원가입/).click();
  await expect(page).toHaveURL(/signup/);
});
