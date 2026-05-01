import '@testing-library/jest-dom'

// ResizeObserver polyfill for jsdom (Semi UI components trigger this)
if (typeof ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}

// HTMLCanvasElement.getContext() polyfill for jsdom.
// @douyinfe/semi-ui transitively imports lottie-web, which eagerly writes to
// `canvas.getContext("2d").fillStyle` at module-init time. jsdom returns null
// from getContext() by default → import crashes before any test runs. Return a
// minimal no-op 2D context stub so the module graph can load. Individual tests
// that actually need canvas APIs still stub what they care about.
if (typeof HTMLCanvasElement !== 'undefined') {
    const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (...args: unknown[]) => unknown
    }
    const orig = proto.getContext
    proto.getContext = function patchedGetContext(this: HTMLCanvasElement, ...args: unknown[]) {
        const result = typeof orig === 'function' ? orig.apply(this, args) : null
        if (result) return result
        return {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            globalAlpha: 1,
            fillRect: () => {},
            clearRect: () => {},
            getImageData: () => ({ data: new Uint8ClampedArray() }),
            putImageData: () => {},
            createImageData: () => ({ data: new Uint8ClampedArray() }),
            setTransform: () => {},
            drawImage: () => {},
            save: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            stroke: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            arc: () => {},
            fill: () => {},
            measureText: () => ({ width: 0 }),
            transform: () => {},
            rect: () => {},
            clip: () => {},
            getContextAttributes: () => ({}),
        }
    }
}
