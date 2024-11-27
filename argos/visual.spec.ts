import { argosScreenshot } from "@argos-ci/playwright"
import { test } from "@playwright/test"

test.describe("Visual Regression Tests", () => {
  test("Homepage", async ({ page }) => {
    await page.goto("http://localhost:8080/welcome")
    // Wait for any animations/transitions to complete
    await page.waitForTimeout(500)
    await argosScreenshot(page, "homepage")
  })

  test("Dark mode", async ({ page }) => {
    await page.goto("http://localhost:8080/welcome")
    // Set dark mode
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark")
    })
    // Wait for any animations/transitions to complete
    await page.waitForTimeout(500)
    await argosScreenshot(page, "homepage-dark")
  })

  test("Design page", async ({ page }) => {
    await page.goto("http://localhost:8080/design")
    // Wait for ToC as per your current config
    // await page.waitForSelector("#table-of-contents")
    // await argosScreenshot(page, "design-page")
  })

  test("ToC highlighting", async ({ page }) => {
    await page.goto("http://localhost:8080/design")
    // await page.waitForSelector("#table-of-contents")
    // Capture just the ToC area
    // const toc = page.locator("#table-of-contents")
    // await argosScreenshot(page, "toc-highlighting", {
    //   clip: (await toc.boundingBox()) || undefined,
    // })
  })
})
