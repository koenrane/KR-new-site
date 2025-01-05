import { test, expect, Page } from "@playwright/test"

import { takeArgosScreenshot } from "./visual_utils"

function isDesktopViewport(page: Page): boolean {
  const viewportSize = page.viewportSize()
  return viewportSize ? viewportSize.width >= 1580 : false // matches $full-page-width
}

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page", {
    waitUntil: "networkidle",
    timeout: 35000,
  })

  await Promise.all([
    page.waitForLoadState("domcontentloaded"),
    page.waitForLoadState("networkidle"),
  ])

  await page.evaluate(() => window.scrollTo(0, 0))
})

test("Clicking away closes the menu", async ({ page }, testInfo) => {
  test.skip(isDesktopViewport(page))

  const menuButton = page.locator("#menu-button")
  const navbarRightMenu = page.locator("#navbar-right .menu")
  await expect(menuButton).toBeVisible()

  // Open the menu first
  await menuButton.click()
  await expect(navbarRightMenu).toBeVisible()
  await expect(navbarRightMenu).toHaveClass(/visible/)
  await takeArgosScreenshot(page, testInfo, "visible-menu", {
    element: navbarRightMenu,
  })

  // Test clicking away
  const body = page.locator("body")
  await body.click()
  await expect(navbarRightMenu).not.toBeVisible()
  await expect(navbarRightMenu).not.toHaveClass(/visible/)
  await takeArgosScreenshot(page, testInfo, "hidden-menu", {
    element: "#navbar-right",
  })
})

test("Menu button makes menu visible", async ({ page }, testInfo) => {
  test.skip(isDesktopViewport(page))

  const menuButton = page.locator("#menu-button")
  const navbarRightMenu = page.locator("#navbar-right .menu")

  // Test initial state
  const originalMenuButtonState = await menuButton.screenshot()
  await expect(navbarRightMenu).not.toBeVisible()
  await expect(navbarRightMenu).not.toHaveClass(/visible/)

  // Test opened state
  await menuButton.click()
  const openedMenuButtonState = await menuButton.screenshot()
  expect(openedMenuButtonState).not.toEqual(originalMenuButtonState)
  await expect(navbarRightMenu).toBeVisible()
  await expect(navbarRightMenu).toHaveClass(/visible/)
  await takeArgosScreenshot(page, testInfo, "visible-menu", {
    element: "#navbar-right .menu",
  })

  // Test closed state
  await menuButton.click()
  const newMenuButtonState = await menuButton.screenshot()
  expect(newMenuButtonState).toEqual(originalMenuButtonState)
  await expect(navbarRightMenu).not.toBeVisible()
  await expect(navbarRightMenu).not.toHaveClass(/visible/)
})

test("Can't see the menu at desktop size", async ({ page }) => {
  test.skip(isDesktopViewport(page))

  const menuButton = page.locator("#menu-button")
  const navbarRightMenu = page.locator("#navbar-right .menu")

  // The menu should always be visible at desktop size, so these should fail
  for (const object of [navbarRightMenu, menuButton]) {
    await expect(object)
      .not.toBeVisible({ timeout: 200 })
      .catch(() => console.debug("Expected failure: menu is always visible at desktop size"))
  }

  // Try clicking the menu button anyways
  await menuButton
    .click({ force: true, timeout: 200 })
    .catch(() => console.debug("Expected failure: menu button not visible at desktop size"))
  await expect(navbarRightMenu)
    .not.toBeVisible({ timeout: 200 })
    .catch(() => console.debug("Expected failure: menu not visible at desktop size"))
})

// Test scrolling down, seeing the menu disappears, and then reappears when scrolling back up
test("Menu disappears when scrolling down and reappears when scrolling up", async ({ page }) => {
  test.skip(isDesktopViewport(page))

  const navbar = page.locator("#navbar")

  // Initial state check
  await expect(navbar).toBeVisible()
  await expect(navbar).not.toHaveClass(/hide-above-screen/)

  // Scroll down
  await page.evaluate(() => {
    window.scrollTo({
      top: 250,
      behavior: "instant",
    })
  })

  // Wait for scroll animation and navbar to hide
  await expect(navbar).toHaveClass(/hide-above-screen/)
  await expect(navbar).toHaveCSS("opacity", "0")

  // Scroll back up
  await page.evaluate(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    })
  })

  // Wait for scroll animation and navbar to show
  await expect(navbar).not.toHaveClass(/hide-above-screen/)
  await expect(navbar).toBeVisible()
})

// TODO sometimes need to focus page before hitting "/"

test("Menu disappears gradually when scrolling down", async ({ page }) => {
  test.skip(isDesktopViewport(page))

  const navbar = page.locator("#navbar")

  // Initial state check
  await expect(navbar).toHaveCSS("opacity", "1")

  // Scroll down
  await page.evaluate(() => window.scrollBy(0, 100))

  // Sample opacity values during the transition
  const getNavbarOpacity = () => navbar.evaluate((el) => getComputedStyle(el).opacity)
  const opacityValues: number[] = [Number(await getNavbarOpacity())]
  for (let i = 0; i < 10; i++) {
    const opacity = await getNavbarOpacity()
    opacityValues.push(Number(opacity))
    await page.waitForTimeout(80) // Wait a bit between samples
  }
  await page.waitForTimeout(500)
  const finalOpacity = await navbar.evaluate((el) => getComputedStyle(el).opacity)
  opacityValues.push(Number(finalOpacity))

  // Verify we saw some intermediate values between 1 and 0
  expect(opacityValues).toContain(1) // Should start at 1
  expect(opacityValues).toContain(0) // Should end at 0
  expect(opacityValues.some((v) => v > 0 && v < 1)).toBeTruthy() // Should have intermediate values
})

// Todo check that shadow works

test("Navbar shows shadow when scrolling down", async ({ page }, testInfo) => {
  test.skip(isDesktopViewport(page))

  const navbar = page.locator("#navbar")

  // Initial state - no shadow
  await expect(navbar).not.toHaveClass(/shadow/)
  await takeArgosScreenshot(page, testInfo, "navbar-no-shadow")

  // Scroll down slightly to trigger shadow
  await page.evaluate(() => {
    window.scrollTo({
      top: 50,
      behavior: "instant",
    })
  })

  // Verify shadow class is added
  await expect(navbar).toHaveClass(/shadow/)
  await takeArgosScreenshot(page, testInfo, "navbar-with-shadow")

  // Scroll back to top
  await page.evaluate(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    })
  })

  // Verify shadow is removed
  await expect(navbar).not.toHaveClass(/shadow/)
})
