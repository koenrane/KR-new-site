import { format } from "path"
import {
  hyphenReplace,
  niceQuotes,
  improveFormatting,
  fullWidthSlashes,
  transformParagraph,
  markerChar,
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
      ['"Hi \'Trout!"', "“Hi ‘Trout!”"],
      ["“scope insensitivity”", "“scope insensitivity”"],
      [
        "strategy s's return is good, even as d's return is bad",
        "strategy s’s return is good, even as d’s return is bad",
      ],
    ])('should fix quotes in "%s"', (input, expected) => {
      const processedHtml = niceQuotes(input)
      expect(processedHtml).toBe(expected)
    })

    it.each([
      ["<code>'This quote should not change'</code>"],
      ['<code>"This quote should not change"</code>'],
      ["<code>5 - 3</code>"],
      ["<p><code>5 - 3</code></p>"],
      ['<p><code>"This quote should not change"</code></p>'],
    ])("should not change quotes inside <code>", (input: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(input)
    })

    it.each([
      ['<p>"<em>This</em>"</p>', "<p>“<em>This</em>”</p>"],
      ['<p><em>"T<b>hi"</b>s</em></p>', "<p><em>“T<b>hi”</b>s</em></p>"],
      [
        '<p>"This quote should change" <code>Test</code></p>',
        "<p>“This quote should change” <code>Test</code></p>",
      ],
    ])("should change quotes outside <code>", (input: string, target: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(target)
    })

    const mathHTML: string = `<p><span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord text"><span class="mord">return</span></span><span class="mopen">(</span><span class="mord mathnormal">s</span><span class="mclose">)</span></span></span></span> averages strategy <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.4306em;"></span><span class="mord mathnormal">s</span></span></span></span>'s return over the first state being cooperate <code>c</code> and being defect <code>d</code>. <a href="#user-content-fnref-5" data-footnote-backref="" aria-label="Back to reference 6" class="data-footnote-backref internal alias">↩</a></p>`

    const targetMathHTML: string = `<p><span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord text"><span class="mord">return</span></span><span class="mopen">(</span><span class="mord mathnormal">s</span><span class="mclose">)</span></span></span></span> averages strategy <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.4306em;"></span><span class="mord mathnormal">s</span></span></span></span>’s return over the first state being cooperate <code>c</code> and being defect <code>d</code>. <a href="#user-content-fnref-5" data-footnote-backref="" aria-label="Back to reference 6" class="data-footnote-backref internal alias">↩</a></p>`

    it("should handle apostrophe right after math mode", () => {
      const processedHtml = testHtmlFormattingImprovement(mathHTML)
      expect(processedHtml).toBe(targetMathHTML)
    })
  })

  describe("Full-width slashes", () => {
    it.each([
      ["'cat' / 'dog'", "'cat'／'dog'"],
      ["https://dog", "https://dog"],
    ])("should replace / with ／ in %s", (input: string, expected: string) => {
      const processedHtml = fullWidthSlashes(input)
      expect(processedHtml).toBe(expected)
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

  describe("Hyphens", () => {
    it.each([
      ["This is a - hyphen.", "This is a—hyphen."],
      ["This is an — em dash.", "This is an—em dash."],
      ["word — word", "word—word"],
      ["word— word", "word—word"],
      ["word —word", "word—word"],
      ['"I love dogs." - Me', '"I love dogs." — Me'],
      ["- Me", "— Me"], // Don't delete space after dash at the start of a line
      [
        "—such behaviors still have to be retrodicted",
        "—such behaviors still have to be retrodicted",
      ], // Don't delete space after dash at the start of a line
      ["\n---\n", "\n---\n"], // Retain horizontal rules
      ["emphasis” —", "emphasis”—"], // small quotations should not retain space
      ["- First level\n - Second level", "— First level\n - Second level"], // Don't replace hyphens in lists, first is ok
      ["> - First level", "> - First level"], // Quoted unordered lists should not be changed
      [
        "reward… — [Model-based RL, Desires, Brains, Wireheading](https://www.alignmentforum.org/posts/K5ikTdaNymfWXQHFb/model-based-rl-desires-brains-wireheading#Self_aware_desires_1__wireheading)",
        "reward… — [Model-based RL, Desires, Brains, Wireheading](https://www.alignmentforum.org/posts/K5ikTdaNymfWXQHFb/model-based-rl-desires-brains-wireheading#Self_aware_desires_1__wireheading)",
      ], // Don't condense em dashes right after ellipses
    ])('should replace hyphens in "%s"', (input, expected) => {
      const result = hyphenReplace(input)
      expect(result).toBe(expected)
    })

    it.each([
      ["<code>This is a - hyphen.</code>", "<code>This is a - hyphen.</code>"],
      ["<p>I think that -<em> despite</em></p>", "<p>I think that—<em>despite</em></p>"],
    ])("handling hyphenation in the DOM", (input: string, expected: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })

  describe("transformParagraph", () => {
    function _getParagraphNode(numChildren: number, value: string = "Hello, world!"): any {
      return {
        type: "element",
        tagName: "p",
        children: Array.from({ length: numChildren }, () => ({
          type: "text",
          value: value,
        })),
      }
    }

    const capitalize = (str: string) => str.toUpperCase()
    it.each([
      ["r231o dsa;", 1],
      ["hi", 3],
    ])("should capitalize while respecting the marker", (before: string, numChildren: number) => {
      const node = _getParagraphNode(numChildren, before)
      transformParagraph(node, capitalize)

      const targetNode = _getParagraphNode(numChildren, capitalize(before))
      expect(node).toEqual(targetNode)
    })
  })
})
