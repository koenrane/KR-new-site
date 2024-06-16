import {
  hyphenReplace,
  niceQuotes,
  improveFormatting,
  fullWidthSlashes,
} from "../formatting_improvement_html" // Adjust import path as needed
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
      ['"This is a quote", she said.', "“This is a quote”, she said."],
      ['"This is a quote," she said.', "“This is a quote”, she said."],
      ['"This is a quote!".', "“This is a quote!”."],
      ['"This is a quote?".', "“This is a quote?”."],
      ['"This is a quote..." he trailed off.', "“This is a quote...” he trailed off."],
      ['She said, "This is a quote."', "She said, “This is a quote.”"],
      ['"Hello." Mary', "“Hello.” Mary"],
      ['"Hello." (Mary)', "“Hello.” (Mary)"],
      ["He said, 'Hi'", "He said, ‘Hi’"],
      ['"I am" so "tired" of "these" "quotes".', "“I am” so “tired” of “these” “quotes.”"],
      ['"world model";', "“world model”;"],
      ['"party"/"wedding."', "“party”/“wedding.”"],
    ])('should fix quotes in "%s"', (input, expected) => {
      const processedHtml = niceQuotes(input)
      expect(processedHtml).toBe(expected)
    })

    it.each([
      ["<code>'This quote should not change'</code>"],
      ['<code>"This quote should not change"</code>'],
      ["<code>5 - 3</code>"],
    ])("should not change quotes inside <code>", (input: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(input)
    })
  })

  describe("Full-width slashes", () => {
    it.each([["'cat' / 'dog'", "'cat'／'dog'"]])(
      "should replace / with ／ in %s",
      (input: string, expected: string) => {
        const processedHtml = fullWidthSlashes(input)
        expect(processedHtml).toBe(expected)
      },
    )
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

  describe("Hyphens", () => {
    it.each([
      ["This is a - hyphen.", "This is a—hyphen."],
      ["This is an — em dash.", "This is an—em dash."],
      ["word — word", "word—word"],
      ["e - “", "e—“"],
      ["word— word", "word—word"],
      ["word —word", "word—word"],
      ['"I love dogs." - Me', '"I love dogs." — Me'],
      ["- Me", "— Me"], // Don't delete space after dash at the start of a line
      ["\n---\n", "\n---\n"], // Retain horizontal rules
      ["emphasis” —", "emphasis”—"], // small quotations should not retain space
      ["- First level\n - Second level", "— First level\n - Second level"], // Don't replace hyphens in lists, first is ok
      ["> - First level", "> - First level"], // Quoted unordered lists should not be changed
    ])('should replace hyphens in "%s"', (input, expected) => {
      const result = hyphenReplace(input)
      expect(result).toBe(expected)
    })
  })
})
