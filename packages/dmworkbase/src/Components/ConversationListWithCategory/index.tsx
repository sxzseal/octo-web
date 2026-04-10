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
    unreadCount?: number
    conversations: React.ReactNode
}

export interface ConversationListWithCategoryProps {
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    categories?: CategoryData[]
    ungroupedConversations?: React.ReactNode  // 未分组群聊，为空时不渲染 UngroupedSection
    isLoading?: boolean
    error?: string | null
    onRetry?: () => void
    allConversations?: React.ReactNode
    onCreateCategory?: () => void
    onManageCategories?: () => void
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
                        category={cat}
                        isCollapsed={collapsedIds.has(cat.id)}
                        onToggle={() => toggleCollapse(cat.id)}
                        onContextMenu={() => {}}
                    >
                        {cat.conversations}
                    </CategorySection>
                ))}
                {/* 未分组区域：有内容才渲染 */}
                {ungroupedConversations && (
                    <UngroupedSection>{ungroupedConversations}</UngroupedSection>
                )}
            </>
        )
    }

    return (
        <div className="wk-conv-with-category">
            <div className="wk-conv-with-category__toggle-wrap">
                <ViewToggle value={viewMode} onChange={onViewModeChange} />
            </div>

            <div className="wk-conv-with-category__body">
                {viewMode === "all" ? allConversations : renderGroupedBody()}
            </div>

            {viewMode === "grouped" && !isLoading && !error && (
                <div className="wk-conv-with-category__footer">
                    <AddCategoryButton onClick={onCreateCategory ?? (() => {})} />
                    {onManageCategories && (
                        <button className="wk-conv-with-category__manage-btn" onClick={onManageCategories}>
                            管理分组
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default ConversationListWithCategory
