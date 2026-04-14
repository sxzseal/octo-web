import {
  EXTENSION_MESSAGE_TYPE,
  parseNotificationId,
  type ExtensionAuthResponse,
  type ExtensionRuntimeMessage,
} from "../utils/extensionRuntime";
import {
  clearPendingConversation,
  getExtensionAuthState,
  setPendingConversation,
} from "../utils/extensionStorage";

const BADGE_BG_COLOR = "#d24747";
const OFFSCREEN_DOCUMENT_PATH = "/offscreen.html";
const chromeApi = (globalThis as { chrome?: any }).chrome;

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
      reasons: [chromeApi.offscreen.Reason.WORKERS],
      justification:
        "Keep unread badge and message notifications in sync when the side panel is closed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("Only a single offscreen")) {
      console.warn("[Extension] Failed to create offscreen document:", error);
    }
  }
}

async function updateBadge(badgeCount: number): Promise<void> {
  const text = badgeCount > 99 ? "99+" : badgeCount > 0 ? String(badgeCount) : "";
  await browser.action.setBadgeBackgroundColor({ color: BADGE_BG_COLOR });
  await browser.action.setBadgeText({ text });
}

async function openSidePanel(): Promise<void> {
  if (!chromeApi?.sidePanel?.open) {
    return;
  }

  const currentWindow = await browser.windows.getLastFocused();
  if (!currentWindow.id) {
    return;
  }

  await chromeApi.sidePanel.open({ windowId: currentWindow.id });
}

async function dispatchConversationOpen(notificationId: string): Promise<void> {
  const target = parseNotificationId(notificationId);
  if (!target) {
    return;
  }

  await setPendingConversation(target);
  await openSidePanel();

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
    void updateBadge(0);
    void browser.notifications.getAll().then((items) => {
      Object.keys(items).forEach((notificationId) => {
        void browser.notifications.clear(notificationId);
      });
    });
    void syncAuthStateToOffscreen();
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.offscreenSyncResult) {
    void updateBadge(message.hasAuth ? message.badgeCount : 0);
    return;
  }

  if (message.type === EXTENSION_MESSAGE_TYPE.offscreenNewMessage) {
    void browser.notifications.create(message.notificationId, {
      type: "basic",
      title: message.title,
      message: message.body,
      iconUrl: browser.runtime.getURL("/logo.png"),
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

  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

  await ensureOffscreenDocument();
  await updateBadge(0);
});
