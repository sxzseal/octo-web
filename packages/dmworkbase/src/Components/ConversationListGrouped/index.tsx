import React, { useState, useRef, useEffect } from "react"
import { Modal } from "@douyinfe/semi-ui"
import { Modal } from "@douyinfe/semi-ui"
import { flushSync } from "react-dom"
import { ChannelTypeGroup, Channel } from "wukongimjssdk"
import { parseThreadChannelId } from "../../Service/Thread"
import { CategoryItem } from "../../Service/CategoryService"
import { ConversationWrap } from "../../Service/Model"
import ConversationList from "../ConversationList"
import ConversationListWithCategory from "../ConversationListWithCategory"
import ContextMenus, { ContextMenusContext, ContextMenusData } from "../ContextMenus"
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable"


// category_id 收窄为非 null（useCategoryList 已 filter 掉 null 项）
export type ValidCategoryItem = CategoryItem & { category_id: string }

export interface ConversationListGroupedProps {
    conversations: ConversationWrap[]
    select?: Channel
    onConversationClick: (conv: ConversationWrap) => void
    onClearMessages: (channel: Channel) => void
    onThreadOverflowClick: (groupNo: string) => void

    // 分组数据（由 ChatConversationList 提供，不自己 fetch）
    categories: ValidCategoryItem[]
    isLoading: boolean
    error: string | null
    onRetry: () => void
    onRenameCategory: (id: string, name: string) => Promise<void>
    onDeleteCategory: (id: string) => Promise<void> | void
    onSortCategories: (ids: string[]) => Promise<void>
    onMoveGroupToCategory: (groupNo: string, categoryId: string) => Promise<void>
    onOpenCreateCategory: () => void
    onStartGroup?: () => void
}



const ConversationListGrouped: React.FC<ConversationListGroupedProps> = ({
    conversations,
    select,
    onConversationClick,
    onClearMessages,
    onThreadOverflowClick,
    categories,
    isLoading,
    error,
    onRetry,
    onRenameCategory,
    onDeleteCategory,
    onSortCategories,
    onMoveGroupToCategory,
    onOpenCreateCategory,
    onStartGroup,
}) => {
    // ── DnD 状态 ──────────────────────────────────────────────────────────────
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 6 }, // 6px 才触发拖拽，避免误触点击
    }))
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    const [activeDragData, setActiveDragData] = useState<any>(null)

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id))
        setActiveDragData(event.active.data.current)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragId(null)
        setActiveDragData(null)
        const { active, over } = event
        if (!over) return

        const activeType = active.data.current?.type
        const overId = String(over.id)

        if (activeType === 'category') {
            // 分组整体排序
            const oldIndex = categories.findIndex(c => `cat::${c.category_id}` === String(active.id))
            const newIndex = categories.findIndex(c => `cat::${c.category_id}` === overId)
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newOrder = arrayMove(categories, oldIndex, newIndex).map(c => c.category_id)
                onSortCategories(newOrder)
            }
        } else if (activeType === 'group') {
            const groupNo = active.data.current?.groupNo as string
            if (!groupNo) return

            // over.id 可能是 useSortable 的 cat:: 或 useDroppable 的 drop::cat::
            if (overId.startsWith('drop::cat::')) {
                const targetCategoryId = overId.replace('drop::cat::', '')
                if (targetCategoryId) onMoveGroupToCategory(groupNo, targetCategoryId)
            } else if (overId.startsWith('cat::')) {
                // useSortable 的 id，同样是分组目标
                const targetCategoryId = overId.replace('cat::', '')
                if (targetCategoryId) onMoveGroupToCategory(groupNo, targetCategoryId)
            } else if (overId === 'drop::ungrouped' || overId === 'ungrouped') {
                // 移出分组
                onMoveGroupToCategory(groupNo, '')
            }
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const categoryCtxMenuRef = useRef<ContextMenusContext | null>(null)
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
    const ctxMenuClearRef = useRef<(() => void) | null>(null)

    // 组件卸载时清理 context menu 的 mousedown 监听器
    useEffect(() => {
        return () => {
            if (ctxMenuClearRef.current) {
                document.removeEventListener('mousedown', ctxMenuClearRef.current, true)
                ctxMenuClearRef.current = null
            }
        }
    }, [])
    // 菜单数据用 ref 存，避免 state 异步导致 menus 为空时就 show()
    const [categoryMenus, setCategoryMenus] = useState<ContextMenusData[]>([])
    const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null)

    const groupConversations = conversations.filter(
        c => c.channel.channelType === ChannelTypeGroup
    )
    const groupConvMap = new Map(groupConversations.map(c => [c.channel.channelID, c]))

    // Thread conv: parentGroupNo → 子区列表
    const threadConvsByParent = new Map<string, ConversationWrap[]>()
    for (const conv of conversations) {
        const parentGroupNo = conv.channelInfo?.orgData?.parentGroupNo
            || parseThreadChannelId(conv.channel.channelID)?.groupNo
        if (parentGroupNo) {
            const list = threadConvsByParent.get(parentGroupNo) || []
            list.push(conv)
            threadConvsByParent.set(parentGroupNo, list)
        }
    }

    const categorizedGroupNos = new Set(
        categories.flatMap(cat => (cat.groups || []).map(g => g.group_no))
    )
    const ungroupedGroupNos = groupConversations
        .filter(c => !categorizedGroupNos.has(c.channel.channelID))
        .map(c => c.channel.channelID)
    const ungroupedConvs: ConversationWrap[] = []
    for (const groupNo of ungroupedGroupNos) {
        const groupConv = groupConvMap.get(groupNo)
        if (groupConv) {
            ungroupedConvs.push(groupConv)
            // 将未分组群组的子区一并加入
            const threads = threadConvsByParent.get(groupNo) || []
            ungroupedConvs.push(...threads)
        }
    }

    // 构建「移到分组」子菜单（含 ✓ 标识 + 新建分组入口）
    const buildExtraContextMenus = (conv: ConversationWrap | undefined): ContextMenusData[] => {
        if (!conv || conv.channel.channelType !== ChannelTypeGroup) return []
        if (categories.length === 0) return []

        const groupNo = conv.channel.channelID
        const currentCategoryId = categories.find(
            cat => (cat.groups || []).some(g => g.group_no === groupNo)
        )?.category_id

        if (currentCategoryId) {
            const catName = categories.find(c => c.category_id === currentCategoryId)?.name ?? '当前分组'
            return [{
                title: '移出分组',
                onClick: () => {
                    Modal.confirm({
                        title: '移出分组',
                        content: `确定将此群聊从「${catName}」移出到未分组吗？`,
                        okText: '移出',
                        cancelText: '取消',
                        onOk: () => onMoveGroupToCategory(groupNo, ''),
                    })
                },
            }]
        }

        const items: ContextMenusData[] = categories.map(cat => ({
            title: cat.name,
            checked: false,
            onClick: () => onMoveGroupToCategory(groupNo, cat.category_id),
        }))
        items.push({ separator: true } as ContextMenusData)
        items.push({ title: "+ 新建分组", onClick: onOpenCreateCategory })

        return items
    }

    const ConvListWithMenu = (convs: ConversationWrap[]) => (
        <ConversationList
            conversations={convs}
            select={select}
            filter="group"
            compact
            onClick={onConversationClick}
            onClearMessages={onClearMessages}
            onThreadOverflowClick={onThreadOverflowClick}
            extraContextMenus={buildExtraContextMenus}
        />
    )

    const categoriesForView = categories.map(cat => {
        // 分组内按最新消息时间降序排序
        const sortedGroups = [...(cat.groups || [])].sort((a, b) => {
            const convA = groupConvMap.get(a.group_no)
            const convB = groupConvMap.get(b.group_no)
            const tA = convA?.timestamp ?? 0
            const tB = convB?.timestamp ?? 0
            return tB - tA
        })
        const catConvs: ConversationWrap[] = []
        for (const g of sortedGroups) {
            const groupConv = groupConvMap.get(g.group_no)
            if (groupConv) {
                catConvs.push(groupConv)
                // 将该群组的子区一并加入
                const threads = threadConvsByParent.get(g.group_no) || []
                catConvs.push(...threads)
            }
        }
        const groupCount = (cat.groups || []).length
        const unreadCount = catConvs.reduce((sum, c) => sum + (c.unread || 0), 0)
        return {
            id: cat.category_id,
            name: cat.name,
            groupCount,
            isEmpty: groupCount === 0,
            unreadCount,
            conversations: ConvListWithMenu(catConvs),
        }
    })

    const buildCategoryContextMenus = (categoryId: string): ContextMenusData[] => {
        const idx = categories.findIndex(c => c.category_id === categoryId)
        const cat = categories[idx]
        if (!cat) return []
        return [
            {
                title: "重命名",
                icon: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m-2-2 4 4",
                onClick: () => {
                    setRenamingCategoryId(categoryId)
                    setActiveCategoryId(null)
                },
            },
            {
                title: "上移",
                icon: "M18 15 12 9 6 15",
                onClick: () => {
                    if (idx <= 0) return
                    const newIds = categories.map(c => c.category_id)
                    ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
                    onSortCategories(newIds)
                },
            },
            {
                title: "下移",
                icon: "M6 9l6 6 6-6",
                onClick: () => {
                    if (idx >= categories.length - 1) return
                    const newIds = categories.map(c => c.category_id)
                    ;[newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]]
                    onSortCategories(newIds)
                },
            },
            { separator: true } as ContextMenusData,
            {
                title: "删除分组",
                icon: "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
                danger: true,
                onClick: () => {
                    const cat = categories.find(c => c.category_id === categoryId)
                    Modal.confirm({
                        title: '删除分组',
                        content: `确定删除「${cat?.name ?? '该分组'}」吗？分组内群聊将移至未分组。`,
                        okType: 'danger',
                        okText: '删除',
                        cancelText: '取消',
                        onOk: () => onDeleteCategory(categoryId),
                    })
                },
            },
        ]
    }

    const categoryIds = categories.map(c => `cat::${c.category_id}`)

    // 找到正在拖拽的 group item（用于 DragOverlay）
    const activeDragConv = activeDragData?.type === 'group'
        ? conversations.find(c => c.channel.channelID === activeDragData.groupNo)
        : null

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={categoryIds} strategy={verticalListSortingStrategy}>
                <ConversationListWithCategory
                    categories={categoriesForView}
                    isLoading={isLoading}
                    error={error}
                    onRetry={onRetry}
                    allConversations={ConvListWithMenu(conversations)}
                    ungroupedConversations={ConvListWithMenu(ungroupedConvs)}
                    onCreateCategory={onOpenCreateCategory}
                    hasNoGroups={categories.length === 0 && ungroupedConvs.length === 0}
                    onStartGroup={onStartGroup}
                    activeCategoryId={activeCategoryId}
                    renamingCategoryId={renamingCategoryId}
                    categorySectionDraggable
                    ungroupedSectionDroppable
                    onRenameConfirm={async (id, newName) => {
                        await onRenameCategory(id, newName)
                        setRenamingCategoryId(null)
                    }}
                    onRenameCancel={() => setRenamingCategoryId(null)}
                    onCategoryContextMenu={(categoryId, e) => {
                        e.preventDefault()
                        const menus = buildCategoryContextMenus(categoryId)
                        flushSync(() => {
                            setActiveCategoryId(categoryId)
                            setCategoryMenus(menus)
                        })
                        categoryCtxMenuRef.current?.show(e)
                        if (ctxMenuClearRef.current) {
                            document.removeEventListener('mousedown', ctxMenuClearRef.current, true)
                        }
                        const clear = () => {
                            setActiveCategoryId(null)
                            document.removeEventListener('mousedown', clear, true)
                            ctxMenuClearRef.current = null
                        }
                        ctxMenuClearRef.current = clear
                        document.addEventListener('mousedown', clear, true)
                    }}
                />
            </SortableContext>

            <ContextMenus
                onContext={(ctx) => { categoryCtxMenuRef.current = ctx }}
                menus={categoryMenus}
            />

            {/* DragOverlay：ghost 预览 */}
            <DragOverlay>
                {activeDragConv ? (
                    <div className="wk-conv-compact-item wk-conv-compact-item--ghost">
                        <span className="wk-conv-compact-icon">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="12" y2="18" />
                            </svg>
                        </span>
                        <span className="wk-conv-compact-name">
                            {activeDragConv.channelInfo?.orgData.displayName ?? activeDragConv.channel.channelID}
                        </span>
                    </div>
                ) : activeDragData?.type === 'category' ? (
                    <div className="wk-category-header wk-category-header--ghost">
                        <span className="wk-category-header__name">
                            {categories.find(c => `cat::${c.category_id}` === activeDragId)?.name ?? '分组'}
                        </span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}

export default ConversationListGrouped
