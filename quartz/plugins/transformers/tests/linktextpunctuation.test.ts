import { remarkLinkPunctuation } from "../linktextpunctuation"

describe("remarkLinkPunctuation Plugin", () => {
  describe("Doesn't bring in too many surrounding bits", () => {
    it.each([["([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ)"]])(
      "correctly handles '%s'",
      (input: string) => {
        const result: string = remarkLinkPunctuation(input) as string
        expect(result).toBe(input)
      },
    )
  })
})
