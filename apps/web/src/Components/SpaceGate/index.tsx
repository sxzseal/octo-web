import React, { Component } from "react";
import { WKApp } from "@octo/base";
import { SpaceService, Space } from "@octo/base/src/Service/SpaceService";
import { Input, Button, Toast, Spin } from "@douyinfe/semi-ui";

interface SpaceGateState {
    loading: boolean;
    spaces: Space[];
    inviteCode: string;
    joining: boolean;
}

export default class SpaceGate extends Component<{}, SpaceGateState> {
    state: SpaceGateState = {
        loading: true,
        spaces: [],
        inviteCode: "",
        joining: false,
    };

    componentDidMount() {
        this.checkSpaces();
    }

    checkSpaces = async () => {
        try {
            const spaces = await SpaceService.shared.getMySpaces();
            if (spaces.length >= 1) {
                // 有 Space → 直接进入第一个（多 Space 切换在侧边栏）
                WKApp.shared.currentSpaceId = spaces[0].space_id;
                WKApp.shared.spaceChecked = true;
                WKApp.shared.notifyListener();
            } else {
                // 没有 Space，显示加入页面
                this.setState({ loading: false });
            }
        } catch {
            this.setState({ loading: false });
        }
    };

    selectSpace = (space: Space) => {
        WKApp.shared.currentSpaceId = space.space_id;
        WKApp.shared.spaceChecked = true;
        WKApp.shared.notifyListener();
    };

    joinSpace = async () => {
        const { inviteCode } = this.state;
        if (!inviteCode.trim()) {
            Toast.warning("请输入邀请码");
            return;
        }
        this.setState({ joining: true });
        try {
            await SpaceService.shared.joinSpace(inviteCode.trim());
            Toast.success("已加入 Space");
            this.checkSpaces();
        } catch {
            Toast.error("邀请码无效或已过期");
            this.setState({ joining: false });
        }
    };

    render() {
        const { loading, spaces, inviteCode, joining } = this.state;

        if (loading) {
            return (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                    <Spin size="large" />
                </div>
            );
        }

        // 没有 Space，显示加入页面
        return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "16px" }}>
                <h2>加入 Space</h2>
                <p style={{ color: "#888" }}>请输入邀请码加入一个 Space 开始使用</p>
                <Input
                    placeholder="邀请码"
                    value={inviteCode}
                    onChange={(v) => this.setState({ inviteCode: v })}
                    onEnterPress={this.joinSpace}
                    style={{ width: 300 }}
                />
                <Button theme="solid" type="primary" loading={joining} onClick={this.joinSpace} style={{ width: 300 }}>
                    加入
                </Button>
            </div>
        );
    }
}
