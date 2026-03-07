import React, { Component, ReactNode } from "react";
import { Conversation } from "../../Components/Conversation";
import ConversationList from "../../Components/ConversationList";
import Provider from "../../Service/Provider";

import { Spin, Modal, Popover } from "@douyinfe/semi-ui";
import { IconPlus, IconSearch } from "@douyinfe/semi-icons";
import { ChatVM, handleGlobalSearchClick } from "./vm";
import "./index.css";
import { ConversationWrap } from "../../Service/Model";
import WKApp, { ThemeMode } from "../../App";
import ChannelSetting from "../../Components/ChannelSetting";
import classNames from "classnames";
import { Channel, ChannelInfo, WKSDK } from "wukongimjssdk";
import { ChannelInfoListener } from "wukongimjssdk";
import { ChatMenus } from "../../App";
import ConversationContext from "../../Components/Conversation/context";
import GlobalSearch from "../../Components/GlobalSearch";
import { ShowConversationOptions } from "../../EndpointCommon";
import SpaceList from "../../Components/SpaceList";
import SpaceCreate from "../../Components/SpaceCreate";
import { Space, SpaceService } from "../../Service/SpaceService";

export interface ChatContentPageProps {
  channel: Channel;
  initLocateMessageSeq?: number; // 打开时定位到某条消息
}

export interface ChatContentPageState {
  showChannelSetting: boolean;
}
export class ChatContentPage extends Component<
  ChatContentPageProps,
  ChatContentPageState
> {
  channelInfoListener!: ChannelInfoListener;
  conversationContext!: ConversationContext;
  constructor(props: any) {
    super(props);
    this.state = {
      showChannelSetting: false,
    };
  }

  componentDidMount() {
    const { channel } = this.props;
    this.channelInfoListener = (channelInfo: ChannelInfo) => {
      if (channelInfo.channel.isEqual(channel)) {
        this.setState({});
      }
    };
    WKSDK.shared().channelManager.addListener(this.channelInfoListener);
  }

  componentWillUnmount() {
    WKSDK.shared().channelManager.removeListener(this.channelInfoListener);
  }



  render(): React.ReactNode {
    const { channel, initLocateMessageSeq } = this.props;
    const { showChannelSetting } = this.state;
    const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel);
    if (!channelInfo) {
      WKSDK.shared().channelManager.fetchChannelInfo(channel);
    }
    return (
      <div
        className={classNames(
          "wk-chat-content-right",
          showChannelSetting ? "wk-chat-channelsetting-open" : ""
        )}
      >
        <div className="wk-chat-content-chat">
          <div
            className="wk-chat-conversation-header"
            onClick={() => {
              this.setState({
                showChannelSetting: !this.state.showChannelSetting,
              });
            }}
          >
            <div className="wk-chat-conversation-header-content">
              <div className="wk-chat-conversation-header-left">
                <div
                  className="wk-chat-conversation-header-back"
                  onClick={(e) => {
                    e.stopPropagation();
                    WKApp.routeRight.pop();
                  }}
                >
                  <div className="wk-chat-conversation-header-back-icon"></div>
                </div>
                <div className="wk-chat-conversation-header-channel">
                  <div className="wk-chat-conversation-header-channel-avatar">
                    <img alt="" src={WKApp.shared.avatarChannel(channel)}></img>
                  </div>
                  <div className="wk-chat-conversation-header-channel-info">
                    <div className="wk-chat-conversation-header-channel-info-name">
                      {channelInfo?.orgData?.displayName}
                    </div>
                    <div className="wk-chat-conversation-header-channel-info-tip"></div>
                  </div>
                </div>
              </div>
              <div className="wk-chat-conversation-header-right">
                {WKApp.endpoints
                  .channelHeaderRightItems(channel)
                  .map((item: any, i: number) => {
                    return (
                      <div
                        key={i}
                        className="wk-chat-conversation-header-right-item"
                      >
                        {item}
                      </div>
                    );
                  })}
                <div className="wk-chat-conversation-header-right-item">
                  <svg
                    fill={WKApp.config.themeColor}
                    height="28px"
                    role="presentation"
                    viewBox="0 0 36 36"
                    width="28px"
                  >
                    <path
                      clipRule="evenodd"
                      d="M18 29C24.0751 29 29 24.0751 29 18C29 11.9249 24.0751 7 18 7C11.9249 7 7 11.9249 7 18C7 24.0751 11.9249 29 18 29ZM19.5 18C19.5 18.8284 18.8284 19.5 18 19.5C17.1716 19.5 16.5 18.8284 16.5 18C16.5 17.1716 17.1716 16.5 18 16.5C18.8284 16.5 19.5 17.1716 19.5 18ZM23 19.5C23.8284 19.5 24.5 18.8284 24.5 18C24.5 17.1716 23.8284 16.5 23 16.5C22.1716 16.5 21.5 17.1716 21.5 18C21.5 18.8284 22.1716 19.5 23 19.5ZM14.5 18C14.5 18.8284 13.8284 19.5 13 19.5C12.1716 19.5 11.5 18.8284 11.5 18C11.5 17.1716 12.1716 16.5 13 16.5C13.8284 16.5 14.5 17.1716 14.5 18Z"
                      fillRule="evenodd"
                    ></path>
                  </svg>
                  <div className="wk-conversation-header-mask"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="wk-chat-conversation">
            <Conversation
              initLocateMessageSeq={initLocateMessageSeq}
              shouldShowHistorySplit={true}
              onContext={(ctx) => {
                this.conversationContext = ctx;
                this.setState({});
              }}
              key={channel.getChannelKey()}
              chatBg={
                WKApp.config.themeMode === ThemeMode.dark
                  ? undefined
                  : require("./assets/chat_bg.svg").default
              }
              channel={channel}
            ></Conversation>
          </div>
        </div>

        <div className={classNames("wk-chat-channelsetting")}>
          <ChannelSetting
            conversationContext={this.conversationContext}
            key={channel.getChannelKey()}
            channel={channel}
            onClose={() => {
              this.setState({
                showChannelSetting: false,
              });
            }}
          ></ChannelSetting>
        </div>
      </div>
    );
  }
}

interface ChatPageState {
  allSpaces: Space[];
  showSpaceDropdown: boolean;
}

export default class ChatPage extends Component<any, ChatPageState> {
  vm!: ChatVM;
  spaceListRef: SpaceList | null = null;
  constructor(props: any) {
    super(props);
    this.state = { allSpaces: [], showSpaceDropdown: false };
  }

  componentDidMount() {
    SpaceService.shared.getMySpaces().then(spaces => {
      this.setState({ allSpaces: spaces });
    }).catch(() => {});
  }

  componentWillUnmount() { }



  render(): ReactNode {
    return (
      <Provider
        create={() => {
          this.vm = new ChatVM();
          return this.vm;
        }}
        render={(vm: ChatVM) => {
          return (
            <div className="wk-chat">
              <div
                className={classNames(
                  "wk-chat-content",
                  vm.selectedConversation ? "wk-conversation-open" : undefined
                )}
              >
                <div className="wk-chat-content-left">
                  <div className="wk-chat-search">
                    <div className="wk-chat-title" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => this.setState(prev => ({ showSpaceDropdown: !prev.showSpaceDropdown }))}>
                      {(() => {
                        const currentSpace = this.state.allSpaces.find(s => s.space_id === WKApp.shared.currentSpaceId);
                        const colors = ['#667eea','#764ba2','#f093fb','#4facfe','#43e97b','#fa709a'];
                        const statusIcon = vm.connectStatus === 1 ? '🟢' : vm.connectStatus === 2 ? '🟡' : '🔴';
                        return currentSpace ? (
                          <>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, backgroundColor: colors[currentSpace.name.charCodeAt(0) % colors.length], color: 'white', fontSize: 14, fontWeight: 600, marginRight: 8 }}>
                              {currentSpace.name.charAt(0)}
                            </span>
                            {currentSpace.name}
                            <span style={{ fontSize: 10, marginLeft: 4 }}>{statusIcon}</span>
                            <span style={{ fontSize: 12, marginLeft: 2, color: '#999' }}>▾</span>
                          </>
                        ) : (
                          <>{vm.connectTitle} <span style={{ fontSize: 10, marginLeft: 4 }}>{statusIcon}</span></>
                        );
                      })()}
                      {this.state.showSpaceDropdown && (
                        <div className="wk-chat-space-dropdown" onClick={e => e.stopPropagation()}>
                          {this.state.allSpaces.map(space => {
                            const isSelected = space.space_id === WKApp.shared.currentSpaceId;
                            const colors = ['#667eea','#764ba2','#f093fb','#4facfe','#43e97b','#fa709a'];
                            return (
                              <div key={space.space_id} className={classNames("wk-chat-space-dropdown-item", isSelected && "wk-chat-space-dropdown-item-selected")} onClick={() => {
                                WKApp.shared.currentSpaceId = space.space_id;
                                localStorage.setItem("currentSpaceId", space.space_id);
                                WKApp.shared.notifyListener();
                                WKApp.mittBus.emit("space-changed", space);
                                this.setState({ showSpaceDropdown: false });
                              }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, backgroundColor: colors[space.name.charCodeAt(0) % colors.length], color: 'white', fontSize: 12, fontWeight: 600, marginRight: 8 }}>
                                  {space.name.charAt(0)}
                                </span>
                                <span style={{ flex: 1 }}>{space.name}</span>
                                {isSelected && <span style={{ color: 'var(--wk-color-theme, #6366F1)' }}>✓</span>}
                              </div>
                            );
                          })}
                          <div className="wk-chat-space-dropdown-divider"></div>
                          <div className="wk-chat-space-dropdown-item" onClick={() => {
                            vm.showSpaceCreate = true;
                            this.setState({ showSpaceDropdown: false });
                          }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, backgroundColor: '#e0e0e0', color: '#666', fontSize: 16, fontWeight: 600, marginRight: 8 }}>+</span>
                            <span style={{ flex: 1, color: '#5b6abf' }}>加入 / 创建 Space</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div
                      style={{ marginRight: '20px', alignItems: 'center', display: 'flex', cursor: 'pointer' }}
                      onClick={() => {
                        vm.showGlobalSearch = true;
                      }}
                    >
                      <IconSearch size="large" />
                    </div>
                    <Popover
                      onClickOutSide={() => {
                        vm.showAddPopover = false;
                      }}
                      className="wk-chat-popover"
                      position="bottomRight"
                      visible={vm.showAddPopover}
                      showArrow={false}
                      trigger="custom"
                      content={
                        <ChatMenusPopover
                          onItem={() => {
                            vm.showAddPopover = false;
                          }}
                        ></ChatMenusPopover>
                      }
                    >
                      <div
                        className="wk-chat-search-add"
                        style={{ alignItems: 'center', display: 'flex' }}
                        onClick={() => {
                          vm.showAddPopover = !vm.showAddPopover;
                        }}
                      >
                        <IconPlus size="large"></IconPlus>
                      </div>
                      {/* <Button icon={<IconPlus></IconPlus>} onClick={() => {
                                    vm.showAddPopover = true
                                }}></Button> */}
                    </Popover>
                  </div>
                  {/* SpaceList 已移至侧边栏 */}
                  <div className="wk-chat-conversation-list">
                    {vm.loading ? (
                      <div className="wk-chat-conversation-list-loading">
                        <Spin style={{ marginTop: "20px" }} />
                      </div>
                    ) : (
                      <ConversationList
                        select={WKApp.shared.openChannel}
                        conversations={vm.filteredConversations}
                        onClearMessages={this.vm.clearMessages.bind(this.vm)}
                        onClick={(conversation: ConversationWrap) => {
                          vm.selectedConversation = conversation;
                          WKApp.endpoints.showConversation(
                            conversation.channel
                          );
                          vm.notifyListener();
                        }}
                      ></ConversationList>
                    )}
                  </div>
                </div>
              </div>
              <SpaceCreate
                visible={vm.showSpaceCreate}
                onClose={() => {
                  vm.showSpaceCreate = false;
                }}
                onSuccess={() => {
                  this.spaceListRef?.loadSpaces();
                }}
              />
              <Modal
                visible={vm.showGlobalSearch}
                closeOnEsc={true}
                onCancel={() => {
                  vm.showGlobalSearch = false
                }}
                footer={null}
                width="80%"
                >
                <div style={{ marginTop: '30px' }}>
                <GlobalSearch onClick={(item,type:string)=>{
                    handleGlobalSearchClick(item,type,()=>{
                      vm.showGlobalSearch = false
                    })
                }}/>
                </div>
              </Modal>
            </div>
          );
        }}
      />
    );
  }
}

interface ChatMenusPopoverState {
  chatMenus: ChatMenus[];
}

interface ChatMenusPopoverProps {
  onItem?: (menus: ChatMenus) => void;
}
class ChatMenusPopover extends Component<
  ChatMenusPopoverProps,
  ChatMenusPopoverState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      chatMenus: [],
    };
  }
  componentDidMount() {
    this.setState({
      chatMenus: WKApp.shared.chatMenus(),
    });
  }

  render(): React.ReactNode {
    const { chatMenus } = this.state;
    const { onItem } = this.props;
    return (
      <div className="wk-chatmenuspopover">
        <ul>
          {chatMenus.map((c, i) => {
            return (
              <li
                key={i}
                onClick={() => {
                  if (c.onClick) {
                    c.onClick();
                  }
                  if (onItem) {
                    onItem(c);
                  }
                }}
              >
                <div className="wk-chatmenuspopover-avatar">
                  <img alt="" src={c.icon}></img>
                </div>
                <div className="wk-chatmenuspopover-title">{c.title}</div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}
