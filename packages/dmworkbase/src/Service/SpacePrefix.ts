// Matches Space-prefixed IDs: s + 32-char hex spaceId + underscore
const SPACE_PREFIX_RE = /^s[0-9a-f]{32}_/

export function hasSpacePrefix(id: string): boolean {
    return SPACE_PREFIX_RE.test(id)
}
