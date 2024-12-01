import { argosScreenshot, ArgosScreenshotOptions } from "@argos-ci/playwright"
import { TestInfo } from "@playwright/test"
import { Page } from "playwright"

const THEME_TRANSITION_DELAY = 250 // ms

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
  await argosScreenshot(page, `${testInfo.title}-${screenshotSuffix}`, totalOptions)
}
