import React, { Component } from "react";
import { QRCodeSVG } from 'qrcode.react';
import "./index.css"
import { Channel, WKSDK } from "wukongimjssdk";
import WKApp from "../../App";
import Provider from "../../Service/Provider";
import { ChannelQRCodeVM } from "./vm";
import { Button, Spin, Toast } from "@douyinfe/semi-ui";
import { copyToClipboard } from "../../Utils/clipboard";

export interface ChannelQRCodeProps {
    channel: Channel
}

export default class ChannelQRCode extends Component<ChannelQRCodeProps> {

    handleCopyLink = async (link: string) => {
        const ok = await copyToClipboard(link)
        if (ok) {
            Toast.success("邀请链接已复制，7 天内有效")
        } else {
            Toast.error("复制失败，请手动复制")
        }
    }

    render() {
        const { channel } = this.props
        const channelInfo = WKSDK.shared().channelManager.getChannelInfo(channel)
        return <Provider create={() => {
            return new ChannelQRCodeVM(channel)
        }} render={(vm: ChannelQRCodeVM) => {

            return <div className="wk-channelqrcode">
                <div className="wk-channelqrcode-box">
                    <div className="wk-channelqrcode-info">
                        <div className="wk-channelqrcode-info-avatar">
                            <img src={WKApp.shared.avatarChannel(channel)}></img>
                        </div>
                        <div className="wk-channelqrcode-info-name">
                            {channelInfo?.title}
                        </div>
                    </div>

                    <div className="wk-channelqrcode-qrcode-box">
                        {
                            channelInfo?.orgData?.invite === 1 &&   vm.qrcodeResp? <div className="wk-channelqrcode-qrcode-mask">
                                <p>该群已开启进群验证</p>
                                <p>只可通过邀请进群</p>
                            </div> : undefined
                        }

                        <div className="wk-channelqrcode-qrcode">
                            {
                                vm.qrcodeResp ? undefined : <div className="wk-channelqrcode-qrcode-loading">
                                    <Spin></Spin>
                                </div>
                            }
                            {
                                vm.qrcodeResp ?
                                    <QRCodeSVG value={vm.qrcodeResp?.qrcode || ""}
                                        size={250}
                                        fgColor="#000000"></QRCodeSVG>
                                    : undefined
                            }
                        </div>
                        {
                            vm.qrcodeResp ? <div className="wk-channelqrcode-expire">
                                该二维码7天内({vm.qrcodeResp.expire})前有效，重新进入将更新
                            </div> : undefined
                        }
                    </div>

                    {
                        vm.qrcodeResp && channelInfo?.orgData?.invite !== 1 ? <div className="wk-channelqrcode-actions">
                            <Button theme="solid" type="primary" onClick={() => this.handleCopyLink(vm.qrcodeResp!.invite_url || vm.qrcodeResp!.qrcode)}>
                                复制邀请链接
                            </Button>
                        </div> : undefined
                    }

                </div>
            </div>
        }}>

        </Provider>
    }
}