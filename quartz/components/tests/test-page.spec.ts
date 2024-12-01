import { test, expect } from "@playwright/test"

import { takeArgosScreenshot, setTheme } from "./visual_utils"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page")
})

test.describe("Admonitions", () => {
  test("Admonitions", async ({ page }, testInfo) => {
    await takeArgosScreenshot(page, testInfo, "admonitions", {
      element: "#admonitions",
    })
  })

  test("Dark mode admonitions", async ({ page }, testInfo) => {
    await setTheme(page, "dark")
    await takeArgosScreenshot(page, testInfo, "dark-mode-admonitions", {
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

test("Mermaid diagram", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "mermaid-diagram", {
    element: ".mermaid",
  })
})

test("Table styling", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "table-styling", {
    element: "table",
  })
})

test("Math rendering", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "math-section", {
    element: "#math",
  })
})

test("Typography examples", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "typography", {
    element: "#typography-examples",
  })
})

test("Emoji rendering", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "emoji", {
    element: "#emoji-examples",
  })
})
test("Dark mode admonitions", async ({ page }, testInfo) => {
  await setTheme(page, "dark")
  await takeArgosScreenshot(page, testInfo, "dark-mode-admonitions", {
    element: "#admonitions",
  })
})

test("Dark mode Mermaid diagram", async ({ page }, testInfo) => {
  await setTheme(page, "dark")
  await takeArgosScreenshot(page, testInfo, "dark-mode-mermaid", {
    element: ".mermaid",
  })
})

test("Spoiler before hover", async ({ page }, testInfo) => {
  await takeArgosScreenshot(page, testInfo, "spoiler-hidden", {
    element: "#spoilers",
  })
})

test("Spoiler during hover", async ({ page }, testInfo) => {
  const spoiler = page.locator(".spoiler").first()
  await spoiler.hover()
  await takeArgosScreenshot(page, testInfo, "spoiler-visible", {
    element: "#spoilers",
  })
})
test("Mobile table", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await takeArgosScreenshot(page, testInfo, "mobile-table", {
    element: "table",
  })
})

// Test that scrolling down halfway through page and then refreshing 3 times doesn't change the screenshot
test("Scrolling down halfway through page and then refreshing 3 times doesn't change the screenshot", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.scrollTo(0, 500)
  })

  // Screenshot the visible viewport
  await page.reload({ waitUntil: "load" })
  const referenceScreenshot = await page.screenshot()
  for (let i = 0; i < 3; i++) {
    await page.reload({ waitUntil: "load" })
    await page.waitForTimeout(200)
    const screenshot = await page.screenshot()
    expect(screenshot).toEqual(referenceScreenshot)
  }
})
