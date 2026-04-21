import { describe, it, expect, vi } from 'vitest'

vi.mock('wukongimjssdk', () => ({
  MediaMessageContent: class {
    file?: File
    remoteUrl?: string
  },
  WKSDK: {
    shared: () => ({
      taskManager: { addListener: vi.fn(), removeListener: vi.fn() },
    }),
  },
  Task: class {},
  TaskStatus: { wait: 0, success: 1, processing: 2, fail: 3, suspend: 4, cancel: 5 },
}))

vi.mock('react', async () => await vi.importActual('react'))
vi.mock('yet-another-react-lightbox', () => ({ default: () => null }))
vi.mock('yet-another-react-lightbox/plugins/download', () => ({ default: {} }))
vi.mock('yet-another-react-lightbox/styles.css', () => ({}))
vi.mock('@douyinfe/semi-ui', () => ({ Toast: { warning: vi.fn() } }))
vi.mock('../../../App', () => ({ default: {} }))
vi.mock('../../../Service/Const', () => ({ MessageContentTypeConst: { image: 3 } }))
vi.mock('../../Base', () => ({ default: () => null }))
vi.mock('../../MessageCell', () => ({
  MessageCell: class {},
}))

import { ImageContent } from '../index'

describe('ImageContent name field', () => {
  it('sets name from file.name in constructor', () => {
    const file = new File([new ArrayBuffer(8)], 'screenshot.png', { type: 'image/png' })
    const content = new ImageContent(file, undefined, 100, 100)
    expect(content.name).toBe('screenshot.png')
  })

  it('leaves name undefined when no file is provided', () => {
    const content = new ImageContent()
    expect(content.name).toBeUndefined()
  })

  it('encodeJSON includes name when set', () => {
    const content = new ImageContent()
    content.name = 'photo.jpg'
    content.remoteUrl = 'https://cdn.example.com/photo.jpg'
    const json = content.encodeJSON()
    expect(json.name).toBe('photo.jpg')
  })

  it('encodeJSON omits name when not set', () => {
    const content = new ImageContent()
    content.remoteUrl = 'https://cdn.example.com/photo.jpg'
    const json = content.encodeJSON()
    expect(json).not.toHaveProperty('name')
  })

  it('decodeJSON reads name field', () => {
    const content = new ImageContent()
    content.decodeJSON({ width: 100, height: 100, url: 'https://cdn.example.com/photo.jpg', name: 'original.png' })
    expect(content.name).toBe('original.png')
  })

  it('decodeJSON without name field leaves it undefined', () => {
    const content = new ImageContent()
    content.decodeJSON({ width: 100, height: 100, url: 'https://cdn.example.com/photo.jpg' })
    expect(content.name).toBeUndefined()
  })
})
