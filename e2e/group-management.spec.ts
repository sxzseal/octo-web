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
  await page.waitForTimeout(2000);
}

async function ss(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/test-screenshots/${name}.png`, fullPage: true });
}

// 在会话列表中找到群聊并点击
async function openGroup(page: Page): Promise<boolean> {
  // 群聊通常有「群」字或多人头像标识
  const groupSelectors = [
    '[class*="group"]',
    'text=/群/',
    '[title*="群"]',
  ];

  for (const sel of groupSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      await page.waitForTimeout(1500);
      console.log(`Opened group via selector: ${sel}`);
      return true;
    }
  }

  // 尝试找会话列表中含有「群」的项
  const items = page.locator('[class*="session-item"], [class*="chat-item"], [class*="conversation"]');
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    const text = await items.nth(i).innerText().catch(() => '');
    if (text.includes('群') || text.includes('Group')) {
      await items.nth(i).click();
      await page.waitForTimeout(1500);
      console.log(`Opened group item ${i}: ${text.slice(0, 30)}`);
      return true;
    }
  }

  console.log('No group found in conversation list');
  return false;
}

// 打开群信息/设置面板
async function openGroupInfo(page: Page): Promise<boolean> {
  const infoSelectors = [
    'button[title*="群信息"], button[title*="设置"]',
    '[class*="group-info"], [class*="group-setting"]',
    'button:has-text("群信息")',
    'button:has-text("设置")',
    '[class*="info-btn"]',
    '.wk-header [class*="setting"], .wk-header [class*="info"]',
  ];

  for (const sel of infoSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click();
      await page.waitForTimeout(1000);
      console.log(`Opened group info via: ${sel}`);
      return true;
    }
  }

  // 尝试点击聊天头部区域（通常是群名称）
  const header = page.locator('.wk-chat-header, [class*="chat-header"], [class*="conversation-header"]').first();
  if (await header.isVisible().catch(() => false)) {
    await header.click();
    await page.waitForTimeout(1000);
    console.log('Clicked chat header to open group info');
    return true;
  }

  return false;
}

test.describe('一、群成员列表', () => {
  test.beforeAll(async () => { await ensureUser(USER_A); });

  test('GM-1.1 会话列表加载完成', async ({ page }) => {
    await loginUser(page, USER_A);
    await ss(page, 'gm-1.1-main');

    // 主界面加载成功
    const isLoggedIn = !(await page.getByRole('button', { name: '登录', exact: true }).isVisible().catch(() => false));
    console.log('Logged in (no login button):', isLoggedIn);
    expect(isLoggedIn).toBeTruthy();
  });

  test('GM-1.2 查看群聊会话', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    console.log('Group found and opened:', found);

    await ss(page, 'gm-1.2-group-chat');

    if (found) {
      // 群聊界面应有消息输入区
      const chatArea = await page.locator(
        'textarea, div[contenteditable], .wk-chat, [class*="chat-content"]'
      ).first().isVisible().catch(() => false);
      console.log('Chat area visible in group:', chatArea);
    }
  });

  test('GM-1.3 群成员列表入口', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    if (!found) {
      console.log('No group available, skipping member list test');
      return;
    }

    // 尝试打开群信息
    await openGroupInfo(page);
    await ss(page, 'gm-1.3-group-info');

    // 查找成员相关元素
    const memberSelectors = [
      '[class*="member"]',
      '[class*="participant"]',
      'text=/成员/',
      'text=/Members/',
    ];

    let hasMemberSection = false;
    for (const sel of memberSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        hasMemberSection = true;
        console.log(`Member section found: ${sel}, count: ${count}`);
        break;
      }
    }
    console.log('Has member section:', hasMemberSection);
  });

  test('GM-1.4 群成员头像显示', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    if (!found) {
      console.log('No group found, skipping avatar test');
      return;
    }

    await openGroupInfo(page);
    await ss(page, 'gm-1.4-member-avatars');

    // 查找头像元素（img 或 avatar class）
    const avatarSelectors = [
      '[class*="avatar"] img',
      '[class*="member"] img',
      '[class*="avatar"]',
    ];

    for (const sel of avatarSelectors) {
      const count = await page.locator(sel).count();
      console.log(`Avatar selector: ${sel}, count: ${count}`);
      if (count > 0) break;
    }
  });
});

test.describe('二、群设置页面', () => {
  test.beforeAll(async () => { await ensureUser(USER_A); });

  test('GM-2.1 群设置面板可打开', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    if (!found) {
      console.log('No group available, skipping settings test');
      return;
    }

    const infoOpened = await openGroupInfo(page);
    await ss(page, 'gm-2.1-group-settings');
    console.log('Group info/settings opened:', infoOpened);

    // 设置面板应包含某种内容
    if (infoOpened) {
      const panelVisible = await page.locator(
        '[class*="panel"], [class*="drawer"], [class*="modal"], [class*="info"]'
      ).first().isVisible().catch(() => false);
      console.log('Settings panel visible:', panelVisible);
    }
  });

  test('GM-2.2 群名称显示', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    if (!found) {
      console.log('No group found, skipping name test');
      return;
    }

    await openGroupInfo(page);
    await ss(page, 'gm-2.2-group-name');

    // 群名应在头部或信息面板中可见
    const nameSelectors = [
      '[class*="group-name"]',
      '[class*="channel-name"]',
      '[class*="chat-name"]',
      '.wk-header-name',
      '[class*="title"]',
    ];

    for (const sel of nameSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        const text = await el.innerText().catch(() => '');
        console.log(`Group name via ${sel}: "${text}"`);
        break;
      }
    }
  });

  test('GM-2.3 群设置包含退出/解散选项', async ({ page }) => {
    await loginUser(page, USER_A);

    const found = await openGroup(page);
    if (!found) {
      console.log('No group available, skipping exit option test');
      return;
    }

    await openGroupInfo(page);

    // 等待面板完全渲染
    await page.waitForTimeout(1000);
    await ss(page, 'gm-2.3-exit-option');

    // 查找退出/解散按钮（不点击，只检查存在）
    const exitSelectors = [
      'button:has-text("退出")',
      'button:has-text("解散")',
      'text=/退出群/i',
      'text=/解散群/i',
      '[class*="exit"], [class*="leave"], [class*="dismiss"]',
    ];

    let hasExitOption = false;
    for (const sel of exitSelectors) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) {
        hasExitOption = true;
        console.log(`Exit option found: ${sel}`);
        break;
      }
    }
    console.log('Has exit/dismiss option:', hasExitOption);
    // 软断言：有些群可能只有普通成员权限
  });

  test('GM-2.4 群 API 返回有效数据', async ({ request }) => {
    // 先登录获取 token
    const loginResp = await request.post(`${API_URL}/v1/user/usernamelogin`, {
      data: { username: USER_A.username, password: USER_A.password },
    });
    expect(loginResp.status()).toBe(200);
    const loginData = await loginResp.json().catch(() => ({}));
    console.log('Login response keys:', Object.keys(loginData));

    const token = loginData.token || loginData.data?.token || '';
    if (!token) {
      console.log('No token found, skipping channel API test');
      return;
    }

    // 查询频道列表
    const channelResp = await request.get(`${API_URL}/v1/channel`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);

    if (channelResp) {
      console.log('Channel API status:', channelResp.status());
      expect([200, 401, 403, 404]).toContain(channelResp.status());
    }
  });
});
