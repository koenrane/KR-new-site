import { jest } from "@jest/globals"

describe("SPA Navigation", () => {
  beforeEach(() => {
    // Mock window and sessionStorage
    Object.defineProperty(window, "sessionStorage", {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Mock scrollTo and scrollY
    Object.defineProperty(window, "scrollTo", {
      value: jest.fn(),
      writable: true,
    })
    Object.defineProperty(window, "scrollY", {
      value: 100,
      writable: true,
    })

    // Mock spaNavigate
    Object.defineProperty(window, "spaNavigate", {
      value: jest.fn().mockImplementation(() => Promise.resolve()),
      writable: true,
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("should save scroll position when navigating forward", async () => {
    const currentUrl = "http://example.com/page1"
    const nextUrl = new URL("http://example.com/page2")

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: new URL(currentUrl),
      writable: true,
    })

    // Simulate navigation
    await window.spaNavigate(nextUrl, false)

    // Check if scroll position was saved
    expect(sessionStorage.setItem).toHaveBeenCalledWith(`scrollPos:${currentUrl}`, "100")
  })

  it("should restore scroll position when navigating back", async () => {
    const url = new URL("http://example.com/page1")
    const savedScrollPos = "250"

    // Mock getting saved scroll position
    jest.mocked(sessionStorage.getItem).mockReturnValue(savedScrollPos)

    // Simulate back navigation
    await window.spaNavigate(url, true)

    // Check if scroll was restored
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 250,
      behavior: "instant",
    })
  })

  it("should handle multiple page navigation history", async () => {
    const urls = [
      "http://example.com/page1",
      "http://example.com/page2",
      "http://example.com/page3",
    ]
    const scrollPositions = [100, 200, 300]

    // Simulate forward navigation through pages
    for (let i = 0; i < urls.length; i++) {
      Object.defineProperty(window, "scrollY", {
        value: scrollPositions[i],
        writable: true,
      })
      Object.defineProperty(window, "location", {
        value: new URL(urls[i]),
        writable: true,
      })

      if (i < urls.length - 1) {
        await window.spaNavigate(new URL(urls[i + 1]), false)

        // Verify scroll position was saved
        expect(sessionStorage.setItem).toHaveBeenCalledWith(
          `scrollPos:${urls[i]}`,
          scrollPositions[i].toString(),
        )
      }
    }

    // Simulate backward navigation
    for (let i = urls.length - 1; i > 0; i--) {
      jest.mocked(sessionStorage.getItem).mockReturnValue(scrollPositions[i - 1].toString())

      await window.spaNavigate(new URL(urls[i - 1]), true)

      // Verify scroll position was restored
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: scrollPositions[i - 1],
        behavior: "instant",
      })
    }
  })

  it("should handle missing scroll positions gracefully", async () => {
    const url = new URL("http://example.com/page1")

    // Mock missing scroll position
    jest.mocked(sessionStorage.getItem).mockReturnValue(null)

    // Simulate back navigation
    await window.spaNavigate(url, true)

    // Should not throw error, scroll should not be modified
    expect(window.scrollTo).not.toHaveBeenCalled()
  })
})
