import { isSafeUrl } from "./security";
import WKApp from "../App";

/**
 * Get a presigned download URL from the backend.
 * Falls back to the original URL on error.
 */
export async function getPresignedDownloadUrl(remotePath: string, filename: string): Promise<string> {
    try {
        const resp = await WKApp.apiClient.get(`file/download/url?path=${encodeURIComponent(remotePath)}&filename=${encodeURIComponent(filename)}`)
        if (resp && resp.url) {
            return resp.url
        }
    } catch (err) {
        console.warn("getPresignedDownloadUrl: failed, falling back to original URL", err)
    }
    return remotePath
}

/**
 * Get a presigned preview URL (Content-Disposition: inline) from the backend.
 * Falls back to the original URL on error.
 */
export async function getPresignedPreviewUrl(remotePath: string, filename: string): Promise<string> {
    try {
        const resp = await WKApp.apiClient.get(`file/download/url?path=${encodeURIComponent(remotePath)}&filename=${encodeURIComponent(filename)}&disposition=inline`)
        if (resp && resp.url) {
            return resp.url
        }
    } catch (err) {
        console.warn("getPresignedPreviewUrl: failed, falling back to original URL", err)
    }
    return remotePath
}

/**
 * Download a file via anchor-click.
 * For cross-origin URLs, fetches a presigned download URL from the backend.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
    if (!url) return;

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url, window.location.href);
    } catch {
        return;
    }

    const resolvedUrl = parsedUrl.href;
    if (!isSafeUrl(resolvedUrl)) return;

    let downloadUrl = resolvedUrl;
    const isCrossOrigin = parsedUrl.origin !== window.location.origin;

    if (isCrossOrigin && filename) {
        downloadUrl = await getPresignedDownloadUrl(resolvedUrl, filename);
    }

    try {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        if (isCrossOrigin) {
            a.target = "_blank";
            a.rel = "noopener";
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (err) {
        console.warn("downloadFile: anchor click failed, trying window.open", err);
        try {
            const w = window.open(downloadUrl, "_blank");
            if (!w) {
                console.warn("downloadFile: window.open returned null (popup blocked?)");
            }
        } catch (err2) {
            console.warn("downloadFile: window.open also failed", err2);
        }
    }
}
