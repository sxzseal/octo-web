import { useState, useEffect, useRef, useCallback } from "react"
import VoiceService, { VoiceConfig, VoiceContextResponse } from "../../Service/VoiceService"
import WKApp from "../../App"
import { ChatContextResult } from "../Conversation/chatContext"

export interface UseVoiceInputOptions {
    maxDuration?: number
    onTranscribed?: (text: string, shouldReplace: boolean) => void
    onError?: (error: Error) => void
    onRecordingFailed?: () => void
    getChatContext?: () => ChatContextResult
}

export interface UseVoiceInputReturn {
    isRecording: boolean
    isTranscribing: boolean
    duration: number
    startRecording: () => void
    stopRecordingAndTranscribe: (contextText?: string) => void
    cancelRecording: () => void
    isVoiceEnabled: boolean
}

function getSupportedMimeType(): string {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        return "audio/webm;codecs=opus"
    }
    return "audio/mp4"
}

export default function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
    const { maxDuration = 60, onTranscribed, onError, onRecordingFailed, getChatContext } = options

    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [duration, setDuration] = useState(0)
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const contextTextRef = useRef<string | undefined>(undefined)
    const getChatContextRef = useRef(getChatContext)
    getChatContextRef.current = getChatContext
    const stopFnRef = useRef<(contextText?: string) => void>(() => {})

    const voiceContextRef = useRef<VoiceContextResponse | null>(null)
    const voiceContextPromiseRef = useRef<Promise<VoiceContextResponse | null> | null>(null)
    const voiceContextSpaceIdRef = useRef<string>("")
    const maxFileSizeRef = useRef<number>(0)

    // Fetch voice config on mount
    useEffect(() => {
        VoiceService.shared.getConfig()
            .then((config: VoiceConfig) => {
                setIsVoiceEnabled(config.enabled)
                maxFileSizeRef.current = config.max_file_size || 0
            })
            .catch(() => {
                setIsVoiceEnabled(false)
            })
    }, [])

    // Listen for space changes to clear stale cache
    useEffect(() => {
        const handler = () => {
            const prevSpaceId = voiceContextSpaceIdRef.current
            if (prevSpaceId) {
                VoiceService.shared.clearVoiceContextCache(prevSpaceId)
            }
            voiceContextRef.current = null
            voiceContextPromiseRef.current = null
            voiceContextSpaceIdRef.current = ""
        }
        WKApp.mittBus.on('space-changed', handler)
        return () => {
            WKApp.mittBus.off('space-changed', handler)
        }
    }, [])

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        mediaRecorderRef.current = null
        chunksRef.current = []
        setDuration(0)
    }, [])

    const startRecording = useCallback(async () => {
        if (isRecording) return

        voiceContextRef.current = null

        const spaceId = WKApp.shared.currentSpaceId
        voiceContextSpaceIdRef.current = spaceId

        if (spaceId) {
            const promise = VoiceService.shared.getVoiceContext(spaceId)
                .then((resp) => {
                    if (voiceContextSpaceIdRef.current === spaceId) {
                        voiceContextRef.current = resp
                    }
                    return resp
                })
                .catch(() => {
                    return null
                })
            voiceContextPromiseRef.current = promise
        } else {
            voiceContextPromiseRef.current = null
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const mimeType = getSupportedMimeType()
            const recorder = new MediaRecorder(stream, { mimeType })
            mediaRecorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data)
                }
            }

            recorder.start()
            setIsRecording(true)
            setDuration(0)

            const startTime = Date.now()
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000)
                setDuration(elapsed)
                if (elapsed >= maxDuration) {
                    stopFnRef.current()
                }
            }, 1000)
        } catch (err) {
            const error = err instanceof Error ? err : new Error("Microphone access denied")
            if (onError) onError(error)
            cleanup()
            if (onRecordingFailed) onRecordingFailed()
        }
    }, [isRecording, maxDuration, onError, onRecordingFailed, cleanup])

    const stopRecordingAndTranscribe = useCallback((contextText?: string) => {
        if (contextText !== undefined) {
            contextTextRef.current = contextText
        }
        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === "inactive") {
            cleanup()
            setIsRecording(false)
            return
        }

        recorder.onstop = async () => {
            const mimeType = getSupportedMimeType()
            const blob = new Blob(chunksRef.current, { type: mimeType })
            cleanup()
            setIsRecording(false)

            // Ignore very short recordings (< 0.5s worth of data is likely accidental)
            if (blob.size < 1000) {
                return
            }

            if (maxFileSizeRef.current > 0 && blob.size > maxFileSizeRef.current) {
                if (onError) onError(new Error("Recording file size exceeds limit"))
                return
            }

            setIsTranscribing(true)
            try {
                if (voiceContextPromiseRef.current) {
                    await voiceContextPromiseRef.current
                    voiceContextPromiseRef.current = null
                }

                // 个人纠错上下文
                let personalContext: string | undefined
                const voiceCtx = voiceContextRef.current
                if (voiceCtx && voiceCtx.has_context === true && voiceCtx.context) {
                    personalContext = voiceCtx.context
                }

                // 群成员名 + 聊天消息上下文
                const chatCtxResult = getChatContextRef.current?.() ?? {}
                const memberContext = chatCtxResult.memberContext
                const chatContext = chatCtxResult.chatContext

                const result = await VoiceService.shared.transcribe(
                    blob, contextTextRef.current, chatContext, personalContext, memberContext
                )
                if (result.text && onTranscribed) {
                    // If context_text was provided, LLM returns complete modified text - should replace
                    const shouldReplace = !!contextTextRef.current
                    onTranscribed(result.text, shouldReplace)
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error("Transcription failed")
                if (onError) onError(error)
            } finally {
                setIsTranscribing(false)
                contextTextRef.current = undefined
            }
        }

        recorder.stop()
    }, [cleanup, onTranscribed, onError])

    stopFnRef.current = stopRecordingAndTranscribe

    const cancelRecording = useCallback(() => {
        const recorder = mediaRecorderRef.current
        if (recorder && recorder.state !== "inactive") {
            recorder.onstop = null
            recorder.stop()
        }
        cleanup()
        setIsRecording(false)
        voiceContextRef.current = null
        voiceContextPromiseRef.current = null
        voiceContextSpaceIdRef.current = ""
    }, [cleanup])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.onstop = null
                mediaRecorderRef.current.stop()
            }
            cleanup()
        }
    }, [cleanup])

    return {
        isRecording,
        isTranscribing,
        duration,
        startRecording,
        stopRecordingAndTranscribe,
        cancelRecording,
        isVoiceEnabled,
    }
}
