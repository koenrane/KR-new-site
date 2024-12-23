import { test, expect, Page } from "@playwright/test"

import {
  desktopWidth,
  searchPlaceholderDesktop,
  searchPlaceholderMobile,
  debounceSearchDelay,
} from "../scripts/search"
import { takeArgosScreenshot, setTheme } from "./visual_utils"

const timeToWaitAfterSearch = debounceSearchDelay + 100

test.beforeEach(async ({ page }) => {
  await page.waitForLoadState("networkidle")
  await page.goto("http://localhost:8080/welcome")
})

async function search(page: Page, term: string) {
  const searchBar = page.locator("#search-bar")

  await expect(searchBar).toBeVisible()
  await searchBar.focus()

  await searchBar.fill(term)
  await page.waitForTimeout(timeToWaitAfterSearch)
}

function showingPreview(page: Page): boolean {
  const viewportSize = page.viewportSize()
  const shouldShowPreview = viewportSize?.width && viewportSize.width > desktopWidth
  return Boolean(shouldShowPreview)
}

test("Search opens with '/' and closes with Escape", async ({ page }) => {
  const searchContainer = page.locator("#search-container")
  const searchBar = page.locator("#search-bar")

  // Initial state
  await expect(searchContainer).not.toHaveClass(/active/)

  // Open with "/"
  await page.keyboard.press("/")
  await expect(searchContainer).toHaveClass(/active/)
  await expect(searchBar).toBeFocused()

  // Close with Escape
  await page.keyboard.press("Escape")
  await expect(searchContainer).not.toHaveClass(/active/)
})

test("Search results appear and can be navigated", async ({ page }, testInfo) => {
  // Open search
  await page.keyboard.press("/")

  // Type search term
  await search(page, "Steering")

  // Check results appear
  const resultsContainer = page.locator("#results-container")
  await expect(resultsContainer).toBeVisible()
  const resultCards = page.locator(".result-card")
  await expect(resultCards.first()).toContainText("Steering")

  // Navigate with arrow keys
  await page.keyboard.press("ArrowDown")
  const secondResult = resultCards.nth(1)
  await expect(secondResult).toHaveClass(/focus/)

  // Check that the preview appears if the width is greater than desktopWidth
  const shouldShowPreview = showingPreview(page)
  const previewContainer = page.locator("#preview-container")
  await expect(previewContainer).toBeVisible({ visible: Boolean(shouldShowPreview) })
  // Should have children -- means there's content
  await expect(previewContainer.first()).toBeVisible({ visible: Boolean(shouldShowPreview) })

  // Take screenshot of search results
  await takeArgosScreenshot(page, testInfo, "", {
    element: "#search-layout",
  })
})

test("Preview panel shows on desktop and hides on mobile", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "test")

  const previewContainer = page.locator("#preview-container")
  const viewportSize = page.viewportSize()
  const shouldBeVisible = viewportSize?.width && viewportSize.width > desktopWidth
  await expect(previewContainer).toBeVisible({ visible: Boolean(shouldBeVisible) })
})

test("Search placeholder changes based on viewport", async ({ page }) => {
  const searchBar = page.locator("#search-bar")
  const pageWidth = page.viewportSize()?.width
  const showShortcutPlaceholder = pageWidth && pageWidth >= desktopWidth

  await page.keyboard.press("/")
  await expect(searchBar).toHaveAttribute(
    "placeholder",
    showShortcutPlaceholder ? searchPlaceholderDesktop : searchPlaceholderMobile,
  )
})

test("Highlighted search terms appear in results", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "test")

  const highlights = page.locator(".highlight")
  await expect(highlights.first()).toContainText("test", { ignoreCase: true })
})

test("Search results are case-insensitive", async ({ page }) => {
  await page.keyboard.press("/")

  await search(page, "TEST")
  const uppercaseResults = await page.locator(".result-card").all()

  await search(page, "test")
  const lowerCaseResults = await page.locator(".result-card").all()

  expect(uppercaseResults).toEqual(lowerCaseResults)
})

test("Search results work for a single character", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "t")

  const results = await page.locator(".result-card").all()

  // If there's only one result, it's probably just "nothing found"
  expect(results).not.toHaveLength(1)
})

test.describe("Search accuracy", () => {
  const searchTerms = [
    { term: "Josh Turner" },
    { term: "The Pond" },
    { term: "United States government" },
  ]
  searchTerms.forEach(({ term }) => {
    test(`Search results prioritize full term matches for ${term}`, async ({ page }) => {
      await page.keyboard.press("/")
      await search(page, term)

      const firstResult = page.locator("#preview-container").first()
      await expect(firstResult).toContainText(term)
    })
  })

  const titleTerms = ["AI presidents", "AI President", "Alignment"]
  titleTerms.forEach((term) => {
    test(`Title search results are ordered before content search results for ${term}`, async ({
      page,
    }) => {
      await page.keyboard.press("/")
      await search(page, term)

      const firstResult = page.locator(".result-card").first()
      const firstText = await firstResult.textContent()
      expect(firstText?.toLowerCase()).toContain(term.toLowerCase())
    })
  })

  const previewTerms = ["Shrek", "AI presidents", "virus", "Emoji"]
  previewTerms.forEach((term) => {
    test(`Term ${term} is previewed in the viewport`, async ({ page }) => {
      if (!showingPreview(page)) {
        test.skip()
      }
      await page.keyboard.press("/")
      await search(page, term)

      const previewContent = page.locator("#preview-container > article")
      await expect(previewContent).toBeVisible()

      // Get first highlighted match
      const highlightedMatches = previewContent.locator(`span.highlight:text("${term}")`).first()
      expect(highlightedMatches).toBeInViewport()
    })
  })

  test("Slug search results are ordered before content search results for date-me", async ({
    page,
  }) => {
    await page.keyboard.press("/")
    await search(page, "date-me")

    const firstResult = page.locator("#preview-container").first()
    await expect(firstResult).toContainText("wife")
  })

  test("Nothing shows up for nonsense search terms", async ({ page }) => {
    await page.keyboard.press("/")
    await search(page, "feiwopqclvxk")

    const resultCards = page.locator(".result-card")
    await expect(resultCards).toHaveCount(1)
    await expect(resultCards.first()).toContainText("No results")
  })

  test("AI presidents doesn't use dropcap", async ({ page }) => {
    if (!showingPreview) {
      test.skip()
    }

    await page.keyboard.press("/")
    await search(page, "AI presidents")

    const previewElement = page.locator("#preview-container > article")
    expect(previewElement).toHaveAttribute("data-use-dropcap", "false")
  })

  test("Test page does use dropcap", async ({ page }) => {
    await page.keyboard.press("/")
    await search(page, "test")

    const previewElement = page.locator("#preview-container > article")
    expect(previewElement).toHaveAttribute("data-use-dropcap", "true")
  })
})

test("Search preview footnote backref has no underline", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "test")

  const footnoteLink = page.locator("#preview-container a[data-footnote-backref]").first()
  await expect(footnoteLink).toHaveCSS("text-decoration", /^none/)
})

test("Enter key navigates to first result", async ({ page }) => {
  const initialUrl = page.url()
  await page.keyboard.press("/")
  await search(page, "test")

  await page.keyboard.press("Enter")

  expect(page.url()).not.toBe(initialUrl)
})

test("Search URL updates as we select different results", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }

  // Open search and type "Shrek"
  await page.keyboard.press("/")
  await search(page, "Shrek")
  const previewContainer = page.locator("#preview-container")

  // Hover over the first result and click the preview
  const firstResult = page.locator(".result-card").first()
  await firstResult.hover()
  await previewContainer.click()

  // Wait for navigation to complete and get the URL
  await page.waitForLoadState("networkidle")
  const firstResultUrl = page.url()

  await page.keyboard.press("/")
  await search(page, "Shrek")

  // Hover over the second result and click the preview
  const secondResult = page.locator(".result-card").nth(1)
  await secondResult.hover()
  await previewContainer.click()

  // Wait for navigation and get the new URL
  await page.waitForLoadState("networkidle")
  const secondResultUrl = page.url()

  // Verify that the URLs are different
  expect(secondResultUrl).not.toBe(firstResultUrl)
})

test("Emoji search works and is converted to twemoji", async ({ page }, testInfo) => {
  await page.keyboard.press("/")
  await search(page, "Emoji examples")

  const firstResult = page.locator(".result-card").first()
  // Assertion on the title's contents for the first result
  await expect(firstResult).toContainText("Testing Site Features")
  if (showingPreview(page)) {
    await takeArgosScreenshot(page, testInfo, "", {
      element: "#preview-container",
    })
  }

  await firstResult.click()
  expect(page.url()).toBe("http://localhost:8080/test-page")
})

//  Test shouldn't pass yet
test("Footnote back arrow is properly replaced", async ({ page }, testInfo) => {
  if (!showingPreview(page)) {
    test.skip()
  }
  await page.keyboard.press("/")
  await search(page, "Testing site")

  const footnoteLink = page.locator("#preview-container a[data-footnote-backref]").first()
  await footnoteLink.scrollIntoViewIfNeeded()
  expect(footnoteLink).toContainText("⤴")
  await expect(footnoteLink).toBeVisible()

  await takeArgosScreenshot(page, testInfo, "", {
    element: footnoteLink,
  })
})

test.describe("Image's mix-blend-mode attribute", () => {
  test.beforeEach(async ({ page }) => {
    await page.keyboard.press("/")
    await search(page, "Testing site")
  })

  test("is multiply in light mode", async ({ page }) => {
    const image = page.locator("#preview-container img").first()
    await expect(image).toHaveCSS("mix-blend-mode", "multiply")
  })

  test("is normal in dark mode", async ({ page }) => {
    await setTheme(page, "dark")
    const image = page.locator("#preview-container img").first()
    await expect(image).toHaveCSS("mix-blend-mode", "normal")
  })
})

// Visual regression testing
test("Opens the 'testing site features' page", async ({ page }, testInfo) => {
  await page.keyboard.press("/")
  await search(page, "Testing site")

  // Make sure it looks good
  const viewportSize = page.viewportSize()
  const shouldShowPreview = viewportSize?.width && viewportSize.width > desktopWidth
  if (shouldShowPreview) {
    await takeArgosScreenshot(page, testInfo, "", {
      element: "#preview-container",
    })
  }

  const firstResult = page.locator(".result-card").first()
  await firstResult.click()

  const url = page.url()
  expect(url).toBe("http://localhost:8080/test-page")
})

test("Search preview shows after bad entry", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }
  await page.keyboard.press("/")
  await search(page, "zzzzzz")
  await search(page, "Testing site")
  await search(page, "zzzzzz")
  await search(page, "Testing site")

  const previewContainer = page.locator("#preview-container")
  await expect(previewContainer).toBeVisible()

  // If preview fails, it'll have no children
  const previewContent = previewContainer.locator(":scope > *")
  await expect(previewContent).toHaveCount(1)
})

test("Search preview shows after searching, closing, and reopening", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }
  const previewContainer = page.locator("#preview-container")

  await page.keyboard.press("/")
  await search(page, "Testing site")
  await expect(previewContainer).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(previewContainer).not.toBeVisible()

  await page.keyboard.press("/")
  await expect(previewContainer).not.toBeVisible()
  await search(page, "Shrek")
  await expect(previewContainer).toBeVisible()
})

test("Show search preview, search invalid, then show again", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }
  await page.keyboard.press("/")
  await search(page, "Testing site")
  await search(page, "zzzzzz")
  await search(page, "Testing site")

  const previewContainer = page.locator("#preview-container")
  await expect(previewContainer).toBeVisible()

  // If preview fails, it'll have no children
  const previewContent = previewContainer.locator(":scope > *")
  await expect(previewContent).toHaveCount(1)
})

test("The pond dropcaps, search preview visual regression test", async ({ page }, testInfo) => {
  if (!showingPreview(page)) {
    test.skip()
  }

  await page.keyboard.press("/")
  await search(page, "Testing site")
  const searchPondDropcaps = page.locator("#the-pond-dropcaps")
  await searchPondDropcaps.scrollIntoViewIfNeeded()

  await takeArgosScreenshot(page, testInfo, "", {
    element: "#the-pond-dropcaps",
  })
})

test("Single letter dropcaps, search preview visual regression test", async ({
  page,
}, testInfo) => {
  if (!showingPreview(page)) {
    test.skip()
  }

  await page.goto("http://localhost:8080/test-page")
  const singleLetterDropcaps = page.locator("#single-letter-dropcap")
  await singleLetterDropcaps.scrollIntoViewIfNeeded()
  await takeArgosScreenshot(page, testInfo, "", {
    element: "#single-letter-dropcap",
  })
})

test("Preview container click navigates to the correct page", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }

  // Set viewport to desktop size to ensure preview is visible
  await page.setViewportSize({ width: desktopWidth + 100, height: 800 })

  // Open search and type a term
  await page.keyboard.press("/")
  await search(page, "Testing site")

  // Get the URL of the first result for comparison
  const firstResult = page.locator(".result-card").first()
  const expectedUrl = await firstResult.getAttribute("href")

  // Click the preview container
  const previewContainer = page.locator("#preview-container")
  await previewContainer.click()

  // Verify navigation occurred to the correct URL
  expect(page.url()).toBe(expectedUrl)
})

test("Result card highlighting stays synchronized with preview", async ({ page }) => {
  if (!showingPreview(page)) {
    test.skip()
  }

  await page.keyboard.press("/")
  await search(page, "test")

  // Check initial state
  const firstResult = page.locator(".result-card").first()
  await expect(firstResult).toHaveClass(/focus/)

  // Check keyboard navigation
  await page.keyboard.press("ArrowDown")
  const secondResult = page.locator(".result-card").nth(1)
  await expect(secondResult).toHaveClass(/focus/)
  await expect(firstResult).not.toHaveClass(/focus/)

  // Check mouse interaction
  const thirdResult = page.locator(".result-card").nth(2)
  await thirdResult.hover()
  await expect(thirdResult).toHaveClass(/focus/)
  await expect(secondResult).not.toHaveClass(/focus/)
})

const navigationMethods = [
  { down: "ArrowDown", up: "ArrowUp", description: "arrow keys" },
  { down: "Tab", up: "Shift+Tab", description: "tab keys" },
] as const

navigationMethods.forEach(({ down, up, description }) => {
  test(`maintains focus when navigating with ${description}`, async ({ page }) => {
    await page.keyboard.press("/")
    await search(page, "Testing Site Features")

    const totalResults = await page.locator(".result-card").count()

    // Navigate down through results
    for (let i = 0; i < totalResults; i++) {
      await page.keyboard.press(down)
      const focusedResults = await page.locator(".result-card.focus").count()
      expect(focusedResults).toBe(1)
    }

    // Navigate up through results
    for (let i = 0; i < totalResults; i++) {
      await page.keyboard.press(up)
      const focusedResults = await page.locator(".result-card.focus").count()
      expect(focusedResults).toBe(1)
    }
  })
})
