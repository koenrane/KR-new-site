import { argosScreenshot, ArgosScreenshotOptions } from "@argos-ci/playwright"
import { Locator, TestInfo } from "@playwright/test"
import { Page } from "playwright"

const THEME_TRANSITION_DELAY = 350 // ms

export async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((themeValue) => {
    document.documentElement.setAttribute("saved-theme", themeValue)
  }, theme)

  await page.waitForTimeout(THEME_TRANSITION_DELAY)
}

const defaultOptions: ArgosScreenshotOptions = { animations: "disabled" }

export async function takeArgosScreenshot(
  page: Page,
  testInfo: TestInfo,
  screenshotSuffix: string,
  options?: ArgosScreenshotOptions,
) {
  const totalOptions = { ...defaultOptions, ...options }
  return
  await argosScreenshot(page, `${testInfo.title}-${screenshotSuffix}`, totalOptions)
}

export async function takeScreenshotAfterElement(
  page: Page,
  testInfo: TestInfo,
  element: Locator,
  height: number,
  testNameSuffix?: string,
) {
  const box = await element.boundingBox()
  if (!box) throw new Error("Could not find element")

  const viewportSize = page.viewportSize()
  if (!viewportSize) throw new Error("Could not get viewport size")

  // Take the screenshot with the specified clipping area
  await takeArgosScreenshot(page, testInfo, `${testInfo.title}-section-${testNameSuffix}`, {
    clip: {
      x: 0,
      y: box.y,
      width: viewportSize.width,
      height,
    },
  })
}

/**
 * Returns the y-offset between two elements, from the top of the first element to the top of the second element.
 * @param firstElement - The first element.
 * @param secondElement - The second element.
 * @returns The y-offset between the two elements.
 */
export async function yOffset(firstElement: Locator, secondElement: Locator) {
  const firstBox = await firstElement.boundingBox()
  const secondBox = await secondElement.boundingBox()
  if (!firstBox || !secondBox) throw new Error("Could not find elements")
  if (firstBox.y === secondBox.y) throw new Error("Elements are the same")

  const offset = secondBox.y - firstBox.y
  if (offset < 0) throw new Error("Second element is above the first element")

  return offset
}

/**
 * Returns the next element matching the selector that is below the current element.
 * @param element - The current element.
 * @param selector - The selector to match.
 * @returns The next element matching the selector that is below the current element.
 */
export async function getNextElementMatchingSelector(
  element: Locator,
  selector: string,
): Promise<Locator> {
  const box = await element.boundingBox()
  if (!box) throw new Error("Element not found")

  const page = element.page()

  // Find all elements matching the selector
  const elements = page.locator(selector)
  const count = await elements.count()

  // Find the first element that appears after our current element
  for (let i = 0; i < count; i++) {
    const currentElement = elements.nth(i)
    const currentBox = await currentElement.boundingBox()

    if (currentBox && currentBox.y > box.y) {
      return currentElement
    }
  }

  throw new Error("No next element found")
}
