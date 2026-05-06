import React, { useEffect, useMemo, useState } from "react"
import { Channel, ChannelTypePerson } from "wukongimjssdk"
import { WKApp, SpaceService } from "@octo/base"
import BotCard, { AppBotInfo } from "./BotCard"
import "./AppBotExplorePage.css"

type LoadState = "loading" | "ready" | "error"

export default function AppBotExplorePage() {
  const [bots, setBots] = useState<AppBotInfo[]>([])
  const [state, setState] = useState<LoadState>("loading")
  const [spaceName, setSpaceName] = useState<string>("")
  const [keyword, setKeyword] = useState<string>("")
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    let stale = false

    const resolveSpaceName = async () => {
      const spaceId = WKApp.shared.currentSpaceId
      if (!spaceId) {
        if (!stale) setSpaceName("")
        return
      }
      try {
        const spaces = await SpaceService.shared.getMySpaces()
        if (stale) return
        const found = spaces?.find((s: any) => s.space_id === spaceId)
        setSpaceName(found?.name || "")
      } catch {
        if (!stale) setSpaceName("")
      }
    }

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
        console.warn('[AppBotExplorePage] Failed to load bots:', err)
        if (stale) return
        setBots([])
        setState("error")
      }
    }

    loadData()
    resolveSpaceName()

    const handler = () => {
      stale = false
      loadData()
      resolveSpaceName()
    }
    WKApp.mittBus.on("space-changed", handler)

    return () => {
      stale = true
      WKApp.mittBus.off("space-changed", handler)
    }
  }, [reloadTick])

  const openChat = (bot: AppBotInfo) => {
    WKApp.endpoints.showConversation(new Channel(bot.uid, ChannelTypePerson))
  }

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return bots
    return bots.filter((b) => {
      const name = (b.display_name || "").toLowerCase()
      const desc = (b.description || "").toLowerCase()
      return name.includes(kw) || desc.includes(kw)
    })
  }, [bots, keyword])

  const platformBots = useMemo(
    () => filtered.filter((b) => b.scope === "platform"),
    [filtered],
  )
  const spaceBots = useMemo(
    () => filtered.filter((b) => b.scope === "space"),
    [filtered],
  )

  const renderSection = (title: string, list: AppBotInfo[]) => {
    if (list.length === 0) return null
    return (
      <section className="appbot-section" key={title}>
        <h2 className="appbot-section-title">{title}</h2>
        <div className="appbot-grid">
          {list.map((bot) => (
            <BotCard key={bot.id} bot={bot} onOpen={openChat} />
          ))}
        </div>
      </section>
    )
  }

  const hasResults = platformBots.length > 0 || spaceBots.length > 0

  return (
    <div className="appbot-page">
      <header className="appbot-page-header">
        <h1 className="appbot-page-title">应用</h1>
        <div className="appbot-search">
          <input
            type="search"
            className="appbot-search-input"
            placeholder="搜索应用"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </header>

      <div className="appbot-page-body">
        {state === "loading" && (
          <div className="appbot-status">
            <div className="appbot-spinner" aria-hidden />
            <div className="appbot-status-text">加载中...</div>
          </div>
        )}

        {state === "error" && (
          <div className="appbot-status">
            <div className="appbot-status-icon">⚠️</div>
            <div className="appbot-status-text">加载失败，请稍后重试</div>
            <button
              className="appbot-retry-btn"
              onClick={() => setReloadTick((t) => t + 1)}
            >
              重试
            </button>
          </div>
        )}

        {state === "ready" && !hasResults && (
          <div className="appbot-status">
            <div className="appbot-status-icon">📦</div>
            <div className="appbot-status-text">
              {keyword ? "未找到匹配的应用" : "暂无可用应用"}
            </div>
          </div>
        )}

        {state === "ready" && hasResults && (
          <>
            {renderSection("平台应用", platformBots)}
            {renderSection(
              spaceName ? `空间应用 · ${spaceName}` : "空间应用",
              spaceBots,
            )}
          </>
        )}
      </div>
    </div>
  )
}
