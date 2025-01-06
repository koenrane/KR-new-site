import { test, expect, Locator, Page } from "@playwright/test"

import { search, showingPreview, takeArgosScreenshot, setTheme } from "./visual_utils"

test.beforeEach(async ({ page }) => {
  // Mock clipboard API
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      value: () => Promise.resolve(),
      writable: true,
    })
  })

  // Log any console errors
  page.on("pageerror", (err) => console.error(err))

  await page.goto("http://localhost:8080/test-page", { waitUntil: "domcontentloaded" })

  // Dispatch the 'nav' event to initialize clipboard functionality
  await page.evaluate(() => {
    window.dispatchEvent(new Event("nav"))
  })
})

test.describe("Test page sections", () => {
  for (const theme of ["dark", "light"]) {
    test(`Test page in search preview in ${theme} mode`, async ({ page }, testInfo) => {
      // EG mobile doesn't show preview
      // For some reason, light theme fails - TODO
      test.skip(!showingPreview(page) || theme === "light")

      // Set theme first and wait for transition
      await setTheme(page, theme as "light" | "dark")

      await page.keyboard.press("/")
      await search(page, "Testing Site Features")
      const previewContainer = page.locator("#preview-container")
      await expect(previewContainer).toBeVisible()

      // Get the preview container's height from the article inside it
      const previewedArticle = previewContainer.locator("article")
      const boundingBoxArticle = await previewedArticle.boundingBox()
      if (!boundingBoxArticle) throw new Error("Could not get preview container dimensions")

      // Set viewport to match preview height
      await page.setViewportSize({
        width: page.viewportSize()?.width ?? 1920,
        height: Math.ceil(2 * boundingBoxArticle.height),
      })

      // The article needs to be tall to screenshot all of it
      await previewContainer.evaluate(
        (el, size) => {
          el.style.height = `${size.height}px`
        },
        {
          height: Math.ceil(1.5 * boundingBoxArticle.height),
        },
      )

      await takeArgosScreenshot(page, testInfo, `test-page-search-preview-${theme}`, {
        element: previewedArticle,
      })
    })

    test(`Test page in ${theme} mode`, async ({ page }, testInfo) => {
      await setTheme(page, theme as "light" | "dark")
      await takeArgosScreenshot(page, testInfo, `test-page-${theme}`)
    })
  }
})

test.describe("Various site pages", () => {
  for (const pageSlug of ["404", "all-tags", "recent", "tags/personal"]) {
    test(`${pageSlug}`, async ({ page }, testInfo) => {
      await page.goto(`http://localhost:8080/${pageSlug}`)
      await takeArgosScreenshot(page, testInfo, `test-page-${pageSlug}`)
    })
  }
})

const isDesktop = (page: Page): boolean => {
  const viewportSize = page.viewportSize()
  return (viewportSize && viewportSize.width > fullPageBreakpoint) || false
}

test.describe("Table of contents", () => {
  function getTableOfContentsSelector(page: Page) {
    return isDesktop(page) ? "#toc-content" : "*:has(> #toc-content-mobile)"
  }

  test("TOC is visible", async ({ page }) => {
    const selector = getTableOfContentsSelector(page)
    await expect(page.locator(selector)).toBeVisible()
  })

  test("TOC visual regression", async ({ page }, testInfo) => {
    const selector = getTableOfContentsSelector(page)
    if (!isDesktop(page)) {
      await page.locator(selector).locator(".callout-title-inner").first().click()
    }

    await takeArgosScreenshot(page, testInfo, selector)
  })
})

test.describe("Admonitions", () => {
  const waitAfterCollapse = 450 // Wait ms after collapsing to ensure transition is complete

  for (const theme of ["light", "dark"]) {
    test(`Opening and closing an admonition in ${theme} mode`, async ({ page }) => {
      await setTheme(page, theme as "light" | "dark")

      const admonition = page.locator("#test-collapse").first()
      await admonition.scrollIntoViewIfNeeded()

      // Verify the admonition starts in a collapsed state
      await expect(admonition).toHaveClass(/.*is-collapsed.*/)

      const initialScreenshot = await admonition.screenshot()

      // Check we can open the admonition
      await admonition.click()
      await page.waitForTimeout(waitAfterCollapse)
      const openedScreenshot = await admonition.screenshot()
      expect(openedScreenshot).not.toEqual(initialScreenshot)

      await expect(admonition).not.toHaveClass(/.*is-collapsed.*/)

      // Check we can close the admonition
      const admonitionTitle = page.locator("#test-collapse .callout-title").first()
      await admonitionTitle.click()
      await page.waitForTimeout(waitAfterCollapse)

      const closedScreenshot = await admonition.screenshot()
      expect(closedScreenshot).toEqual(initialScreenshot)

      // Check the admonition is back in a collapsed state
      await expect(admonition).toHaveClass(/.*is-collapsed.*/)
    })
  }

  for (const status of ["open", "closed"]) {
    test(`Regression testing on fold button appearance in ${status} state`, async ({
      page,
    }, testInfo) => {
      let element: Locator
      if (status === "open") {
        element = page.locator("#test-open .fold-callout-icon").first()
      } else {
        element = page.locator("#test-collapse .fold-callout-icon").first()
      }

      await takeArgosScreenshot(page, testInfo, `fold-button-appearance-${status}`, {
        element,
      })
    })
  }

  test("color demo text isn't wrapping", async ({ page }) => {
    for (const identifier of ["#light-demo", "#dark-demo"]) {
      // Get all paragraph elements within the demo
      const textElements = page.locator(`${identifier} > div > p`)
      const count = await textElements.count()

      // Iterate through each paragraph element
      for (let i = 0; i < count; i++) {
        const element = textElements.nth(i)

        // Get computed styles for this element
        const computedStyle = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el)
          return {
            lineHeight: parseFloat(styles.lineHeight),
            height: el.getBoundingClientRect().height,
          }
        })

        // Assert the height is not greater than line height
        expect(computedStyle.height).toBeLessThanOrEqual(computedStyle.lineHeight)
      }
    }
  })
})

test.describe("Clipboard button", () => {
  for (const theme of ["light", "dark"]) {
    test(`Clipboard button is visible when hovering over code block in ${theme} mode`, async ({
      page,
    }) => {
      await setTheme(page, theme as "light" | "dark")
      const clipboardButton = page.locator(".clipboard-button").first()
      await clipboardButton.scrollIntoViewIfNeeded()
      await expect(clipboardButton).toHaveCSS("opacity", "0")

      const codeBlock = page.locator("figure[data-rehype-pretty-code-figure]").first()
      await codeBlock.hover()
      await expect(clipboardButton).toHaveCSS("opacity", "1")
    })

    test(`Clicking the button changes it in ${theme} mode`, async ({ page }) => {
      await setTheme(page, theme as "light" | "dark")
      const clipboardButton = page.locator(".clipboard-button").first()
      const screenshotBeforeClicking = await clipboardButton.screenshot()

      await clipboardButton.click()
      const screenshotAfterClicking = await clipboardButton.screenshot()
      expect(screenshotAfterClicking).not.toEqual(screenshotBeforeClicking)
    })

    test(`Clipboard button in ${theme} mode`, async ({ page }, testInfo) => {
      await setTheme(page, theme as "light" | "dark")
      const clipboardButton = page.locator(".clipboard-button").first()
      await clipboardButton.click()

      await takeArgosScreenshot(page, testInfo, `clipboard-button-clicked-${theme}`, {
        element: clipboardButton,
        disableHover: false,
      })
    })
  }
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

  test("Scrolling down changes TOC highlight", async ({ page }, testInfo) => {
    const viewportSize = page.viewportSize()
    test.skip((viewportSize && viewportSize.width < fullPageBreakpoint) || false)

    const spoilerHeading = page.locator("#spoilers").first()
    await spoilerHeading.scrollIntoViewIfNeeded()

    const activeElement = page.locator("#table-of-contents .active").first()
    await takeArgosScreenshot(page, testInfo, "toc-highlight-scrolled", {
      element: activeElement,
    })
  })

  test("ContentMeta is visible", async ({ page }, testInfo) => {
    await takeArgosScreenshot(page, testInfo, "content-meta-visible", {
      element: "#content-meta",
    })
  })
  // TODO test backlinks
})

test.describe("Spoilers", () => {
  const waitAfterRevealing = 800 // ms

  for (const theme of ["light", "dark"]) {
    test(`Spoiler before revealing in ${theme} mode`, async ({ page }, testInfo) => {
      await setTheme(page, theme as "light" | "dark")
      const spoiler = page.locator(".spoiler-container").first()
      await takeArgosScreenshot(page, testInfo, `spoiler-before-revealing-${theme}`, {
        element: spoiler,
      })
    })

    test(`Spoiler after revealing in ${theme} mode`, async ({ page }, testInfo) => {
      await setTheme(page, theme as "light" | "dark")
      const spoiler = page.locator(".spoiler-container").first()
      await spoiler.scrollIntoViewIfNeeded()
      await expect(spoiler).toBeVisible()

      await spoiler.click()

      // Wait for the 'revealed' class to be added
      await expect(spoiler).toHaveClass(/revealed/)
      await page.waitForTimeout(waitAfterRevealing)

      await takeArgosScreenshot(page, testInfo, "spoiler-after-revealing", {
        element: spoiler,
      })

      // Click again to close
      await spoiler.click()
      await page.mouse.click(0, 0) // Click away to remove focus

      // Wait for the 'revealed' class to be removed
      await expect(spoiler).not.toHaveClass(/revealed/)
    })
  }

  // Test that hovering over the spoiler reveals it
  test("Hovering over spoiler reveals it", async ({ page }, testInfo) => {
    const spoiler = page.locator(".spoiler-container").first()
    await spoiler.scrollIntoViewIfNeeded()
    await expect(spoiler).toBeVisible()

    const initialScreenshot = await spoiler.screenshot()

    await spoiler.hover()
    const revealedScreenshot = await spoiler.screenshot()
    expect(revealedScreenshot).not.toEqual(initialScreenshot)

    await takeArgosScreenshot(page, testInfo, "spoiler-hover-reveal", {
      element: spoiler,
      disableHover: false,
    })
  })
})

test("Single letter dropcaps visual regression", async ({ page }, testInfo) => {
  const singleLetterDropcaps = page.locator("#single-letter-dropcap")
  await singleLetterDropcaps.scrollIntoViewIfNeeded()
  await takeArgosScreenshot(page, testInfo, "", {
    element: "#single-letter-dropcap",
  })
})

// TODO: hover over elvish text
