import {
  EXTENSION_MESSAGE_TYPE,
  EXTENSION_STORAGE_KEYS,
  parseNotificationId,
  type ExtensionAuthResponse,
  type ExtensionRuntimeMessage,
} from "../utils/extensionRuntime";
import {
  clearPendingConversation,
  getExtensionAuthState,
  getExtensionPreferences,
  setPendingConversation,
} from "../utils/extensionStorage";

const BADGE_BG_COLOR = "#d24747";
const BADGE_DOT_TEXT = "•";
const OFFSCREEN_DOCUMENT_PATH = "/offscreen.html";
const SETTINGS_CONTEXT_MENU_ID = "open-extension-settings";
const chromeApi = (globalThis as { chrome?: any }).chrome;
const SIDEPANEL_ACTIVE_TTL_MS = 5000;
const NEW_MESSAGE_BADGE_GRACE_MS = 3000;
let lastSidepanelActiveAt = 0;
let lastNewMessageAt = 0;

function markSidepanelActive(): void {
  lastSidepanelActiveAt = Date.now();
}

function clearSidepanelActive(): void {
  lastSidepanelActiveAt = 0;
}

function isSidepanelActive(): boolean {
  return Date.now() - lastSidepanelActiveAt < SIDEPANEL_ACTIVE_TTL_MS;
}

async function getStoredAuthResponse(): Promise<ExtensionAuthResponse> {
  const auth = await getExtensionAuthState();
  return { auth: auth?.loggedIn ? auth : null };
}

async function syncAuthStateToOffscreen(): Promise<void> {
  const { auth } = await getStoredAuthResponse();

  if (auth?.loggedIn) {
    try {
      await browser.runtime.sendMessage({
        type: EXTENSION_MESSAGE_TYPE.authChanged,
        auth,
      } satisfies ExtensionRuntimeMessage);
    } catch (error) {
      console.debug("[Extension] Failed to sync auth state to offscreen:", error);
    }
    return;
  }

  try {
    await browser.runtime.sendMessage({
      type: EXTENSION_MESSAGE_TYPE.authCleared,
    } satisfies ExtensionRuntimeMessage);
  } catch (error) {
    console.debug("[Extension] Failed to clear offscreen auth state:", error);
  }
}

async function ensureOffscreenDocument(): Promise<void> {
  if (!chromeApi?.offscreen?.createDocument) {
    return;
  }

  try {
    await chromeApi.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [
        chromeApi.offscreen.Reason.WORKERS,
        chromeApi.offscreen.Reason.AUDIO_PLAYBACK,
      ],
      justification:
        "Keep unread badge and message notifications in sync, and play extension sounds when the side panel is closed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Only a single offscreen")) {
      console.warn("[Extension] Failed to create offscreen document:", error);
    }
  }
}

async function updateBadge(hasUnread: boolean): Promise<void> {
  const text = hasUnread ? BADGE_DOT_TEXT : "";
  await browser.action.setBadgeBackgroundColor({ color: BADGE_BG_COLOR });
  await browser.action.setBadgeText({ text });
}

async function clearAllNotifications(): Promise<void> {
  const items = await browser.notifications.getAll();
  Object.keys(items).forEach((notificationId) => {
    void browser.notifications.clear(notificationId);
  });
}

async function openOptionsPage(): Promise<void> {
  if (browser.runtime.openOptionsPage) {
    await browser.runtime.openOptionsPage();
  }
}

async function focusChromeWindow(): Promise<number | undefined> {
  const currentWindow = await browser.windows.getLastFocused();
  if (!currentWindow.id) {
    return undefined;
  }

  await browser.windows.update(currentWindow.id, { focused: true });
  return currentWindow.id;
}

async function applyPreferencesToUi(): Promise<void> {
  const preferences = await getExtensionPreferences();

  if (!preferences.notificationsEnabled) {
    await updateBadge(false);
    await clearAllNotifications();
    return;
  }

  if (!preferences.notificationsVisible) {
    await clearAllNotifications();
  }
}

function registerSettingsContextMenu(): void {
  if (!chromeApi?.contextMenus?.create) {
    return;
  }

  chromeApi.contextMenus.removeAll(() => {
    chromeApi.contextMenus.create({
      id: SETTINGS_CONTEXT_MENU_ID,
      title: "打开配置",
      contexts: ["action"],
    });
  });
}

async function openSidePanel(windowId?: number): Promise<void> {
  if (!chromeApi?.sidePanel?.open) {
    return;
  }

  const targetWindowId = windowId ?? (await focusChromeWindow());
  if (!targetWindowId) {
    return;
  }

  await chromeApi.sidePanel.open({ windowId: targetWindowId });
}

async function dispatchConversationOpen(notificationId: string): Promise<void> {
  const target = parseNotificationId(notificationId);
  if (!target) {
    return;
  }

  await setPendingConversation(target);
  await focusChromeWindow();

  if (isSidepanelActive()) {
    await openSidePanel();
  }

  try {
    await browser.runtime.sendMessage({
      type: EXTENSION_MESSAGE_TYPE.openConversation,
      target,
    } satisfies ExtensionRuntimeMessage);
  } catch (error) {
    console.debug("[Extension] Sidepanel is not ready yet, pending target kept.", error);
  }
}

async function handleRuntimeMessage(
  message: ExtensionRuntimeMessage,
): Promise<ExtensionAuthResponse | void> {
  if (message.type === EXTENSION_MESSAGE_TYPE.offscreenReady) {
    return getStoredAuthResponse();
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.authChanged) {
    void ensureOffscreenDocument().then(() => {
      void syncAuthStateToOffscreen();
    });
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.authCleared) {
    void clearPendingConversation();
    void updateBadge(false);
    void clearAllNotifications();
    void syncAuthStateToOffscreen();
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.offscreenSyncResult) {
    if (isSidepanelActive()) {
      return;
    }

    void getExtensionPreferences().then((preferences) => {
      const shouldShowBadge = preferences.notificationsEnabled && message.hasAuth;
      const wantBadge = shouldShowBadge && message.hasUnread;
      // 刚收到新消息时 SDK 的 unread 计数可能还未更新，跳过清除以防覆盖
      if (!wantBadge && Date.now() - lastNewMessageAt < NEW_MESSAGE_BADGE_GRACE_MS) {
        return;
      }
      void updateBadge(wantBadge);
    });
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync) {
    markSidepanelActive();
    void getExtensionPreferences().then((preferences) => {
      void updateBadge(preferences.notificationsEnabled && message.hasUnread);
    });
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.sidepanelState) {
    if (message.active) {
      markSidepanelActive();
    } else {
      clearSidepanelActive();
    }
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.offscreenNewMessage) {
    void getExtensionPreferences().then((preferences) => {
      if (!preferences.notificationsEnabled) {
        return;
      }

      // 记录新消息时间，防止后续 offscreenSyncResult(false) 覆盖红点
      lastNewMessageAt = Date.now();
      if (!isSidepanelActive()) {
        void updateBadge(true);
      }

      if (!preferences.notificationsVisible) {
        return;
      }

      void browser.notifications.create(message.notificationId, {
        type: "basic",
        title: message.title,
        message: message.body,
        iconUrl: browser.runtime.getURL("/logo.png"),
      });
    });
  }
}

export default defineBackground(async () => {
  console.log("Hello background!", { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message: ExtensionRuntimeMessage) => {
    return handleRuntimeMessage(message);
  });

  browser.notifications.onClicked.addListener((notificationId) => {
    void browser.notifications.clear(notificationId);
    void dispatchConversationOpen(notificationId);
  });

  chromeApi?.contextMenus?.onClicked?.addListener((info: { menuItemId?: string }) => {
    if (info.menuItemId === SETTINGS_CONTEXT_MENU_ID) {
      void openOptionsPage();
    }
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[EXTENSION_STORAGE_KEYS.preferences]) {
      return;
    }

    void applyPreferencesToUi();
  });

  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  registerSettingsContextMenu();
  await ensureOffscreenDocument();
  await updateBadge(false);
  await applyPreferencesToUi();
});
