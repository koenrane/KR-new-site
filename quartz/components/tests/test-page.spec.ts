import { argosScreenshot, ArgosScreenshotOptions } from "@argos-ci/playwright"
import { test, expect } from "@playwright/test"

const defaultOptions: ArgosScreenshotOptions = { animations: "disabled" }

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page")
})

test("Overall page layout", async ({ page }) => {
  await argosScreenshot(page, "test-page-full", defaultOptions)
})

test.describe("Admonitions", () => {
  test("Admonitions", async ({ page }) => {
    await argosScreenshot(page, "admonitions", {
      ...defaultOptions,
      element: "#admonitions",
    })
  })

  test("Dark mode admonitions", async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add("dark")
    })
    await argosScreenshot(page, "dark-mode-admonitions", {
      ...defaultOptions,
      element: "#admonitions",
    })
  })

  test("Nested admonition icon is the same as the non-nested admonition icon", async ({ page }) => {
    const normalAdmonition = page.locator(".note .callout-icon").first()
    const nestedAdmonition = page.locator(".quote .note .callout-icon").first()

    const screenshots: string[] = []
    for (const admonition of [normalAdmonition, nestedAdmonition]) {
      await admonition.scrollIntoViewIfNeeded()
      await expect(admonition).toBeVisible()
      screenshots.push((await admonition.screenshot()).toString("base64"))
    }

    expect(screenshots[0]).toEqual(screenshots[1])
  })
})

test("Mermaid diagram", async ({ page }) => {
  await argosScreenshot(page, "mermaid-diagram", {
    ...defaultOptions,
    element: ".mermaid",
  })
})

test("Table styling", async ({ page }) => {
  await argosScreenshot(page, "table-styling", {
    ...defaultOptions,
    element: "table",
  })
})

test("Math rendering", async ({ page }) => {
  await argosScreenshot(page, "math-section", {
    ...defaultOptions,
    element: "#math",
  })
})

test("Typography examples", async ({ page }) => {
  await argosScreenshot(page, "typography", {
    ...defaultOptions,
    element: "#typography-examples",
  })
})

test("Emoji rendering", async ({ page }) => {
  await argosScreenshot(page, "emoji", {
    ...defaultOptions,
    element: "#emoji-examples",
  })
})

test("Dark mode full page", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
  })
  await page.waitForTimeout(200)
  await argosScreenshot(page, "dark-mode-full", defaultOptions)
})

test("Dark mode admonitions", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
  })
  await page.waitForTimeout(200)
  await argosScreenshot(page, "dark-mode-admonitions", {
    ...defaultOptions,
    element: "#admonitions",
  })
})

test("Dark mode Mermaid diagram", async ({ page }) => {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
  })
  await page.waitForTimeout(200)
  await argosScreenshot(page, "dark-mode-mermaid", {
    ...defaultOptions,
    element: ".mermaid",
  })
})

test("Spoiler before hover", async ({ page }) => {
  await argosScreenshot(page, "spoiler-hidden", {
    ...defaultOptions,
    element: "#spoilers",
  })
})

test("Spoiler during hover", async ({ page }) => {
  const spoiler = page.locator(".spoiler").first()
  await spoiler.hover()
  await argosScreenshot(page, "spoiler-visible", {
    ...defaultOptions,
    element: "#spoilers",
  })
})

test("Mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }) // iPhone 12 Pro dimensions
  await argosScreenshot(page, "mobile-full", defaultOptions)
})

test("Mobile table", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await argosScreenshot(page, "mobile-table", {
    ...defaultOptions,
    element: "table",
  })
})
