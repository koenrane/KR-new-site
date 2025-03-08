/**
 * @jest-environment jsdom
 */

import { jest, describe, it, beforeEach, afterEach, expect } from "@jest/globals"

import { type FullSlug } from "../../util/path"
import { setupDarkMode } from "./darkmode"

type MediaQueryListMock = {
  matches: boolean
  media: string
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null
  addEventListener: jest.Mock
  removeEventListener: jest.Mock
  dispatchEvent: jest.Mock
  addListener: jest.Mock
  removeListener: jest.Mock
}

describe("darkmode", () => {
  let documentSpy: ReturnType<typeof jest.spyOn>
  let localStorageSpy: ReturnType<typeof jest.spyOn>
  let matchMediaSpy: jest.Mock

  const triggerToggle = (checked: boolean) => {
    const toggle = document.querySelector("#darkmode-toggle") as HTMLInputElement
    toggle.checked = checked
    toggle.dispatchEvent(new Event("change"))
  }

  beforeEach(() => {
    // Mock DOM elements
    document.body.innerHTML = `
          <div id="darkmode-span">
            <label>
              <input type="checkbox" id="darkmode-toggle" />
            </label>
            <p id="darkmode-auto-text">Auto</p>
          </div>
        `

    documentSpy = jest.spyOn(document, "dispatchEvent")
    localStorageSpy = jest.spyOn(Storage.prototype, "setItem")

    // Mock window.matchMedia
    matchMediaSpy = jest.fn((query: unknown) => ({
      matches: typeof query === "string" && query === "(prefers-color-scheme: dark)",
      media: typeof query === "string" ? query : "",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }))
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
    it("should set theme to dark when system prefers dark", () => {
      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      expect(document.documentElement.getAttribute("theme")).toBe("dark")
      const toggle = document.querySelector("#darkmode-toggle") as HTMLInputElement
      expect(toggle.checked).toBe(true)
    })

    it("should set theme to light when system prefers light", () => {
      matchMediaSpy.mockImplementation((query: unknown) => ({
        matches: typeof query === "string" && query === "(prefers-color-scheme: light)",
        media: typeof query === "string" ? query : "",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }))

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      expect(document.documentElement.getAttribute("theme")).toBe("light")
      const toggle = document.querySelector("#darkmode-toggle") as HTMLInputElement
      expect(toggle.checked).toBe(false)
    })

    it("should respect stored theme preference over system preference", () => {
      localStorage.setItem("saved-theme", "dark")
      matchMediaSpy.mockImplementation((query: unknown) => ({
        matches: typeof query === "string" && query === "(prefers-color-scheme: light)",
        media: typeof query === "string" ? query : "",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }))

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      expect(document.documentElement.getAttribute("theme")).toBe("dark")
      const toggle = document.querySelector("#darkmode-toggle") as HTMLInputElement
      expect(toggle.checked).toBe(true)
    })
  })

  describe("theme toggle", () => {
    it("should emit theme change event when toggle is clicked", () => {
      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      triggerToggle(true)

      expect(documentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "themechange",
          detail: { theme: "dark" },
        }),
      )
    })

    it("should update localStorage when theme is changed", () => {
      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "test-page" as FullSlug } }))

      triggerToggle(true)

      // Initial theme is auto
      expect(localStorageSpy).toHaveBeenCalledWith("saved-theme", "auto")
    })
  })

  describe("system preference change", () => {
    it("should update theme when system preference changes", () => {
      const mediaQueryList: MediaQueryListMock = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }

      matchMediaSpy.mockReturnValue(mediaQueryList)

      setupDarkMode()
      document.dispatchEvent(new CustomEvent("nav", { detail: { url: "" as FullSlug } }))

      // Get the callback that was registered
      const callback = mediaQueryList.addEventListener.mock.calls[0][1] as (
        e: MediaQueryListEvent,
      ) => void

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
})

// TODO add tests for auto mode
// TODO add tests for cycling through themes
