import { describe, it, expect } from "vitest"
import { hasSpacePrefix } from "../SpacePrefix"

// A valid 32-char hex spaceId for testing
const SPACE_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90"

describe("hasSpacePrefix", () => {
    it("returns false for a regular UID not starting with 's'", () => {
        expect(hasSpacePrefix("alice")).toBe(false)
        expect(hasSpacePrefix("bob_bot")).toBe(false)
        expect(hasSpacePrefix("user123")).toBe(false)
    })

    it("returns false for a bot UID starting with 's' (e.g. stevejobs_bot)", () => {
        expect(hasSpacePrefix("stevejobs_bot")).toBe(false)
        expect(hasSpacePrefix("support")).toBe(false)
        expect(hasSpacePrefix("sam_admin")).toBe(false)
        expect(hasSpacePrefix("system")).toBe(false)
    })

    it("returns true for a Space-prefixed channelID (s + 32 hex + _)", () => {
        expect(hasSpacePrefix(`s${SPACE_ID}_alice`)).toBe(true)
        expect(hasSpacePrefix(`s${SPACE_ID}_group123`)).toBe(true)
    })

    it("returns false for 's' prefix with non-hex or wrong-length spaceId", () => {
        // Too short (31 chars)
        expect(hasSpacePrefix("sa1b2c3d4e5f60718293a4b5c6d7e8f9_uid")).toBe(false)
        // Too long (33 chars)
        expect(hasSpacePrefix("sa1b2c3d4e5f60718293a4b5c6d7e8f900_uid")).toBe(false)
        // Contains non-hex char 'g'
        expect(hasSpacePrefix("sg1b2c3d4e5f60718293a4b5c6d7e8f90_uid")).toBe(false)
        // Missing trailing underscore
        expect(hasSpacePrefix(`s${SPACE_ID}alice`)).toBe(false)
    })

    it("returns false for empty string", () => {
        expect(hasSpacePrefix("")).toBe(false)
    })
})

// Test extractUID logic in isolation (same algorithm as DataSourceModule.extractUID)
function extractUID(channelID: string): string {
    if (hasSpacePrefix(channelID)) {
        const idx = channelID.indexOf("_")
        return channelID.substring(idx + 1)
    }
    return channelID
}

describe("extractUID", () => {
    it("returns stevejobs_bot unchanged", () => {
        expect(extractUID("stevejobs_bot")).toBe("stevejobs_bot")
    })

    it("returns a regular UID unchanged", () => {
        expect(extractUID("alice")).toBe("alice")
        expect(extractUID("user_123")).toBe("user_123")
    })

    it("extracts uid from a Space-prefixed ID", () => {
        expect(extractUID(`s${SPACE_ID}_alice`)).toBe("alice")
        expect(extractUID(`s${SPACE_ID}_bob_bot`)).toBe("bob_bot")
    })
})

// Test shouldSkipChannelForSpace filtering logic
// We test the prefix-matching branch in isolation since the full function depends on WKApp
describe("shouldSkipChannelForSpace prefix logic", () => {
    const currentSpaceId = SPACE_ID
    const otherSpaceId = "00000000000000000000000000000000"

    function wouldFilterByPrefix(cid: string): boolean | null {
        if (!hasSpacePrefix(cid)) return null // not a Space-prefixed ID, other logic applies
        return !cid.startsWith(`s${currentSpaceId}_`)
    }

    it("does not filter regular UIDs (returns null = not handled by prefix branch)", () => {
        expect(wouldFilterByPrefix("alice")).toBeNull()
        expect(wouldFilterByPrefix("stevejobs_bot")).toBeNull()
    })

    it("does not filter Space-prefixed ID when Space matches", () => {
        expect(wouldFilterByPrefix(`s${currentSpaceId}_alice`)).toBe(false)
        expect(wouldFilterByPrefix(`s${currentSpaceId}_group1`)).toBe(false)
    })

    it("filters Space-prefixed ID when Space does not match", () => {
        expect(wouldFilterByPrefix(`s${otherSpaceId}_alice`)).toBe(true)
        expect(wouldFilterByPrefix(`s${otherSpaceId}_group1`)).toBe(true)
    })
})
