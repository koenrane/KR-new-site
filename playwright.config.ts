import { defineConfig, devices } from "@playwright/test"

interface DeviceConfig {
  name: string
  config: {
    viewport?: { width: number; height: number }
    [key: string]: unknown
  }
}

interface Browser {
  name: string
  engine: "chromium" | "firefox" | "webkit"
}

const deviceList: DeviceConfig[] = [
  {
    name: "Desktop",
    config: {
      viewport: { width: 1920, height: 1080 },
    },
  },
  {
    name: "iPad Pro",
    config: {
      ...devices["iPad Pro"],
    },
  },
  {
    name: "iPhone 12",
    config: {
      viewport: { width: 390, height: 844 },
    },
  },
]

const browsers: Browser[] = [
  { name: "Chrome", engine: "chromium" },
  { name: "Firefox", engine: "firefox" },
  { name: "Safari", engine: "webkit" },
]

export default defineConfig({
  timeout: 30000,
  fullyParallel: true,
  workers: "65%", // 75 might be too many and cause flakiness
  testDir: "./quartz/",
  testMatch: /.*\.spec\.ts/,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: {
      mode: "on",
      fullPage: true,
    },
  },
  projects: deviceList.flatMap((device) =>
    browsers.map((browser) => ({
      name: `${device.name} ${browser.name}`,
      use: {
        ...device.config,
        browserName: browser.engine,
      },
    })),
  ),
})
