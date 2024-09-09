import { processReadingTime } from "../ContentMeta"

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
})
