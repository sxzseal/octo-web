/**
 * DMWork v4 Design Tokens — TypeScript
 * Source: Figma "设计基础" (2026-04-20 提取)
 *
 * 用途：
 * - JS 动态样式（inline style、canvas、动画）
 * - Storybook args 默认值
 * - 单元测试 snapshot 验证
 */

export const colors = {
  brand: {
    primary:      '#1C1C23',   /* Figma: 主色 — 深黑 */
    primaryHover: '#2A2A33',
    darkTab:      '#343B3A',   /* Figma: Tab 容器背景 */
    glow:         'rgba(28, 28, 35, 0.2)',
  },
  accent: {
    purple:       '#7F3BF5',   /* Figma: AI/Thread 链接色 */
    purpleHover:  '#6A2FD0',
    teal:         '#0B867D',   /* Figma: 按钮图标 */
  },
  semantic: {
    success: '#41CD59',
    warning: '#FC8800',
    error:   '#F54A45',
    info:    '#0077FA',
  },
  ai: {
    surface: 'rgba(127, 59, 245, 0.04)',  /* AI 保持紫色 */
    border:  'rgba(127, 59, 245, 0.12)',
    glow:    'rgba(127, 59, 245, 0.06)',
  },
  dark: {
    bgDeep:     '#111318',
    bgBase:     '#171921',
    bgSurface:  '#1E212B',
    bgElevated: '#262A36',
    bgHover:    '#2E3238',
    bgActive:   '#343B3A',
    textPrimary:   '#E4E6ED',
    textSecondary: '#9CA1B3',
    textTertiary:  '#7A7F96',
    textAccent:    '#9B6DF7',  /* 暗色下 AI 链接色 */
    borderSubtle:  'rgba(255, 255, 255, 0.04)',
    borderDefault: 'rgba(255, 255, 255, 0.07)',
    borderStrong:  'rgba(255, 255, 255, 0.12)',
    borderGlow:    'rgba(127, 59, 245, 0.2)',
  },
  light: {
    bgDeep:     '#F5F6F7',
    bgBase:     '#F5F6F7',
    bgSurface:  '#FFFFFF',
    bgElevated: '#F2F3F4',
    bgHover:    '#DFE0E2',
    bgActive:   '#D9D9D9',
    textPrimary:   '#1F2329',
    textSecondary: '#555B61',
    textTertiary:  '#6B7075',
    textAccent:    '#7F3BF5',  /* 亮色下 AI 链接色 */
    borderSubtle:  'rgba(0, 0, 0, 0.05)',
    borderDefault: 'rgba(0, 0, 0, 0.08)',
    borderStrong:  'rgba(0, 0, 0, 0.12)',
    borderGlow:    'rgba(127, 59, 245, 0.2)',
  },
  /** Figma Tag 专属色 */
  tag: {
    blueBg:    '#0077FA',
    blueText:  '#00418F',
    grayBg:    '#6B7075',
    grayText:  '#555B61',
    orangeBg:  '#FC8800',
    orangeText:'#722F01',
  },
} as const

export const spacing = {
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
} as const

export const radius = {
  xs:   3,    /* Figma: Tag, 导航项 */
  sm:   6,
  md:   8,    /* Figma: 消息气泡, AI 卡片, 图片 */
  lg:   16,   /* Figma: 普通头像 */
  xl:   20,
  full: 9999, /* pill */
} as const

export const typography = {
  fontSans: "'PingFang SC', 'Inter', -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif",
  fontMono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  sizes: {
    h1:      28,
    h2:      22,
    h3:      16,  /* Figma: heading-lg 组织名 */
    h4:      14,  /* Figma: heading-md 用户名/群名 */
    body:    14,  /* Figma: 正文 */
    caption: 12,  /* Figma: Tag/辅助文字 */
    tiny:    10,  /* Figma: badge 数字 */
    code:    13,
  },
  weights: {
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
  lineHeights: {
    tight:  1.25,
    normal: 1.5,
    relaxed: 1.65,
    code:   1.6,
  },
} as const

export const animation = {
  ease:       'cubic-bezier(0.16, 1, 0.3, 1)',
  easeBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  durFast:    150,
  dur:        200,
  durSlow:    350,
} as const

export const layout = {
  navWidth:      56,   /* Figma: 侧边栏折叠 */
  sidebarWidth:  240,  /* Figma: 会话列表 */
  taskRailWidth: 320,
} as const

/** CSS 变量名映射（用于 debug.js inspect 验证） */
export const cssVarNames = {
  brandPrimary:   '--wk-brand-primary',
  bgBase:         '--wk-bg-base',
  bgElevated:     '--wk-bg-elevated',
  textPrimary:    '--wk-text-primary',
  textSecondary:  '--wk-text-secondary',
  borderDefault:  '--wk-border-default',
  borderGlow:     '--wk-border-glow',
  aiSurface:      '--wk-ai-surface',
  aiBorder:       '--wk-ai-border',
} as const

export type ColorToken = keyof typeof colors.dark
export type SpacingToken = keyof typeof spacing
export type RadiusToken = keyof typeof radius
