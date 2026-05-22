import { useState, useEffect, useCallback } from "react"
import WKApp from "../App"
import CategoryService, { CategoryItem } from "../Service/CategoryService"

export interface UseCategoryListResult {
    categories: CategoryItem[]
    isLoading: boolean
    error: string | null
    reload: () => void
    createCategory: (name: string) => Promise<CategoryItem>
    renameCategory: (categoryId: string, name: string) => Promise<void>
    deleteCategory: (categoryId: string) => Promise<void>
    sortCategories: (categoryIds: string[]) => Promise<void>
    moveGroupToCategory: (groupNo: string, categoryId: string) => Promise<void>
}

export function useCategoryList(): UseCategoryListResult {
    const [categories, setCategories] = useState<CategoryItem[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const spaceId = WKApp.shared.currentSpaceId

    const load = useCallback(async () => {
        if (!spaceId) return
        setIsLoading(true)
        setError(null)
        try {
            const result = await CategoryService.list(spaceId)
            // 后端 PR #1007 起，默认分组有真实 UUID，不再返回 category_id 为 null 的项。
            // 保留所有项，类型守卫在 ConversationListGrouped 的 ValidCategoryItem 处处理。
            setCategories(result)
        } catch (e: any) {
            setError(e?.message || "加载分组失败")
        } finally {
            setIsLoading(false)
        }
    }, [spaceId])

    useEffect(() => {
        load()
    }, [load])

    const createCategory = async (name: string) => {
        if (!spaceId) throw new Error("未选中 Space")
        const created = await CategoryService.create(spaceId, { name })
        await load()
        return created
    }

    const renameCategory = async (categoryId: string, name: string) => {
        if (!spaceId) throw new Error("未选中 Space")
        await CategoryService.update(spaceId, categoryId, { name })
        setCategories(prev =>
            prev.map(c => c.category_id === categoryId ? { ...c, name } : c)
        )
    }

    const deleteCategory = async (categoryId: string) => {
        if (!spaceId) throw new Error("未选中 Space")
        await CategoryService.delete(spaceId, categoryId)
        setCategories(prev => prev.filter(c => c.category_id !== categoryId))
    }

    const sortCategories = async (categoryIds: string[]) => {
        if (!spaceId) throw new Error("未选中 Space")
        await CategoryService.sort(spaceId, { category_ids: categoryIds })
        // 按新顺序重排本地数据
        setCategories(prev => {
            const map = new Map(prev.map(c => [c.category_id, c]))
            return categoryIds.map(id => map.get(id)).filter(Boolean) as CategoryItem[]
        })
    }

    const moveGroupToCategory = async (groupNo: string, categoryId: string) => {
        await CategoryService.moveGroupToCategory(groupNo, { category_id: categoryId })
        await load()
    }

    return {
        categories,
        isLoading,
        error,
        reload: load,
        createCategory,
        renameCategory,
        deleteCategory,
        sortCategories,
        moveGroupToCategory,
    }
}
