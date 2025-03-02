import { test, expect } from "@playwright/test"

import { takeRegressionScreenshot } from "./visual_utils"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page", { waitUntil: "load" })
  await page.reload()

  await page.evaluate(() => window.scrollTo(0, 0))
})

test("Internal links show popover on hover (lostpixel)", async ({ page }, testInfo) => {
  // TODO choose consistent link
  const internalLink = page.locator(".internal").first()
  await expect(internalLink).toBeVisible()

  // Initial state - no popover
  let popover = page.locator(".popover")
  await expect(popover).not.toBeVisible()

  // Hover over link
  await internalLink.hover()
  popover = page.locator(".popover")
  await expect(popover).toBeVisible()
  await expect(popover).toHaveClass(/popover-visible/)
  await takeRegressionScreenshot(page, testInfo, "first-visible-popover", {
    element: popover,
  })

  // Move mouse away
  await page.mouse.move(0, 0)
  await expect(popover).not.toBeVisible()
})

test("External links do not show popover on hover (lostpixel)", async ({ page }) => {
  const externalLink = page.locator(".external").first()
  await expect(externalLink).toBeVisible()

  // Initial state - no popover
  let popover = page.locator(".popover")
  await expect(popover).not.toBeVisible()

  // Hover over link
  await externalLink.hover()
  popover = page.locator(".popover")
  await expect(popover).not.toBeVisible()
})

test("Popover content matches target page content", async ({ page }) => {
  const internalLink = page.locator(".internal").first()
  const linkHref = await internalLink.getAttribute("href")
  await expect(internalLink).toBeVisible()

  // Hover and wait for popover
  await internalLink.hover()
  const popover = page.locator(".popover")
  await expect(popover).toBeVisible()

  // Check content matches
  const popoverContent = await popover.locator(".popover-inner").textContent()
  const sameLink = page.locator(`.internal[href="${linkHref}"]`)
  await sameLink.click()

  const pageContent = await page.locator(".popover-hint").first().textContent()
  expect(popoverContent).toContain(pageContent)
})

test("Multiple popovers don't stack", async ({ page }) => {
  // Get two different internal links
  const firstLink = page.locator(".internal").first()
  const secondLink = page.locator(".internal").nth(1)
  await expect(firstLink).toBeVisible()
  await expect(secondLink).toBeVisible()

  // Hover first link
  await firstLink.hover()
  const popover = page.locator(".popover")
  await expect(popover).toBeVisible()
  let popovers = await page.locator(".popover").count()
  expect(popovers).toBe(1)

  // Hover second link
  await secondLink.hover()
  await expect(popover).toBeVisible()
  popovers = await page.locator(".popover").count()
  expect(popovers).toBe(1)
})

test("Popover updates position on window resize", async ({ page }) => {
  const internalLink = page.locator(".internal").first()
  await expect(internalLink).toBeVisible()

  // Show popover
  await internalLink.hover()
  const popover = page.locator(".popover")
  await expect(popover).toBeVisible()

  // Get initial position
  const initialRect = await popover.boundingBox()

  // Resize viewport
  await page.setViewportSize({ width: 800, height: 600 })

  // Get new position and wait for it to change
  await expect(async () => {
    const newRect = await popover.boundingBox()
    expect(newRect).not.toEqual(initialRect)
  }).toPass()
})

test("Popover scrolls to hash target", async ({ page }) => {
  // Find a link with a hash
  const hashLink = page.locator(".internal[href*='#']").first()
  await expect(hashLink).toBeVisible()

  // Show popover
  await hashLink.hover()
  const popover = page.locator(".popover")
  await expect(popover).toBeVisible()

  // Get hash target scroll position and wait for scroll
  const popoverInner = popover.locator(".popover-inner")
  await expect(async () => {
    const scrollTop = await popoverInner.evaluate((el) => el.scrollTop)
    expect(scrollTop).toBeGreaterThan(0)
  }).toPass()
})
