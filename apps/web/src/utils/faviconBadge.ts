/**
 * faviconBadge.ts
 * 在浏览器 Tab favicon 上叠加未读数角标，同步更新 document.title 前缀。
 *
 * 实现参考 Tinycon（业界最广泛引用的 favicon badge 库）核心算法：
 * - canvas 尺寸 = 16 × devicePixelRatio，与浏览器显示尺寸一致，避免降采样模糊
 * - 角标为圆角矩形，底部/右部贴齐 canvas 边缘
 * - 字体 bold arial，textAlign=right / textBaseline=top
 * - 同步修改 document.title 前缀作为兜底（Safari/IE 不支持 Canvas 时仍有效）
 */

const BADGE_BG = '#F03D25'
const BADGE_FG = '#ffffff'
const FALLBACK_BG = '#5b6abf'

// devicePixelRatio 感知（Retina 屏用 2x）
const r = Math.ceil(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1)
const SIZE = 16 * r   // canvas 边长，与 favicon 显示尺寸一致

let originalFaviconHref: string | null = null
let originalTitle: string | null = null
let canvas: HTMLCanvasElement | null = null

// ── DOM helpers ──────────────────────────────────────────────────────────────

function getFaviconLink(): HTMLLinkElement {
  // 移除旧的，重新插入（部分浏览器需要替换节点才刷新）
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
  if (existing) return existing
  const link = document.createElement('link')
  link.rel = 'icon'
  document.head.appendChild(link)
  return link
}

function setFaviconHref(url: string) {
  // 替换节点而非修改 href，Safari 需要这样才刷新
  const old = document.querySelector('link[rel~="icon"]')
  if (old) old.parentNode?.removeChild(old)
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = url
  document.head.appendChild(link)
}

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
  }
  return canvas
}

// ── 保存原始状态 ───────────────────────────────────────────────────────────

function saveOriginals() {
  if (originalFaviconHref === null) {
    const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    originalFaviconHref = link?.getAttribute('href') || '/favicon.ico'
  }
  if (originalTitle === null) {
    originalTitle = document.title
  }
}

// ── 角标绘制（Tinycon 算法）──────────────────────────────────────────────────

function drawBubble(ctx: CanvasRenderingContext2D, label: string) {
  const len = label.length - 1

  // 角标尺寸：宽随位数增长，高固定
  const bw = 7 * r + 6 * r * len
  const bh = 9 * r

  // 贴齐右边和底边
  const top    = SIZE - bh
  const left   = SIZE - bw - r
  const bottom = SIZE
  const right  = SIZE
  const radius = 2 * r

  ctx.fillStyle   = BADGE_BG
  ctx.strokeStyle = BADGE_BG
  ctx.lineWidth   = r

  // 圆角矩形
  ctx.beginPath()
  ctx.moveTo(left + radius, top)
  ctx.quadraticCurveTo(left, top, left, top + radius)
  ctx.lineTo(left, bottom - radius)
  ctx.quadraticCurveTo(left, bottom, left + radius, bottom)
  ctx.lineTo(right - radius, bottom)
  ctx.quadraticCurveTo(right, bottom, right, bottom - radius)
  ctx.lineTo(right, top + radius)
  ctx.quadraticCurveTo(right, top, right - radius, top)
  ctx.closePath()
  ctx.fill()

  // 底部阴影线（增加立体感）
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.moveTo(left + radius / 2, bottom)
  ctx.lineTo(right - radius / 2, bottom)
  ctx.stroke()

  // 数字文字
  ctx.fillStyle    = BADGE_FG
  ctx.textAlign    = 'right'
  ctx.textBaseline = 'top'
  // webkit 字体略细，加 bold 补偿
  ctx.font = `bold ${10 * r}px arial`
  ctx.fillText(label, r === 2 ? 29 : 15, 6 * r)
}

function renderWithBadge(img: HTMLImageElement | null, label: string): string {
  const c = getCanvas()
  const ctx = c.getContext('2d')!

  ctx.clearRect(0, 0, SIZE, SIZE)

  if (img) {
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, SIZE, SIZE)
  } else {
    // 兜底：品牌色圆角矩形背景
    const rad = SIZE * 0.18
    ctx.fillStyle = FALLBACK_BG
    ctx.beginPath()
    ctx.moveTo(rad, 0); ctx.lineTo(SIZE - rad, 0)
    ctx.quadraticCurveTo(SIZE, 0, SIZE, rad)
    ctx.lineTo(SIZE, SIZE - rad)
    ctx.quadraticCurveTo(SIZE, SIZE, SIZE - rad, SIZE)
    ctx.lineTo(rad, SIZE)
    ctx.quadraticCurveTo(0, SIZE, 0, SIZE - rad)
    ctx.lineTo(0, rad)
    ctx.quadraticCurveTo(0, 0, rad, 0)
    ctx.closePath()
    ctx.fill()
  }

  drawBubble(ctx, label)
  return c.toDataURL('image/png')
}

// ── title 前缀（兜底 + 辅助） ────────────────────────────────────────────────

function setTitleBadge(count: number) {
  if (originalTitle === null) return
  // 剥掉旧前缀
  const base = originalTitle.replace(/^\(\d+\+?\)\s*/, '')
  document.title = `(${count > 99 ? '99+' : count}) ${base}`
}

function clearTitleBadge() {
  if (originalTitle !== null) {
    document.title = originalTitle
  }
}

// ── 公开 API ─────────────────────────────────────────────────────────────────

export function setFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return

  saveOriginals()

  const label = count > 99 ? '99+' : String(count)

  // 同步更新 title
  setTitleBadge(count)

  // 如果不支持 canvas，title 前缀已经够用了
  if (!getCanvas().getContext) return

  const src = originalFaviconHref || '/favicon.ico'
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload  = () => setFaviconHref(renderWithBadge(img, label))
  img.onerror = () => setFaviconHref(renderWithBadge(null, label))
  img.src = src
}

export function clearFaviconBadge(): void {
  if (typeof document === 'undefined') return

  clearTitleBadge()

  const href = originalFaviconHref || '/favicon.ico'
  setFaviconHref(href)
}
