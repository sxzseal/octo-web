import React, { useState } from "react"
import { Modal, Button } from "@douyinfe/semi-ui"

export interface DeleteCategoryModalProps {
    visible: boolean
    categoryName: string
    groupCount: number
    onConfirm: () => Promise<void> | void
    onCancel: () => void
}

const DeleteCategoryModal: React.FC<DeleteCategoryModalProps> = ({
    visible,
    categoryName,
    groupCount,
    onConfirm,
    onCancel,
}) => {
    const [loading, setLoading] = useState(false)

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onConfirm()
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            title={`删除分组「${categoryName}」？`}
            visible={visible}
            onCancel={onCancel}
            zIndex={9999}
            footer={
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <Button onClick={onCancel}>取消</Button>
                    <Button
                        type="danger"
                        loading={loading}
                        onClick={handleConfirm}
                    >
                        确认删除
                    </Button>
                </div>
            }
        >
            <p style={{ margin: 0, color: "var(--wk-text-secondary)", fontSize: "var(--wk-text-size-base)", lineHeight: 1.6 }}>
                删除后，该分组下的 <strong>{groupCount}</strong> 个群聊将移到「未分组」中。群聊本身不会被删除。
            </p>
        </Modal>
    )
}

export default DeleteCategoryModal
