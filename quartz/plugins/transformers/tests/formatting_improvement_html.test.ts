import { improveFormatting } from "../formatting_improvement_html" // Adjust import path as needed
import { rehype } from "rehype"

function testHtmlFormattingImprovement(inputHTML: string) {
  return rehype()
    .data("settings", { fragment: true })
    .use(improveFormatting)
    .processSync(inputHTML)
    .toString()
}

describe("HTMLFormattingImprovement", () => {
  describe("Quotes", () => {
    it.each([
      ['<p>"This is a quote", she said.</p>', "<p>“This is a quote”, she said.</p>"],
      ['<p>"This is a quote," she said.</p>', "<p>“This is a quote”, she said.</p>"],
      ['<p>"This is a quote!".</p>', "<p>“This is a quote!”.</p>"],
      ['<p>"This is a quote?".</p>', "<p>“This is a quote?”.</p>"],
      [
        '<p>"This is a quote..." he trailed off.</p>',
        "<p>“This is a quote...” he trailed off.</p>",
      ],
      ['<p>She said, "This is a quote."</p>', "<p>She said, “This is a quote.”</p>"],
      ['<p>"Hello." Mary</p>', "<p>“Hello.” Mary</p>"],
      ['<p>"Hello." (Mary)</p>', "<p>“Hello.” (Mary)</p>"],
      ["<p>He said, 'Hi'</p>", "<p>He said, ‘Hi’</p>"],
      [
        '<p>"I am" so "tired" of "these" "quotes".</p>',
        "<p>“I am” so “tired” of “these” “quotes.”</p>",
      ],
      ['<p>"world model";</p>', "<p>“world model”;</p>"],
    ])('should fix quotes in "%s"', (input, expected) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })

    it.each([
      ["<code>'This quote should not change'</code>"],
      ['<code>"This quote should not change"</code>'],
    ])("should not change quotes inside <code>", (input: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(input)
    })
  })

  describe("Non-breaking spaces", () => {
    it("should replace &nbsp; with regular spaces", () => {
      const input = "<p>This&nbsp;is&nbsp;a&nbsp;test.</p>"
      const expected = "<p>This is a test.</p>"
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })
  describe("Fractions", () => {
    it.each([
      ["<p>There are 1/2 left.</p>", '<p>There are <span class="fraction">1/2</span> left.</p>'],
      ["<p>I ate 2 1/4 pizzas.</p>", '<p>I ate 2 <span class="fraction">1/4</span> pizzas.</p>'],
      [
        "<p>I ate 2 -14213.21/4 pizzas.</p>",
        '<p>I ate 2 <span class="fraction">-14213.21/4</span> pizzas.</p>',
      ],
      ["<p>2/3/50</p>", "<p>2/3/50</p>"],
      ["<p>01/01/2000</p>", "<p>01/01/2000</p>"],
    ])("should create an element for the fractions in %s", (input, expected) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })
})
