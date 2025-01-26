import { jest } from "@jest/globals"

import { throttle, debounce, withoutTransition, wrapWithoutTransition } from "./util"

describe("throttle", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // Mock requestAnimationFrame and performance.now
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16)
      return Math.random()
    })
    global.performance.now = jest.fn(() => Date.now())
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("should only call function once within delay period", () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled() // Should call immediately
    throttled() // Should be ignored
    throttled() // Should be ignored

    expect(func).toHaveBeenCalledTimes(1)
  })

  it("should call function again after delay", () => {
    const func = jest.fn()
    const throttled = throttle(func, 100)

    throttled() // First call
    jest.advanceTimersByTime(150)
    throttled() // Second call after delay

    expect(func).toHaveBeenCalledTimes(2)
  })
})

describe("debounce", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16)
      return Math.random()
    })
    global.performance.now = jest.fn(() => Date.now())
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("should delay function execution", () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)
    const event = new KeyboardEvent("keydown")

    debounced(event)
    expect(func).not.toHaveBeenCalled()

    jest.advanceTimersByTime(150)
    expect(func).toHaveBeenCalledTimes(1)
  })

  it("should execute immediately with immediate flag", () => {
    const func = jest.fn()
    const debounced = debounce(func, 100, true)
    const event = new KeyboardEvent("keydown")

    debounced(event)
    expect(func).toHaveBeenCalledTimes(1)
  })

  it("should cancel previous calls", () => {
    const func = jest.fn()
    const debounced = debounce(func, 100)
    const event = new KeyboardEvent("keydown")

    debounced(event)
    debounced(event)
    debounced(event)

    jest.advanceTimersByTime(150)
    expect(func).toHaveBeenCalledTimes(1)
  })
})

describe("withoutTransition", () => {
  const originalGetComputedStyle = window.getComputedStyle

  beforeEach(() => {
    window.getComputedStyle = jest.fn().mockReturnValue({ opacity: "1" }) as jest.Mock<
      typeof window.getComputedStyle
    >
    jest.spyOn(document.head, "appendChild").mockImplementation((x) => x)
    jest.spyOn(document.head, "removeChild").mockImplementation((x) => x)
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16)
      return Math.random()
    })
  })

  afterEach(() => {
    window.getComputedStyle = originalGetComputedStyle
    jest.clearAllMocks()
  })

  it("should add and remove transition-disabling style", () => {
    const action = jest.fn()
    withoutTransition(action)

    expect(document.head.appendChild).toHaveBeenCalled()
    expect(action).toHaveBeenCalled()
    expect(document.head.removeChild).toHaveBeenCalled()
  })
})

describe("wrapWithoutTransition", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    global.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16)
      return Math.random()
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it("should wrap function execution with transition handling", () => {
    const func = jest.fn().mockReturnValue("result")
    const wrapped = wrapWithoutTransition(func)
    const addClassSpy = jest.spyOn(document.documentElement.classList, "add")
    const removeClassSpy = jest.spyOn(document.documentElement.classList, "remove")

    const result = wrapped()

    expect(addClassSpy).toHaveBeenCalledWith("temporary-transition")
    expect(func).toHaveBeenCalled()
    expect(result).toBe("result")

    jest.advanceTimersByTime(32) // Advance past both rAF calls
    expect(removeClassSpy).toHaveBeenCalledWith("temporary-transition")

    addClassSpy.mockRestore()
    removeClassSpy.mockRestore()
  })

  it("should throw error if function returns undefined", () => {
    const func = jest.fn().mockReturnValue(undefined)
    const wrapped = wrapWithoutTransition(func)

    expect(() => wrapped()).toThrow("Function returned undefined")
  })
})
