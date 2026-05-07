import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { BaseRendererProps } from "../types";
import { isFileTooLarge, getRenderMode, formatFileSize } from "../config";
import { useFileContent } from "../hooks/useFileContent";
import { RendererState } from "./RendererState";
import FileTooLarge from "./FileTooLarge";
import "./HtmlRenderer.css";
import "./code-highlight.css";

export interface HtmlRendererProps extends BaseRendererProps {
  /** 视图模式：预览 | 源码 */
  viewMode?: "preview" | "source";
  /** 视图模式变化回调 */
  onViewModeChange?: (mode: "preview" | "source") => void;
}

/**
 * HTML 渲染器
 * 使用 iframe 渲染 HTML 文件，支持完整的 HTML 预览
 * 支持 html, htm 格式
 *
 * 功能：
 * 1. 预览模式：iframe 沙箱渲染
 * 2. 源码模式：语法高亮 + 行号
 * 3. 错误自动切源码：iframe 渲染出错时自动切换到源码并显示红色提示条
 */
const HtmlRenderer: React.FC<HtmlRendererProps> = ({
  file,
  onError,
  viewMode: externalViewMode,
  onViewModeChange,
}) => {
  // 内部视图模式状态（当外部不传入时使用）
  const [internalViewMode, setInternalViewMode] = useState<
    "preview" | "source"
  >("preview");
  // 实际使用的视图模式
  const viewMode = externalViewMode ?? internalViewMode;

  const [iframeLoading, setIframeLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 加载 HTML 内容
  const {
    content,
    loading: contentLoading,
    error,
    reload,
  } = useFileContent({
    url: file.url,
  });

  // 切换视图模式
  const handleViewModeChange = useCallback(
    (mode: "preview" | "source") => {
      if (onViewModeChange) {
        onViewModeChange(mode);
      } else {
        setInternalViewMode(mode);
      }
      // 切换到预览模式时清除错误状态
      if (mode === "preview") {
        setRenderError(null);
        setIframeLoading(true);
      }
    },
    [onViewModeChange]
  );

  // 切换到预览模式时重置加载状态
  useEffect(() => {
    if (content && viewMode === "preview") {
      setIframeLoading(true);
    }
  }, [content, viewMode]);

  // iframe 加载完成
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);

    // 尝试检测 iframe 内部是否有错误
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        // 检查是否是空白页或错误页
        const body = iframe.contentDocument.body;
        if (body && body.innerHTML.includes("error")) {
          // 可能有错误，但不强制切换
        }
      }
    } catch {
      // 跨域访问限制，忽略
    }
  }, []);

  // iframe 加载错误
  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    const errorMsg = "HTML 渲染失败，已切换到源码视图";
    setRenderError(errorMsg);
    // 自动切换到源码模式
    handleViewModeChange("source");
    onError?.(errorMsg);
  }, [handleViewModeChange, onError]);

  // 监听 iframe 内部的 JS 错误
  useEffect(() => {
    if (viewMode !== "preview" || !content) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      // 安全检查：验证消息确实来自我们的 iframe
      // 只检查 event.source，这是唯一可靠的验证方式
      if (event.source !== iframe.contentWindow) {
        return; // 忽略来自其他来源的消息
      }

      // 检查消息类型
      if (event.data?.type === "html-render-error") {
        const errorMsg = `渲染错误: ${event.data.message || "未知错误"}`;
        setRenderError(errorMsg);
        handleViewModeChange("source");
        onError?.(errorMsg);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [viewMode, content, handleViewModeChange, onError]);

  // 计算内容大小（用于源码模式的分级渲染）
  const contentSize = useMemo(() => {
    if (file.size) return file.size;
    return content ? new Blob([content]).size : 0;
  }, [file.size, content]);

  // 源码模式的渲染模式（highlight / plain / too-large）
  const sourceRenderMode = useMemo(
    () => getRenderMode(contentSize),
    [contentSize]
  );

  // 使用 useEffect 通知错误，避免在渲染阶段调用外部回调
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // 文件大小检查（超过 20MB 不渲染）- 移到 hooks 之后
  if (file.size && isFileTooLarge(file.size)) {
    return (
      <FileTooLarge
        fileName={file.name}
        fileSize={file.size}
        fileUrl={file.url}
      />
    );
  }

  // 内容加载中
  if (contentLoading) {
    return <RendererState type="loading" />;
  }

  // 内容加载错误
  if (error) {
    return <RendererState type="error" message={error} onRetry={reload} />;
  }

  // 无内容
  if (!content) {
    return <RendererState type="empty" />;
  }

  // 源码模式
  if (viewMode === "source") {
    // 源码超过 PLAIN_TEXT 阈值，不预览
    if (sourceRenderMode === "too-large") {
      return (
        <FileTooLarge
          fileName={file.name}
          fileSize={contentSize}
          fileUrl={file.url}
        />
      );
    }

    return (
      <div className="wk-file-preview-html-renderer wk-file-preview-html-renderer--source">
        {/* 错误提示条 */}
        {renderError && (
          <div className="wk-file-preview-html-renderer__error-bar">
            <span className="wk-file-preview-html-renderer__error-icon">⚠</span>
            <span className="wk-file-preview-html-renderer__error-text">
              {renderError}
            </span>
            <button
              className="wk-file-preview-html-renderer__retry-preview"
              onClick={() => handleViewModeChange("preview")}
            >
              重试预览
            </button>
          </div>
        )}
        <div className="wk-file-preview-html-renderer__source-container wk-code-highlight-container">
          {sourceRenderMode === "highlight" ? (
            <SyntaxHighlighter
              language="html"
              useInlineStyles={false}
              showLineNumbers
              wrapLines
              lineNumberStyle={{
                minWidth: "3em",
                paddingRight: "1em",
                textAlign: "right",
                userSelect: "none",
              }}
            >
              {content}
            </SyntaxHighlighter>
          ) : (
            /* 大文件使用纯文本渲染，避免卡死 */
            <>
              <div className="wk-file-preview-html-renderer__plain-hint">
                文件较大（{formatFileSize(contentSize)}
                ），已禁用语法高亮以提升性能
              </div>
              <pre className="wk-file-preview-html-renderer__plain-source">
                <code>{content}</code>
              </pre>
            </>
          )}
        </div>
      </div>
    );
  }

  // 预览模式：使用 srcdoc 渲染 HTML
  // sandbox 配置说明：
  // - allow-scripts: 允许执行脚本
  // - allow-same-origin: 让 iframe 继承父页面的 origin，解决 blob:null CSP 问题
  //   （否则 srcdoc 的 origin 是 null，HTML 内部创建的 blob:null/xxx URL 会被 CSP 阻止）
  // - allow-modals: 允许 alert/confirm/prompt
  // - allow-popups: 允许弹出窗口（如 window.open）
  return (
    <div className="wk-file-preview-html-renderer wk-file-preview-html-renderer--preview">
      {iframeLoading && (
        <div className="wk-file-preview-html-renderer__loading-overlay">
          <div className="wk-file-preview-html-renderer__spinner" />
          <span className="wk-file-preview-html-renderer__message">
            渲染中...
          </span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={content}
        className={`wk-file-preview-html-renderer__iframe ${
          iframeLoading ? "wk-file-preview-html-renderer__iframe--hidden" : ""
        }`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
        title={file.name}
      />
    </div>
  );
};

export default HtmlRenderer;
export { HtmlRenderer };
