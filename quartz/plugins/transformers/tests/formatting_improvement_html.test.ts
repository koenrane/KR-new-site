import {
  hyphenReplace,
  niceQuotes,
  getTextContent,
  flattenTextNodes,
  improveFormatting,
  fullWidthSlashes,
  transformElement,
  assertSmartQuotesMatch,
  enDashNumberRange,
  neqConversion,
} from "../formatting_improvement_html"
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
      ["He wanted 'power.'", "He wanted ‘power.’"], // Test end of line
      [
        '"how many ways can this function be implemented?".',
        "“how many ways can this function be implemented?”.",
      ],
      ['SSL.")', "SSL.”)"],
      ["can't multiply\"?", "can’t multiply”?"],
      ["I'd", "I’d"],
      ["I don't'nt want to go", "I don’t’nt want to go"],
      ['with "scope insensitivity":', "with “scope insensitivity”:"],
      ['("the best")', "(“the best”)"],
      ['"\'sup"', "“‘sup”"],
      ["'the best',", "‘the best’,"],
      ["'I lost the game.'", "‘I lost the game.’"],
      ["I hate you.'\"", "I hate you.’”"],
    ])('should fix quotes in "%s"', (input, expected) => {
      const processedHtml = niceQuotes(input)
      expect(processedHtml).toBe(expected)
    })

    it.each([['<p><br>"Unicorn"<br></p>', "<p><br>“Unicorn”<br></p>"]])(
      "should handle quotes in DOM",
      (input, expected) => {
        const processedHtml = testHtmlFormattingImprovement(input)
        expect(processedHtml).toBe(expected)
      },
    )

    it.each([
      ["<code>'This quote should not change'</code>"],
      ["<p><code>5 - 3</code></p>"],
      ['<p><code>"This quote should not change"</code></p>'],
      ["<p><code>'This quote should not change'</code></p>"],
    ])("should not change quotes inside <code>", (input: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(input)
    })

    const mathHTML: string = `<p><span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord text"><span class="mord">return</span></span><span class="mopen">(</span><span class="mord mathnormal">s</span><span class="mclose">)</span></span></span></span> averages strategy <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.4306em;"></span><span class="mord mathnormal">s</span></span></span></span>'s return over the first state being cooperate <code>c</code> and being defect <code>d</code>. <a href="#user-content-fnref-5" data-footnote-backref="" aria-label="Back to reference 6" class="data-footnote-backref internal alias">↩</a></p>`

    const targetMathHTML: string = `<p><span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:1em;vertical-align:-0.25em;"></span><span class="mord text"><span class="mord">return</span></span><span class="mopen">(</span><span class="mord mathnormal">s</span><span class="mclose">)</span></span></span></span> averages strategy <span class="katex"><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height:0.4306em;"></span><span class="mord mathnormal">s</span></span></span></span>’s return over the first state being cooperate <code>c</code> and being defect <code>d</code>. <a href="#user-content-fnref-5" data-footnote-backref="" aria-label="Back to reference 6" class="data-footnote-backref internal alias">↩</a></p>`

    it("should handle apostrophe right after math mode", () => {
      const processedHtml = testHtmlFormattingImprovement(mathHTML)
      expect(processedHtml).toBe(targetMathHTML)
    })

    const originalHeader =
      '<h3 id="optimal-policy--reinforcement-maximizing-policy"><del>"Optimal policy"</del> → "Reinforcement-maximizing policy"</h3>'
    const targetHeader =
      '<h3 id="optimal-policy--reinforcement-maximizing-policy"><del>“Optimal policy”</del> → “Reinforcement-maximizing policy”</h3>'
    it("should handle quotes in headers", () => {
      const processedHtml = testHtmlFormattingImprovement(originalHeader)
      expect(processedHtml).toBe(targetHeader)
    })
  })

  describe("Full-width slashes", () => {
    it.each([
      ["'cat' / 'dog'", "'cat' ／'dog'"],
      ["https://dog", "https://dog"],
    ])("should replace / with ／ in %s", (input: string, expected: string) => {
      const processedHtml = fullWidthSlashes(input)
      expect(processedHtml).toBe(expected)
    })
  })
  describe("Fractions", () => {
    it.each([
      ["<p>There are 1/2 left.</p>", '<p>There are <span class="fraction">1/2</span> left.</p>'],
      ["<p>I ate 2 1/4 pizzas.</p>", '<p>I ate 2 <span class="fraction">1/4</span> pizzas.</p>'],
      ["<p>I ate 2 -14213.21/4 pizzas.</p>", "<p>I ate 2 -14213.21/4 pizzas.</p>"],
      ["<p>2/3/50</p>", "<p>2/3/50</p>"],
      ["<p>01/01/2000</p>", "<p>01/01/2000</p>"],
    ])("should create an element for the fractions in %s", (input, expected) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })

  describe("NEQ Conversion", () => {
    it.each([["<p>There are 1 != 2 left.</p>", "<p>There are 1 ≠ 2 left.</p>"]])(
      "should replace != with ≠ in %s",
      (input: string, expected: string) => {
        const result = neqConversion(input)
        expect(result).toBe(expected)
      },
    )
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
      ["-- Me", "— Me"],
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
      ["a browser- or OS-specific fashion", "a browser- or OS-specific fashion"], // Retain hyphen in compound words
      ["since--as you know", "since—as you know"], // Replace double+ hyphens in words with em dash
    ])('should replace hyphens in "%s"', (input, expected) => {
      const result = hyphenReplace(input)
      expect(result).toBe(expected)
    })

    it.each([
      ["<code>This is a - hyphen.</code>", "<code>This is a - hyphen.</code>"],
      ["<p>I think that -<em> despite</em></p>", "<p>I think that—<em>despite</em></p>"],
      [
        "<blockquote><p>Perhaps one did not want to be loved so much as to be understood.</p><p>-- Orwell, <em>1984</em></p></blockquote>",
        "<blockquote><p>Perhaps one did not want to be loved so much as to be understood.</p><p>—Orwell, <em>1984</em></p></blockquote>",
      ],
      // There is NBSP after the - in the next one!
      [
        "<blockquote><blockquote><p>not simply <em>accept</em> – but</p></blockquote></blockquote>",
        "<blockquote><blockquote><p>not simply <em>accept</em>—but</p></blockquote></blockquote>",
      ],
      // Handle en dash number ranges
      ["<p>1-2</p>", "<p>1–2</p>"],
      ["<p>p1-2</p>", "<p>p1–2</p>"], // Page range
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
      transformElement(node, capitalize)

      const targetNode = _getParagraphNode(numChildren, capitalize(before))
      expect(node).toEqual(targetNode)
    })
  })

  describe("Number Range", () => {
    it.each([
      ["1-2", "1–2"],
      ["10-20", "10–20"],
      ["100-200", "100–200"],
      ["1000-2000", "1000–2000"],
      ["1-2 and 3-4", "1–2 and 3–4"],
      ["from 5-10 to 15-20", "from 5–10 to 15–20"],
      ["1-2-3", "1–2-3"], // Only replace the first hyphen
      ["a-b", "a-b"], // Don't replace non-numeric ranges
      ["1a-2b", "1a-2b"], // Don't replace if not purely numeric
      ["1 - 2", "1 - 2"], // Don't replace if there are spaces
      ["a1-2b", "a1-2b"], // Don't replace if not purely numeric
      ["p. 206-207)", "p. 206–207)"], // ) should close out a word boundary
    ])('should replace hyphens with en dashes in number ranges: "%s"', (input, expected) => {
      const result = enDashNumberRange(input)
      expect(result).toBe(expected)
    })
  })
})

describe("applyLinkPunctuation", () => {
  const punctuationMarks = [".", ",", "!", "?", ";", ":", "`"]
  const specialCases = [
    [
      '<p>"<a href="https://example.com">Link</a>"</p>',
      '<p><a href="https://example.com">“Link”</a></p>',
    ],
    [
      '<p>(<a href="https://scholar.google.com/citations?user=thAHiVcAAAAJ">Google Scholar</a>)</p>',
      '<p>(<a href="https://scholar.google.com/citations?user=thAHiVcAAAAJ">Google Scholar</a>)</p>',
    ],
    [
      '<p><em><a href="https://example.com">Link</a></em></p>',
      '<p><em><a href="https://example.com">Link</a></em></p>',
    ],
    [
      '<p><strong><a href="https://example.com">Link</a></strong></p>',
      '<p><strong><a href="https://example.com">Link</a></strong></p>',
    ],
    [
      '<p><a href="/a-certain-formalization-of-corrigibility-is-vnm-incoherent"><em>Corrigibility Can Be VNM-Incoherent</em></a></p>,',
      '<p><a href="/a-certain-formalization-of-corrigibility-is-vnm-incoherent"><em>Corrigibility Can Be VNM-Incoherent,</em></a></p>',
    ],
  ]

  const generateLinkScenarios = () => {
    const basicScenarios = punctuationMarks.map((mark) => [
      `<p><a href="https://example.com">Link</a>${mark}</p>`,
      `<p><a href="https://example.com">Link${mark}</a></p>`,
    ])
    return [...basicScenarios, ...specialCases]
  }

  const linkScenarios = generateLinkScenarios()

  it.each(linkScenarios)("correctly handles link punctuation", (input, expected) => {
    const processedHtml = testHtmlFormattingImprovement(input)
    expect(processedHtml).toBe(expected)
  })

  describe("End-to-end HTML formatting improvement", () => {
    it.each([
      [
        '<p><a href="https://www.amazon.com/Algorithms-Live-Computer-Science-Decisions/dp/1627790365">Algorithms to Live By: The Computer Science of Human Decisions</a>.</p>',
        '<p><a href="https://www.amazon.com/Algorithms-Live-Computer-Science-Decisions/dp/1627790365">Algorithms to Live By: The Computer Science of Human Decisions.</a></p>',
      ],
      [
        '<p><em><a href="https://www.amazon.com/Algorithms-Live-Computer-Science-Decisions/dp/1627790365">Algorithms to Live By: The Computer Science of Human Decisions</a></em>.</p>',
        '<p><em><a href="https://www.amazon.com/Algorithms-Live-Computer-Science-Decisions/dp/1627790365">Algorithms to Live By: The Computer Science of Human Decisions.</a></em></p>',
      ],
    ])(`correctly processes links`, (input: string, expected: string) => {
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })

  describe("Handles multiple links in a single string", () => {
    it("processes multiple links correctly", () => {
      const input =
        '<p>Check out <a href="https://example1.com">Link1</a>, and then <a href="https://example2.com">Link2</a>!</p>'
      const expected =
        '<p>Check out <a href="https://example1.com">Link1,</a> and then <a href="https://example2.com">Link2!</a></p>'
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(expected)
    })
  })

  describe("Doesn't modify non-link text", () => {
    it("leaves regular text unchanged", () => {
      const input = "<p>This is a regular sentence without any links.</p>"
      const processedHtml = testHtmlFormattingImprovement(input)
      expect(processedHtml).toBe(input)
    })
  })
})

// Testing smartquotes balance checker

describe("assertSmartQuotesMatch", () => {
  it("should not throw for an empty string", () => {
    expect(() => assertSmartQuotesMatch("")).not.toThrow()
  })

  it("should not throw for correctly matched quotes", () => {
    const validStrings = [
      "“This is a valid string”",
      "“Nested quotes: “Inside” work too”",
      "“Multiple sentences work too”. “So does this”",
      "Other punctuation is fine: “Hello,” she said.",
    ]

    validStrings.forEach((str) => {
      expect(() => assertSmartQuotesMatch(str)).not.toThrow()
    })
  })

  it("should throw for mismatched opening quotes", () => {
    const invalidStrings = ["“This is missing an end quote", "“Nested “quotes” that are incorrect"]

    invalidStrings.forEach((str) => {
      expect(() => assertSmartQuotesMatch(str)).toThrowErrorMatchingSnapshot()
    })
  })

  it("should throw for mismatched closing quotes", () => {
    const invalidStrings = ["This has a random ending quote”", "“More” nested mismatches”"]

    invalidStrings.forEach((str) => {
      expect(() => assertSmartQuotesMatch(str)).toThrowErrorMatchingSnapshot()
    })
  })
})

describe("flattenTextNodes and getTextContent", () => {
  const ignoreNone = () => false
  const ignoreCode = (n: any) => n.tagName === "code"

  const testNodes = {
    empty: {},
    simple: { type: "text", value: "Hello, world!" },
    nested: {
      type: "element",
      tagName: "div",
      children: [
        { type: "text", value: "This is " },
        { type: "element", tagName: "em", children: [{ type: "text", value: "emphasized" }] },
        { type: "text", value: " text." },
      ],
    },
    withCode: {
      type: "element",
      tagName: "div",
      children: [
        { type: "text", value: "This is " },
        { type: "element", tagName: "code", children: [{ type: "text", value: "ignored" }] },
        { type: "text", value: " text." },
      ],
    },
    emptyAndComment: {
      type: "element",
      tagName: "div",
      children: [
        { type: "element", tagName: "span", children: [] },
        { type: "comment", value: "This is a comment" },
      ],
    },
    deeplyNested: {
      type: "element",
      tagName: "div",
      children: [
        { type: "text", value: "Level 1 " },
        {
          type: "element",
          tagName: "span",
          children: [
            { type: "text", value: "Level 2 " },
            {
              type: "element",
              tagName: "em",
              children: [{ type: "text", value: "Level 3" }],
            },
          ],
        },
        { type: "text", value: " End" },
      ],
    },
  }

  describe("flattenTextNodes", () => {
    it("should handle various node structures", () => {
      expect(flattenTextNodes(testNodes.empty, ignoreNone)).toEqual([])
      expect(flattenTextNodes(testNodes.simple, ignoreNone)).toEqual([testNodes.simple])
      expect(flattenTextNodes(testNodes.nested, ignoreNone)).toEqual([
        { type: "text", value: "This is " },
        { type: "text", value: "emphasized" },
        { type: "text", value: " text." },
      ])
      expect(flattenTextNodes(testNodes.withCode, ignoreCode)).toEqual([
        { type: "text", value: "This is " },
        { type: "text", value: " text." },
      ])
      expect(flattenTextNodes(testNodes.emptyAndComment, ignoreNone)).toEqual([])
      expect(flattenTextNodes(testNodes.deeplyNested, ignoreNone)).toEqual([
        { type: "text", value: "Level 1 " },
        { type: "text", value: "Level 2 " },
        { type: "text", value: "Level 3" },
        { type: "text", value: " End" },
      ])
    })
  })

  describe("getTextContent", () => {
    it("should handle various node structures", () => {
      expect(getTextContent(testNodes.empty as any)).toBe("")
      expect(getTextContent(testNodes.simple as any)).toBe("Hello, world!")
      expect(getTextContent(testNodes.nested as any)).toBe("This is emphasized text.")
      expect(getTextContent(testNodes.withCode as any, ignoreCode)).toBe("This is  text.")
      expect(getTextContent(testNodes.emptyAndComment as any)).toBe("")
      expect(getTextContent(testNodes.deeplyNested as any)).toBe("Level 1 Level 2 Level 3 End")
    })
  })
})
