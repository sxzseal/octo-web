import { ChatPage, EndpointCategory, WKApp, Menus, shouldSkipChannelForSpace, shouldSkipPersonConversationForSpace } from '@octo/base';
import { ContactsList } from '@octo/contacts';
import React from 'react';
// lucide icons replaced with filled SVGs per Figma
import './index.css';
import AppLayout from '../Layout';
import { WKSDK, ChannelTypePerson } from 'wukongimjssdk';
import { setFaviconBadge, clearFaviconBadge } from '../utils/faviconBadge';
import { ChatIcon } from '../Components/Icons/ChatIcon';
import { ContactsIcon } from '../Components/Icons/ContactsIcon';
function App() {
  registerMenus()
  return (
    <AppLayout />
  );
}

async function registerMenus() {

  WKSDK.shared().conversationManager.addConversationListener(() => {
    WKApp.menus.refresh()
  })

  WKApp.endpointManager.setMethod("menus.friendapply.change", () => {
    WKApp.menus.refresh()
  }, {
    category: EndpointCategory.friendApplyDataChange,
  })

  WKApp.menus.register("chat", (_context) => {
    const m = new Menus("chat", "/", "会话", <ChatIcon />, <ChatIcon />)
    let badge = 0;

    for (const conversation of WKSDK.shared().conversationManager.conversations) {
      const channelInfo = WKSDK.shared().channelManager.getChannelInfo(conversation.channel)
      if (channelInfo?.mute) {
        continue
      }
      // Space 过滤：复用 shouldSkipChannelForSpace 完整逻辑（含 channelSpaceMap 缓存）
      if (shouldSkipChannelForSpace(conversation.channel)) {
        continue
      }
      if (shouldSkipPersonConversationForSpace(conversation)) continue
      // Person 频道在 Space 模式下优先使用 per-Space 未读计数
      const currentSpaceId = WKApp.shared.currentSpaceId
      if (currentSpaceId
          && conversation.channel.channelType === ChannelTypePerson
          && conversation.extra?.spaceUnread !== undefined) {
        badge += conversation.extra.spaceUnread
      } else {
        badge += conversation.unread
      }
    }

    // badge 和 favicon 角标已下线
    clearFaviconBadge()

    if ((window as any).__POWERED_ELECTRON__) {
      (window as any).ipc.send("conversation-anager-unread-count", badge);
    }

    return m
  }, 1000)

  if (WKApp.loginInfo.isLogined()) {
    WKApp.apiClient.get(`/user/reddot/friendApply`).then(res => {
      WKApp.mittBus.emit('friend-applys-unread-count', res.count)
      WKApp.loginInfo.setStorageItem(`${WKApp.loginInfo.uid}-friend-applys-unread-count`, res.count)
      WKApp.menus.refresh();
    }).catch(error => {
      console.warn('Failed to fetch friend apply count:', error);
    });
  }

  WKApp.menus.register("contacts", (param) => {
    const m = new Menus("contacts", "/contacts", "通讯录", <ContactsIcon />, <ContactsIcon />)
    m.badge = WKApp.shared.getFriendApplysUnreadCount();
    return m
  }, 4000)

  WKApp.route.register("/", () => {
    return <ChatPage></ChatPage>
  })

  WKApp.route.register("/contacts", () => {
    return <ContactsList></ContactsList>
  })

}

export default App;

