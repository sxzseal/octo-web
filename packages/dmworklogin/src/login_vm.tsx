import { WKApp, ProviderListener } from "@octo/base";


export class LoginStatus {
    static getUUID: string = "getUUID"
    static waitScan: string = "waitScan"
    static authed: string = "authed"
    static scanned: string = "scanned"
    static expired: string = "expired"
}

export enum LoginType {
    qrcode, // 二维码登录
    phone, // 手机号登录
    register, // 注册
    forgetPassword, // 忘记密码
}

export class LoginVM extends ProviderListener {
    loginStatus: string = LoginStatus.getUUID // 登录状态
    qrcodeLoading: boolean = false // 二维码加载中
    uuid?: string
    qrcode?: string
    expireMaxTryCount: number = 5 // 过期最多次数（超过指定次数则永远显示过期，需要用户手动刷新）
    private _expireTryCount: number = 0 // 过期尝试次数

    uid?: string // 当前扫描的用户uid
    private _loginType: LoginType = LoginType.phone

    private _pullMaxErrCount: number = 10 //  pull登录状态请求最大错误次数，超过指定次数将不再请求
    private _pullErrCount: number = 0 // 当前pull发生错误请求次数

    private _autoRefresh: boolean = true // 是否自动刷新二维码
     loginLoading: boolean = false // 登录中

    // ---------- 手机登录方式 ----------
    username?:string
    password?:string

    // ---------- 注册方式 ----------
    registerUsername?:string
    registerName?:string
    registerPassword?:string
    registerConfirmPassword?:string
    registerLoading: boolean = false

    // ---------- 邮箱注册方式 ----------
    registerEmail?:string
    registerEmailPassword?:string
    registerEmailConfirmPassword?:string
    registerEmailName?:string
    emailCodeSending: boolean = false
    emailCodeCountdown: number = 0
    private _countdownTimer?: any

    // ---------- 忘记密码 ----------
    forgetEmail?:string
    forgetCode?:string
    forgetNewPassword?:string
    forgetConfirmPassword?:string
    forgetLoading: boolean = false

    // ---------- 邀请信息 ----------
    inviteInfo?: { space_name: string; member_count: number; max_users: number; invite_code: string; space_id: string }
    inviteLoading: boolean = false

    set autoRefresh(v: boolean) {
        this._autoRefresh = v
        this.notifyListener()

        if (v) {
            this.reStartAdvance()
        }
    }

    get autoRefresh() {
        return this._autoRefresh
    }

    didMount(): void {
        this.advance()
        this.checkInviteParam()
    }

    private checkInviteParam() {
        const urlParams = new URLSearchParams(window.location.search)
        const inviteCode = urlParams.get('invite')
        if (!inviteCode || !/^[a-zA-Z0-9_-]+$/.test(inviteCode)) return

        // 保存到 localStorage，登录成功后 onLogin 回调会使用
        localStorage.setItem('pendingInviteCode', inviteCode)

        this.inviteLoading = true
        this.notifyListener()

        fetch(`${window.location.origin}/api/v1/space/invite/${inviteCode}`)
            .then(resp => {
                if (!resp.ok) throw new Error('invalid')
                return resp.json()
            })
            .then(info => {
                this.inviteInfo = info
                this.inviteLoading = false
                this.notifyListener()
            })
            .catch(() => {
                this.inviteLoading = false
                this.notifyListener()
            })
    }

    didUnMount(): void {
        if (this._countdownTimer) {
            clearInterval(this._countdownTimer)
            this._countdownTimer = undefined
        }
    }

    set loginType(v: LoginType) {
        this._loginType = v
        if (v === LoginType.qrcode) {
            this.reStartAdvance()
        }
        this.notifyListener()
    }
    get loginType(): LoginType {
        return this._loginType
    }

    reStartAdvance() {
        this.restCount()
        this.loginStatus = LoginStatus.getUUID
        this._autoRefresh = true
        this.notifyListener()
        this.advance()
    }


    advance(data?: any) {
        if (this.loginType !== LoginType.qrcode) {
            return
        }
        switch (this.loginStatus) {
            case LoginStatus.getUUID:
                this.requestUUID()
                break
            case LoginStatus.waitScan:
                this.pullLoginStatus(this.uuid)
                break
            case LoginStatus.scanned:
                this.uid = data.uid
                this.notifyListener()
                this.pullLoginStatus(this.uuid)
                break
            case LoginStatus.authed:
                this.restCount()
                this.requestLogin(data.auth_code)
                break
            case LoginStatus.expired:
                this._expireTryCount++
                if (this._expireTryCount > this.expireMaxTryCount) {
                    this.autoRefresh = false
                } else {
                    this.loginStatus = LoginStatus.getUUID
                    this.advance()
                }

        }
    }

    restCount() {
        this._expireTryCount = 0
        this._pullErrCount = 0
    }

    async requestLogin(authCode: string) {
        if (this.loginLoading) {
            return
        }
        this.loginLoading = true
        this.notifyListener()
        try {
            const resp = await WKApp.apiClient.post(`user/login_authcode/${authCode}`);
            if (resp) {
                this.loginSuccess(resp)
            }
        } catch (error) {
            console.error('Login failed:', error)
        } finally {
            this.loginLoading = false
            this.notifyListener()
        }
    }

    async requestLoginWithUsernameAndPwd(username: string, password: string) {
        this.loginLoading = true
        this.notifyListener()
        const device = this.getDevice()
        let deviceFlag = 1 // web
        // if(WKApp.shared.isPC) {
        //     deviceFlag = 2 // pc

        // }
        return WKApp.apiClient.post(`user/login`, { "username": username, "password": password, "flag": deviceFlag,"device":device }).then((result)=>{
            this.loginSuccess(result)
        }).finally(()=>{
            this.loginLoading = false
            this.notifyListener()
        }) // flag 0.app 1.pc
    }

    async requestRegister(username: string, name: string, password: string) {
        this.registerLoading = true
        this.notifyListener()
        const device = this.getDevice()
        return WKApp.apiClient.post(`user/usernameregister`, {
            "username": username,
            "name": name,
            "password": password,
            "flag": 1,
            "device": device,
        }).then((result) => {
            this.loginSuccess(result)
        }).finally(() => {
            this.registerLoading = false
            this.notifyListener()
        })
    }

    async requestEmailSendCode(email: string, codeType: number = 0) {
        this.emailCodeSending = true
        this.notifyListener()
        return WKApp.apiClient.post('user/email/sendcode', {
            email: email,
            code_type: codeType,
        }).then(() => {
            this.emailCodeCountdown = 60
            // Clear any existing timer before creating a new one
            if (this._countdownTimer) {
                clearInterval(this._countdownTimer)
                this._countdownTimer = undefined
            }
            this._countdownTimer = setInterval(() => {
                this.emailCodeCountdown--
                if (this.emailCodeCountdown <= 0) {
                    clearInterval(this._countdownTimer)
                    this._countdownTimer = undefined
                }
                this.notifyListener()
            }, 1000)
        }).finally(() => {
            this.emailCodeSending = false
            this.notifyListener()
        })
    }

    async requestEmailRegister(email: string, password: string, name: string) {
        this.registerLoading = true
        this.notifyListener()
        const device = this.getDevice()
        return WKApp.apiClient.post('user/emailregister', {
            email, password, name, flag: 1, device,
        }).then((result) => {
            // emailregister wraps response in {data: ...}
            this.loginSuccess(result)
        }).finally(() => {
            this.registerLoading = false
            this.notifyListener()
        })
    }

    async requestEmailLogin(email: string, password: string) {
        this.loginLoading = true
        this.notifyListener()
        const device = this.getDevice()
        return WKApp.apiClient.post('user/emaillogin', {
            email, password, flag: 1, device,
        }).then((result) => {
            // emaillogin wraps response in {data: ...}
            this.loginSuccess(result)
        }).finally(() => {
            this.loginLoading = false
            this.notifyListener()
        })
    }

    async requestForgetPassword(email: string, code: string, newPassword: string) {
        this.forgetLoading = true
        this.notifyListener()
        return WKApp.apiClient.post('user/email/forgetpwd', {
            email, code, new_password: newPassword,
        }).then((result) => {
            this.clearSensitiveFields()
            return result
        }).finally(() => {
            this.forgetLoading = false
            this.notifyListener()
        })
    }

    getDevice() {
        return {
            "device_id": WKApp.shared.deviceId,
            "device_name": WKApp.shared.deviceName,
            "device_model": WKApp.shared.deviceModel,
        }
    }

    clearSensitiveFields() {
        this.password = ''
        this.registerEmailPassword = ''
        this.forgetNewPassword = ''
    }

    loginSuccess(data:any) {
        if (!data || !data.uid || !data.token) {
            throw new Error('Invalid login response: missing required fields (uid, token)')
        }
        this.clearSensitiveFields()
        const loginInfo = WKApp.loginInfo
        loginInfo.appID = data.app_id ?? ''
        loginInfo.uid = data.uid
        loginInfo.token = data.token
        loginInfo.shortNo = data.short_no ?? ''
        loginInfo.name = data.name ?? ''
        loginInfo.sex = data.sex ?? 0
        loginInfo.save()

        // 登录/注册成功后，检查是否有待处理的邀请码（来自邀请链接）
        const pendingInvite = localStorage.getItem("pendingInviteCode");
        if (pendingInvite && /^[a-zA-Z0-9_-]+$/.test(pendingInvite)) {
            const apiUrl = WKApp.apiClient.config.apiURL?.replace(/\/+$/, '');
            fetch(`${apiUrl}/space/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': data.token },
                body: JSON.stringify({ invite_code: pendingInvite }),
            }).then(resp => resp.json()).then(result => {
                localStorage.removeItem("pendingInviteCode");
                if (result?.space_id) {
                    localStorage.setItem('currentSpaceId', result.space_id);
                }
            }).catch(() => {
                localStorage.removeItem("pendingInviteCode");
            });
        }

        try {
            WKApp.endpoints.callOnLogin()
        } catch (e) {
            console.warn('callOnLogin error suppressed:', e)
        }
    }

    requestUUID() {
        if (this.qrcodeLoading) {
            return
        }
        this.qrcodeLoading = true
        this.notifyListener()
        const device = this.getDevice()
        WKApp.apiClient.get('user/loginuuid',{
            param: device,
        }).then((result) => {
            this.uuid = result.uuid
            this.qrcodeLoading = false
            this.qrcode = result.qrcode
            this.loginStatus = LoginStatus.waitScan
            this.notifyListener()
            this.advance()
        }).catch(() => {
            this.qrcodeLoading = false
            this.notifyListener()
        })
    }

    // 轮训登录状态
    pullLoginStatus(uuid?: string) {
        if (this.loginType !== LoginType.qrcode) {
            return
        }
        if (!uuid) {
            return
        }
        if (uuid !== this.uuid) return;
        if (this._pullErrCount >= this._pullMaxErrCount) {
            this._pullErrCount = 0
            this.loginStatus = LoginStatus.getUUID
            this.advance()
            return
        }

        WKApp.apiClient.get(`user/loginstatus?uuid=${uuid}`).then((result: any) => {
            this._pullErrCount = 0
            const loginStatus = result.status;
            this.loginStatus = loginStatus
            this.advance(result)
        }).catch(() => {
            this._pullErrCount++
            if (this._pullErrCount < this._pullMaxErrCount) {
                setTimeout(() => {
                    this.pullLoginStatus(uuid)
                }, 2000)
            } else {
                this._pullErrCount = 0
                this.loginStatus = LoginStatus.getUUID
                this.advance()
                this.notifyListener()
            }
        })
    }
    showAvatar() {
        return this.loginStatus === LoginStatus.scanned && this.uid
    }
}