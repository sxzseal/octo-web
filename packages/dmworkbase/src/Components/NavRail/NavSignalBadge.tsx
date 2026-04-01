import React, { Component } from "react"
import { WKSDK, ConnectStatus } from "wukongimjssdk"
import WKApp from "../../App"

interface NavSignalBadgeState {
    status: ConnectStatus
    latency: number | null
    showTooltip: boolean
}

export default class NavSignalBadge extends Component<{}, NavSignalBadgeState> {
    private statusListener: any
    private pingTimer: any

    state: NavSignalBadgeState = {
        status: WKSDK.shared().connectManager.status,
        latency: null,
        showTooltip: false,
    }

    componentDidMount() {
        this.statusListener = (status: ConnectStatus) => {
            if (status === ConnectStatus.Connected) {
                this.startPing()
            } else {
                this.stopPing()
            }
            this.setState({ status, latency: status === ConnectStatus.Connected ? this.state.latency : null })
        }
        WKSDK.shared().connectManager.addConnectStatusListener(this.statusListener)

        if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
            this.startPing()
        }
    }

    componentWillUnmount() {
        WKSDK.shared().connectManager.removeConnectStatusListener(this.statusListener)
        this.stopPing()
    }

    startPing() {
        this.stopPing()
        this.measureLatency()
        this.pingTimer = setInterval(() => this.measureLatency(), 5000)
    }

    stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer)
            this.pingTimer = null
        }
    }

    async measureLatency() {
        try {
            const start = Date.now()
            await fetch(`${WKApp.apiClient.config.apiURL}/health`, { method: "GET", cache: "no-cache" })
            const latency = Date.now() - start
            if (WKSDK.shared().connectManager.status === ConnectStatus.Connected) {
                this.setState({ latency })
            }
        } catch { /* ignore */ }
    }

    getBars(ms: number | null, connected: boolean): number {
        if (!connected) return 0
        if (ms === null) return 2
        if (ms < 100) return 3
        if (ms <= 300) return 2
        return 1
    }

    getColor(ms: number | null, connected: boolean, connecting: boolean): string {
        if (!connected) return connecting ? "#eab308" : "#9ca3af"
        if (ms === null) return "#22c55e"
        if (ms < 100) return "#22c55e"
        if (ms <= 300) return "#eab308"
        return "#ef4444"
    }

    getTooltipText(): string {
        const { status, latency } = this.state
        if (status === ConnectStatus.Connected) {
            return latency !== null ? `已连接 · ${latency}ms` : "已连接"
        }
        if (status === ConnectStatus.Connecting) return "连接中..."
        return "已断开 · 点击重连"
    }

    handleClick = () => {
        if (this.state.status !== ConnectStatus.Connected) {
            WKSDK.shared().connectManager.connect()
        }
    }

    render() {
        const { status, latency, showTooltip } = this.state
        const connected = status === ConnectStatus.Connected
        const connecting = status === ConnectStatus.Connecting
        const bars = this.getBars(latency, connected)
        const color = this.getColor(latency, connected, connecting)

        return (
            <div
                className={`wk-navrail__signal${connecting ? " wk-navrail__signal--blink" : ""}`}
                onClick={this.handleClick}
                onMouseEnter={() => this.setState({ showTooltip: true })}
                onMouseLeave={() => this.setState({ showTooltip: false })}
                title={this.getTooltipText()}
                style={{ cursor: connected ? "default" : "pointer" }}
            >
                <svg width="10" height="10" viewBox="0 0 16 16">
                    <rect x="1" y="11" width="3" height="5" rx="0.5" fill={bars >= 1 ? color : "#d1d5db"} />
                    <rect x="6" y="7" width="3" height="9" rx="0.5" fill={bars >= 2 ? color : "#d1d5db"} />
                    <rect x="11" y="3" width="3" height="13" rx="0.5" fill={bars >= 3 ? color : "#d1d5db"} />
                </svg>
                {showTooltip && (
                    <div className="wk-navrail__signal-tooltip" style={{ whiteSpace: 'nowrap' }}>
                        {this.getTooltipText()}
                    </div>
                )}
            </div>
        )
    }
}
