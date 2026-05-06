import React from "react"

export interface AppBotInfo {
  id: string
  uid: string
  display_name: string
  description: string
  avatar: string
  scope: "platform" | "space"
}

interface BotCardProps {
  bot: AppBotInfo
  onOpen: (bot: AppBotInfo) => void
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

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#10b981", "#06b6d4",
  "#3b82f6",
]

function pickColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function BotCard({ bot, onOpen }: BotCardProps) {
  const letter = bot.display_name?.charAt(0)?.toUpperCase() || "A"
  const showImage = isSafeImageUrl(bot.avatar)
  const bgColor = pickColor(bot.uid || bot.id || letter)

  const handleClick = () => onOpen(bot)
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onOpen(bot)
    }
  }

  return (
    <div
      className="appbot-card"
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className="appbot-card-head">
        <div
          className="appbot-card-avatar"
          style={!showImage ? { background: bgColor } : undefined}
        >
          {showImage
            ? <img src={bot.avatar} alt={bot.display_name} />
            : <span>{letter}</span>
          }
        </div>
        <div className="appbot-card-title">
          <div className="appbot-card-name" title={bot.display_name}>{bot.display_name}</div>
        </div>
      </div>
      <div className="appbot-card-desc">
        {bot.description || "暂无描述"}
      </div>
      <div className="appbot-card-footer">
        <span className="appbot-card-cta">发起对话 &gt;</span>
      </div>
    </div>
  )
}
