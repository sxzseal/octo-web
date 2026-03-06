import { test, expect, Page } from '@playwright/test';
import { BASE_URL, API_URL, USER_A } from './test-config';

async function ensureUser(user: typeof USER_A) {
  try {
    await fetch(`${API_URL}/v1/user/usernameregister`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, name: user.name, password: user.password, flag: 1 }),
    });
  } catch {}
}

// 默认页面是扫码登录，需要先切换到手机号/用户名登录
async function switchToPasswordLogin(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);
  // 点击"使用手机号登录"按钮切换到密码登录
  const switchBtn = page.getByText('使用手机号登录');
  if (await switchBtn.isVisible().catch(() => false)) {
    await switchBtn.click();
    await page.waitForTimeout(500);
  }
}

async function loginUser(page: Page, user: typeof USER_A) {
  await switchToPasswordLogin(page);
  const usernameInput = page.locator('input[placeholder*="手机号"]:visible, input[placeholder*="用户名"]:visible').first();
  const passwordInput = page.locator('input[type="password"]:visible').first();
  await usernameInput.fill(user.username);
  await passwordInput.fill(user.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(3000);
}

async function goToRegister(page: Page) {
  await switchToPasswordLogin(page);
  const link = page.getByText('没有账号？注册');
  if (await link.isVisible()) {
    await link.click();
    await page.waitForTimeout(500);
  }
}

// ============ 一、品牌 ============
test.describe('一、品牌与页面基础', () => {
  test('1.1 页面标题为 DMWork', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle('DMWork');
  });
  test('1.2 Favicon 存在', async ({ page }) => {
    await page.goto(BASE_URL);
    const favicon = await page.locator('link[rel*="icon"]').getAttribute('href');
    expect(favicon).toBeTruthy();
  });
  test('1.3 主题色存在', async ({ page }) => {
    await switchToPasswordLogin(page);
    // 等 React 渲染完成
    await page.waitForTimeout(1000);
    const color = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--wk-color-theme').trim()
    );
    expect(color.length).toBeGreaterThan(0);
  });
  test('1.4 无唐僧叨叨残留', async ({ page }) => {
    await switchToPasswordLogin(page);
    const text = await page.locator('body').innerText();
    expect(text).not.toContain('唐僧叨叨');
  });
  test('1.5 viewport 禁止缩放拼写正确', async ({ page }) => {
    await page.goto(BASE_URL);
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toContain('maximum-scale=1.0');
    expect(content).not.toContain('maximu-scale');
  });
});

// ============ 二、注册 ============
test.describe('二、注册功能', () => {
  test('2.1 注册页面可访问', async ({ page }) => {
    await goToRegister(page);
    await expect(page.getByText('注册新账号')).toBeVisible();
  });
  test('2.2 注册表单字段完整', async ({ page }) => {
    await goToRegister(page);
    const visibleInputs = page.locator('input:visible');
    expect(await visibleInputs.count()).toBeGreaterThanOrEqual(4);
  });
  test('2.3 注册表单密码框可见', async ({ page }) => {
    await goToRegister(page);
    const pwdInputs = page.locator('input[type="password"]:visible');
    expect(await pwdInputs.count()).toBe(2);
  });
  test('2.4 注册表单自动填充提示', async ({ page }) => {
    await goToRegister(page);
    const usernameAuto = await page.locator('input[name="reg-username"]:visible').first().getAttribute('autocomplete');
    const passwordAuto = await page.locator('input[name="reg-password"]:visible').first().getAttribute('autocomplete');
    const confirmAuto = await page.locator('input[name="reg-confirm-password"]:visible').first().getAttribute('autocomplete');
    expect(usernameAuto).toBe('username');
    expect(passwordAuto).toBe('new-password');
    expect(confirmAuto).toBe('new-password');
  });
});

// ============ 三、登录 ============
test.describe('三、登录功能', () => {
  test.beforeAll(async () => { await ensureUser(USER_A); });

  test('3.0 登录表单包含自动填充提示', async ({ page }) => {
    await switchToPasswordLogin(page);
    const usernameAuto = await page.locator('input[name="username"]:visible').first().getAttribute('autocomplete');
    const passwordAuto = await page.locator('input[name="password"]:visible').first().getAttribute('autocomplete');
    expect(usernameAuto).toBe('username');
    expect(['current-password', 'password']).toContain(passwordAuto ?? '');
  });

  test('3.1 切换到密码登录后有输入框', async ({ page }) => {
    await switchToPasswordLogin(page);
    const inputs = page.locator('input:visible');
    expect(await inputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('3.2 登录按钮存在', async ({ page }) => {
    await switchToPasswordLogin(page);
    const btn = page.getByRole('button', { name: '登录', exact: true });
    expect(await btn.isVisible()).toBeTruthy();
  });

  test('3.3 正确凭证登录', async ({ page }) => {
    await loginUser(page, USER_A);
    // 登录后应该离开登录页
    await page.waitForTimeout(2000);
    const loginBtnGone = !(await page.getByRole('button', { name: '登录', exact: true }).isVisible().catch(() => false));
    const scanLoginGone = !(await page.getByText('使用手机号登录').isVisible().catch(() => false));
    expect(loginBtnGone || scanLoginGone).toBeTruthy();
  });

  test('3.4 错误密码不跳转', async ({ page }) => {
    await switchToPasswordLogin(page);
    const usernameInput = page.locator('input:visible').first();
    const passwordInput = page.locator('input[type="password"]:visible').first();
    await usernameInput.fill(USER_A.username);
    await passwordInput.fill('wrongpassword');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForTimeout(2000);
    const btn = page.getByRole('button', { name: '登录', exact: true });
    expect(await btn.isVisible()).toBeTruthy();
  });
});

// ============ 四、API ============
test.describe('四、API 连通性', () => {
  test('4.1 API 端口可达', async ({ request }) => {
    const resp = await request.get(`${API_URL}/v1`).catch(() => null);
    expect(resp !== null).toBeTruthy();
  });
  test('4.2 用户名登录 API', async ({ request }) => {
    await ensureUser(USER_A);
    const resp = await request.post(`${API_URL}/v1/user/usernamelogin`, {
      data: { username: USER_A.username, password: USER_A.password },
    });
    expect(resp.status()).toBe(200);
  });
});

// ============ 五、响应式 ============
test.describe('五、响应式', () => {
  test('5.1 桌面无水平滚动', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });
  test('5.2 手机尺寸可用', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle('DMWork');
  });
  test('5.3 手机无水平滚动', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 2);
  });
});
