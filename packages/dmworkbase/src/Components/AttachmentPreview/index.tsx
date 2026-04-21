import React, { Component, ReactNode } from "react"
import ConversationContext from "../Conversation/context"
import "./index.css"

interface AttachmentPreviewProps {
    conversationContext: ConversationContext
    files: File[]
}

function getFileIconInfo(file: File): { color: string; label: string } {
    const dotIdx = file.name.lastIndexOf('.')
    const ext = dotIdx > 0 ? file.name.substring(dotIdx + 1).toLowerCase() : ""
    if (file.type.startsWith('image/')) return { color: "#1C1C23", label: "IMG" }
    switch (ext) {
        case "pdf": return { color: "#EF4444", label: "PDF" }
        case "doc": case "docx": return { color: "#3B82F6", label: "DOC" }
        case "xls": case "xlsx": return { color: "#22C55E", label: "XLS" }
        case "ppt": case "pptx": return { color: "#F97316", label: "PPT" }
        case "zip": case "rar": case "7z": return { color: "#EAB308", label: "ZIP" }
        default: return { color: "#9CA3AF", label: "FILE" }
    }
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default class AttachmentPreview extends Component<AttachmentPreviewProps> {
    render(): ReactNode {
        const { conversationContext, files } = this.props
        if (!files || files.length === 0) return null

        return (
            <div className="wk-attachment-preview">
                <div className="wk-attachment-preview-list">
                    {files.map((file, index) => {
                        const iconInfo = getFileIconInfo(file)
                        return (
                            <div key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="wk-attachment-preview-item">
                                <div className="wk-attachment-preview-icon" style={{ backgroundColor: iconInfo.color }}>
                                    <span className="wk-attachment-preview-icon-label">{iconInfo.label}</span>
                                </div>
                                <div className="wk-attachment-preview-info">
                                    <div className="wk-attachment-preview-name" title={file.name}>{file.name}</div>
                                    <div className="wk-attachment-preview-size">{formatFileSize(file.size)}</div>
                                </div>
                                <button
                                    className="wk-attachment-preview-remove"
                                    onClick={() => conversationContext.removePendingAttachment(index)}
                                    title="移除"
                                >
                                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M568.92 508.23l299.37-299.42a39.14 39.14 0 0 0 0-55.15l-1.64-1.64a39.14 39.14 0 0 0-55.09 0L512.19 451.84 212.77 151.91a39.14 39.14 0 0 0-55.09 0l-1.64 1.64a38.46 38.46 0 0 0 0 55.09l299.48 299.59-299.42 299.48a39.14 39.14 0 0 0 0 55.09l1.64 1.7a39.14 39.14 0 0 0 55.09 0l299.42-299.48 299.37 299.42a39.14 39.14 0 0 0 55.09 0l1.7-1.64a39.14 39.14 0 0 0 0-55.09L568.87 508.17z" />
                                    </svg>
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }
}
