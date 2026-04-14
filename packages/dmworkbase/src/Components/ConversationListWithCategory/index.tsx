import React, { useState } from "react"
import ViewToggle, { ViewMode } from "../ViewToggle"
import CategorySection from "../CategorySection"
import UngroupedSection from "../UngroupedSection"
import CategoryEmptyState from "../CategoryEmptyState"
import AddCategoryButton from "../AddCategoryButton"
import "./index.css"

export interface CategoryData {
    id: string
    name: string
    groupCount?: number   // 分组内群聊总数，折叠时显示
    unreadCount?: number
    conversations: React.ReactNode
    isEmpty?: boolean     // 无群聊时为 true
}

export interface ConversationListWithCategoryProps {
    viewMode?: ViewMode
    onViewModeChange?: (mode: ViewMode) => void
    categories?: CategoryData[]
    ungroupedConversations?: React.ReactNode  // 未分组群聊，为空时不渲染 UngroupedSection
    isLoading?: boolean
    error?: string | null
    onRetry?: () => void
    allConversations?: React.ReactNode
    onCreateCategory?: () => void
    onCategoryContextMenu?: (categoryId: string, e: React.MouseEvent) => void
    /** CategorySection 是否启用拖拽（useSortable + useDroppable） */
    categorySectionDraggable?: boolean
    /** UngroupedSection 是否启用 droppable */
    ungroupedSectionDroppable?: boolean
    activeCategoryId?: string | null       // 右键菜单打开时的高亮分组
    renamingCategoryId?: string | null     // 行内重命名中的分组
    onRenameConfirm?: (id: string, newName: string) => void
    onRenameCancel?: () => void
}

const ConversationListWithCategory: React.FC<ConversationListWithCategoryProps> = ({
    viewMode,
    onViewModeChange,
    categories = [],
    ungroupedConversations,
    isLoading,
    error,
    onRetry,
    allConversations,
    onCreateCategory,
    onCategoryContextMenu,
    activeCategoryId,
    renamingCategoryId,
    onRenameConfirm,
    onRenameCancel,
    categorySectionDraggable,
    ungroupedSectionDroppable,
}) => {
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

    const toggleCollapse = (id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const renderGroupedBody = () => {
        if (isLoading) {
            return (
                <div className="wk-conv-with-category__loading">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="wk-conv-with-category__skeleton" />
                    ))}
                </div>
            )
        }

        if (error) {
            return (
                <div className="wk-conv-with-category__error">
                    <span className="wk-conv-with-category__error-text">加载失败，请检查网络</span>
                    {onRetry && (
                        <button className="wk-conv-with-category__retry" onClick={onRetry}>
                            点击重试
                        </button>
                    )}
                </div>
            )
        }

        if (categories.length === 0) {
            return <CategoryEmptyState onCreateCategory={onCreateCategory ?? (() => {})} />
        }

        return (
            <>
                {categories.map(cat => (
                    <CategorySection
                        key={cat.id}
                        category={{ ...cat, isEmpty: cat.isEmpty ?? cat.groupCount === 0 }}
                        isCollapsed={collapsedIds.has(cat.id)}
                        onToggle={() => toggleCollapse(cat.id)}
                        onContextMenu={onCategoryContextMenu ? (e) => onCategoryContextMenu(cat.id, e) : undefined}
                        isActive={activeCategoryId === cat.id}
                        isEditing={renamingCategoryId === cat.id}
                        onRenameConfirm={onRenameConfirm ? (newName) => onRenameConfirm(cat.id, newName) : undefined}
                        onRenameCancel={onRenameCancel}
                        draggable={categorySectionDraggable}
                    >
                        {cat.conversations}
                    </CategorySection>
                ))}
                {/* 未分组区域：始终渲染 */}
                <UngroupedSection droppable={ungroupedSectionDroppable}>
                    {ungroupedConversations}
                </UngroupedSection>
            </>
        )
    }

    return (
        <div className="wk-conv-with-category">
            <div className="wk-conv-with-category__body">
                {renderGroupedBody()}
            </div>

            {!isLoading && !error && (
                <div className="wk-conv-with-category__footer">
                    <AddCategoryButton onClick={onCreateCategory ?? (() => {})} />
                </div>
            )}
        </div>
    )
}

export default ConversationListWithCategory
