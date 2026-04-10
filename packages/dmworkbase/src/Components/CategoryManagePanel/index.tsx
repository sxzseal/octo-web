import React, { useState, useRef } from "react"
import { Modal } from "@douyinfe/semi-ui"
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
    onDelete: (id: string) => void
    onReorder: (ids: string[]) => Promise<void> | void
}

const CategoryManagePanel: React.FC<CategoryManagePanelProps> = ({
    visible,
    categories,
    onClose,
    onRename,
    onDelete,
    onReorder,
}) => {
    const [items, setItems] = useState<CategoryItem[]>(categories)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [renameError, setRenameError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null)
    const dragRef = useRef<string | null>(null)

    React.useEffect(() => {
        setItems(categories)
    }, [categories])

    const startRename = (item: CategoryItem) => {
        setRenamingId(item.id)
        setRenameValue(item.name)
        setRenameError(null)
    }

    const confirmRename = async (id: string) => {
        const trimmed = renameValue.trim()
        if (!trimmed) { setRenameError("分组名不能为空"); return }
        const duplicate = items.some(i => i.id !== id && i.name === trimmed)
        if (duplicate) { setRenameError("该分组名已存在"); return }
        try {
            await onRename(id, trimmed)
            setItems(prev => prev.map(i => i.id === id ? { ...i, name: trimmed } : i))
            setRenamingId(null)
            setRenameError(null)
        } catch {
            setRenameError("保存失败")
        }
    }

    const cancelRename = () => {
        setRenamingId(null)
        setRenameError(null)
    }

    // 简单 HTML5 拖拽排序
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
        try {
            await onReorder(items.map(i => i.id))
        } catch {
            // 排序失败时重置到服务端顺序
            setItems(categories)
        }
        dragRef.current = null
    }

    return (
        <>
            <Modal
                title="管理分组"
                visible={visible}
                onCancel={onClose}
                footer={null}
                width={400}
            >
                <div className="wk-category-manage">
                    <div className="wk-category-manage__list">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className={`wk-category-manage__item${dragRef.current === item.id ? " wk-category-manage__item--dragging" : ""}`}
                                draggable
                                onDragStart={() => handleDragStart(item.id)}
                                onDragOver={(e) => handleDragOver(e, item.id)}
                                onDragEnd={handleDragEnd}
                            >
                                <span className="wk-category-manage__drag-handle">⠿</span>

                                {renamingId === item.id ? (
                                    <div className="wk-category-manage__rename-wrap">
                                        <input
                                            autoFocus
                                            className={`wk-category-manage__rename-input${renameError ? " wk-category-manage__rename-input--error" : ""}`}
                                            value={renameValue}
                                            onChange={e => { setRenameValue(e.target.value); setRenameError(null) }}
                                            onKeyDown={e => {
                                                if (e.key === "Enter") confirmRename(item.id)
                                                if (e.key === "Escape") cancelRename()
                                            }}
                                        />
                                        <div className="wk-category-manage__rename-confirm">
                                            <button className="wk-category-manage__rename-btn" onClick={() => confirmRename(item.id)}>✓</button>
                                            <button className="wk-category-manage__rename-btn" onClick={cancelRename}>✗</button>
                                        </div>
                                        {renameError && (
                                            <span className="wk-category-manage__rename-error">{renameError}</span>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <span className="wk-category-manage__name">{item.name}</span>
                                        <span className="wk-category-manage__count">{item.groupCount} 个群聊</span>
                                        <div className="wk-category-manage__actions">
                                            <button
                                                className="wk-category-manage__action-btn"
                                                onClick={() => startRename(item)}
                                                title="重命名"
                                            >✏️</button>
                                            <button
                                                className="wk-category-manage__action-btn wk-category-manage__action-btn--danger"
                                                onClick={() => setDeleteTarget(item)}
                                                title="删除"
                                            >🗑️</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {deleteTarget && (
                <DeleteCategoryModal
                    visible={!!deleteTarget}
                    categoryName={deleteTarget.name}
                    groupCount={deleteTarget.groupCount}
                    onConfirm={async () => {
                        onDelete(deleteTarget.id)
                        setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
                        setDeleteTarget(null)
                    }}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </>
    )
}

export default CategoryManagePanel
