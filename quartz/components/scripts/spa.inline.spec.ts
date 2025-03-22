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
  await page.goto("http://localhost:8080/test-page", { waitUntil: "domcontentloaded" })

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
    await page.goto("http://localhost:8080/design", { waitUntil: "domcontentloaded" })

    // Capture the current sessionStorage data before going back
    const sessionData: string = await page.evaluate(() => JSON.stringify(sessionStorage))

    // Go back in history. The popstate event in spa.inline.ts will attempt to restore scroll.
    await page.goBack({ waitUntil: "networkidle" })

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

    await page.goto("http://localhost:8080/design", { waitUntil: "domcontentloaded" })

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

test.describe("Same-page navigation", () => {
  test("back button works after clicking same-page link", async ({ page }) => {
    // Create two sections with different scroll positions
    await page.evaluate(() => {
      const section1 = document.createElement("div")
      section1.id = "section1"
      section1.textContent = "Section 1"
      section1.style.marginTop = "0px"

      const section2 = document.createElement("div")
      section2.id = "section2"
      section2.textContent = "Section 2"
      section2.style.marginTop = "1500px"

      const link = document.createElement("a")
      link.href = "#section2"
      link.id = "same-page-link"
      link.textContent = "Go to Section 2"

      section1.appendChild(link)
      document.body.appendChild(section1)
      document.body.appendChild(section2)
    })

    // Record initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY)

    // Click the link to navigate to section2
    await page.click("#same-page-link")
    await page.waitForTimeout(100) // Wait for scroll

    // Verify we scrolled down
    const scrollAfterClick = await page.evaluate(() => window.scrollY)
    expect(scrollAfterClick).toBeGreaterThan(initialScroll)

    // Go back
    await page.goBack()
    await page.waitForTimeout(100) // Wait for scroll

    // Verify we returned to the original position
    const scrollAfterBack = await page.evaluate(() => window.scrollY)
    expect(scrollAfterBack).toBe(initialScroll)
  })

  test("maintains scroll history for multiple same-page navigations", async ({ page }) => {
    // Navigate through all positions and store scroll positions
    const scrollPositions: number[] = []

    const headings = await page.locator("h1 a").all()
    for (const heading of headings.slice(2, 5)) {
      await heading.scrollIntoViewIfNeeded()
      await heading.click()
      await page.waitForTimeout(100) // Wait for scroll
      scrollPositions.push(await page.evaluate(() => window.scrollY))
    }

    // Verify each position was different
    console.log(scrollPositions)
    for (let i = 1; i < scrollPositions.length; i++) {
      expect(scrollPositions[i]).not.toBe(scrollPositions[i - 1])
    }

    // Go back through history and verify each scroll position
    for (let i = scrollPositions.length - 2; i >= 0; i--) {
      await page.goBack()
      await page.waitForTimeout(100) // Wait for scroll
      const currentScroll = await page.evaluate(() => window.scrollY)
      console.log(`Current: ${currentScroll}`)
      console.log(`Expected: ${scrollPositions[i]}`)
      expect(currentScroll).toBe(scrollPositions[i])
    }
  })
})
