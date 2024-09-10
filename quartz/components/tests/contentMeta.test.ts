import { processReadingTime, getDateToFormat, formatDateStr, getFaviconPath } from "../ContentMeta"
import { QuartzPluginData } from "../../plugins/vfile"
import { GlobalConfiguration } from "../../cfg"

describe("ContentMeta", () => {
  describe("processReadingTime", () => {
    it("should return correct string for minutes less than 60", () => {
      expect(processReadingTime(30)).toBe("30 minutes")
      expect(processReadingTime(1)).toBe("1 minute")
      expect(processReadingTime(59)).toBe("59 minutes")
    })

    it("should return correct string for exactly 60 minutes", () => {
      expect(processReadingTime(60)).toBe("1 hour")
    })

    it("should return correct string for hours and minutes", () => {
      expect(processReadingTime(90)).toBe("1 hour 30 minutes")
      expect(processReadingTime(120)).toBe("2 hours")
      expect(processReadingTime(150)).toBe("2 hours 30 minutes")
    })

    it("should handle edge cases", () => {
      expect(processReadingTime(0)).toBe("")
      expect(processReadingTime(61)).toBe("1 hour 1 minute")
      expect(processReadingTime(119)).toBe("1 hour 59 minutes")
    })
  })

  describe("getDateToFormat", () => {
    const mockCfg = {} as GlobalConfiguration

    it("should return date_published if available", () => {
      const fileData = {
        frontmatter: { title: "Test Title", date_published: "2023-01-01" },
      } as unknown as QuartzPluginData
      expect(getDateToFormat(fileData, mockCfg)).toEqual(new Date("2023-01-01"))
    })

    it("should return undefined if no date is available", () => {
      const fileData = {} as QuartzPluginData
      expect(getDateToFormat(fileData, mockCfg)).toBeUndefined()
    })
  })

  describe("formatDateStr", () => {
    it("should format date correctly", () => {
      const date = new Date("2023-03-15T00:00:00Z")
      const formatted = formatDateStr(date, "en-US")
      expect(formatted).toMatch(/^ on Mar(ch)? 1[45], 2023$/)
    })
  })

  describe("getFaviconPath", () => {
    it("should return correct paths for own site", () => {
      const url = new URL("https://turntrout.com")
      const faviconPath = getFaviconPath(url)
      expect(faviconPath).toMatch(/^https:\/\/assets\.turntrout\.com\/.*\.ico$/)
    })

    it("should return null for unknown domains", () => {
      const url = new URL("https://unknown-domain.com")
      const faviconPath = getFaviconPath(url)
      expect(faviconPath).toBeNull()
    })
  })
})
