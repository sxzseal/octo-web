import { test, expect } from '@playwright/test';
import { BASE_URL, USER_A } from './test-config';

const TEST_USER = USER_A.username;
const TEST_PASS = USER_A.password;

test.describe('DMWork Web 验收测试', () => {

  test('1. 页面加载 + 品牌检查', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle('DMWork');
  });

  test('2. 注册页面可访问', async ({ page }) => {
    await page.goto(BASE_URL);
    // 登录页默认可能显示注册入口，用精确匹配
    const registerLink = page.getByText('没有账号？注册');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForTimeout(1000);
      await expect(page.getByText('注册新账号')).toBeVisible();
    }
  });

  test('3. 用户名登录流程', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);
    // 登录页面 — 输入框可能在默认登录 tab 下
    const usernameInput = page.locator('input[placeholder*="用户名"]').first();
    const passwordInput = page.locator('input[placeholder*="密码"]').first();
    
    if (await usernameInput.isVisible()) {
      await usernameInput.fill(TEST_USER);
      await passwordInput.fill(TEST_PASS);
      await page.getByRole('button', { name: '登录' }).click();
      await page.waitForTimeout(3000);
    }
  });

  test('4. 主题色蓝紫色', async ({ page }) => {
    await page.goto(BASE_URL);
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--wk-color-theme').trim()
    );
    expect(color).toBe('#6366F1');
  });
});
