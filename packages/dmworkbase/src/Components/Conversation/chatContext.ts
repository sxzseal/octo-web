const ChannelTypeGroup = 2
const ChannelTypePerson = 1

export interface ChatContextMember {
    uid: string
    name?: string
    remark?: string
    isDeleted?: number
}

export interface ChatContextMessage {
    fromUID: string
    from?: { title?: string }
    content?: { text?: string }
}

export interface ChatContextChannelInfo {
    title?: string
    orgData?: { remark?: string }
}

export interface ChatContextResult {
    memberContext?: string   // "聊天成员：Alice,Bob"
    chatContext?: string     // "[Alice]: hi\n[Bob]: hello"
}

export function buildChatContext(params: {
    messages: ChatContextMessage[]
    subscribers: ChatContextMember[]
    channelType: number
    loginUID: string
    channelInfo?: ChatContextChannelInfo | null
}): ChatContextResult {
    const { messages, subscribers, channelType, loginUID, channelInfo } = params
    const names: string[] = []

    if (channelType === ChannelTypeGroup) {
        if (subscribers.length <= 100) {
            for (const sub of subscribers) {
                if (sub.uid === loginUID) continue
                if (sub.isDeleted) continue
                if (sub.name?.trim()) names.push(sub.name)
                if (sub.remark?.trim() && sub.remark !== sub.name) {
                    names.push(sub.remark)
                }
            }
        } else {
            const activeUIDs = new Set<string>()
            for (let i = messages.length - 1; i >= 0 && activeUIDs.size < 100; i--) {
                const uid = messages[i].fromUID
                if (uid && uid !== loginUID) {
                    activeUIDs.add(uid)
                }
            }
            for (const sub of subscribers) {
                if (activeUIDs.has(sub.uid) && !sub.isDeleted) {
                    if (sub.name?.trim()) names.push(sub.name)
                    if (sub.remark?.trim() && sub.remark !== sub.name) {
                        names.push(sub.remark)
                    }
                }
            }
        }
    } else if (channelType === ChannelTypePerson) {
        if (channelInfo?.title?.trim()) names.push(channelInfo.title)
        if (channelInfo?.orgData?.remark?.trim()
            && channelInfo.orgData.remark !== channelInfo.title) {
            names.push(channelInfo.orgData.remark)
        }
    }

    const uniqueNames = [...new Set(names)]

    const result: ChatContextResult = {}

    if (uniqueNames.length > 0) {
        result.memberContext = `聊天成员：${uniqueNames.join(",")}`
    }

    if (messages && messages.length > 0) {
        const last10 = messages.slice(-10)
        const lines = last10.map(m => {
            const senderName = m.from?.title || m.fromUID
            const text = m.content?.text || ''
            return `[${senderName}]: ${text}`
        })
        result.chatContext = lines.join('\n')
    }

    return result
}
