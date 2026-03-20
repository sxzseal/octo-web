import React, { Component } from "react"
import { Channel, ChannelTypePerson } from "wukongimjssdk"
import WKApp from "../../App"
import "./index.css"

interface BotInfo {
    uid: string
    name: string
    description: string
    creator_uid: string
    creator_name: string
    bot_commands: string
    auto_approve?: number
    status?: string // not_added | pending | added
}

interface BotStoreState {
    myBots: BotInfo[]
    spaceBots: BotInfo[]
    loading: boolean
    activeTab: "my" | "store"
    applyingUid: string
}

export default class BotStore extends Component<{}, BotStoreState> {
    state: BotStoreState = {
        myBots: [],
        spaceBots: [],
        loading: true,
        activeTab: "store",
        applyingUid: "",
    }

    private handleSpaceChanged = () => {
        this.loadData()
    }

    componentDidMount() {
        this.loadData()
        WKApp.mittBus.on('space-changed', this.handleSpaceChanged)
    }

    componentWillUnmount() {
        WKApp.mittBus.off('space-changed', this.handleSpaceChanged)
    }

    async loadData() {
        this.setState({ loading: true })
        try {
            const spaceId = WKApp.shared.currentSpaceId
            const [myRes, spaceRes] = await Promise.all([
                WKApp.apiClient.get("/robot/my_bots", spaceId ? { param: { space_id: spaceId } } : undefined),
                spaceId ? WKApp.apiClient.get(`/robot/space_bots`, { param: { space_id: spaceId } }) : Promise.resolve([]),
            ])
            this.setState({
                myBots: myRes || [],
                spaceBots: spaceRes || [],
                loading: false,
            })
        } catch {
            this.setState({ loading: false })
        }
    }

    handleChat = (uid: string) => {
        WKApp.endpoints.showConversation(new Channel(uid, ChannelTypePerson))
    }

    handleAddFriend = async (uid: string) => {
        this.setState({ applyingUid: uid })
        try {
            await WKApp.apiClient.post("friend/apply", { to_uid: uid, remark: "" })
            // 刷新列表
            setTimeout(() => this.loadData(), 500)
        } catch {
            // ignore
        } finally {
            this.setState({ applyingUid: "" })
        }
    }

    handleBotFatherChat = () => {
        WKApp.endpoints.showConversation(new Channel("botfather", ChannelTypePerson))
    }

    renderBotCard(bot: BotInfo, showAction: boolean) {
        const { applyingUid } = this.state
        const isAdded = bot.status === "added"
        const isPending = bot.status === "pending"
        const isApplying = applyingUid === bot.uid

        return (
            <div className="wk-bot-card" key={bot.uid}>
                <div className="wk-bot-card-avatar">
                    {bot.name?.charAt(0)?.toUpperCase() || "B"}
                </div>
                <div className="wk-bot-card-info">
                    <div className="wk-bot-card-name">
                        {bot.name || bot.uid}
                        <span className="wk-bot-card-badge">AI</span>
                    </div>
                    <div className="wk-bot-card-desc">{bot.description || "暂无简介"}</div>
                    {bot.creator_name && (
                        <div className="wk-bot-card-creator">创建者: {bot.creator_name}</div>
                    )}
                </div>
                <div className="wk-bot-card-action">
                    {showAction && isAdded && (
                        <button className="wk-bot-btn wk-bot-btn-chat" onClick={() => this.handleChat(bot.uid)}>
                            发消息
                        </button>
                    )}
                    {showAction && isPending && (
                        <button className="wk-bot-btn wk-bot-btn-pending" disabled>
                            审批中
                        </button>
                    )}
                    {showAction && !isAdded && !isPending && (
                        <button
                            className="wk-bot-btn wk-bot-btn-add"
                            disabled={isApplying}
                            onClick={() => this.handleAddFriend(bot.uid)}
                        >
                            {isApplying ? "申请中..." : "添加"}
                        </button>
                    )}
                    {!showAction && (
                        <button className="wk-bot-btn wk-bot-btn-chat" onClick={() => this.handleChat(bot.uid)}>
                            发消息
                        </button>
                    )}
                </div>
            </div>
        )
    }

    render() {
        const { myBots, spaceBots, loading, activeTab } = this.state

        return (
            <div className="wk-bot-store">
                {/* BotFather 固定置顶 */}
                <div className="wk-bot-father" onClick={this.handleBotFatherChat}>
                    <div className="wk-bot-father-avatar">⚙️</div>
                    <div className="wk-bot-father-info">
                        <div className="wk-bot-father-name">BotFather</div>
                        <div className="wk-bot-father-desc">创建和管理你的 AI 机器人</div>
                    </div>
                    <div className="wk-bot-father-arrow">›</div>
                </div>

                {/* Tab 切换 */}
                <div className="wk-bot-tabs">
                    <div
                        className={`wk-bot-tab ${activeTab === "my" ? "active" : ""}`}
                        onClick={() => this.setState({ activeTab: "my" })}
                    >
                        我的 AI ({myBots.length})
                    </div>
                    <div
                        className={`wk-bot-tab ${activeTab === "store" ? "active" : ""}`}
                        onClick={() => this.setState({ activeTab: "store" })}
                    >
                        AI 广场 ({spaceBots.length})
                    </div>
                </div>

                {/* 列表 */}
                <div className="wk-bot-list">
                    {loading && <div className="wk-bot-loading">加载中...</div>}
                    {!loading && activeTab === "my" && myBots.length === 0 && (
                        <div className="wk-bot-empty">还没有添加任何 AI<br/>去 AI 广场看看吧</div>
                    )}
                    {!loading && activeTab === "store" && spaceBots.length === 0 && (
                        <div className="wk-bot-empty">当前 Space 暂无可用 AI</div>
                    )}
                    {!loading && activeTab === "my" && myBots.map(bot => this.renderBotCard(bot, false))}
                    {!loading && activeTab === "store" && spaceBots.map(bot => this.renderBotCard(bot, true))}
                </div>
            </div>
        )
    }
}
