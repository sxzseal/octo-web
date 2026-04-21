import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockApiGet = vi.fn()

vi.mock('../App', () => ({
  default: {
    apiClient: {
      get: (...args: any[]) => mockApiGet(...args),
    },
  },
}))

vi.mock('./security', () => ({
  isSafeUrl: (url: string) => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'),
}))

import { getPresignedDownloadUrl, getPresignedPreviewUrl } from './download'

describe('getPresignedDownloadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns presigned URL from backend', async () => {
    mockApiGet.mockResolvedValue({ url: 'https://cdn.example.com/presigned' })

    const result = await getPresignedDownloadUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cdn.example.com/presigned')
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining('file/download/url?')
    )
  })

  it('falls back to original URL on error', async () => {
    mockApiGet.mockRejectedValue(new Error('network error'))

    const result = await getPresignedDownloadUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cos.example.com/file.pdf')
  })

  it('falls back to original URL when resp has no url field', async () => {
    mockApiGet.mockResolvedValue({})

    const result = await getPresignedDownloadUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cos.example.com/file.pdf')
  })
})

describe('getPresignedPreviewUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns presigned preview URL from backend', async () => {
    mockApiGet.mockResolvedValue({ url: 'https://cdn.example.com/presigned-inline' })

    const result = await getPresignedPreviewUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cdn.example.com/presigned-inline')
    expect(mockApiGet).toHaveBeenCalledWith(
      expect.stringContaining('disposition=inline')
    )
  })

  it('passes disposition=inline in the API call', async () => {
    mockApiGet.mockResolvedValue({ url: 'https://cdn.example.com/presigned-inline' })

    await getPresignedPreviewUrl('https://cos.example.com/file.pdf', 'report.pdf')

    const callArg = mockApiGet.mock.calls[0][0] as string
    expect(callArg).toContain('disposition=inline')
    expect(callArg).toContain('filename=report.pdf')
  })

  it('falls back to original URL on error', async () => {
    mockApiGet.mockRejectedValue(new Error('network error'))

    const result = await getPresignedPreviewUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cos.example.com/file.pdf')
  })

  it('falls back to original URL when resp has no url field', async () => {
    mockApiGet.mockResolvedValue({})

    const result = await getPresignedPreviewUrl('https://cos.example.com/file.pdf', 'file.pdf')

    expect(result).toBe('https://cos.example.com/file.pdf')
  })
})
