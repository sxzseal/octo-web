import { Channel, ChannelTypePerson, WKSDK, Message } from "wukongimjssdk";
import WKApp from "./App";
import React, { Component, ReactNode } from "react";
import { ChatContentPage } from "./Pages/Chat";
import { EndpointCategory, EndpointID } from "./Service/Const";
import { EndpointManager } from "./Service/Module";
import ConversationContext from "./Components/Conversation/context";

export class MessageContextMenus {
  title!: string;
  onClick?: () => void;
}

export class ShowConversationOptions {
  // 聊天消息定位的messageSeq
  initLocateMessageSeq?: number;
}

export class EndpointCommon {
  private _onLogins: VoidFunction[] = []; // 登录成功

  constructor() {
    this.registerShowConversation();
  }

  addOnLogin(v: VoidFunction) {
    this._onLogins?.push(v);
  }

  removeOnLogin(v: VoidFunction) {
    const len = this._onLogins.length;
    for (let i = 0; i < len; i++) {
      if (v === this._onLogins[i]) {
        this._onLogins.splice(i, 1);
        return;
      }
    }
  }

  showConversation(channel: Channel, opts?: ShowConversationOptions) {
    // Space 模式：DM (channelType=1) 自动加 Space 前缀
    // channel_id 格式: s{spaceId}_{uid}，让每个 Space 有独立的 DM 会话
    const spaceId = WKApp.shared.currentSpaceId
    if (spaceId && channel.channelType === ChannelTypePerson) {
      const cid = channel.channelID
      // 只给裸 UID 加前缀，已有前缀的跳过
      if (!cid.startsWith("s")) {
        channel = new Channel(`s${spaceId}_${cid}`, channel.channelType)
      }
    }
    WKApp.shared.openChannel = channel;
    EndpointManager.shared.invoke(EndpointID.showConversation, {
      channel: channel,
      opts: opts,
    });
    WKApp.shared.notifyListener();
  }

  registerContactsHeader(
    id: string,
    callback: (param: any) => JSX.Element,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      id,
      (param) => {
        return callback(param);
      },
      {
        sort: sort,
        category: EndpointCategory.contactsHeader,
      }
    );
  }
  contactsHeaders(): JSX.Element[] {
    return EndpointManager.shared.invokes(EndpointCategory.contactsHeader);
  }

  private registerShowConversation() {
    EndpointManager.shared.setMethod(
      EndpointID.showConversation,
      (param: any) => {
        const channel = param.channel as Channel;
        let opts: ShowConversationOptions = {}
        if (param.opts) {
          opts = param.opts
        }

        let initLocateMessageSeq = 0;
        if (opts && opts.initLocateMessageSeq && opts.initLocateMessageSeq > 0) {
          initLocateMessageSeq = opts.initLocateMessageSeq;
        }

        if (initLocateMessageSeq <= 0) {
          const conversation =
            WKSDK.shared().conversationManager.findConversation(channel);
          if (
            conversation &&
            conversation.lastMessage &&
            conversation.unread > 0 &&
            conversation.lastMessage.messageSeq > conversation.unread
          ) {
            initLocateMessageSeq =
              conversation.lastMessage.messageSeq - conversation.unread;
          }
        }

        let key = channel.getChannelKey()
        if (initLocateMessageSeq > 0) {
          key = `${key}-${initLocateMessageSeq}`
        }

        WKApp.routeRight.replaceToRoot(
          <ChatContentPage
            key={key}
            channel={channel}
            initLocateMessageSeq={initLocateMessageSeq}
          ></ChatContentPage>
        );
      },
      {}
    );
  }

  registerMessageContextMenus(
    sid: string,
    handle: (
      message: Message,
      context: ConversationContext
    ) => MessageContextMenus | null,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      sid,
      (param: any) => {
        return handle(param.message, param.context);
      },
      {
        category: EndpointCategory.messageContextMenus,
        sort: sort,
      }
    );
  }

  messageContextMenus(
    message: Message,
    ctx: ConversationContext
  ): MessageContextMenus[] {
    return EndpointManager.shared.invokes(
      EndpointCategory.messageContextMenus,
      { message: message, context: ctx }
    );
  }

  registerChatToolbar(
    sid: string,
    handle: (ctx: ConversationContext) => React.ReactNode | undefined
  ) {
    EndpointManager.shared.setMethod(
      sid,
      (param) => {
        return handle(param);
      },
      {
        category: EndpointCategory.chatToolbars,
      }
    );
  }

  chatToolbars(ctx: ConversationContext): React.ReactNode[] {
    return EndpointManager.shared.invokes(EndpointCategory.chatToolbars, ctx);
  }

  chatToolbarsWithKey(ctx: ConversationContext): { sid: string; node: React.ReactNode }[] {
    const endpoints = EndpointManager.shared.getWithCategory(EndpointCategory.chatToolbars);
    const results: { sid: string; node: React.ReactNode }[] = [];
    if (endpoints && endpoints.length > 0) {
      for (const endpoint of endpoints) {
        const result = endpoint.handler!(ctx);
        if (result) {
          results.push({ sid: endpoint.sid, node: result });
        }
      }
    }
    return results;
  }

  registerChannelHeaderRightItem(
    id: string,
    callback: (param: any) => JSX.Element | undefined,
    sort?: number
  ) {
    EndpointManager.shared.setMethod(
      id,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.channelHeaderRightItems,
        sort: sort,
      }
    );
  }

  channelHeaderRightItems(channel: Channel): JSX.Element[] {
    return EndpointManager.shared.invokes(
      EndpointCategory.channelHeaderRightItems,
      { channel: channel }
    );
  }

  organizationalTool(channel: Channel, render?: JSX.Element): JSX.Element {
    return EndpointManager.shared.invoke(EndpointCategory.organizational, {
      channel: channel,
      render: render,
    });
  }

  registerOrganizationalTool(
    sid: string,
    callback: (param: any) => JSX.Element | undefined
  ) {
    EndpointManager.shared.setMethod(
      EndpointCategory.organizational,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.organizational,
      }
    );
  }

  organizationalLayer(channel: Channel): void {
    return EndpointManager.shared.invoke(EndpointCategory.organizationalLayer, {
      channel: channel,
    });
  }

  registerOrganizationalLayer(sid: string, callback: (param: any) => void) {
    EndpointManager.shared.setMethod(
      EndpointCategory.organizationalLayer,
      (param) => {
        return callback(param);
      },
      {
        category: EndpointCategory.organizational,
      }
    );
  }

  callOnLogin() {
    const len = this._onLogins.length;
    for (let i = 0; i < len; i++) {
      this._onLogins[i]();
    }
  }
}

export class ChatToolbar {
  icon!: string;
  onClick?: () => void;
}
