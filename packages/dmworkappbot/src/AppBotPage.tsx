import React, { useEffect, useMemo, useState } from "react"
import { Channel, ChannelTypePerson, WKSDK } from "wukongimjssdk"
import { WKApp, ChatContentPage, SpaceService } from "@octo/base"
import "./AppBotPage.css"

interface AppBotInfo {
  id: string
  uid: string
  display_name: string
  description: string
  avatar: string
  scope: "platform" | "space"
}

type LoadState = "loading" | "ready" | "error"

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
  "linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)",
]

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function isSafeImageUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function BotIconFallback() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="9" cy="14" r="1.5" fill="white" />
      <circle cx="15" cy="14" r="1.5" fill="white" />
      <path d="M9.5 17.5C10 18.5 11 19 12 19C13 19 14 18.5 14.5 17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="4" x2="12" y2="8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.5" fill="white" />
    </svg>
  )
}

export default function AppBotPage() {
  const [bots, setBots] = useState<AppBotInfo[]>([])
  const [state, setState] = useState<LoadState>("loading")
  const [spaceName, setSpaceName] = useState("")
  const [keyword, setKeyword] = useState("")
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let stale = false

    const loadData = async () => {
      setState("loading")
      try {
        const spaceId = WKApp.shared.currentSpaceId
        const params = spaceId ? { param: { space_id: spaceId } } : undefined
        const res = await WKApp.apiClient.get("/app_bot/available", params)
        if (stale) return
        setBots(Array.isArray(res) ? res : [])
        setState("ready")
      } catch (err) {
        console.warn("[AppBotPage] Failed to load bots:", err)
        if (stale) return
        setBots([])
        setState("error")
      }
    }

    const resolveSpaceName = async () => {
      const spaceId = WKApp.shared.currentSpaceId
      if (!spaceId) { if (!stale) setSpaceName(""); return }
      try {
        const spaces = await SpaceService.shared.getMySpaces()
        if (stale) return
        const found = spaces?.find((s: any) => s.space_id === spaceId)
        setSpaceName(found?.name || "")
      } catch { if (!stale) setSpaceName("") }
    }

    loadData()
    resolveSpaceName()

    const handler = () => { stale = false; loadData(); resolveSpaceName() }
    WKApp.mittBus.on("space-changed", handler)
    return () => { stale = true; WKApp.mittBus.off("space-changed", handler) }
  }, [reloadTick])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return bots
    return bots.filter((b) =>
      (b.display_name || "").toLowerCase().includes(kw) ||
      (b.description || "").toLowerCase().includes(kw)
    )
  }, [bots, keyword])

  const platformBots = useMemo(() => filtered.filter((b) => b.scope === "platform"), [filtered])
  const spaceBots = useMemo(() => filtered.filter((b) => b.scope === "space"), [filtered])

  const handleSelect = (bot: AppBotInfo) => {
    setSelectedUid(bot.uid)
    const channel = new Channel(bot.uid, ChannelTypePerson)

    // Ensure conversation exists in SDK
    if (!WKSDK.shared().conversationManager.findConversation(channel)) {
      WKSDK.shared().conversationManager.createEmptyConversation(channel)
    }
    // Push chat content to routeRight (same panel as ChatPage uses)
    WKApp.routeRight.replaceToRoot(
      <ChatContentPage key={channel.getChannelKey()} channel={channel} />
    )
  }

  const renderItem = (bot: AppBotInfo) => {
    const isActive = selectedUid === bot.uid
    const showImg = isSafeImageUrl(bot.avatar)
    return (
      <div
        key={bot.id}
        className={`appbot-list-item ${isActive ? "appbot-list-item-active" : ""}`}
        onClick={() => handleSelect(bot)}
      >
        <div
          className="appbot-list-avatar"
          style={!showImg ? { background: pickGradient(bot.uid || bot.id) } : undefined}
        >
          {showImg ? <img src={bot.avatar} alt={bot.display_name} /> : <BotIconFallback />}
        </div>
        <div className="appbot-list-info">
          <div className="appbot-list-name">{bot.display_name}</div>
          <div className="appbot-list-desc">{bot.description || "应用 Bot"}</div>
        </div>
      </div>
    )
  }

  const renderSection = (title: string, list: AppBotInfo[]) => {
    if (list.length === 0) return null
    return (
      <div className="appbot-list-section" key={title}>
        <div className="appbot-list-section-title">{title}</div>
        {list.map(renderItem)}
      </div>
    )
  }

  return (
    <div className="appbot-page">
      <div className="appbot-page-header">
        <div className="appbot-page-title">应用</div>
        <input
          type="search"
          className="appbot-search-input"
          placeholder="搜索"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="appbot-page-list">
        {state === "loading" && (
          <div className="appbot-list-status">
            <div className="appbot-spinner" />
            <span>加载中...</span>
          </div>
        )}
        {state === "error" && (
          <div className="appbot-list-status">
            <span>加载失败</span>
            <button className="appbot-retry-btn" onClick={() => setReloadTick((t) => t + 1)}>重试</button>
          </div>
        )}
        {state === "ready" && filtered.length === 0 && (
          <div className="appbot-list-status">
            <span>{keyword ? "未找到匹配的应用" : "暂无可用应用"}</span>
          </div>
        )}
        {state === "ready" && (
          <>
            {renderSection("平台应用", platformBots)}
            {renderSection(spaceName ? `空间应用 · ${spaceName}` : "空间应用", spaceBots)}
          </>
        )}
      </div>
    </div>
  )
}
