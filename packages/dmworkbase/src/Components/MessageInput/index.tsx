import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapMention from '@tiptap/extension-mention'
import { createMentionSuggestion } from './mentionSuggestion'
import ConversationContext from "../Conversation/context";
import clazz from 'classnames';
import WKSDK, { Channel, ChannelTypePerson, Subscriber } from "wukongimjssdk";
import hotkeys from 'hotkeys-js';
import WKApp from "../../App";
import "./index.css"
import { Notification } from '@douyinfe/semi-ui';
import SlashCommandMenu, { BotCommand } from "../SlashCommandMenu";
import VoiceInputIndicator from "./VoiceInputIndicator";
import { ChatContextResult } from "../Conversation/chatContext";
import { Maximize2, Minimize2 } from 'lucide-react';
import IconClick from '../IconClick';
import mentionAllIcon from './mention.png';

const MAX_MESSAGE_LENGTH = 5000;

// Strip zero-width and invisible Unicode characters
const INVISIBLE_CHARS_RE = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u034F\u061C\u180E]/g;
function stripInvisibleChars(text: string): string {
    return text.replace(INVISIBLE_CHARS_RE, '');
}

export type OnInsertFnc = (text: string) => void
export type OnAddMentionFnc = (uid: string, name: string) => void

interface MessageInputProps {
    context: ConversationContext
    onSend?: (text: string, mention?: MentionModel) => void
    members?: Array<Subscriber>
    onInputRef?: any
    onInsertText?: (fnc: OnInsertFnc) => void
    onAddMention?: (fnc: OnAddMentionFnc) => void
    hideMention?: boolean
    toolbar?: JSX.Element
    onContext?: (ctx: MessageInputContext) => void
    topView?: JSX.Element
    botCommands?: BotCommand[]
    getChatContext?: () => ChatContextResult
    hasPendingAttachments?: boolean
    onExpandChange?: (expanded: boolean) => void
}

export interface MentionEntity {
    uid: string;
    offset: number;
    length: number;
}

export class MentionModel {
    all: boolean = false
    uids?: Array<string>
    entities?: MentionEntity[]
}

export function formatMentionTextV2(text: string): {
    content: string;
    mention: MentionModel | undefined;
} {
    const entities: MentionEntity[] = [];
    const uids: string[] = [];
    let result = '';
    let cursor = 0;
    let all = false;

    const placeholderPattern = /@\[([^:\]]+):([^\]]+)\]/g;
    let match;

    while ((match = placeholderPattern.exec(text)) !== null) {
        const uid = match[1];
        const name = match[2];

        result += text.substring(cursor, match.index);

        if (uid === '-1') {
            all = true;
            const atName = `@${name}`;
            result += atName;
        } else {
            const atName = `@${name}`;
            const offset = result.length;
            result += atName;

            entities.push({ uid, offset, length: atName.length });
            uids.push(uid);
        }

        cursor = match.index + match[0].length;
    }

    result += text.substring(cursor);

    if (all) {
        const mention = new MentionModel();
        mention.all = true;
        return { content: result, mention };
    }

    if (entities.length === 0) {
        return { content: result, mention: undefined };
    }

    const mention = new MentionModel();
    mention.uids = uids;
    mention.entities = entities;
    return { content: result, mention };
}

export interface MessageInputContext {
    insertText(text: string): void
    addMention(uid: string, name: string): void
    text(): string | undefined
}

// 从 Tiptap JSON 提取 mentions
function extractMentionsFromEditor(editor: any): string {
    const json = editor.getJSON()
    let result = ''

    function traverse(node: any) {
        if (node.type === 'text') {
            result += node.text
        } else if (node.type === 'mention') {
            const uid = node.attrs.id
            const label = node.attrs.label
            result += `@[${uid}:${label}]`
        } else if (node.type === 'hardBreak') {
            result += '\n'
        } else if (node.content) {
            node.content.forEach(traverse)
        }
    }

    if (json.content) {
        json.content.forEach((block: any, i: number) => {
            if (i > 0) result += '\n'
            traverse(block)
        })
    }

    return stripInvisibleChars(result)
}

const MessageInput: React.FC<MessageInputProps> = (props) => {
    const [slashMenuVisible, setSlashMenuVisible] = useState(false)
    const [slashFilter, setSlashFilter] = useState('')
    const [slashActiveIndex, setSlashActiveIndex] = useState(0)
    const [expanded, setExpanded] = useState(false)
    const previousScopeRef = useRef('all')
    const membersRef = useRef(props.members)
    const sendRef = useRef<(() => void) | null>(null)
    const mentionActiveRef = useRef(false)
    const botCommandsRef = useRef(props.botCommands)
    // editorHandleKeyDownRef 持有最新的键盘处理函数，通过 useEffect 更新
    const editorHandleKeyDownRef = useRef<((view: any, event: KeyboardEvent) => boolean) | null>(null)

    // 更新 membersRef
    useEffect(() => {
        membersRef.current = props.members
    }, [props.members])

    // 更新 botCommandsRef
    useEffect(() => {
        botCommandsRef.current = props.botCommands
    }, [props.botCommands])

    // 创建编辑器
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // 只保留基础功能，禁用富文本格式
                bold: false,
                italic: false,
                code: false,
                heading: false,
                blockquote: false,
                horizontalRule: false,
                codeBlock: false,
                strike: false,
            }),
            TiptapMention.configure({
                HTMLAttributes: {
                    class: 'mention',
                },
                suggestion: createMentionSuggestion(
                    ({ query }) => {
                        if (!membersRef.current) return [{
                            uid: '-1',
                            name: '所有人',
                            icon: mentionAllIcon,
                            isBot: false,
                        }]

                        const items = membersRef.current.map(member => ({
                            uid: member.uid,
                            name: member.name,
                            icon: WKApp.shared.avatarChannel(new Channel(member.uid, ChannelTypePerson)),
                            isBot: WKSDK.shared().channelManager.getChannelInfo(
                                new Channel(member.uid, ChannelTypePerson)
                            )?.orgData?.robot === 1,
                        }))

                        items.unshift({
                            uid: '-1',
                            name: '所有人',
                            icon: mentionAllIcon,
                            isBot: false,
                        })

                        return items.filter(item =>
                            item.name.toLowerCase().includes(query.toLowerCase())
                        )
                    },
                    (active) => { mentionActiveRef.current = active },
                ),
                renderLabel({ options, node }) {
                    return `@${node.attrs.label}`
                },
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                'data-placeholder': '按 Shift + Enter 换行,按 Enter 发送',
            },
            // ProseMirror 级别的键盘处理，在所有 keymap 之前执行
            handleKeyDown: (_view, event) => {
                return editorHandleKeyDownRef.current?.(_view, event) ?? false
            },
        },
        onUpdate: ({ editor }) => {
            const text = stripInvisibleChars(editor.getText())

            // 检查 slash 命令
            if (botCommandsRef.current && text.startsWith('/') && !text.includes(' ') && !text.includes('\n')) {
                const filter = text.slice(1)
                setSlashMenuVisible(true)
                setSlashFilter(filter)
                setSlashActiveIndex(0)
            } else {
                setSlashMenuVisible(false)
                setSlashFilter('')
                setSlashActiveIndex(0)
            }
        },
    })

    // 设置hotkeys scope
    useEffect(() => {
        const scope = "messageInput"
        previousScopeRef.current = hotkeys.getScope()
        hotkeys.filter = function (event) {
            return true;
        }
        hotkeys.setScope(scope);

        return () => {
            hotkeys.setScope(previousScopeRef.current);
        }
    }, [])

    // 导出 context 方法
    useEffect(() => {
        if (props.onInsertText) {
            props.onInsertText(insertText)
        }
        if (props.onContext) {
            props.onContext({
                insertText,
                addMention,
                text: () => editor ? extractMentionsFromEditor(editor) : undefined,
            })
        }
    }, [editor, props.onInsertText, props.onContext])

    // 导出 addMention 方法
    useEffect(() => {
        if (props.onAddMention) {
            props.onAddMention(addMention)
        }
    }, [editor, props.onAddMention])

    const insertText = useCallback((text: string) => {
        if (editor) {
            editor.commands.insertContent(text)
            editor.commands.focus()
        }
    }, [editor])

    const addMention = useCallback((uid: string, name: string) => {
        if (editor && name) {
            editor.commands.insertContent({
                type: 'mention',
                attrs: { id: uid, label: name },
            })
            editor.commands.insertContent(' ')
        }
    }, [editor])

    const send = useCallback(() => {
        if (!editor) return

        const text = editor.getText()
        if (text.length > MAX_MESSAGE_LENGTH) {
            Notification.error({
                content: `输入内容长度不能大于${MAX_MESSAGE_LENGTH}字符！`,
            })
            return
        }

        const hasText = text.trim() !== ""
        if (props.onSend && (hasText || props.hasPendingAttachments)) {
            // 从编辑器提取带格式的文本（包含 @[uid:name] 格式的 mention）
            const formattedText = extractMentionsFromEditor(editor)
            const { content, mention } = formatMentionTextV2(formattedText);
            props.onSend(content, mention);
        }

        editor.commands.clearContent()

        if (expanded) {
            setExpanded(false)
            props.onExpandChange?.(false)
        }
    }, [editor, expanded, props.onSend, props.hasPendingAttachments, props.onExpandChange])

    // 更新 sendRef
    useEffect(() => {
        sendRef.current = send
    }, [send])

    const getFilteredSlashCommands = useCallback((): BotCommand[] => {
        const { botCommands } = props
        if (!botCommands) return []
        if (!slashFilter) return botCommands
        const lower = slashFilter.toLowerCase()
        return botCommands.filter(
            (cmd) =>
                cmd.command.toLowerCase().includes(lower) ||
                cmd.description.toLowerCase().includes(lower)
        )
    }, [props.botCommands, slashFilter])

    const handleSlashSelect = useCallback((cmd: BotCommand) => {
        if (!editor) return

        editor.commands.setContent(`${cmd.command.startsWith('/') ? cmd.command : `/${cmd.command}`} `)
        setSlashMenuVisible(false)
        setSlashFilter('')
        setSlashActiveIndex(0)
        editor.commands.focus()
    }, [editor])

    const handleMenuButtonClick = useCallback(() => {
        setSlashMenuVisible(prev => !prev)
        setSlashFilter('')
        setSlashActiveIndex(0)
    }, [])

    // 每次状态变更时更新键盘处理函数（通过 ref 保持最新，避免 useEditor 闭包过期）
    useEffect(() => {
        editorHandleKeyDownRef.current = (_view: any, event: KeyboardEvent) => {
            if (slashMenuVisible) {
                const filtered = getFilteredSlashCommands()
                if (event.key === 'Escape') {
                    setSlashMenuVisible(false)
                    return true
                }
                if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setSlashActiveIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
                    return true
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setSlashActiveIndex((prev) => (prev - 1 + Math.max(1, filtered.length)) % Math.max(1, filtered.length))
                    return true
                }
                if (event.key === 'Enter' && !event.shiftKey) {
                    if (filtered.length > 0) {
                        handleSlashSelect(filtered[slashActiveIndex])
                    } else {
                        setSlashMenuVisible(false)
                        sendRef.current?.()
                    }
                    return true
                }
                return false
            }

            if (event.key === 'Enter' && !event.shiftKey) {
                if (mentionActiveRef.current) return false
                sendRef.current?.()
                return true
            }

            return false
        }
    }, [slashMenuVisible, slashActiveIndex, getFilteredSlashCommands, handleSlashSelect])

    const toggleExpand = useCallback(() => {
        const next = !expanded
        props.onExpandChange?.(next)
        setExpanded(next)
        if (next && editor) {
            setTimeout(() => editor.commands.focus(), 100)
        }
    }, [expanded, editor, props.onExpandChange])

    const { onInputRef, topView, toolbar, botCommands, hasPendingAttachments } = props
    const hasValue = (editor?.getText().length || 0) > 0 || hasPendingAttachments

    // 设置 inputRef
    useEffect(() => {
        if (onInputRef && editor) {
            onInputRef(editor.view.dom)
        }
    }, [editor, onInputRef])

    return (
        <div className={clazz('wk-messageinput-box', { 'wk-messageinput-box--expanded': expanded })} style={expanded ? { flex: 1 } : undefined}>
            {topView && <div className="wk-messageinput-box-top">{topView}</div>}

            <div className="wk-messageinput-bar">
                <div className="wk-messageinput-toolbar">
                    <div className="wk-messageinput-actionbox">
                        {toolbar}
                        <VoiceInputIndicator
                            onTranscribed={(text: string, shouldReplace: boolean) => {
                                if (!editor) return

                                if (shouldReplace) {
                                    editor.commands.setContent(text)
                                } else {
                                    editor.commands.insertContent(text)
                                }
                                editor.commands.focus()
                            }}
                            getCurrentText={() => editor?.getText() || ''}
                            getChatContext={props.getChatContext}
                        />

                        {/* 展开/收起按钮 */}
                        <div className="wk-messageinput-actionitem">
                            <IconClick
                                size="sm"
                                title={expanded ? "收起" : "展开输入框"}
                                onClick={toggleExpand}
                                icon={expanded
                                    ? <Minimize2 size={15} />
                                    : <Maximize2 size={15} />
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="wk-messageinput-inputbox"
                style={{
                    position: 'relative',
                    ...(expanded ? {
                        flex: 1,
                        minHeight: 0
                    } : {})
                }}
            >
                {botCommands && botCommands.length > 0 && (
                    <SlashCommandMenu
                        commands={botCommands}
                        filter={slashFilter}
                        visible={slashMenuVisible}
                        activeIndex={slashActiveIndex}
                        onSelect={handleSlashSelect}
                    />
                )}
                {botCommands && botCommands.length > 0 && (
                    <div
                        className="wk-messageinput-menu-btn"
                        onClick={handleMenuButtonClick}
                        title="斜杠命令"
                    >
                        /
                    </div>
                )}
                <div
                    className="wk-messageinput-editor"
                >
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    )
}

export default MessageInput
