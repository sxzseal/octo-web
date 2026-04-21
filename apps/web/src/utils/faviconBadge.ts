/**
 * faviconBadge.ts
 * 在浏览器 Tab favicon 上叠加未读数角标，同步更新 document.title 前缀。
 * - count 0：恢复原始 favicon
 * - 1~99：显示数字
 * - >99：显示 "99+"
 */

const RENDER_SIZE = 128
const BADGE_COLOR = '#e53935'
const BADGE_TEXT_COLOR = '#ffffff'
const FALLBACK_BG_COLOR = '#1C1C23'

let originalFaviconHref: string | null = null
// generation counter：防止 onload 乱序覆盖（快速连续调用时丢弃过期回调）
let generation = 0

function getFaviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  return link
}

function saveOriginalFavicon(): void {
  if (originalFaviconHref === null) {
    originalFaviconHref = getFaviconLink().getAttribute('href') || '/favicon.ico'
  }
}

// ── title 处理：每次操作当前 title，不保存快照（避免快照过期问题）──────────

function getBaseTitle(): string {
  return document.title.replace(/^\(\d+\+?\)\s*/, '')
}

function setTitlePrefix(count: number) {
  document.title = `(${count > 99 ? '99+' : count}) ${getBaseTitle()}`
}

function clearTitlePrefix() {
  document.title = getBaseTitle()
}

// ── Canvas 绘制 ───────────────────────────────────────────────────────────────

function drawBadge(ctx: CanvasRenderingContext2D, text: string, size: number): void {
  const badgeH = size * 0.60
  const ry     = badgeH / 2  // 圆角半径 = 高度一半（胶囊形）

  // 宽度撑满图标全宽，贴底部水平居中
  const rx = size / 2
  const cx = size / 2
  const cy = size - ry

  const x1 = cx - rx, y1 = cy - ry
  const x2 = cx + rx, y2 = cy + ry

  ctx.beginPath()
  ctx.moveTo(x1 + ry, y1)
  ctx.lineTo(x2 - ry, y1)
  ctx.quadraticCurveTo(x2, y1, x2, y1 + ry)
  ctx.lineTo(x2, y2 - ry)
  ctx.quadraticCurveTo(x2, y2, x2 - ry, y2)
  ctx.lineTo(x1 + ry, y2)
  ctx.quadraticCurveTo(x1, y2, x1, y2 - ry)
  ctx.lineTo(x1, y1 + ry)
  ctx.quadraticCurveTo(x1, y1, x1 + ry, y1)
  ctx.closePath()
  ctx.fillStyle = BADGE_COLOR
  ctx.fill()

  const fontSize = Math.round(badgeH * 0.80)
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillStyle    = BADGE_TEXT_COLOR
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
}

function renderBadge(img: HTMLImageElement | null, text: string): string {
  const size   = RENDER_SIZE
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { alpha: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (img) {
    ctx.drawImage(img, 0, 0, size, size)
  } else {
    const rad = size * 0.18
    ctx.fillStyle = FALLBACK_BG_COLOR
    ctx.beginPath()
    ctx.moveTo(rad, 0); ctx.lineTo(size - rad, 0)
    ctx.quadraticCurveTo(size, 0, size, rad)
    ctx.lineTo(size, size - rad)
    ctx.quadraticCurveTo(size, size, size - rad, size)
    ctx.lineTo(rad, size)
    ctx.quadraticCurveTo(0, size, 0, size - rad)
    ctx.lineTo(0, rad)
    ctx.quadraticCurveTo(0, 0, rad, 0)
    ctx.closePath()
    ctx.fill()
  }

  drawBadge(ctx, text, size)
  return canvas.toDataURL('image/png')
}

// ── 公开 API ──────────────────────────────────────────────────────────────────

export function setFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return

  saveOriginalFavicon()
  setTitlePrefix(count)

  const text    = count > 99 ? '99+' : String(count)
  const src     = originalFaviconHref || '/favicon.ico'
  const thisGen = ++generation

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => { if (thisGen === generation) getFaviconLink().href = renderBadge(img, text) }
  img.onerror = () => { if (thisGen === generation) getFaviconLink().href = renderBadge(null, text) }
  img.src = src
}

export function clearFaviconBadge(): void {
  if (typeof document === 'undefined') return
  clearTitlePrefix()
  getFaviconLink().href = originalFaviconHref || '/favicon.ico'
}
