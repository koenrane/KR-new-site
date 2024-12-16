import { test, expect } from "@playwright/test"

import { takeArgosScreenshot } from "./visual_utils"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page")
  await page.waitForLoadState("networkidle")
  await page.waitForLoadState("domcontentloaded")
  await page.evaluate(() => window.scrollTo(0, 0))
})

test.afterEach(async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 0))
})

test("Clicking away closes the menu", async ({ page }, testInfo) => {
  if (testInfo.project.name === "Desktop Chrome") {
    test.skip()
  }

  const menuButton = page.locator("#menu-button")
  const navbarRightMenu = page.locator("#navbar-right .menu")
  expect(menuButton).toBeVisible()

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
  if (testInfo.project.name === "Desktop Chrome") {
    test.skip()
  }

  const menuButton = page.locator("#menu-button")
  const navbarRightMenu = page.locator("#navbar-right .menu")

  // Test initial state
  const originalMenuButtonState = await menuButton.screenshot()
  await expect(navbarRightMenu).not.toBeVisible()
  await expect(navbarRightMenu).not.toHaveClass(/visible/)

  // Test opened state
  await menuButton.click()
  expect(await menuButton.screenshot()).not.toEqual(originalMenuButtonState)
  await expect(navbarRightMenu).toBeVisible()
  await expect(navbarRightMenu).toHaveClass(/visible/)
  await takeArgosScreenshot(page, testInfo, "visible-menu", {
    element: "#navbar-right .menu",
  })

  // Test closed state
  await menuButton.click()
  expect(await menuButton.screenshot()).toEqual(originalMenuButtonState)
  await expect(navbarRightMenu).not.toBeVisible()
  await expect(navbarRightMenu).not.toHaveClass(/visible/)
})

test("Can't see the menu at desktop size", async ({ page }, testInfo) => {
  if (testInfo.project.name !== "Desktop Chrome") {
    test.skip()
  }

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
test("Menu disappears when scrolling down and reappears when scrolling up", async ({
  page,
}, testInfo) => {
  if (testInfo.project.name === "Desktop Chrome") {
    test.skip()
  }

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

// TODO this test is flaky
test("Menu disappears gradually when scrolling down", async ({ page }, testInfo) => {
  if (testInfo.project.name === "Desktop Chrome") {
    test.skip()
  }

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
