import { argosScreenshot, ArgosScreenshotOptions } from "@argos-ci/playwright"
import { test, expect, devices } from "@playwright/test"

const defaultOptions: ArgosScreenshotOptions = { animations: "disabled" }

test.use({
  ...devices["iPhone 12"],
  ...devices["iPad Pro"],
  ...devices["Desktop Chrome"],
})

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/welcome")
})

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
  const searchBar = page.locator("#search-bar")

  // Type search term
  await searchBar.fill("Steering")
  await page.waitForTimeout(300) // Wait for debounce

  // Check results appear
  const resultsContainer = page.locator("#results-container")
  await expect(resultsContainer).toBeVisible()
  const resultCards = page.locator(".result-card")
  await expect(resultCards.first()).toContainText("Steering")

  // Navigate with arrow keys
  await page.keyboard.press("ArrowDown")
  const secondResult = resultCards.nth(1)
  await expect(secondResult).toBeFocused()

  // Check that the preview appears if the width is greater than 1000
  const viewportSize = page.viewportSize()
  const shouldShowPreview = viewportSize?.width && viewportSize.width > 1000
  const previewContainer = page.locator("#preview-container")
  await expect(previewContainer).toBeVisible({ visible: Boolean(shouldShowPreview) })
  // Should have children -- means there's content
  await expect(previewContainer.first()).toBeVisible()

  // Take screenshot of search results
  await argosScreenshot(page, "search-results", { ...defaultOptions, element: "#search-layout" })
})

test("Nothing shows up for nonsense search terms", async ({ page }) => {
  await page.keyboard.press("/")
  const term = "zzzzzz"
  await page.locator("#search-bar").fill(term)

  // Wait for search results to update
  await page.waitForTimeout(300)

  // Wait for any loading states to complete
  await page.waitForLoadState("networkidle")

  // Assert that there are no results
  const resultCards = page.locator(".result-card")
  await expect(resultCards).toHaveCount(1)
  await expect(resultCards.first()).toContainText("No results")
})

test("Preview panel shows on desktop and hides on mobile", async ({ page }) => {
  await page.keyboard.press("/")
  await page.locator("#search-bar").fill("test")
  await page.waitForTimeout(300)

  const previewContainer = page.locator("#preview-container")
  const viewportSize = page.viewportSize()
  const shouldBeVisible = viewportSize?.width && viewportSize.width > 1000
  await expect(previewContainer).toBeVisible({ visible: Boolean(shouldBeVisible) })
})

test("Search placeholder changes based on viewport", async ({ page }) => {
  const searchBar = page.locator("#search-bar")

  // Desktop
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.keyboard.press("/")
  await expect(searchBar).toHaveAttribute("placeholder", "Toggle search by pressing /")

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(searchBar).toHaveAttribute("placeholder", "Search")
})

test("Highlighted search terms appear in results", async ({ page }) => {
  await page.keyboard.press("/")
  await page.locator("#search-bar").fill("test")
  await page.waitForTimeout(300)

  const highlights = page.locator(".highlight")
  await expect(highlights).toHaveCount(10)
  await expect(highlights.first()).toContainText("test", { ignoreCase: true })
})

test("Enter key navigates to first result", async ({ page }) => {
  await page.keyboard.press("/")
  await page.locator("#search-bar").fill("test")
  await page.waitForTimeout(300)

  const initialUrl = page.url()
  await page.keyboard.press("Enter")

  // URL should change after navigation
  expect(page.url()).not.toBe(initialUrl)
})
