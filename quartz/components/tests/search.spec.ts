import { argosScreenshot, ArgosScreenshotOptions } from "@argos-ci/playwright"
import { test, expect, Page } from "@playwright/test"

import {
  desktopWidth,
  searchPlaceholderDesktop,
  searchPlaceholderMobile,
  debounceSearchDelay,
} from "../scripts/search"

const timeToWaitAfterSearch = debounceSearchDelay + 100

const defaultOptions: ArgosScreenshotOptions = { animations: "disabled" }

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/welcome")
})

async function search(page: Page, term: string) {
  const searchBar = page.locator("#search-bar")
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

test("Tag search opens with Ctrl+Shift+K", async ({ page }) => {
  const searchContainer = page.locator("#search-container")
  const searchBar = page.locator("#search-bar")

  // Open tag search
  await page.keyboard.press("Control+Shift+K")
  await expect(searchContainer).toHaveClass(/active/)
  await expect(searchBar).toHaveValue("#")

  // Take screenshot of tag search
  await argosScreenshot(page, "tag-search-open", {
    ...defaultOptions,
    element: "#search-container",
  })
})

test("Search results appear and can be navigated", async ({ page }) => {
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
  await expect(secondResult).toBeFocused()

  // Check that the preview appears if the width is greater than desktopWidth
  const shouldShowPreview = showingPreview(page)
  const previewContainer = page.locator("#preview-container")
  await expect(previewContainer).toBeVisible({ visible: Boolean(shouldShowPreview) })
  // Should have children -- means there's content
  await expect(previewContainer.first()).toBeVisible()

  // Take screenshot of search results
  await argosScreenshot(page, "search-results-preview-container", {
    ...defaultOptions,
    element: "#search-layout",
  })
})

test("Nothing shows up for nonsense search terms", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "zzzzzz")

  // Assert that there are no results
  const resultCards = page.locator(".result-card")
  await expect(resultCards).toHaveCount(1)
  await expect(resultCards.first()).toContainText("No results")
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

test("Enter key navigates to first result", async ({ page }) => {
  const initialUrl = page.url()
  await page.keyboard.press("/")
  await search(page, "test")

  await page.keyboard.press("Enter")

  expect(page.url()).not.toBe(initialUrl)
})

// Test emoji replacement
test("Emoji search works and is converted to twemoji", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "Testing site emoji")

  const firstResult = page.locator(".result-card").first()
  await expect(firstResult).toContainText("Emoji")
  if (showingPreview(page)) {
    await argosScreenshot(page, "search-results-preview-container", {
      ...defaultOptions,
      element: "#preview-container",
    })
  }

  await firstResult.click()
  expect(page.url()).toBe("http://localhost:8080/test-page")
})

// Test footnote back arrow replacement
test("Footnote back arrow is properly replaced", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "Testing site")

  const footnoteLink = page.locator("#preview-container a[data-footnote-backref]").first()
  await footnoteLink.scrollIntoViewIfNeeded()
  expect(footnoteLink).toContainText("⤴")
  await expect(footnoteLink).toBeVisible()

  await argosScreenshot(page, "search-results-preview-footnote-link", {
    ...defaultOptions,
    element: footnoteLink,
  })
})

// Test that images have mix-blend-mode: multiply

// Visual regression testing
test("Opens the 'testing site features' page", async ({ page }) => {
  await page.keyboard.press("/")
  await search(page, "Testing site")

  // Make sure it looks good
  const viewportSize = page.viewportSize()
  const shouldShowPreview = viewportSize?.width && viewportSize.width > desktopWidth
  if (shouldShowPreview) {
    await argosScreenshot(page, "search-results-preview-container", {
      ...defaultOptions,
      element: "#preview-container",
    })
  }

  const firstResult = page.locator(".result-card").first()
  await firstResult.click()

  const url = page.url()
  expect(url).toBe("http://localhost:8080/test-page")
})

test("Search preview shows after bad entry", async ({ page }) => {
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
