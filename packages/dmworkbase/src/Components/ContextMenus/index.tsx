import classNames from "classnames";
import React, { HTMLProps } from "react";
import { Component, ReactNode } from "react";

import "./index.css"

export interface ContextMenusProps {
    onContext: (context: ContextMenusContext) => void
    menus?: ContextMenusData[]
}

export interface ContextMenusState {
    contextOrigin: number
    showContextMenus: boolean
}

export interface ContextMenusContext {
    show(event: React.MouseEvent<Element, MouseEvent>): void
    hide(): void
    isShow(): boolean
}

export class ContextMenusData {
    title!: string
    onClick?: () => void
    /** SVG path 字符串，例如 'M3 6h18...' */
    icon?: string
    /** 危险操作（红色） */
    danger?: boolean
    /** 分隔线（此项时其他字段无效） */
    separator?: boolean
    /** 子菜单项 */
    children?: ContextMenusData[]
    /** 选中态（子菜单项右侧显示主题色 ✓） */
    checked?: boolean
}

// ── 内部：渲染单个图标 ──
function CtxIcon({ path }: { path: string }) {
    return (
        <svg className="ctx-icon" viewBox="0 0 24 24">
            <path d={path} />
        </svg>
    )
}

// ── 内部：箭头图标 ──
function ArrowIcon() {
    return (
        <svg className="wk-ctx-arrow" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    )
}

export default class ContextMenus extends Component<ContextMenusProps, ContextMenusState> implements ContextMenusContext {
    private static _instances: Set<ContextMenus> = new Set()

    static hideAll() {
        ContextMenus._instances.forEach((instance) => {
            if (instance.isShow()) {
                instance.hide()
            }
        })
    }

    _gHandleClick!: () => void
    constructor(props: any) {
        super(props)
        this.state = {
            contextOrigin: 0,
            showContextMenus: false,
        }
        this._gHandleClick = this._handleClick.bind(this)
    }

    isShow(): boolean {
        return this.state.showContextMenus
    }

    _handleClick() {
        this.hide()
    }

    hide(): void {
        this.setState({ showContextMenus: false })
    }

    show(event: React.MouseEvent<Element, MouseEvent>): void {
        event.preventDefault();
        if (!this.contextMenusRef) return

        ContextMenus._instances.forEach((instance) => {
            if (instance !== this && instance.isShow()) instance.hide()
        })

        const clickX = event.clientX;
        const clickY = event.clientY;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const rootW = this.contextMenusRef.offsetWidth || 200;
        const rootH = this.contextMenusRef.offsetHeight || 0;

        const showLeft = (screenW - clickX) <= rootW
        const showBottom = (screenH - clickY) <= rootH

        this.contextMenusRef.style.left = showLeft
            ? `${clickX - rootW}px`
            : `${clickX + 5}px`

        if (showBottom) {
            this.contextMenusRef.style.top = `${clickY - rootH}px`
            this.setState({ contextOrigin: rootH, showContextMenus: true })
        } else {
            this.contextMenusRef.style.top = `${clickY}px`
            this.setState({ contextOrigin: 0, showContextMenus: true })
        }
    }

    contextMenusRef!: HTMLDivElement | null

    componentDidMount() {
        ContextMenus._instances.add(this)
        if (this.props.onContext) this.props.onContext(this)
    }

    componentWillUnmount() {
        ContextMenus._instances.delete(this)
    }

    _renderItem(m: ContextMenusData, i: number): ReactNode {
        if (m.separator) {
            return <div key={i} className="wk-ctx-sep" />
        }

        const hasChildren = m.children && m.children.length > 0

        return (
            <li
                key={i}
                className={classNames(m.danger && "wk-ctx-danger")}
                onClick={(e) => {
                    if (hasChildren) {
                        e.stopPropagation()
                        return
                    }
                    this.hide()
                    if (m.onClick) m.onClick()
                }}
            >
                {m.icon && <CtxIcon path={m.icon} />}
                <span style={{ flex: 1 }}>{m.title}</span>
                {hasChildren && (
                    <>
                        <ArrowIcon />
                        <ul className="wk-ctx-submenu">
                            {m.children!.map((child, ci) => {
                                if (child.separator) {
                                    return <div key={ci} className="wk-ctx-sep" />
                                }
                                return (
                                    <li
                                        key={ci}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            this.hide()
                                            if (child.onClick) child.onClick()
                                        }}
                                    >
                                        {child.icon && <CtxIcon path={child.icon} />}
                                        <span style={{ flex: 1 }}>{child.title}</span>
                                        {child.checked && (
                                            <span style={{
                                                color: 'var(--wk-brand-primary, #1C1C23)',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                flexShrink: 0,
                                                marginLeft: 4,
                                            }}>✓</span>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                )}
            </li>
        )
    }

    render(): ReactNode {
        const { showContextMenus, contextOrigin } = this.state
        const { menus } = this.props
        return (
            <>
                <div
                    className={classNames("wk-contextmenus", showContextMenus && "wk-contextmenus-open")}
                    ref={ref => { this.contextMenusRef = ref }}
                    style={{ transformOrigin: `-3px ${contextOrigin}px` }}
                >
                    <ul>
                        {menus && menus.map((m, i) => this._renderItem(m, i))}
                    </ul>
                </div>
                <div
                    className="wk-contextmenus-mask"
                    style={{ visibility: showContextMenus ? "visible" : "hidden" }}
                    onClick={() => ContextMenus.hideAll()}
                />
            </>
        )
    }
}
