import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import "highlight.js/styles/github-dark.css";
import "./markdown.css";

interface MarkdownContentProps {
    content: string;
    isSend?: boolean;
    isStreaming?: boolean;
}

/**
 * 在 GitHub 默认白名单基础上，追加 highlight.js 需要的 class 属性。
 * 执行顺序：rehypeHighlight 先着色（加 hljs-* className），
 * rehypeSanitize 最后兜底清洗——白名单里的 hljs-* / language-* 才真正生效。
 * 注意：react-markdown 的输入是 Markdown 字符串，remark 直接解析成安全 AST，
 * 不存在注入 HTML 的机会（未开启 allowDangerousHtml），所以 highlight 先跑不会引入风险。
 */
const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        // 放行代码块的 language-* class（highlight.js 加的）
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ["className", /^language-/, /^hljs/],
        ],
        // 放行 span 上的 hljs-* class（语法高亮 token）
        span: [
            ...(defaultSchema.attributes?.span ?? []),
            ["className", /^hljs/],
        ],
    },
};

/**
 * 预处理 Markdown 内容：
 * 把独占一行的 --- / === 补充前后空行，避免被解析成 setext 标题（h2/h1）。
 * 标准 Markdown：紧跟在文本行后面的 --- 会变成 h2，=== 会变成 h1。
 * AI 输出的 --- 通常是分割线意图，前后补空行可强制解析为 <hr>。
 */
function normalizeContent(raw: string): string {
    return raw
        // --- 或 *** 或 ___ 作为分割线：确保前后各有一个空行
        .replace(/([^\n])\n([-*_]{3,})\n/g, "$1\n\n$2\n\n")
        // 行首 --- 但前面没有空行（文件开头或紧接内容）
        .replace(/(^|\n)([-*_]{3,})(\n|$)/g, "\n\n$2\n\n")
        // 收拢多余空行（最多两个换行）
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isSend, isStreaming }) => {
    const normalized = normalizeContent(content);
    return (
        <div className={`wk-markdown ${isSend ? "wk-markdown-send" : "wk-markdown-recv"}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                    // highlight 先着色，sanitize 最后兜底——白名单 hljs-* class 才真正有效
                    rehypeHighlight,
                    [rehypeSanitize, sanitizeSchema],
                ]}
                components={{
                    a: ({ href, children, ...props }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                            {children}
                        </a>
                    ),
                    pre: ({ children, ...props }) => (
                        <div className="wk-markdown-pre-wrapper">
                            <pre {...props}>{children}</pre>
                        </div>
                    ),
                }}
            >
                {normalized}
            </ReactMarkdown>
            {isStreaming && <span className="wk-stream-cursor" />}
        </div>
    );
};

export default MarkdownContent;
