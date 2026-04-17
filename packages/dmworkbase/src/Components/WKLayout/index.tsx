import classNames from "classnames";
import React from "react";
import { Component } from "react";
import WKViewQueue, { WKViewQueueContext } from "../WKViewQueue";
import { throttle } from "../../Utils/rateLimit";
import "./index.css"

const smallScreenWidth = 640 // 小屏最大宽度（index.css @media screen 里也需要改成这个值的大小）

const SPLITTER_MIN_WIDTH = 200
const SPLITTER_MAX_WIDTH = 480
const SPLITTER_DEFAULT_WIDTH = 300
const SPLITTER_STORAGE_KEY = 'wk-layout-left-width'
const MIN_RIGHT_WIDTH = 360  // minimum right panel width to keep chat usable

export enum ScreenSize {
    normal,
    small
}

export interface WKLayoutProps {
    onRenderTab?: (size: ScreenSize) => JSX.Element
    contentLeft?: JSX.Element
    contentRight?:JSX.Element
    onLeftContext?:(context:WKViewQueueContext)=>void
    onRightContext?:(context:WKViewQueueContext)=>void

}

interface WKLayoutState {
    leftWidth: number
    isDragging: boolean
}

export class WKLayout extends Component<WKLayoutProps, WKLayoutState>{
    gResize!: (this: Window, ev: UIEvent) => any
    rightContext!: WKViewQueueContext
    routeLister!:VoidFunction
    private layoutRef = React.createRef<HTMLDivElement>()
    private dragStartX = 0        // mouse X when drag started
    private dragStartWidth = 0    // left panel width when drag started
    private lastWidth = SPLITTER_DEFAULT_WIDTH  // sync copy for localStorage persist

    constructor(props: any) {
        super(props)
        this.gResize = this.resize

        // Restore saved width from localStorage
        let savedWidth = SPLITTER_DEFAULT_WIDTH
        try {
            const stored = localStorage.getItem(SPLITTER_STORAGE_KEY)
            if (stored) {
                const parsed = parseInt(stored, 10)
                if (!isNaN(parsed) && parsed >= SPLITTER_MIN_WIDTH && parsed <= SPLITTER_MAX_WIDTH) {
                    savedWidth = parsed
                }
            }
        } catch (_) {}

        this.lastWidth = savedWidth
        this.state = {
            leftWidth: savedWidth,
            isDragging: false,
        }
    }

    componentDidMount() {
        window.addEventListener("resize", this.gResize)

        this.routeLister = ()=>{
            this.setState({})
        }
        this.rightContext.addRouteListener(this.routeLister)
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.gResize)
        this.rightContext.removeRouteListener(this.routeLister)
        // Clean up drag listeners in case unmount during drag
        document.removeEventListener('mousemove', this.onDragMove)
        document.removeEventListener('mouseup', this.onDragEnd)
    }

    resize = throttle(() => {
        this.setState({})
    }, 100)

    private onDragStart = (e: React.MouseEvent) => {
        e.preventDefault()
        this.dragStartX = e.clientX
        this.dragStartWidth = this.lastWidth
        this.setState({ isDragging: true })
        document.addEventListener('mousemove', this.onDragMove)
        document.addEventListener('mouseup', this.onDragEnd)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    /** Calculate the effective max left width based on current container size */
    private getMaxLeftWidth(): number {
        if (!this.layoutRef.current) return SPLITTER_MAX_WIDTH
        const contentEl = this.layoutRef.current.querySelector('.wk-layout-content') as HTMLElement
        if (!contentEl) return SPLITTER_MAX_WIDTH
        const available = contentEl.clientWidth
        // Reserve MIN_RIGHT_WIDTH for the right panel
        const dynamicMax = available - MIN_RIGHT_WIDTH
        return Math.min(SPLITTER_MAX_WIDTH, Math.max(SPLITTER_MIN_WIDTH, dynamicMax))
    }

    private onDragMove = (e: MouseEvent) => {
        // Use delta from drag start point — no need to know tab width or layout offset
        const delta = e.clientX - this.dragStartX
        const maxWidth = this.getMaxLeftWidth()
        let newWidth = this.dragStartWidth + delta
        newWidth = Math.max(SPLITTER_MIN_WIDTH, Math.min(maxWidth, newWidth))
        this.lastWidth = newWidth
        this.setState({ leftWidth: newWidth })
    }

    private onDragEnd = () => {
        this.setState({ isDragging: false })
        document.removeEventListener('mousemove', this.onDragMove)
        document.removeEventListener('mouseup', this.onDragEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        // Persist width — use this.lastWidth (sync) instead of this.state (async)
        try {
            localStorage.setItem(SPLITTER_STORAGE_KEY, String(this.lastWidth))
        } catch (_) {}
    }

    render() {
        const { onRenderTab, contentLeft,contentRight,onLeftContext,onRightContext } = this.props
        const isExtension = (window as any).__POWERED_EXTENSION__
        const isSmallScreen = window.innerWidth <= smallScreenWidth
        const { leftWidth, isDragging } = this.state

        const tabElement = <div className="wk-layout-tab">
            {
                onRenderTab && onRenderTab(isSmallScreen ? ScreenSize.small : ScreenSize.normal)
            }
        </div>

        // Clamp leftWidth against current container to prevent right panel collapse
        const maxWidth = this.getMaxLeftWidth()
        const clampedWidth = Math.max(SPLITTER_MIN_WIDTH, Math.min(maxWidth, leftWidth))

        // Apply dynamic width via CSS variable on the content container
        const contentStyle = isSmallScreen ? undefined : {
            '--wk-width-layout-content-left': `${clampedWidth}px`
        } as React.CSSProperties

        const contentElement = <div
            className={classNames("wk-layout-content", this.rightContext?.viewCount() > 0 ? "wk-layout-open" : undefined)}
            style={contentStyle}
        >
            <div className="wk-layout-content-left">
                <WKViewQueue onContext={(context) => {
                    if(onLeftContext) {
                        onLeftContext(context)
                    }
                }}>
                    {contentLeft}
                </WKViewQueue>
            </div>
            <div className="wk-layout-content-right">
                <WKViewQueue onContext={(context) => {
                    this.rightContext = context
                    if(onRightContext) {
                        onRightContext(context)
                    }
                }}>
                    {contentRight}
                </WKViewQueue>
            </div>
            {/* Draggable splitter — absolutely positioned on the border, hidden on small screens via CSS */}
            <div
                className={classNames("wk-layout-splitter", isDragging && "wk-layout-splitter-active")}
                onMouseDown={this.onDragStart}
            >
                <div className="wk-layout-splitter-line" />
            </div>
        </div>

        {/* Drag overlay to prevent iframe/content from capturing mouse events */}
        return <div className="wk-layout" ref={this.layoutRef}>
            {isExtension ? <>{contentElement}{tabElement}</> : <>{tabElement}{contentElement}</>}
            {isDragging && <div className="wk-layout-drag-overlay" />}
        </div>
    }
}