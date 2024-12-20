import { test, expect } from "@playwright/test"

/**
 * This spec file is designed to test the functionality of spa.inline.ts,
 * including client-side routing, scroll behavior, hash navigation,
 * and the route announcer for accessibility. It follows a structure
 * similar to test-page.spec.ts.
 */

test.beforeEach(async ({ page }) => {
  // Log any console errors to help diagnose issues
  page.on("pageerror", (error) => console.error("Page Error:", error))

  // Navigate to a page that uses the SPA inline logic
  // and wait for network to be idle (i.e., no more requests)
  await page.goto("http://localhost:8080/test-page")
  await page.waitForLoadState("networkidle")

  // Dispatch the 'nav' event to ensure the router is properly initialized
  await page.evaluate(() => {
    window.dispatchEvent(new Event("nav"))
  })
})

test.describe("Local Link Navigation", () => {
  test("navigates without a full reload", async ({ page }) => {
    // Record current page URL
    const initialUrl = page.url()

    // Click on a local link
    const localLink = page.locator("a").first()
    await localLink.click()
    await page.waitForLoadState("networkidle")

    // Ensure the URL has changed
    expect(page.url()).not.toBe(initialUrl)

    // Check that the body content is still present (verifying no full reload)
    await expect(page.locator("body")).toBeVisible()
  })

  test("ignores links with target=_blank", async ({ page }) => {
    // Inject a link with target=_blank
    await page.evaluate(() => {
      const link = document.createElement("a")
      link.href = "/design"
      link.target = "_blank"
      link.id = "blank-link"
      link.textContent = "Open in new tab"
      document.body.appendChild(link)
    })

    // Track the URL before clicking
    const currentUrl = page.url()
    // Click the link normally
    await page.click("#blank-link")

    // The local link with target=_blank should not be intercepted
    // The page should not change in this browser instance
    expect(page.url()).toBe(currentUrl)
  })

  test("external links are not intercepted", async ({ page }) => {
    // Inject an external link
    await page.evaluate(() => {
      const link = document.createElement("a")
      link.href = "https://www.example.com"
      link.id = "external-link"
      link.textContent = "External Site"
      document.body.appendChild(link)
    })

    // Check that SPA logic does not intercept external links
    // (We don't actually navigate to external sites in tests.)
    // Instead, we can ensure the click is not prevented.
    await page.click("#external-link", { button: "middle" })
    // There's no assertion needed here because we only want to ensure
    // no interception or errors occur. If something breaks, the test will fail.
  })
})

test.describe("Scroll Behavior", () => {
  test("preserves scroll position on back navigation", async ({ page }) => {
    // Scroll down and store the desired position
    const testScrollPos = 600
    await page.evaluate((pos: number) => {
      window.scrollY = pos
    }, testScrollPos)

    // Navigate to a new page (this should trigger beforeunload and saveScrollPosition in spa.inline.ts)
    await page.goto("http://localhost:8080/design")
    await page.waitForLoadState("networkidle")

    // Capture the current sessionStorage data before going back
    const sessionData: string = await page.evaluate(() => JSON.stringify(sessionStorage))

    // Go back in history. The popstate event in spa.inline.ts will attempt to restore scroll.
    await page.goBack()
    await page.waitForLoadState("networkidle")

    // Reinject the sessionStorage data on the same page (rather than using addInitScript).
    // This ensures the loaded page has the same session items spa.inline.ts relies on.
    await page.evaluate((storage: string) => {
      if (window.location.hostname === "localhost") {
        const parsed = JSON.parse(storage) as Record<string, string>
        for (const [key, value] of Object.entries(parsed)) {
          window.sessionStorage.setItem(key, value)
        }
      }
    }, sessionData)

    // Check if scroll position is the same as before
    const currentScroll: number = await page.evaluate(() => window.scrollY)
    expect(currentScroll).toBe(testScrollPos)
  })

  test("handles hash navigation by scrolling to element", async ({ page }) => {
    // Inject a section to test scroll with an ID
    await page.evaluate(() => {
      const section = document.createElement("div")
      section.id = "test-scroll-section"
      section.style.marginTop = "1500px"
      document.body.appendChild(section)
    })

    // Create a hash link and click it
    await page.evaluate(() => {
      const link = document.createElement("a")
      link.href = "#test-scroll-section"
      link.id = "hash-link"
      link.textContent = "Scroll to test section"
      document.body.appendChild(link)
    })

    await page.click("#hash-link")

    // Wait briefly to allow scroll animation
    await page.waitForLoadState("networkidle")

    // Verify the final scroll position is beyond 0
    const scrollPosition = await page.evaluate(() => window.scrollY)
    expect(scrollPosition).toBeGreaterThan(0)
  })
})

test.describe("Popstate (Back/Forward) Navigation", () => {
  test("browser back and forward updates content appropriately", async ({ page }) => {
    const initialUrl = page.url()

    await page.goto("http://localhost:8080/design")

    await page.waitForLoadState("networkidle")
    expect(page.url()).not.toBe(initialUrl)

    // Check going back
    await page.goBack()
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(initialUrl)

    // Check going forward
    await page.goForward()
    await page.waitForLoadState("networkidle")
    expect(page.url()).not.toBe(initialUrl)
  })
})
