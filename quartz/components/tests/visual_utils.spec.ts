import { test, expect } from "@playwright/test"

import { yOffset, setTheme, getNextElementMatchingSelector } from "./visual_utils"

test.describe("visual_utils functions", () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForLoadState("networkidle")
    await page.goto("http://localhost:8080/test-page")
  })

  for (const theme of ["light", "dark"]) {
    test(`setTheme changes theme attribute to ${theme}`, async ({ page }) => {
      await setTheme(page, theme as "light" | "dark")
      const savedTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("saved-theme"),
      )
      expect(savedTheme).toBe(theme)
    })
  }

  test("yOffset between two headers returns correct positive offset", async ({ page }) => {
    const header1 = page.locator("h1").nth(0)
    const header2 = page.locator("h1").nth(1)

    const offset = await yOffset(header1, header2)
    expect(offset).toBeGreaterThan(0)
  })

  test("yOffset throws error when second element is above the first", async ({ page }) => {
    const header1 = page.locator("h2").nth(1)
    const header2 = page.locator("h2").nth(0)

    await expect(yOffset(header1, header2)).rejects.toThrow(
      "Second element is above the first element",
    )
  })

  test("getNextElementMatchingSelector finds the next h2 after a given h2", async ({ page }) => {
    const currentHeader = page.locator("h2").nth(1)
    const nextHeader = await getNextElementMatchingSelector(currentHeader, "h2")

    const trueNextHeader = page.locator("h2").nth(2)
    expect(await nextHeader.evaluate((el) => el.textContent)).toEqual(
      await trueNextHeader.evaluate((el) => el.textContent),
    )
  })

  test("getNextElementMatchingSelector throws error if no next element is found", async ({
    page,
  }) => {
    const headers = page.locator("h2")
    const lastHeaderIndex = (await headers.count()) - 1
    const lastHeader = headers.nth(lastHeaderIndex)

    await expect(getNextElementMatchingSelector(lastHeader, "h2")).rejects.toThrow(
      "No next element found",
    )
  })
})
