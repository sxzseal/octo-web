import React, { useState, useRef, useEffect } from "react"
import { Modal, Input, Button } from "@douyinfe/semi-ui"
import "./index.css"

export interface CreateCategoryModalProps {
    visible: boolean
    onConfirm: (name: string) => Promise<void> | void
    onCancel: () => void
    existingNames?: string[]
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
    visible,
    onConfirm,
    onCancel,
    existingNames = [],
}) => {
    const [value, setValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (visible) {
            setValue("")
            setError(null)
            setLoading(false)
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [visible])

    const isDuplicate = existingNames.includes(value.trim())
    const isEmpty = value.trim() === ""
    const isDisabled = isEmpty || isDuplicate || loading

    const handleConfirm = async () => {
        if (isDisabled) return
        if (isDuplicate) {
            setError("该分组名已存在")
            return
        }
        setLoading(true)
        setError(null)
        try {
            await onConfirm(value.trim())
            setValue("")
        } catch {
            setError("创建失败，请重试")
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm()
        if (e.key === "Escape") onCancel()
    }

    return (
        <Modal
            title="新建分组"
            visible={visible}
            onCancel={onCancel}
            zIndex={9999}
            footer={
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button type="tertiary" onClick={onCancel}>取消</Button>
                    <Button
                        type="primary"
                        disabled={isDisabled}
                        loading={loading}
                        onClick={handleConfirm}
                        style={{ opacity: isDisabled && !loading ? 0.5 : 1 }}
                    >
                        确认
                    </Button>
                </div>
            }
        >
            <div className="wk-create-category-modal__input-wrap">
                <Input
                    ref={inputRef as any}
                    value={value}
                    onChange={(v) => {
                        setValue(v)
                        if (error) setError(null)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="输入分组名称"
                    validateStatus={isDuplicate || error ? "error" : undefined}
                />
                {(isDuplicate || error) ? (
                    <div className="wk-create-category-modal__error">
                        {isDuplicate ? "该分组名已存在" : error}
                    </div>
                ) : (
                    <div className="wk-create-category-modal__help">
                        例如：工作、学习、兴趣、项目名
                    </div>
                )}
            </div>
        </Modal>
    )
}

export default CreateCategoryModal
