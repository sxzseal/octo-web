import WKSDK, { Channel, ChannelTypePerson, ChannelTypeGroup } from "wukongimjssdk";
import React from "react";
import { Component, CSSProperties } from "react";
import classNames from "classnames";
import WKApp from "../../App";
import "./index.css"

/**
 * Check if a user is a bot by looking up channelInfo.
 * Centralizes the repeated WKSDK.shared().channelManager.getChannelInfo(...) pattern.
 */
export function isBot(uid: string): boolean {
    const info = WKSDK.shared().channelManager.getChannelInfo(new Channel(uid, ChannelTypePerson))
    return info?.orgData?.robot === 1
}

interface WKAvatarProps {
    channel?: Channel
    src?: string
    style?: CSSProperties
    random?: string
}

const defaultAvatarSVG = `
  data:image/svg+xml;charset=UTF-8,<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg">
  <rect width="50" height="50" x="0" y="0" rx="20" ry="20" fill="rgb(220,220,220)" />
</svg>
`;

export interface WKAvatarState {
    src: string
    loadedErr: boolean // 图片是否加载错误
}

export default class WKAvatar extends Component<WKAvatarProps, WKAvatarState> {

    constructor(props: any) {
        super(props);
        this.state = {
            src: this.getImageSrc(),
            loadedErr: false,
        };
    }

    componentDidUpdate(prevProps: WKAvatarProps) {
        // Update src when props change
        const srcChanged = prevProps.src !== this.props.src;
        const randomChanged = prevProps.random !== this.props.random;
        const channelChanged = 
            prevProps.channel?.channelID !== this.props.channel?.channelID ||
            prevProps.channel?.channelType !== this.props.channel?.channelType;
        
        if (srcChanged || channelChanged || randomChanged) {
            this.setState({ 
                src: this.getImageSrc(),
                loadedErr: false 
            });
        }
    }

    getImageSrc() {
        const { channel, src, random } = this.props
        let imgSrc = ""
        if (src && src.trim() !== "") {
            imgSrc = src
        } else {
            if (channel) {
                imgSrc = WKApp.shared.avatarChannel(channel)
            }
        }
        if (random && random !== "") {
            imgSrc = `${imgSrc}#${random}`
        }
        return imgSrc
    }
    handleImgError = () => {
        this.setState({ src: defaultAvatarSVG, loadedErr: true });
    };
    
    getAvatarClass() {
        const { channel } = this.props
        if (!channel) return ""
        if (channel.channelType === ChannelTypeGroup) return "wk-avatar-group"
        if (channel.channelType === ChannelTypePerson) {
            const info = WKSDK.shared().channelManager.getChannelInfo(channel)
            if (info?.orgData?.robot === 1) return "wk-avatar-ai"
        }
        return ""
    }

    render() {
        const { style } = this.props
        return <img alt="" style={style} className={classNames("wk-avatar", this.getAvatarClass())} src={this.state.src} onError={this.handleImgError} />
    }
}
