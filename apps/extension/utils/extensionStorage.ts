import type { ConversationTarget, ExtensionAuthState } from "./extensionRuntime";
import { EXTENSION_STORAGE_KEYS } from "./extensionRuntime";

export async function getExtensionAuthState(): Promise<ExtensionAuthState | null> {
  const result = await browser.storage.local.get(EXTENSION_STORAGE_KEYS.authState);
  return (result[EXTENSION_STORAGE_KEYS.authState] as ExtensionAuthState | undefined) ?? null;
}

export async function setExtensionAuthState(auth: ExtensionAuthState): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.authState]: auth,
  });
}

export async function clearExtensionAuthState(): Promise<void> {
  await browser.storage.local.remove(EXTENSION_STORAGE_KEYS.authState);
}

export async function getPendingConversation(): Promise<ConversationTarget | null> {
  const result = await browser.storage.local.get(
    EXTENSION_STORAGE_KEYS.pendingConversation,
  );
  return (
    (result[EXTENSION_STORAGE_KEYS.pendingConversation] as ConversationTarget | undefined) ??
    null
  );
}

export async function setPendingConversation(
  target: ConversationTarget,
): Promise<void> {
  await browser.storage.local.set({
    [EXTENSION_STORAGE_KEYS.pendingConversation]: target,
  });
}

export async function clearPendingConversation(): Promise<void> {
  await browser.storage.local.remove(EXTENSION_STORAGE_KEYS.pendingConversation);
}
