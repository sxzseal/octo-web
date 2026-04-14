import React from 'react';
import { createRoot } from 'react-dom/client';
import '@octo/base/src/theme/tokens.css';
import './style.css';
import { BaseModule, WKApp } from '@octo/base';
import StorageService from '@octo/base/src/Service/StorageService';
import { LoginModule } from '@octo/login';
import { DataSourceModule } from '@octo/datasource';
import { ContactsModule } from '@octo/contacts';
import { Channel } from 'wukongimjssdk';
import App from '../../../web/src/App';
import {
  DEFAULT_API_URL,
  EXTENSION_MESSAGE_TYPE,
  normalizeApiURL,
  type ConversationTarget,
  type ExtensionAuthState,
  type ExtensionRuntimeMessage,
} from '../../utils/extensionRuntime';
import {
  clearExtensionAuthState,
  clearPendingConversation,
  getPendingConversation,
  setExtensionAuthState,
  setPendingConversation,
} from '../../utils/extensionStorage';

// 标记扩展环境（Layout 等组件据此跳过 window.location.href 硬跳转）
(window as any).__POWERED_EXTENSION__ = true;

// 扩展环境使用 localStorage 替代 sessionStorage，确保侧边面板关闭重开后登录状态不丢失
StorageService.shared.setItem = (key, value) => localStorage.setItem(key, value);
StorageService.shared.getItem = (key) => localStorage.getItem(key);
StorageService.shared.removeItem = (key) => localStorage.removeItem(key);

// API 配置（扩展环境直接用完整 URL）
const apiURL = normalizeApiURL(DEFAULT_API_URL);
WKApp.apiClient.config.apiURL = apiURL;
WKApp.apiClient.config.tokenCallback = () => WKApp.loginInfo.token;
WKApp.config.appVersion = '0.0.0.1';
WKApp.config.appName = 'Octo';

WKApp.loginInfo.load();

function getAuthSnapshot(): ExtensionAuthState {
  return {
    loggedIn: WKApp.loginInfo.isLogined(),
    uid: WKApp.loginInfo.uid || '',
    token: WKApp.loginInfo.token || '',
    apiURL,
    currentSpaceId: localStorage.getItem('currentSpaceId') || '',
  };
}

async function syncExtensionAuthState(): Promise<void> {
  const auth = getAuthSnapshot();
  if (auth.loggedIn && auth.token) {
    await setExtensionAuthState(auth);
    await browser.runtime.sendMessage({
      type: EXTENSION_MESSAGE_TYPE.authChanged,
      auth,
    } satisfies ExtensionRuntimeMessage).catch(() => {});
    return;
  }

  await clearExtensionAuthState();
  await browser.runtime.sendMessage({
    type: EXTENSION_MESSAGE_TYPE.authCleared,
  } satisfies ExtensionRuntimeMessage).catch(() => {});
}

async function openConversation(target: ConversationTarget): Promise<boolean> {
  if (!WKApp.shared.isLogined()) {
    return false;
  }

  WKApp.endpoints.showConversation(
    new Channel(target.channelId, target.channelType),
  );
  return true;
}

let pendingConversationRetryId: number | undefined;
let lastSyncedSpaceId = localStorage.getItem('currentSpaceId') || '';

async function consumePendingConversation(): Promise<void> {
  const target = await getPendingConversation();
  if (!target) {
    if (pendingConversationRetryId) {
      window.clearInterval(pendingConversationRetryId);
      pendingConversationRetryId = undefined;
    }
    return;
  }

  const opened = await openConversation(target);
  if (opened) {
    await clearPendingConversation();
    if (pendingConversationRetryId) {
      window.clearInterval(pendingConversationRetryId);
      pendingConversationRetryId = undefined;
    }
  }
}

function ensurePendingConversationRetry(): void {
  if (!pendingConversationRetryId) {
    pendingConversationRetryId = window.setInterval(() => {
      void consumePendingConversation();
    }, 1000);
  }
}

window.setInterval(() => {
  const currentSpaceId = localStorage.getItem('currentSpaceId') || '';
  if (currentSpaceId === lastSyncedSpaceId) {
    return;
  }
  lastSyncedSpaceId = currentSpaceId;
  void syncExtensionAuthState();
}, 1000);

const originalLoginSave = WKApp.loginInfo.save.bind(WKApp.loginInfo);
WKApp.loginInfo.save = () => {
  originalLoginSave();
  void syncExtensionAuthState();
};

const originalLogout = WKApp.shared.logout.bind(WKApp.shared);
WKApp.shared.logout = () => {
  void clearPendingConversation()
    .then(() => clearExtensionAuthState())
    .then(() =>
      browser.runtime.sendMessage({
        type: EXTENSION_MESSAGE_TYPE.authCleared,
      } satisfies ExtensionRuntimeMessage).catch(() => {}),
    )
    .finally(() => {
      originalLogout();
    });
};

// 注册模块
WKApp.shared.registerModule(new BaseModule());
WKApp.shared.registerModule(new DataSourceModule());
WKApp.shared.registerModule(new LoginModule());
WKApp.shared.registerModule(new ContactsModule());

WKApp.shared.startup();
void syncExtensionAuthState();

// 渲染
const container = document.getElementById('root')!;
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

browser.runtime.onMessage.addListener((message: ExtensionRuntimeMessage) => {
  if (message.type === EXTENSION_MESSAGE_TYPE.openConversation) {
    void setPendingConversation(message.target).then(() => {
      void consumePendingConversation();
      ensurePendingConversationRetry();
    });
  }
});

void consumePendingConversation();
ensurePendingConversationRetry();
