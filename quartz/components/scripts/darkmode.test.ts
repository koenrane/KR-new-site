/**
 * @jest-environment jsdom
 */

import { jest, describe, it, beforeEach, afterEach, expect } from "@jest/globals"

import { type FullSlug } from "../../util/path"
import { rotateTheme, setupDarkMode } from "./darkmode"

type MediaQueryCallback = (e: MediaQueryListEvent) => void

const createMockMediaQueryList = (
  matches: boolean,
): MediaQueryList & { addEventListener: jest.Mock } => ({
  matches,
  media: "(prefers-color-scheme: dark)",
  onchange: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: () => false,
  addListener: jest.fn(),
  removeListener: jest.fn(),
})

describe("darkmode", () => {
  let documentSpy: ReturnType<typeof jest.spyOn>
  let localStorageSpy: ReturnType<typeof jest.spyOn>
  let matchMediaSpy: jest.Mock<(query: string) => MediaQueryList>

  const triggerToggle = () => {
    const toggle = document.querySelector("#theme-toggle") as HTMLButtonElement
    toggle.click()
  }

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="darkmode-span">
        <button id="theme-toggle" type="button" aria-label="Toggle theme">
          <svg id="day-icon"></svg>
          <svg id="night-icon"></svg>
        </button>
        <p id="darkmode-auto-text">Auto</p>
      </div>
    `

    documentSpy = jest.spyOn(document, "dispatchEvent")
    localStorageSpy = jest.spyOn(Storage.prototype, "setItem")

    // Mock window.matchMedia
    matchMediaSpy = jest.fn((query: string) =>
      createMockMediaQueryList(query === "(prefers-color-scheme: dark)"),
    )
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaSpy,
    })

    localStorage.clear()

    // Mock component_script_utils.wrapWithoutTransition to not require return values
    jest.mock("./component_script_utils", () => ({
      wrapWithoutTransition:
        <Args extends unknown[], R>(fn: (...args: Args) => R) =>
        (...args: Args): R => {
          return fn(...args)
        },
    }))
  })

  afterEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    // Clean up window.matchMedia mock
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: undefined,
    })
  })

  describe("theme initialization", () => {
    for (const systemPrefers of ["dark", "light"]) {
      it(`should set theme to ${systemPrefers} when system prefers ${systemPrefers}`, () => {
        matchMediaSpy.mockReturnValue(createMockMediaQueryList(systemPrefers === "dark"))
        setupDarkMode()
        document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

        expect(document.documentElement.getAttribute("theme")).toBe(systemPrefers)
      })
    }

    it("should respect stored theme preference over system preference", () => {
      matchMediaSpy.mockReturnValue(createMockMediaQueryList(false)) // system prefers light
      localStorage.setItem("saved-theme", "dark")

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      expect(document.documentElement.getAttribute("theme")).toBe("dark")
    })
  })

  describe("theme toggle", () => {
    it("should emit theme change event when toggle is clicked", () => {
      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      triggerToggle()

      expect(documentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "themechange",
          detail: { theme: expect.any(String) },
        }),
      )
    })

    it("should update localStorage when theme is changed", () => {
      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      triggerToggle()

      // Initial theme is auto
      expect(localStorageSpy).toHaveBeenCalledWith("saved-theme", "auto")
    })
  })

  describe("system preference change", () => {
    it("should update theme when system preference changes", () => {
      const mediaQueryList = createMockMediaQueryList(false)
      matchMediaSpy.mockReturnValue(mediaQueryList)

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      // Get the callback that was registered
      const callback = mediaQueryList.addEventListener.mock.calls[0][1] as MediaQueryCallback

      // Simulate the media query change
      // skipcq: JS-0255
      callback({ matches: true } as MediaQueryListEvent)

      // Theme class and events should reflect the system preference (dark)
      expect(document.documentElement.getAttribute("theme")).toBe("dark")
      expect(documentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "themechange",
          detail: { theme: "dark" },
        }),
      )

      // But localStorage should preserve auto mode
      expect(localStorageSpy).toHaveBeenCalledWith("saved-theme", "auto")
    })
  })

  describe("auto mode", () => {
    it("should follow system preference when in auto mode", () => {
      localStorage.setItem("saved-theme", "auto")
      const mediaQueryList = createMockMediaQueryList(true)
      matchMediaSpy.mockReturnValue(mediaQueryList)

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      expect(document.documentElement.getAttribute("theme")).toBe("dark")

      // Change system preference to light
      const lightMediaQueryList = createMockMediaQueryList(false)
      matchMediaSpy.mockReturnValue(lightMediaQueryList)

      const callback = mediaQueryList.addEventListener.mock.calls[0][1] as MediaQueryCallback
      callback({ matches: false } as MediaQueryListEvent)

      expect(document.documentElement.getAttribute("theme")).toBe("light")
    })
  })

  describe("theme cycling", () => {
    it("should cycle through themes in order: auto -> light -> dark -> auto", () => {
      localStorage.setItem("saved-theme", "auto")
      // Mock a system preference of dark
      matchMediaSpy.mockReturnValue(createMockMediaQueryList(true))

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      const autoText = document.querySelector("#darkmode-auto-text")
      expect(autoText?.classList.contains("hidden")).toBe(false)

      // auto -> light
      rotateTheme()
      expect(localStorage.getItem("saved-theme")).toBe("light")
      expect(document.documentElement.getAttribute("theme")).toBe("light")
      expect(autoText?.classList.contains("hidden")).toBe(true)

      // light -> dark
      rotateTheme()
      expect(localStorage.getItem("saved-theme")).toBe("dark")
      expect(document.documentElement.getAttribute("theme")).toBe("dark")
      expect(autoText?.classList.contains("hidden")).toBe(true)

      // dark -> auto
      rotateTheme()
      expect(localStorage.getItem("saved-theme")).toBe("auto")
      expect(document.documentElement.getAttribute("theme")).toBe("dark")
      expect(autoText?.classList.contains("hidden")).toBe(false)
    })
  })
})
