import React, { useRef, useEffect } from "react"
import "./index.css"

export interface CategoryHeaderProps {
    name: string
    groupCount?: number
    unreadCount?: number
    isCollapsed: boolean
    isEmpty?: boolean
    onToggle: () => void
    onContextMenu?: (e: React.MouseEvent) => void
    // 右键菜单打开时高亮
    isActive?: boolean
    // 行内重命名
    isEditing?: boolean
    onRenameConfirm?: (newName: string) => void
    onRenameCancel?: () => void
    // 拖拽 handle props（由 useSortable 传入）
    dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
    name,
    groupCount,
    unreadCount,
    isCollapsed,
    isEmpty,
    onToggle,
    onContextMenu,
    isActive,
    isEditing,
    onRenameConfirm,
    onRenameCancel,
    dragHandleProps,
}) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const isConfirmed = useRef(false)

    useEffect(() => {
        if (isEditing && inputRef.current) {
            isConfirmed.current = false
            inputRef.current.focus()
            inputRef.current.select()
        }
    }, [isEditing])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const val = inputRef.current?.value.trim()
            if (val) {
                isConfirmed.current = true
                onRenameConfirm?.(val)
            }
        }
        if (e.key === "Escape") {
            isConfirmed.current = true  // 标记已处理，onBlur 跳过
            onRenameCancel?.()
        }
    }

    const handleConfirm = () => {
        const val = inputRef.current?.value.trim()
        if (val) {
            isConfirmed.current = true
            onRenameConfirm?.(val)
        }
    }

    const handleCancel = () => {
        isConfirmed.current = true
        onRenameCancel?.()
    }

    if (isEditing) {
        return (
            <div className="wk-category-header wk-category-header--editing" onClick={e => e.stopPropagation()}>
                <div className="wk-category-header__rename-wrap">
                    <input
                        ref={inputRef}
                        className="wk-category-header__rename-input"
                        defaultValue={name}
                        onKeyDown={handleKeyDown}
                        onBlur={e => {
                            if (isConfirmed.current) {
                                isConfirmed.current = false
                                return
                            }
                            const val = e.target.value.trim()
                            if (val && val !== name) onRenameConfirm?.(val)
                            else onRenameCancel?.()
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                    {/* ✓ 确认 */}
                    <button
                        className="wk-category-header__rename-btn wk-category-header__rename-btn--ok"
                        onMouseDown={e => e.preventDefault()}
                        onClick={handleConfirm}
                    >
                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                    </button>
                    {/* ✗ 取消 */}
                    <button
                        className="wk-category-header__rename-btn wk-category-header__rename-btn--cancel"
                        onMouseDown={e => e.preventDefault()}
                        onClick={handleCancel}
                    >
                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            className={[
                "wk-category-header",
                isEmpty ? "wk-category-header--empty" : "",
                isActive ? "wk-category-header--active" : "",
            ].filter(Boolean).join(" ")}
            onClick={onToggle}
            onContextMenu={onContextMenu}
        >
            {/* 拖拽 handle（由父组件传入 useSortable listeners） */}
            {dragHandleProps && (
                <span
                    className="wk-category-header__drag-handle"
                    {...dragHandleProps}
                    onClick={e => e.stopPropagation()}
                >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                        <circle cx="3" cy="3" r="1.2" fill="currentColor" />
                        <circle cx="7" cy="3" r="1.2" fill="currentColor" />
                        <circle cx="3" cy="7" r="1.2" fill="currentColor" />
                        <circle cx="7" cy="7" r="1.2" fill="currentColor" />
                        <circle cx="3" cy="11" r="1.2" fill="currentColor" />
                        <circle cx="7" cy="11" r="1.2" fill="currentColor" />
                    </svg>
                </span>
            )}
            <span className={`wk-category-header__arrow${isCollapsed ? " wk-category-header__arrow--collapsed" : ""}`}>
                <svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
            <span className="wk-category-header__name">
                {name}
                {isEmpty ? (
                    <span className="wk-category-header__count wk-category-header__count--empty"> (空)</span>
                ) : isCollapsed && groupCount !== undefined ? (
                    <span className="wk-category-header__count"> ({groupCount})</span>
                ) : null}
            </span>
            {!isEmpty && !!unreadCount && unreadCount > 0 && (
                <span className="wk-category-header__badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                </span>
            )}
        </div>
    )
}

export default CategoryHeader
