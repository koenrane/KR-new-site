import { test, expect, type Page } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("http://localhost:8080/test-page", { waitUntil: "load" })
})

async function clickToggle(page: Page) {
  const mode = await page.evaluate(() => document.documentElement.getAttribute("saved-theme"))
  if (mode === "dark") {
    await page.locator("#night-icon").click()
  } else {
    await page.locator("#day-icon").click()
  }
}

test("Dark mode toggle changes theme", async ({ page }) => {
  const toggle = page.locator("#darkmode-toggle")
  const lightSvg = page.locator("#day-icon")
  const darkSvg = page.locator("#night-icon")

  await expect(toggle).toBeAttached()
  await expect(lightSvg).toBeVisible()
  await expect(darkSvg).not.toBeVisible()

  // Get initial theme
  const initialTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("saved-theme"),
  )
  const initialSpan = page.locator("span.dark-mode")
  const initialIcon = await initialSpan.screenshot()

  await clickToggle(page)
  await expect(async () => {
    const currentIcon = await initialSpan.screenshot()
    expect(currentIcon).not.toEqual(initialIcon)
  }).toPass()

  // Verify theme changed
  const newTheme = await page.evaluate(() => document.documentElement.getAttribute("saved-theme"))
  expect(newTheme).not.toBe(initialTheme)
  expect(newTheme).toBe(initialTheme === "dark" ? "light" : "dark")

  // Verify localStorage updated
  const storedTheme = await page.evaluate(() => localStorage.getItem("theme"))
  expect(storedTheme).toBe(newTheme)
})

test("System preference changes are reflected", async ({ page }) => {
  const toggle = page.locator("#darkmode-toggle")

  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({
      colorScheme: colorScheme as "light" | "dark" | "no-preference" | null | undefined,
    })
    await page.reload()
    //
    const theme = await page.evaluate(() => document.documentElement.getAttribute("saved-theme"))
    expect(theme).toBe(colorScheme)
    if (colorScheme === "light") {
      await expect(toggle).not.toBeChecked()
    } else {
      await expect(toggle).toBeChecked()
    }
  }
})

test("Theme persists across page reloads", async ({ page }) => {
  // Set theme to dark
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark")
    document.documentElement.setAttribute("saved-theme", "dark")
  })

  // Reload page
  await page.reload()

  // Verify theme persisted
  const theme = await page.evaluate(() => document.documentElement.getAttribute("saved-theme"))
  expect(theme).toBe("dark")

  // Verify toggle state matches
  const toggle = page.locator("#darkmode-toggle")
  await expect(toggle).toBeChecked()
})

test("Description paragraph hides after first toggle", async ({ page }) => {
  const label = page.locator(".darkmode label")
  await expect(label).toBeAttached()

  const description = page.locator("#darkmode-description")
  await expect(description).toBeVisible()

  await clickToggle(page)

  // Verify description hides
  await expect(description).toHaveClass(/hidden/)

  // Verify localStorage flag set
  const usedToggle = await page.evaluate(() => localStorage.getItem("usedToggle"))
  expect(usedToggle).toBe("true")
})

test("Theme change event is emitted", async ({ page }) => {
  const label = page.locator(".darkmode label")
  await expect(label).toBeAttached()

  // Listen for theme change event
  const themeChangePromise = page.evaluate(
    () =>
      new Promise((resolve) => {
        document.addEventListener("themechange", ((e: CustomEvent) => {
          resolve(e.detail.theme)
        }) as EventListener)
      }),
  )

  await clickToggle(page)

  // Verify event emitted with correct theme
  const emittedTheme = await themeChangePromise
  const currentTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("saved-theme"),
  )
  expect(emittedTheme).toBe(currentTheme)
})

test("Toggle state matches system preference by default", async ({ page }) => {
  // Clear any stored preference
  await page.evaluate(() => {
    localStorage.removeItem("theme")
  })

  // Emulate dark color scheme
  await page.emulateMedia({ colorScheme: "dark" })
  await page.reload()

  const toggle = page.locator("#darkmode-toggle")
  await expect(toggle).toBeChecked()

  // Emulate light color scheme
  await page.emulateMedia({ colorScheme: "light" })
  await page.reload()

  await expect(toggle).not.toBeChecked()
})

test("Dark mode icons are visible and toggle correctly", async ({ page }) => {
  const dayIcon = page.locator("#day-icon")
  const nightIcon = page.locator("#night-icon")

  const toggle = page.locator("#darkmode-toggle")
  await expect(toggle).toBeAttached()
  await expect(dayIcon).toBeVisible()
  await expect(nightIcon).not.toBeVisible()

  await clickToggle(page)

  await expect(toggle).toBeChecked()
  await expect(dayIcon).not.toBeVisible()
  await expect(nightIcon).toBeVisible()

  await clickToggle(page)

  await expect(toggle).not.toBeChecked()
  await expect(dayIcon).toBeVisible()
  await expect(nightIcon).not.toBeVisible()
})
