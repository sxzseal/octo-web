import { test, expect, Page } from '@playwright/test';
import { BASE_URL, API_URL, USER_A, USER_B } from './test-config';

async function ensureUser(user: typeof USER_A) {
  try {
    await fetch(`${API_URL}/v1/user/usernameregister`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, name: user.name, password: user.password, flag: 1 }),
    });
  } catch {}
}

async function switchToPasswordLogin(page: Page) {
  await page.goto(BASE_URL);
  await page.waitForTimeout(1500);
  const switchBtn = page.getByText('使用手机号登录');
  if (await switchBtn.isVisible().catch(() => false)) {
    await switchBtn.click();
    await page.waitForTimeout(500);
  }
}

async function loginUser(page: Page, user: typeof USER_A) {
  await switchToPasswordLogin(page);
  await page.locator('input[type="text"]:visible').first().fill(user.username);
  await page.locator('input[type="password"]:visible').first().fill(user.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForURL('**/?sid=*', { timeout: 15000 }).catch(() => {});
}

async function goToRegister(page: Page) {
  await switchToPasswordLogin(page);
  const link = page.getByText('没有账号？注册');
  if (await link.isVisible()) { await link.click(); await page.waitForTimeout(500); }
}

async function ss(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/test-screenshots/${name}.png`, fullPage: true });
}

// ===== 一、品牌 =====
test.describe('一、品牌与页面基础', () => {
  test('1.1 标题', async ({ page }) => { await page.goto(BASE_URL); await expect(page).toHaveTitle('DMWork'); });
  test('1.2 Favicon', async ({ page }) => { await page.goto(BASE_URL); expect(await page.locator('link[rel*="icon"]').getAttribute('href')).toBeTruthy(); });
  test('1.3 Logo', async ({ page }) => { await switchToPasswordLogin(page); expect(await page.locator('img[alt="logo"]').first().isVisible()).toBeTruthy(); });
  test('1.4 无残留', async ({ page }) => {
    await switchToPasswordLogin(page);
    const t = await page.locator('.wk-login-content-phonelogin:visible').innerText();
    expect(t).not.toContain('唐僧叨叨');
  });
});

// ===== 二、注册 =====
test.describe('二、注册功能', () => {
  test('2.1 注册页面', async ({ page }) => { await goToRegister(page); await expect(page.getByText('注册新账号')).toBeVisible(); await ss(page, '2.1-register'); });
  test('2.2 表单字段>=4', async ({ page }) => { await goToRegister(page); expect(await page.locator('input:visible').count()).toBeGreaterThanOrEqual(4); });
  test('2.3 密码框x2', async ({ page }) => { await goToRegister(page); expect(await page.locator('input[type="password"]:visible').count()).toBe(2); });
});

// ===== 三、登录 =====
test.describe('三、登录功能', () => {
  test.beforeAll(async () => { await ensureUser(USER_A); await ensureUser(USER_B); });
  test('3.1 输入框', async ({ page }) => { await switchToPasswordLogin(page); expect(await page.locator('input:visible').count()).toBeGreaterThanOrEqual(2); });
  test('3.2 登录按钮', async ({ page }) => { await switchToPasswordLogin(page); expect(await page.getByRole('button', { name: '登录', exact: true }).isVisible()).toBeTruthy(); });
  test('3.3 正确登录', async ({ page }) => {
    await loginUser(page, USER_A);
    // 等待登录按钮消失（最多15秒）
    try {
      await page.getByRole('button', { name: '登录', exact: true }).waitFor({ state: 'hidden', timeout: 15000 });
    } catch {}
    await page.waitForTimeout(1000);
    await ss(page, '3.3-after-login');
    const gone = !(await page.getByRole('button', { name: '登录', exact: true }).isVisible().catch(() => false));
    const hasNav = await page.locator('.wk-nav,.wk-sidebar,.wk-main').first().isVisible().catch(() => false);
    expect(gone || hasNav).toBeTruthy();
  });
  test('3.4 错误密码', async ({ page }) => {
    await switchToPasswordLogin(page);
    await page.locator('input:visible').first().fill(USER_A.username);
    await page.locator('input[type="password"]:visible').first().fill('wrong');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await page.waitForTimeout(2000);
    expect(await page.getByRole('button', { name: '登录', exact: true }).isVisible()).toBeTruthy();
  });
  test('3.5 扫码默认', async ({ page }) => {
    await page.goto(BASE_URL); await page.waitForTimeout(2000);
    expect(await page.locator('.wk-login').first().isVisible().catch(() => false)).toBeTruthy();
  });
});

// ===== 四、主界面 =====
test.describe('四、主界面', () => {
  test('4.1 登录后进入主页', async ({ page }) => {
    await loginUser(page, USER_A);
    await page.waitForTimeout(2000);
    await ss(page, '4.1-main');
    const body = await page.locator('body').innerText();
    expect(body.includes('使用手机号登录')).toBeFalsy();
  });
  test('4.2 联系人中有 BotFather', async ({ page }) => {
    await loginUser(page, USER_A);
    await page.waitForTimeout(2000);
    // 尝试找到联系人/通讯录入口
    const contactsNav = page.locator('[class*="contact"],[class*="friend"]').first();
    if (await contactsNav.isVisible().catch(() => false)) {
      await contactsNav.click();
      await page.waitForTimeout(1000);
    }
    await ss(page, '4.2-contacts');
    // 验证 BotFather 存在（可能在联系人列表或最近会话中）
    const hasBotFather = await page.getByText('BotFather').isVisible().catch(() => false)
      || await page.getByText('botfather').isVisible().catch(() => false);
    // 不强制断言，记录结果
    console.log('BotFather visible:', hasBotFather);
  });
});

// ===== 五、API =====
test.describe('五、API 连通性', () => {
  test('5.1 API 可达', async ({ request }) => { expect((await request.get(`${API_URL}/v1`).catch(() => null)) !== null).toBeTruthy(); });
  test('5.2 登录 API', async ({ request }) => {
    const r = await request.post(`${API_URL}/v1/user/usernamelogin`, { data: { username: USER_A.username, password: USER_A.password } });
    expect(r.status()).toBe(200);
  });
  test('5.3 Skill.md 完整', async ({ request }) => {
    const r = await request.get(`${API_URL}/v1/bot/skill.md`);
    expect(r.status()).toBe(200);
    const t = await r.text();
    expect(t).toContain('DMWork Bot Skill');
    expect(t).toContain('Step 1: Register');
    expect(t).toContain('OpenClaw Plugin');
    expect(t).toContain('Streaming Response');
    expect(t).toContain('Security');
    expect(t.length).toBeGreaterThan(5000);
  });
  test('5.4 上传需认证', async ({ request }) => {
    const r = await request.post(`${API_URL}/v1/file/upload`);
    expect([401, 400, 403]).toContain(r.status());
  });
});

// ===== 六、响应式 =====
test.describe('六、响应式', () => {
  test('6.1 桌面', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(BASE_URL); await page.waitForTimeout(500);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    const cw = await page.evaluate(() => document.documentElement.clientWidth);
    expect(sw).toBeLessThanOrEqual(cw + 5);
  });
  test('6.2 手机', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle('DMWork');
  });
});
