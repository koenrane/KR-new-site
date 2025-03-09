import { test, expect, type Page } from "@playwright/test"

import { type Theme } from "../scripts/darkmode"
import { setTheme as utilsSetTheme } from "./visual_utils"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page", { waitUntil: "load" })
  await page.emulateMedia({ colorScheme: "light" })
})

class DarkModeHelper {
  page: Page

  constructor(page: Page) {
    this.page = page
  }

  async getTheme(): Promise<string> {
    const theme = await this.page.evaluate(() => document.documentElement.getAttribute("theme"))
    return theme || "light"
  }

  async setTheme(theme: Theme): Promise<void> {
    await utilsSetTheme(this.page, theme)
  }

  async verifyTheme(expectedTheme: Theme): Promise<void> {
    const actualTheme =
      expectedTheme === "auto"
        ? await this.page.evaluate(() =>
            window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
          )
        : expectedTheme

    await expect(this.page.locator(":root")).toHaveAttribute("theme", actualTheme)
    await expect(this.page.locator("#day-icon")).toBeVisible({ visible: actualTheme === "light" })
    await expect(this.page.locator("#night-icon")).toBeVisible({ visible: actualTheme === "dark" })
  }

  async verifyStorage(expectedTheme: Theme): Promise<void> {
    const storedTheme = await this.page.evaluate(() => localStorage.getItem("saved-theme"))
    expect(storedTheme).toBe(expectedTheme)
  }

  async clickToggle(): Promise<void> {
    await this.page.locator("#theme-toggle").click()
  }

  async verifyAutoText(visible: boolean): Promise<void> {
    await expect(this.page.locator("#darkmode-auto-text")).toBeVisible({ visible })
  }
}

test("Dark mode toggle changes icon's visual state", async ({ page }) => {
  const helper = new DarkModeHelper(page)
  await helper.verifyTheme("light")
  const initialSpan = page.locator("#darkmode-span")
  const initialIcon = await initialSpan.screenshot()

  await helper.clickToggle()
  await expect(async () => {
    expect(await initialSpan.screenshot()).not.toEqual(initialIcon)
  }).toPass()
})

test("System preference changes are reflected in auto mode", async ({ page }) => {
  const helper = new DarkModeHelper(page)
  await helper.setTheme("auto")
  await helper.verifyAutoText(true)

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await helper.verifyTheme(scheme)

    // We're in auto mode the whole time
    await helper.verifyAutoText(true)
    await helper.verifyStorage("auto")
  }
})

test.describe("Theme persistence and UI states", () => {
  for (const theme of ["light", "dark", "auto"] as const) {
    test(`persists ${theme} theme across reloads`, async ({ page }) => {
      const helper = new DarkModeHelper(page)
      await helper.setTheme(theme)
      await helper.verifyAutoText(theme === "auto")

      await page.reload()
      await helper.verifyTheme(theme)
      await helper.verifyStorage(theme)
      await helper.verifyAutoText(theme === "auto")
    })
  }
})

test("Theme change event is emitted", async ({ page }) => {
  const helper = new DarkModeHelper(page)
  const themeChangePromise = page.evaluate(
    () =>
      new Promise((resolve) => {
        document.addEventListener("themechange", ((e: CustomEvent) => {
          resolve(e.detail.theme)
        }) as EventListener)
      }),
  )

  await helper.clickToggle()
  const [emittedTheme, currentTheme] = await Promise.all([themeChangePromise, helper.getTheme()])
  expect(emittedTheme).toBe(currentTheme)
})

// Verify that dark mode toggle works w/ both the real button and the helper
for (const useButton of [true, false]) {
  const method = useButton ? "clickToggle" : "setTheme"

  test(`Dark mode icons toggle correctly through states (method: ${method})`, async ({ page }) => {
    const helper = new DarkModeHelper(page)
    const states: Theme[] = ["auto", "light", "dark", "auto"]

    for (const [index, theme] of states.entries()) {
      await helper.verifyTheme(theme)
      await helper.verifyAutoText(theme === "auto")

      if (index < states.length - 1) {
        if (useButton) {
          await helper.clickToggle()
        } else {
          await helper.setTheme(states[index + 1])
        }
      }
    }
  })
}
