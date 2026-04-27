/**
 * FilePreviewPanel 配置
 * 集中管理所有可配置项
 */

/** 文件大小阈值配置（单位：字节） */
export const FILE_SIZE_THRESHOLD = {
  /** 小于此值：完全渲染（语法高亮） */
  HIGHLIGHT: 100 * 1024, // 100KB

  /** 小于此值：纯文本渲染（无高亮） */
  PLAIN_TEXT: 1 * 1024 * 1024, // 1MB

  /** 小于此值：允许预览（超过则提示下载） */
  MAX_PREVIEW: 20 * 1024 * 1024, // 20MB

  /** Markdown 预览模式大小限制（超过此值自动切换到源码模式） */
  MARKDOWN_PREVIEW: 200 * 1024, // 200KB

  /** 大于 MAX_PREVIEW：不渲染，提示下载 */
} as const;

/** 分页配置 */
export const PAGINATION = {
  /** 默认每页行数 */
  DEFAULT_PAGE_SIZE: 100,

  /** JSON/JSONL 表格视图每页行数 */
  TABLE_PAGE_SIZE: 100,
} as const;

/** 虚拟滚动配置 */
export const VIRTUAL_SCROLL = {
  /** 默认行高（像素） */
  DEFAULT_ROW_HEIGHT: 40,

  /** 缓冲区大小（可见区域外预渲染的行数） */
  BUFFER_SIZE: 5,
} as const;

/** 代码渲染配置 */
export const CODE_RENDER = {
  /** 代码字体 */
  FONT_FAMILY: '"SF Mono", Monaco, "Cascadia Code", Consolas, monospace',

  /** 代码字号 */
  FONT_SIZE: "13px",

  /** 代码行高 */
  LINE_HEIGHT: "1.6",
} as const;

/**
 * 格式化文件大小
 * @param bytes - 文件大小（字节），可选
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * 判断文件渲染模式
 * - highlight: 语法高亮渲染（< 100KB）
 * - plain: 纯文本渲染（100KB ~ 1MB）
 * - too-large: 文件过大，不渲染（> 20MB）
 */
export type RenderMode = "highlight" | "plain" | "too-large";

export function getRenderMode(size: number): RenderMode {
  if (size <= FILE_SIZE_THRESHOLD.HIGHLIGHT) return "highlight";
  // PLAIN_TEXT (1MB) < MAX_PREVIEW (20MB)，所以只需检查 MAX_PREVIEW
  if (size <= FILE_SIZE_THRESHOLD.MAX_PREVIEW) return "plain";
  return "too-large";
}

/**
 * 判断是否应该获取文件内容
 * 文件大小超过 20MB 时不获取
 */
export function shouldFetchContent(fileSize: number): boolean {
  // 如果 fileSize 为 0（未知），则尝试获取
  // 如果 fileSize 超过 20MB 阈值，则不获取
  return fileSize === 0 || fileSize <= FILE_SIZE_THRESHOLD.MAX_PREVIEW;
}

/**
 * 判断文件是否过大无法预览
 */
export function isFileTooLarge(fileSize: number): boolean {
  return fileSize > FILE_SIZE_THRESHOLD.MAX_PREVIEW;
}
