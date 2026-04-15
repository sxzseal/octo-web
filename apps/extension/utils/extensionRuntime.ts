export const DEFAULT_API_URL =
  import.meta.env.VITE_API_URL || "https://api.example.com/api/v1/";

export const EXTENSION_STORAGE_KEYS = {
  authState: "dmwork:extension:auth-state",
  pendingConversation: "dmwork:extension:pending-conversation",
  preferences: "dmwork:extension:preferences",
} as const;

export interface ExtensionPreferences {
  notificationsEnabled: boolean;
  notificationsVisible: boolean;
}

export const DEFAULT_EXTENSION_PREFERENCES: ExtensionPreferences = {
  notificationsEnabled: true,
  notificationsVisible: true,
};

export const EXTENSION_MESSAGE_TYPE = {
  authChanged: "AUTH_CHANGED",
  authCleared: "AUTH_CLEARED",
  offscreenReady: "OFFSCREEN_READY",
  offscreenSyncResult: "OFFSCREEN_SYNC_RESULT",
  offscreenNewMessage: "OFFSCREEN_NEW_MESSAGE",
  openConversation: "OPEN_CONVERSATION",
  sidepanelBadgeSync: "SIDEPANEL_BADGE_SYNC",
  sidepanelState: "SIDEPANEL_STATE",
} as const;

export interface ExtensionAuthState {
  loggedIn: boolean;
  uid: string;
  token: string;
  apiURL: string;
  currentSpaceId: string;
}

export interface ConversationTarget {
  channelId: string;
  channelType: number;
}

export interface OffscreenSyncResult {
  type: typeof EXTENSION_MESSAGE_TYPE.offscreenSyncResult;
  hasUnread: boolean;
  hasAuth: boolean;
  polledAt: number;
}

export interface OffscreenNewMessageEvent {
  type: typeof EXTENSION_MESSAGE_TYPE.offscreenNewMessage;
  notificationId: string;
  title: string;
  body: string;
  target: ConversationTarget;
  messageKey: string;
}

export interface AuthChangedMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.authChanged;
  auth: ExtensionAuthState;
}

export interface AuthClearedMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.authCleared;
}

export interface OffscreenReadyMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.offscreenReady;
}

export interface OpenConversationMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.openConversation;
  target: ConversationTarget;
}

export interface SidepanelBadgeSyncMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.sidepanelBadgeSync;
  hasUnread: boolean;
}

export interface SidepanelStateMessage {
  type: typeof EXTENSION_MESSAGE_TYPE.sidepanelState;
  active: boolean;
}

export type ExtensionRuntimeMessage =
  | AuthChangedMessage
  | AuthClearedMessage
  | OffscreenReadyMessage
  | OffscreenSyncResult
  | OffscreenNewMessageEvent
  | OpenConversationMessage
  | SidepanelBadgeSyncMessage
  | SidepanelStateMessage;

export interface ExtensionAuthResponse {
  auth: ExtensionAuthState | null;
}

export function normalizeApiURL(apiURL?: string): string {
  const raw = (apiURL || DEFAULT_API_URL).trim();
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export function buildNotificationId(
  target: ConversationTarget,
  messageKey: string,
): string {
  return [
    "dmwork-msg",
    String(target.channelType),
    encodeURIComponent(target.channelId),
    encodeURIComponent(messageKey),
  ].join(":");
}

export function parseNotificationId(
  notificationId: string,
): ConversationTarget | undefined {
  const parts = notificationId.split(":");
  if (parts.length < 4 || parts[0] !== "dmwork-msg") {
    return undefined;
  }

  const channelType = Number(parts[1]);
  if (Number.isNaN(channelType)) {
    return undefined;
  }

  return {
    channelType,
    channelId: decodeURIComponent(parts[2]),
  };
}
