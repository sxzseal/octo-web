import React, { useState, useRef, useEffect } from "react"
import DeleteCategoryModal from "../DeleteCategoryModal"
import "./index.css"

export interface CategoryItem {
    id: string
    name: string
    groupCount: number
}

export interface CategoryManagePanelProps {
    visible: boolean
    categories: CategoryItem[]
    onClose: () => void
    onRename: (id: string, newName: string) => Promise<void> | void
    onDelete: (id: string) => Promise<void> | void
    onReorder: (ids: string[]) => Promise<void> | void
    onCreateCategory?: () => void
}

// SVG 图标组件
const PencilIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
)
const TrashIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
)
const CheckIcon = () => (
    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
)
const CloseSmIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const PlusIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)

const CategoryManagePanel: React.FC<CategoryManagePanelProps> = ({
    visible,
    categories,
    onClose,
    onRename,
    onDelete,
    onReorder,
    onCreateCategory,
}) => {
    const [items, setItems] = useState<CategoryItem[]>(categories)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [renameError, setRenameError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null)
    const dragRef = useRef<string | null>(null)

    useEffect(() => {
        setItems(categories)
    }, [categories])

    // 关闭时重置所有临时状态，避免下次打开时有残留
    useEffect(() => {
        if (!visible) {
            setRenamingId(null)
            setRenameValue("")
            setRenameError(null)
            setDeleteTarget(null)
            dragRef.current = null
        }
    }, [visible])

    if (!visible) return null

    const startRename = (item: CategoryItem) => {
        setRenamingId(item.id)
        setRenameValue(item.name)
        setRenameError(null)
    }

    const confirmRename = async (id: string) => {
        const trimmed = renameValue.trim()
        if (!trimmed) { setRenameError("分组名不能为空"); return }
        if (items.some(i => i.id !== id && i.name === trimmed)) { setRenameError("该分组名已存在"); return }
        try {
            await onRename(id, trimmed)
            setItems(prev => prev.map(i => i.id === id ? { ...i, name: trimmed } : i))
            setRenamingId(null)
            setRenameError(null)
        } catch {
            setRenameError("保存失败")
        }
    }

    const cancelRename = () => { setRenamingId(null); setRenameError(null) }

    // HTML5 拖拽排序
    const handleDragStart = (id: string) => { dragRef.current = id }
    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault()
        if (dragRef.current === id) return
        const from = items.findIndex(i => i.id === dragRef.current)
        const to = items.findIndex(i => i.id === id)
        if (from < 0 || to < 0) return
        const next = [...items]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        setItems(next)
    }
    const handleDragEnd = async () => {
        try { await onReorder(items.map(i => i.id)) } catch { setItems(categories) }
        dragRef.current = null
    }

    return (
        <>
            {/* 点击遮罩关闭 */}
            <div className="wk-category-manage-panel-overlay" onClick={onClose}>
                <div className="wk-category-manage-panel" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="wk-category-manage-panel__header">
                        <span className="wk-category-manage-panel__title">管理分组</span>
                        <button className="wk-category-manage-panel__close" onClick={onClose}>
                            <CloseSmIcon />
                        </button>
                    </div>

                    {/* List */}
                    <div className="wk-category-manage-panel__list">
                        {items.length === 0 && (
                            <div className="wk-category-manage-panel__empty-state">
                                <p className="wk-category-manage-panel__empty-title">还没有分组</p>
                                <p className="wk-category-manage-panel__empty-desc">点击下方按钮创建第一个分组</p>
                            </div>
                        )}
                        {items.map((item) => {
                            const isEditing = renamingId === item.id
                            const isDragging = dragRef.current === item.id
                            return (
                                <div
                                    key={item.id}
                                    className={`wk-category-manage-panel__item${isEditing ? " wk-category-manage-panel__item--editing" : ""}${isDragging ? " wk-category-manage-panel__item--dragging" : ""}`}
                                    onDragOver={e => handleDragOver(e, item.id)}
                                >
                                    {/* 只有手柄可以拖拽，整行不 draggable */}
                                    <span
                                        className="wk-category-manage-panel__handle"
                                        draggable={!isEditing}
                                        onDragStart={() => handleDragStart(item.id)}
                                        onDragEnd={handleDragEnd}
                                    >⠿</span>

                                    {isEditing ? (
                                        <div className="wk-category-manage-panel__rename-wrap">
                                            <input
                                                autoFocus
                                                className={`wk-category-manage-panel__rename-input${renameError ? " wk-category-manage-panel__rename-input--error" : ""}`}
                                                value={renameValue}
                                                onChange={e => { setRenameValue(e.target.value); setRenameError(null) }}
                                                onKeyDown={e => {
                                                    if (e.key === "Enter") confirmRename(item.id)
                                                    if (e.key === "Escape") cancelRename()
                                                }}
                                            />
                                            <div className="wk-category-manage-panel__rename-confirm">
                                                <button
                                                    className="wk-category-manage-panel__action-btn wk-category-manage-panel__rename-btn--ok"
                                                    onClick={() => confirmRename(item.id)}
                                                >
                                                    <CheckIcon />
                                                </button>
                                                <button
                                                    className="wk-category-manage-panel__action-btn wk-category-manage-panel__rename-btn--cancel"
                                                    onClick={cancelRename}
                                                >
                                                    <CloseSmIcon />
                                                </button>
                                            </div>
                                            {renameError && (
                                                <span className="wk-category-manage-panel__rename-error">{renameError}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <span className="wk-category-manage-panel__name">{item.name}</span>
                                            <span className="wk-category-manage-panel__count">{item.groupCount} 个群聊</span>
                                            <div className="wk-category-manage-panel__actions" draggable={false}>
                                                <button
                                                    className="wk-category-manage-panel__action-btn"
                                                    draggable={false}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    onClick={() => startRename(item)}
                                                    title="重命名"
                                                >
                                                    <PencilIcon />
                                                </button>
                                                <button
                                                    className="wk-category-manage-panel__action-btn"
                                                    draggable={false}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    onClick={() => setDeleteTarget(item)}
                                                    title="删除"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer */}
                    {onCreateCategory && (
                        <div className="wk-category-manage-panel__footer">
                            <button className="wk-category-manage-panel__add-btn" onClick={onCreateCategory}>
                                <PlusIcon />
                                新建分组
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {deleteTarget && (
                <DeleteCategoryModal
                    visible={!!deleteTarget}
                    categoryName={deleteTarget.name}
                    groupCount={deleteTarget.groupCount}
                    onConfirm={async () => {
                        try {
                            await onDelete(deleteTarget.id)
                            setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
                            setDeleteTarget(null)
                        } catch {
                            setDeleteTarget(null)
                        }
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    )
}

export default CategoryManagePanel
