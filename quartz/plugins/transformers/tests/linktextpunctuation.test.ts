import { applyLinkPunctuation } from "../linktextpunctuation"
import { markerChar } from "../formatting_improvement_html"

describe("applyLinkPunctuation function", () => {
  describe("Handles various link scenarios", () => {
    it.each([
      ["[Link](https://example.com).", "[Link.](https://example.com)"],
      ["[Link](https://example.com),", "[Link,](https://example.com)"],
      ['"[Link](https://example.com)"', '["Link"](https://example.com)'],
      [
        "([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ))",
        "([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ))",
      ],
      ["[Link](https://example.com)!", "[Link!](https://example.com)"],
      ["[Link](https://example.com)?", "[Link?](https://example.com)"],
      ["[Link](https://example.com);", "[Link;](https://example.com)"],
      ["[Link](https://example.com):", "[Link:](https://example.com)"],
      ["*[Link](https://example.com)*", "*[Link](https://example.com)*"],
      ["**[Link](https://example.com)**", "**[Link](https://example.com)**"],
      ["[Link](https://example.com)`", "[Link`](https://example.com)"],
    ])("correctly handles '%s'", (input, expected) => {
      const result = applyLinkPunctuation(input)
      expect(result).toBe(expected)
    })
  })

  describe("Handles multiple links in a single string", () => {
    it("processes multiple links correctly", () => {
      const input =
        "Check out [Link1](https://example1.com), and then [Link2](https://example2.com)!"
      const expected =
        "Check out [Link1,](https://example1.com) and then [Link2!](https://example2.com)"
      const result = applyLinkPunctuation(input)
      expect(result).toBe(expected)
    })
  })

  describe("Doesn't modify non-link text", () => {
    it("leaves regular text unchanged", () => {
      const input = "This is a regular sentence without any links."
      const result = applyLinkPunctuation(input)
      expect(result).toBe(input)
    })
  })

  describe("Handles private use character", () => {
    it("correctly processes links with private use character", () => {
      const input = `[Link${markerChar}](https://example.com).${markerChar} [Another${markerChar} Link](https://example2.com)${markerChar},`
      const expected = `[Link${markerChar}.](https://example.com)${markerChar} [Another${markerChar} Link,](https://example2.com)${markerChar}`
      const result = applyLinkPunctuation(input)
      expect(result).toBe(expected)
    })
  })
})
