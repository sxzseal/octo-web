import WKApp from "../../App";
import classnames from "classnames";
import React, { Component } from "react";
import { Toast, Spin, Button, Progress } from "@douyinfe/semi-ui";
import WKModal from "../WKModal";

export interface NavSettingsPanelProps {
    settingSelected: boolean;
    hasNewVersion: boolean;
    showNewVersion: boolean;
    showAppVersion: boolean;
    showAppUpdate: boolean;
    appUpdateProgress: number;
    showAppUpdateOperation: boolean;
    lastVersionInfo?: { appVersion: string; updateDesc: string };
    onToggleSetting: () => void;
    onSetShowNewVersion: (v: boolean) => void;
    onSetShowAppVersion: (v: boolean) => void;
    onInstallUpdate: () => void;
    onNotifyListener: () => void;
}

interface NavSettingsPanelState {
    changelog: { notes: string; version: string; pub_date: string } | null;
    changelogLoading: boolean;
}

export default class NavSettingsPanel extends Component<NavSettingsPanelProps, NavSettingsPanelState> {
    private _fetchingChangelog = false; // 实例属性防并发，避免 setState 异步批处理导致的竞态

    state: NavSettingsPanelState = {
        changelog: null,
        changelogLoading: false,
    };

    fetchChangelog = async () => {
        if (this._fetchingChangelog) return;
        this._fetchingChangelog = true;
        this.setState({ changelogLoading: true });
        try {
            const apiURL = WKApp.apiClient.config.apiURL;
            const resp = await fetch(`${apiURL}common/updater/web/1.0`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            if (!data || typeof data.notes !== 'string') {
                throw new Error('Invalid changelog format');
            }
            this.setState({ changelog: data, changelogLoading: false });
        } catch (e) {
            console.error('[NavSettingsPanel] fetch changelog failed', e);
            this.setState({ changelogLoading: false });
            Toast.error("获取更新日志失败");
        } finally {
            this._fetchingChangelog = false;
        }
    };

    render() {
        const {
            settingSelected,
            hasNewVersion,
            showNewVersion,
            showAppVersion,
            showAppUpdate,
            appUpdateProgress,
            showAppUpdateOperation,
            lastVersionInfo,
            onToggleSetting,
            onSetShowNewVersion,
            onSetShowAppVersion,
            onInstallUpdate,
            onNotifyListener,
        } = this.props;

        return (
            <>
                {/* 点击外部关闭 mask */}
                {settingSelected && (
                    <div
                        style={{ position: "fixed", inset: 0, zIndex: 199 }}
                        onClick={onToggleSetting}
                    />
                )}
                <ul className={classnames("wk-sider-setting-list wk-navrail__settings-list", settingSelected ? "open" : undefined)}>
                    {/* 暗黑模式入口已关闭 */}
                    <li onClick={() => {
                        onToggleSetting();
                        this.fetchChangelog();
                        onSetShowNewVersion(true);
                    }}>
                        更新日志
                    </li>
                    <li onClick={() => {
                        onToggleSetting();
                        WKApp.shared.notificationIsClose = !WKApp.shared.notificationIsClose;
                    }}>
                        {WKApp.shared.notificationIsClose ? "打开" : "关闭"}桌面通知
                    </li>
                    <li onClick={() => {
                        onToggleSetting();
                        WKApp.shared.logout();
                    }}>
                        退出登录
                    </li>
                </ul>

                {/* 更新日志 Modal */}
                <WKModal
                    title="更新日志"
                    visible={showNewVersion}
                    onCancel={() => onSetShowNewVersion(false)}
                >
                    {this.state.changelogLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                            <Spin size="large" />
                        </div>
                    ) : this.state.changelog ? (
                        <div style={{ overflow: 'auto', maxHeight: 400, padding: '8px 0' }}>
                            <div style={{ fontSize: 13, color: 'rgba(28,28,35,0.4)', marginBottom: 12 }}>
                                版本 {this.state.changelog.version || '未知'} · {this.state.changelog.pub_date ? new Date(this.state.changelog.pub_date).toLocaleDateString('zh-CN') : ''}
                            </div>
                            <pre style={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: 14,
                                lineHeight: 1.7,
                                margin: 0,
                                fontFamily: "'PingFang SC', sans-serif",
                                color: 'rgba(28,28,35,0.9)',
                            }}>
                                {this.state.changelog.notes}
                            </pre>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(28,28,35,0.4)' }}>
                            暂无更新日志
                        </div>
                    )}
                </WKModal>

                {/* 更新进度 Modal */}
                <WKModal
                    title="检测更新"
                    visible={showAppVersion}
                    options={{ maskClosable: false, closeOnEsc: false }}
                    onCancel={() => { onSetShowAppVersion(false); onNotifyListener(); }}
                    footer={showAppUpdateOperation ? (
                        <>
                            <Button theme="solid" type="tertiary" onClick={() => { onSetShowAppVersion(false); onNotifyListener(); }}>取消</Button>
                            <Button theme="solid" type="primary" onClick={onInstallUpdate}>更新</Button>
                        </>
                    ) : undefined}
                >
                    <div style={{ overflow: "auto", height: 200 }}>
                    {lastVersionInfo && (
                        <div className="wk-versioncheckview">
                            <div className="wk-versioncheckview-content">
                                <div className="wk-versioncheckview-updateinfo">
                                    <ul>
                                        <li>当前版本: {WKApp.config.appVersion}&nbsp;&nbsp;目标版本: {lastVersionInfo.appVersion}</li>
                                        <li>更新内容：</li>
                                        <li><pre>{lastVersionInfo.updateDesc}</pre></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                    {showAppUpdate && (
                        <Progress percent={appUpdateProgress} style={{ height: "8px" }} showInfo aria-label="update progress" />
                    )}
                    </div>
                </WKModal>
            </>
        );
    }
}


