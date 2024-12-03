import { test, expect, Locator } from "@playwright/test"

import {
  takeArgosScreenshot,
  takeScreenshotAfterElement,
  setTheme,
  yOffset,
  getNextElementMatchingSelector,
} from "./visual_utils"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page")
})

// Automatical visual regression test for each section on the page
test.describe("Sections", () => {
  for (const theme of ["light", "dark"]) {
    test(`Sections in ${theme} mode`, async ({ page }, testInfo) => {
      await setTheme(page, theme as "light" | "dark")

      const headers: Locator[] = await page.locator("h1").all()
      for (let index = 0; index < headers.length - 1; index++) {
        const header = headers[index]
        const nextHeader = headers[index + 1]
        const offset = await yOffset(header, nextHeader)

        // Only screenshot up to where the next section begins
        await takeScreenshotAfterElement(page, testInfo, header, offset, `${theme}-${index}`)
      }
    })
  }
})

test.describe("Admonitions", () => {
  const waitAfterCollapse = 450 // Wait ms after collapsing to ensure transition is complete

  for (const theme of ["light", "dark"]) {
    test(`Nested admonition icon is the same as the non-nested admonition icon in ${theme} mode`, async ({
      page,
    }) => {
      await setTheme(page, theme as "light" | "dark")
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

    test(`Opening and closing an admonition in ${theme} mode`, async ({ page }) => {
      await setTheme(page, theme as "light" | "dark")
      const admonition = page.locator(".is-collapsible:has(.callout-title)").first()
      await admonition.scrollIntoViewIfNeeded()
      const initialScreenshot = await admonition.screenshot()

      const admonitionTitle = page.locator(".is-collapsible .callout-title").first()
      await admonitionTitle.click()
      await page.waitForTimeout(waitAfterCollapse)
      await expect(admonition).not.toHaveClass(/.*is-collapsed.*/)

      const openedScreenshot = await admonition.screenshot()
      expect(openedScreenshot).not.toEqual(initialScreenshot)

      await admonitionTitle.click()
      await page.waitForTimeout(waitAfterCollapse)
      await expect(admonition).toHaveClass(/.*is-collapsed.*/)

      const closedScreenshot = await admonition.screenshot()
      expect(closedScreenshot).toEqual(initialScreenshot)
    })
  }

  for (const status of ["open", "closed"]) {
    test(`Regression testing on fold button appearance in ${status} state`, async ({
      page,
    }, testInfo) => {
      let element: Locator
      if (status === "open") {
        element = page.locator(".fold-callout-icon:not(.is-collapsed *)").first()
      } else {
        element = page.locator(".is-collapsed .fold-callout-icon").first()
      }

      await takeArgosScreenshot(page, testInfo, `fold-button-appearance-${status}`, {
        element,
      })
    })
  }
})
test.describe("Clipboard button", () => {
  test("Clipboard button is visible when hovering over code block", async ({ page }) => {
    const clipboardButton = page.locator(".clipboard-button").first()
    await clipboardButton.scrollIntoViewIfNeeded()
    await expect(clipboardButton).toHaveCSS("opacity", "0")

    const codeBlock = page.locator("figure[data-rehype-pretty-code-figure]").first()
    await codeBlock.hover()
    await expect(clipboardButton).toHaveCSS("opacity", "1")
  })
})

const fullPageBreakpoint = 1580 // px
test.describe("Right sidebar", () => {
  test("TOC visual test", async ({ page }, testInfo) => {
    const viewportSize = page.viewportSize()
    if (viewportSize && viewportSize.width < fullPageBreakpoint) {
      // Open the TOC
      const tocContent = page.locator(".callout").first()
      await tocContent.click()
      await takeArgosScreenshot(page, testInfo, "toc-visual-test-open", {
        element: tocContent,
      })
    } else {
      const rightSidebar = page.locator("#right-sidebar")
      await takeArgosScreenshot(page, testInfo, "toc-visual-test", {
        element: rightSidebar,
      })
    }
  })

  test("ContentMeta is visible", async ({ page }, testInfo) => {
    await takeArgosScreenshot(page, testInfo, "content-meta-visible", {
      element: "#content-meta",
    })
  })
})
// Test that scrolling down halfway through page and then refreshing 3 times doesn't change the screenshot
// test("Scrolling down halfway through page and then refreshing 3 times doesn't change the screenshot", async ({
//   page,
// }) => {
//   await page.evaluate(() => {
//     window.scrollTo(0, 500)
//   })

//   // Screenshot the visible viewport
//   await page.reload({ waitUntil: "load" })
//   const referenceScreenshot = await page.screenshot()
//   for (let i = 0; i < 3; i++) {
//     await page.reload({ waitUntil: "load" })
//     await page.waitForTimeout(200)
//     const screenshot = await page.screenshot()
//     expect(screenshot).toEqual(referenceScreenshot)
//   }
// })
