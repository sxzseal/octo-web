import React from "react";
import QRCodeMy from "../QRCodeMy";
import WKApp from "../../App";
import RouteContext, { FinishButtonContext, RouteContextConfig } from "../../Service/Context";
import { ProviderListener } from "../../Service/Provider";
import { Row, Section } from "../../Service/Section";
import { InputEdit } from "../InputEdit";
import { ListItem, ListItemIcon } from "../ListItem";
import { Sex, SexSelect } from "../SexSelect";
import { ListItemAvatar } from "../ListItemAvatar";
import RealnameVerifiedBadge from "../RealnameVerifiedBadge";
import axios from "axios";
import { Toast } from "@douyinfe/semi-ui";
import WKSDK, { Channel } from "wukongimjssdk";
import { ChannelInfoListener } from "wukongimjssdk";
import { ChannelInfo, ChannelTypePerson } from "wukongimjssdk";
import { Convert } from "../../Service/Convert";
import { isRealnameVerified } from "../../Utils/displayName";

/**
 * MeInfoVM — 自己的「个人信息 / 设置」页面 ViewModel
 *
 * YUJ-359 / GH #1121 接入 OCTO 实名认证：
 *   - 「名字」行右侧展示 ✓ + 「已实名」tag（已认证）
 *   - 新增「账号安全 · 实名认证」section
 *     · 已认证：展示 「已认证 · {年-月}」不可点
 *     · 未认证：展示「去认证」CTA，点击 POST /v1/internal/verify-token
 *       拿 { token, verify_url } 后 window.open(verify_url, '_blank')
 *   - 用户完成 CAS 回 OCTO 后（URL 带 ?verified=1）由 Main 页触发刷新，
 *     此 VM 的 reload() 会重新拉 users/{uid} 同步状态
 */
export class MeInfoVM extends ProviderListener {

    channelInfoListener!:ChannelInfoListener
    /** YUJ-359：本页加载时主动拉取的自身 profile（含 realname_verified / real_name） */
    selfChannelInfo?: ChannelInfo
    /** YUJ-359：点击「去认证」时禁用按钮，避免重复提交 */
    verifyPending: boolean = false

    didMount(): void {
        this.channelInfoListener = (channelInfo:ChannelInfo)=>{
            if(channelInfo.channel.channelType !== ChannelTypePerson) {
                return
            }
            if(channelInfo.channel.channelID !== WKApp.loginInfo.uid) {
                return
            }
            WKApp.loginInfo.name = channelInfo.title;
            WKApp.loginInfo.shortNo = channelInfo.orgData.short_no;
            WKApp.loginInfo.sex = channelInfo.orgData.sex;
            this.syncRealnameFromOrgData(channelInfo.orgData)
            WKApp.shared.myUserAvatarChange()
            this.selfChannelInfo = channelInfo
            this.notifyListener()
        }
        WKSDK.shared().channelManager.addListener(this.channelInfoListener)

        // YUJ-359: 主动拉一次 /users/{uid} 保证进入本页时 realname_verified / real_name
        // 是最新状态（channelInfoListener 只在后续有变更时才会触发）。
        this.reloadSelfProfile()

        // 用户从 CAS 流程返回（verify_url 回调至 OCTO 时通常带 ?verified=1），
        // 我们在此页再拉一次 profile 并主动清除 URL 里的 verified 参数，
        // 避免二次进入时误触发刷新。
        try {
            const params = new URLSearchParams(window.location.search)
            if (params.get("verified") === "1") {
                params.delete("verified")
                const rest = params.toString()
                const url = window.location.pathname + (rest ? ("?" + rest) : "") + window.location.hash
                window.history.replaceState(null, "", url)
                // 再拉一次以保证刚认证完状态立即刷新
                this.reloadSelfProfile()
            }
        } catch (e) {
            // URL API 在非浏览器环境下可能不可用 — 静默降级，不阻塞页面
        }
    }

    didUnMount(): void {
        WKSDK.shared().channelManager.removeListener(this.channelInfoListener)
    }

    /**
     * YUJ-359：把 profile orgData 里的实名字段回写到 WKApp.loginInfo（方便跨页面快速判定）。
     * 硬约束：仅处理 realname_verified / real_name 两个字段，不扩散其他字段到 loginInfo。
     */
    private syncRealnameFromOrgData(orgData: any) {
        const verified = isRealnameVerified(orgData)
        WKApp.loginInfo.realnameVerified = verified
        if (verified && typeof orgData?.real_name === "string" && orgData.real_name.length > 0) {
            WKApp.loginInfo.realName = orgData.real_name
        } else {
            WKApp.loginInfo.realName = undefined
        }
        const verifiedAt = orgData?.realname_verified_at
        if (typeof verifiedAt === "number" && verifiedAt > 0) {
            WKApp.loginInfo.realnameVerifiedAt = verifiedAt
        }
        WKApp.loginInfo.save()
    }

    async reloadSelfProfile() {
        const uid = WKApp.loginInfo.uid
        if (!uid) return
        try {
            const res = await WKApp.apiClient.get<any>(`users/${uid}`)
            const channelInfo = Convert.userToChannelInfo(res)
            this.selfChannelInfo = channelInfo
            this.syncRealnameFromOrgData(channelInfo.orgData)
            this.notifyListener()
        } catch (e: any) {
            // 个人页拉取失败不打断渲染（仍然有 loginInfo 的缓存字段），仅静默
            // 控制台打印以便排查
            // eslint-disable-next-line no-console
            console.warn("[MeInfoVM] reloadSelfProfile failed", e)
        }
    }

    /**
     * YUJ-359 实名认证：POST /v1/internal/verify-token → 拿 {token, verify_url}
     * 后跳转到 verify_url 完成 CAS 流程。新 tab 打开，避免用户在聊天中途被整页切走。
     *
     * 预期后端响应：{ token: string, verify_url: string, expires_in?: number }
     */
    async startRealnameVerify() {
        if (this.verifyPending) return
        this.verifyPending = true
        this.notifyListener()
        try {
            // YUJ-359 follow-up: Web 显式传 return_to，让 verify-service 在 CAS 完成后
            // 302 回资料页（带 ?verified=1），避免服务端 default 是 dmwork:// deep link
            // 时 Web 浏览器不识别导致白屏。didMount 中已有 ?verified=1 检测逻辑
            // 会自动 reloadSelfProfile。
            //
            // origin 用 window.location.origin（https://<host>）而非 hardcode，兼容
            // im-test / im-prod / 本地 dev 三套环境。pathname 回到个人信息页。
            const returnTo = `${window.location.origin}${window.location.pathname}?verified=1`
            const res = await WKApp.apiClient.post("internal/verify-token", { return_to: returnTo })
            const verifyUrl = (res as any)?.verify_url
            if (typeof verifyUrl !== "string" || verifyUrl.length === 0) {
                Toast.error("获取认证链接失败，请稍后再试")
                return
            }
            // 新 tab 打开，noopener 防止 verify service 反操作当前窗口
            const opened = window.open(verifyUrl, "_blank", "noopener,noreferrer")
            if (!opened) {
                // 弹窗被浏览器拦截时降级为当前 tab 跳转
                window.location.href = verifyUrl
            }
        } catch (e: any) {
            Toast.error(e?.msg || "获取认证链接失败")
        } finally {
            this.verifyPending = false
            this.notifyListener()
        }
    }

    uploadAvatar(file: File) {
        const param = new FormData();
        param.append("file", file);
        return axios.post(`users/${WKApp.loginInfo.uid}/avatar`, param, {
            headers: { "Content-Type": "multipart/form-data", "token": WKApp.loginInfo.token || "" },
        }).catch(error => {
        })
    }

    updateMyInfo(field: string, value: string) {
        let param: any = {}
        param[field] = value
        return WKApp.apiClient.put("user/current", param).catch((err) => {
            Toast.error(err.msg)
        })
    }

    inputEditPush(context: RouteContext<any>, defaultValue: string, onFinish: (value: string) => Promise<void>, placeholder?: string,maxCount?:number) {
        let value: string
        let finishButtonContext: FinishButtonContext
        context.push(<InputEdit maxCount={maxCount} defaultValue={defaultValue} placeholder={placeholder} onChange={(v) => {
            value = v
            if (!value || value === "") {
                finishButtonContext.disable(true)
            } else {
                finishButtonContext.disable(false)
            }
        }}></InputEdit>, new RouteContextConfig({
            showFinishButton: true,
            onFinishContext: (finishBtnContext) => {
                finishButtonContext = finishBtnContext
                finishBtnContext.disable(true)
            },
            onFinish: async () => {
                finishButtonContext.loading(true)
                await onFinish(value)
                finishButtonContext.loading(false)

                context.pop()
            }
        }))
    }

    /**
     * YUJ-359：「名字」行的 subTitle — 已认证时展示 「昵称 ✓ 已实名」，
     * 未认证时退化为普通昵称字符串。
     */
    private nameRowSubTitle(): React.ReactNode {
        const name = WKApp.loginInfo.name || ""
        if (!WKApp.loginInfo.realnameVerified) {
            return name
        }
        return (
            <span style={{ display: "inline-flex", alignItems: "center" }}>
                {WKApp.loginInfo.realName || name}
                <RealnameVerifiedBadge />
            </span>
        )
    }

    /**
     * YUJ-359：格式化「已认证 · 2025-03」展示文本。
     * verified_at 字段后端若缺失，只展示「已认证」不拼年月，避免显示 NaN。
     */
    private formatVerifiedAtLabel(): string {
        const ts = WKApp.loginInfo.realnameVerifiedAt
        if (!ts || typeof ts !== "number" || ts <= 0) {
            return "已认证"
        }
        // 后端通常发秒级时间戳，兼容毫秒
        const ms = ts > 10_000_000_000 ? ts : ts * 1000
        const d = new Date(ms)
        if (Number.isNaN(d.getTime())) {
            return "已认证"
        }
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        return `已认证 · ${yyyy}-${mm}`
    }

    sections(context: RouteContext<any>) {

        let sections = new Array<Section>()
        sections.push(new Section({
            rows: [
                new Row({
                    cell: ListItemAvatar,
                    properties: {
                        title: `头像`,
                        context: context,
                        avatar: <img style={{ "width": "24px", "height": "24px", "borderRadius": "50%" }} src={WKApp.shared.avatarUser(WKApp.loginInfo.uid || "")}></img>,
                        onFileUpload: async (f: File) => {
                            await this.uploadAvatar(f)
                            WKApp.shared.changeChannelAvatarTag(new Channel(WKApp.loginInfo.uid||"", ChannelTypePerson))
                        }
                    }
                }),
                new Row({
                    cell: ListItem,
                    properties: {
                        title: "名字",
                        subTitle: this.nameRowSubTitle(),
                        onClick: () => {
                            this.inputEditPush(context, WKApp.loginInfo.name || "", async (value) => {
                                if (value.trim() === "") {
                                    Toast.error("名字不能为空！")
                                    return
                                }
                                return this.updateMyInfo("name",value).then(()=>{
                                    WKApp.loginInfo.name = value
                                    WKApp.loginInfo.save()
                                })
                            }, "设置名字",20)
                        }
                    }
                }),
                new Row({
                    cell: ListItem,
                    properties: {
                        title: `${WKApp.config.appName}号`,
                        subTitle: WKApp.loginInfo.shortNo,
                        onClick: () => {

                        }
                    }
                }),
                new Row({
                    cell: ListItemIcon,
                    properties: {
                        title: `我的二维码`,
                        icon: <img style={{ "width": "24px", "height": "24px" }} src={require("./../../assets/icon_qrcode.png")}></img>,
                        onClick: () => {
                            context.push(<QRCodeMy disableHeader={true}></QRCodeMy>)
                        }
                    }
                })
            ]
        }))

        let sex = WKApp.loginInfo.sex === 0 ? Sex.Female : Sex.Male
        let sexStr = "男"
        if (sex === Sex.Female) {
            sexStr = "女"
        }

        sections.push(new Section({
            rows: [
                new Row({
                    cell: ListItem,
                    properties: {
                        title: "性别",
                        subTitle: sexStr,
                        onClick: () => {
                            context.push(<SexSelect sex={sex} onSelect={ async (sex) => {
                                this.updateMyInfo("sex",sex.toString())
                                context.pop()
                                WKApp.loginInfo.sex = sex
                                WKApp.loginInfo.save()
                            }}></SexSelect>)
                        }
                    }
                }),
            ]
        }))

        // YUJ-359：账号安全 · 实名认证。
        // 已认证：展示文本行，点击无动作；未认证：点击触发 verify-token → CAS。
        const verified = !!WKApp.loginInfo.realnameVerified
        sections.push(new Section({
            title: "账号安全",
            rows: [
                new Row({
                    cell: ListItem,
                    properties: {
                        title: "实名认证",
                        subTitle: verified
                            ? this.formatVerifiedAtLabel()
                            : (this.verifyPending ? "正在获取认证链接…" : "去认证"),
                        onClick: () => {
                            if (verified) return
                            if (this.verifyPending) return
                            this.startRealnameVerify()
                        }
                    }
                })
            ]
        }))

        return sections
    }
}
