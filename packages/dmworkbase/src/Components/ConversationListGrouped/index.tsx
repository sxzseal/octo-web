import React, { useState, useRef, useEffect } from "react"
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


// category_id 收窄为非 null
export type ValidCategoryItem = CategoryItem & { category_id: string }

/** 运行时类型守卫：确保 category_id 为非 null 字符串 */
export function isValidCategoryItem(c: CategoryItem): c is ValidCategoryItem {
    return c.category_id !== null
}

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
    onCreateGroupInCategory?: (categoryId: string) => void
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
    onCreateGroupInCategory,
}) => {
    // ── DnD 状态 ──────────────────────────────────────────────────────────────
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 6 }, // 6px 才触发拖拽，避免误触点击
    }))
    const [activeDragId, setActiveDragId] = useState<string | null>(null)
    type DragData =
        | { type: 'category'; categoryId: string }
        | { type: 'group'; groupNo: string }

    function isDragData(d: unknown): d is DragData {
        if (!d || typeof d !== 'object') return false
        const obj = d as Record<string, unknown>
        if (obj.type === 'category') return typeof obj.categoryId === 'string'
        if (obj.type === 'group') return typeof obj.groupNo === 'string'
        return false
    }

    const [activeDragData, setActiveDragData] = useState<DragData | null>(null)

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(String(event.active.id))
        const d = event.active.data.current
        setActiveDragData(isDragData(d) ? d : null)
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
            const d = active.data.current
            if (!isDragData(d) || d.type !== 'group') return
            const groupNo = d.groupNo

            // over.id 可能是 useSortable 的 cat:: 或 useDroppable 的 drop::cat::
            if (overId.startsWith('drop::cat::')) {
                const targetCategoryId = overId.replace('drop::cat::', '')
                if (targetCategoryId) onMoveGroupToCategory(groupNo, targetCategoryId)
            } else if (overId.startsWith('cat::')) {
                // useSortable 的 id，同样是分组目标
                const targetCategoryId = overId.replace('cat::', '')
                if (targetCategoryId) onMoveGroupToCategory(groupNo, targetCategoryId)
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

    // 构建右键菜单：移出分组（有分组时，一级直接点击）+ 移到分组（一级，展开二级子菜单）
    const buildExtraContextMenus = (conv: ConversationWrap | undefined): ContextMenusData[] => {
        if (!conv || conv.channel.channelType !== ChannelTypeGroup) return []
        if (categories.length === 0) return []

        const groupNo = conv.channel.channelID
        const currentCategoryId = categories.find(
            cat => (cat.groups || []).some(g => g.group_no === groupNo)
        )?.category_id

        // 「移到分组」二级子菜单（排除当前分组）
        const moveToChildren: ContextMenusData[] = categories
            .filter(c => c.category_id !== currentCategoryId)
            .map(cat => ({
                title: cat.name,
                checked: false,
                onClick: () => onMoveGroupToCategory(groupNo, cat.category_id),
            }))
        moveToChildren.push({ separator: true } as ContextMenusData)
        moveToChildren.push({ title: '+ 新建分组', onClick: onOpenCreateCategory })

        const moveToItem: ContextMenusData = {
            title: '移到分组',
            icon: "M2 9V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4 M12 3v5h5 M9 15l3 3 3-3 M12 12v6",
            children: moveToChildren,
        }

        if (currentCategoryId) {
            const catName = categories.find(c => c.category_id === currentCategoryId)?.name ?? '当前分组'
            const moveOutItem: ContextMenusData = {
                title: '移出分组',
                icon: "M2 9V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4 M12 3v5h5 M9 18l3-3 3 3 M12 21v-6",
                onClick: () => {
                    const defaultCategory = categories.find(c => c.is_default)
                    if (!defaultCategory) {
                        console.warn('[ConversationListGrouped] 找不到默认分组，无法移出分组')
                        return
                    }
                    Modal.confirm({
                        title: '移出分组',
                        content: `确定将此群聊从「${catName}」移出到未分组吗？`,
                        okText: '移出',
                        cancelText: '取消',
                        onOk: () => onMoveGroupToCategory(groupNo, defaultCategory.category_id),
                    })
                },
            }
            return [moveToItem, moveOutItem]
        }

        return [moveToItem]
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

    // 所有非默认分组里已归组的群 group_no 集合（用于默认分组的兜底逻辑）
    const assignedGroupNos = new Set<string>()
    for (const cat of categories) {
        if (!cat.is_default) {
            for (const g of cat.groups || []) {
                assignedGroupNos.add(g.group_no)
            }
        }
    }

    const categoriesForView = categories.map(cat => {
        let catConvs: ConversationWrap[]

        if (cat.is_default) {
            // 默认分组：显示所有不在非默认分组里的群聊（含新建后尚未 reload categories 的情况）
            catConvs = groupConversations.filter(c => !assignedGroupNos.has(c.channel.channelID))
            catConvs = catConvs.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
            // 加上每个群的子区
            const withThreads: ConversationWrap[] = []
            for (const conv of catConvs) {
                withThreads.push(conv)
                const threads = [...(threadConvsByParent.get(conv.channel.channelID) || [])]
                    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
                withThreads.push(...threads)
            }
            catConvs = withThreads
        } else {
            // 非默认分组：按 cat.groups 顺序，按最新消息排序
            const sortedGroups = [...(cat.groups || [])].sort((a, b) => {
                const convA = groupConvMap.get(a.group_no)
                const convB = groupConvMap.get(b.group_no)
                const tA = convA?.timestamp ?? 0
                const tB = convB?.timestamp ?? 0
                return tB - tA
            })
            catConvs = []
            for (const g of sortedGroups) {
                const groupConv = groupConvMap.get(g.group_no)
                if (groupConv) {
                    catConvs.push(groupConv)
                    const threads = threadConvsByParent.get(g.group_no) || []
                    catConvs.push(...threads)
                }
            }
        }

        // groupCount：默认分组用实际 conv 数，非默认分组用 cat.groups 数
        const groupCount = cat.is_default
            ? groupConversations.filter(c => !assignedGroupNos.has(c.channel.channelID)).length
            : (cat.groups || []).length
        const unreadCount = catConvs.reduce((sum, c) => sum + (c.unread || 0), 0)
        return {
            id: cat.category_id,
            name: cat.is_default ? '默认分组' : cat.name,
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

        const upDownMenus: ContextMenusData[] = [
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
        ]

        // 默认分组：仅允许拖拽排序，屏蔽「重命名」和「删除分组」
        if (cat.is_default) {
            return upDownMenus
        }

        return [
            {
                title: "新建群聊",
                icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
                onClick: () => {
                    onCreateGroupInCategory?.(categoryId)
                },
            },
            { separator: true } as ContextMenusData,
            {
                title: "重命名",
                icon: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z m-2-2 4 4",
                onClick: () => {
                    setRenamingCategoryId(categoryId)
                    setActiveCategoryId(null)
                },
            },
            ...upDownMenus,
            { separator: true } as ContextMenusData,
            {
                title: "删除分组",
                icon: "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",
                danger: true,
                onClick: () => {
                    Modal.confirm({
                        title: '删除分组',
                        content: `确定删除「${cat.name}」吗？分组内群聊将移至未分组。`,
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
                    onCreateCategory={onOpenCreateCategory}
                    hasNoGroups={categories.length === 0}
                    onStartGroup={onStartGroup}
                    activeCategoryId={activeCategoryId}
                    renamingCategoryId={renamingCategoryId}
                    categorySectionDraggable
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
