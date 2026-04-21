import { MediaMessageContent, WKSDK, Task, TaskStatus } from "wukongimjssdk"
import React from "react"
import WKApp from "../../App"
import { MessageContentTypeConst } from "../../Service/Const"
import MessageBase from "../Base"
import { MessageCell } from "../MessageCell"
import Lightbox from "yet-another-react-lightbox"
import Download from "yet-another-react-lightbox/plugins/download"
import "yet-another-react-lightbox/styles.css"
import { Toast } from "@douyinfe/semi-ui"
import { downloadFile } from "../../Utils/download"

const SMALL_FILE_THRESHOLD = 1024 * 1024 // 1MB 以下不显示进度覆盖层


export class ImageContent extends MediaMessageContent {
    width!: number
    height!: number
    url!: string
    imgData?: string
    caption?: string
    mentionUids?: string[]
    name?: string
    constructor(file?: File, imgData?: string, width?: number, height?: number, caption?: string, mentionUids?: string[]) {
        super()
        this.file = file
        this.imgData = imgData
        this.width = width || 0
        this.height = height || 0
        this.caption = caption
        this.mentionUids = mentionUids
        if (file) {
            this.name = file.name
        }
    }
    decodeJSON(content: any) {
        this.width = content["width"] || 0
        this.height = content["height"] || 0
        this.url = content["url"] || ''
        this.caption = content["caption"] || ''
        this.mentionUids = content["mention_uids"] || []
        this.name = content["name"] || undefined
        this.remoteUrl = this.url
    }
    encodeJSON() {
        const json: Record<string, unknown> = { "width": this.width || 0, "height": this.height || 0, "url": this.remoteUrl || "" }
        if (this.caption) {
            json["caption"] = this.caption
        }
        if (this.mentionUids && this.mentionUids.length > 0) {
            json["mention_uids"] = this.mentionUids
        }
        if (this.name) {
            json["name"] = this.name
        }
        return json
    }
    get contentType() {
        return MessageContentTypeConst.image
    }
    get conversationDigest() {
        return "[图片]"
    }
}


interface ImageCellState {
    showPreview: boolean
    uploadProgress: number
    uploadStatus: TaskStatus | null
}

/** task 自身支持的重试接口（MediaMessageUploadTask 实现） */
interface RestartableTask extends Task {
    restart(): Promise<void>;
}

export class ImageCell extends MessageCell<any, ImageCellState> {
    private _task?: RestartableTask

    private _taskListener = (task: Task) => {
        const { message } = this.props
        if (task.id !== message.clientMsgNo) return
        this.setState({ uploadProgress: task.progress(), uploadStatus: task.status })
    }

    constructor(props: any) {
        super(props)
        this.state = {
            showPreview: false,
            uploadProgress: 0,
            uploadStatus: null,
        }
    }

    componentDidMount() {
        const { message } = this.props
        // 小文件（<1MB）不显示进度，跳过订阅
        const fileSize = (message.content as any).file?.size ?? 0
        if (fileSize < SMALL_FILE_THRESHOLD) return
        WKSDK.shared().taskManager.addListener(this._taskListener)
        const found = ((WKSDK.shared().taskManager as any).taskMap as Map<string, Task> | undefined)
            ?.get(message.clientMsgNo) as RestartableTask | undefined
        if (found) {
            this._task = found
            this.setState({ uploadProgress: found.progress(), uploadStatus: found.status })
        }
    }

    componentWillUnmount() {
        WKSDK.shared().taskManager.removeListener(this._taskListener)
    }

    imageScale(orgWidth: number, orgHeight: number, maxWidth = 250, maxHeight = 250) {
        let actSize = { width: orgWidth, height: orgHeight };
        if (orgWidth > orgHeight) {//横图
            if (orgWidth > maxWidth) { // 横图超过最大宽度
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        } else if (orgWidth < orgHeight) { //竖图
            if (orgHeight > maxHeight) {
                let rate = maxHeight / orgHeight; // 缩放比例
                actSize.width = orgWidth * rate;
                actSize.height = maxHeight;
            }
        } else if (orgWidth === orgHeight) {
            if (orgWidth > maxWidth) {
                let rate = maxWidth / orgWidth; // 缩放比例
                actSize.width = maxWidth;
                actSize.height = orgHeight * rate;
            }
        }
        return actSize;
    }

    getImageSrc(content: ImageContent) {
        if (content.url && content.url !== "") {
            return WKApp.dataSource.commonDataSource.getImageURL(content.url, { width: content.width, height: content.height })
        }
        return content.imgData
    }

    getImageElement() {
        const { message } = this.props
        const content = message.content as ImageContent
        let scaleSize = this.imageScale(content.width, content.height);
        return <img alt="" src={this.getImageSrc(content)} style={{ borderRadius: '5px', width: scaleSize.width, height: scaleSize.height }} />
    }

    render() {
        const { message, context } = this.props
        const { showPreview, uploadProgress, uploadStatus } = this.state
        const content = message.content as ImageContent
        let scaleSize = this.imageScale(content.width, content.height);
        const imageURL = this.getImageSrc(content) || ""

        const hasRemoteUrl = !!(content.url || (content as any).remoteUrl)
        const isUploading =
            uploadStatus !== null &&
            uploadStatus !== TaskStatus.success &&
            uploadStatus !== TaskStatus.fail &&
            uploadStatus !== TaskStatus.cancel &&
            !hasRemoteUrl

        const pct = Math.round(uploadProgress)

        return <MessageBase context={context} message={message}>
            <div style={{ cursor: isUploading ? "default" : "pointer" }}>
                <div style={{ position: "relative", width: scaleSize.width, height: scaleSize.height }}
                    onClick={() => { if (!isUploading) this.setState({ showPreview: !showPreview }) }}>
                    {this.getImageElement()}
                    {/* 上传进度覆盖层 */}
                    {isUploading && (
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(0,0,0,0.45)",
                            borderRadius: 5,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: 8,
                        }}>
                            <div style={{ width: "70%", height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 2, transition: "width 0.2s ease" }} />
                            </div>
                            <span style={{ color: "#fff", fontSize: 12 }}>{pct}%</span>
                        </div>
                    )}
                    {/* 上传失败覆盖层 */}
                    {uploadStatus === TaskStatus.fail && (
                        <div style={{
                            position: "absolute", inset: 0,
                            background: "rgba(0,0,0,0.5)",
                            borderRadius: 5,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            gap: 6,
                            cursor: "pointer",
                        }} onClick={(e) => {
                            e.stopPropagation()
                            if (!this._task) {
                                Toast.warning('上传任务已失效，请重新发送文件')
                                return
                            }
                            this._task.restart()
                        }}>
                            <span style={{ color: "#fff", fontSize: 22 }}>⚠️</span>
                            <span style={{ color: "#fff", fontSize: 11 }}>上传失败，点击重试</span>
                        </div>
                    )}
                </div>
                {content.caption && (
                    <div className="wk-image-caption" style={{ maxWidth: scaleSize.width, marginTop: '4px', fontSize: '14px', color: 'var(--wk-text-item)', wordBreak: 'break-word' }}>
                        {content.caption}
                    </div>
                )}
            </div>
            <Lightbox
                open={showPreview}
                close={() => this.setState({ showPreview: false })}
                slides={[{ src: imageURL, alt: '' }]}
                plugins={[Download]}
                download={{ download: ({ slide }) => {
                    if (slide?.src) {
                        downloadFile(slide.src, content.name || 'image.png')
                    }
                }}}
                carousel={{ finite: true }}
                controller={{ closeOnBackdropClick: true }}
                render={{
                    buttonPrev: () => null,
                    buttonNext: () => null,
                }}
            />
        </MessageBase>
    }
}