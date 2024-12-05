import { Text } from "hast"
import { h } from "hastscript"
import { rehype } from "rehype"
import seedrandom from "seedrandom"

import {
  allowAcronyms,
  rehypeTagAcronyms,
  ignoreList,
  isRomanNumeral,
  REGEX_ACRONYM,
  smallCapsSeparators,
  REGEX_ABBREVIATION,
  validSmallCapsPhrase,
  allCapsContinuation,
  REGEX_ALL_CAPS_PHRASE,
  skipSmallcaps,
  ignoreAcronym,
} from "../tagacronyms"

// Helper function for all HTML processing tests
function testTagAcronymsHTML(inputHTML: string) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeTagAcronyms)
    .processSync(inputHTML)
    .toString()
}

describe("rehypeTagAcronyms", () => {
  // Test basic acronym wrapping with representative cases
  const acronymCases = [
    [
      "<p>NASA launched a new satellite for NOAA to study GCRs.</p>",
      '<p><abbr class="small-caps">nasa</abbr> launched a new satellite for <abbr class="small-caps">noaa</abbr> to study <abbr class="small-caps">gcr</abbr>s.</p>',
    ],
    ["<p>GPT-2-XL</p>", '<p><abbr class="small-caps">gpt-2-xl</abbr></p>'],
    ["<p>MIRI-relevant math</p>", '<p><abbr class="small-caps">miri</abbr>-relevant math</p>'],
    // Test all-caps phrases
    [
      "<p>I HATE YOU but YOU ARE SWEET-I LIKE YOU</p>",
      '<p><abbr class="small-caps">i hate you</abbr> but <abbr class="small-caps">you are sweet-i like you</abbr></p>',
    ],
  ]
  it.each(acronymCases)("should properly format: %s", (input, expected) => {
    expect(testTagAcronymsHTML(input)).toBe(expected)
  })
})

describe("Abbreviations and Units", () => {
  // Test numeric abbreviations (e.g., 100km)
  const validCases = ["10ZB", ".1EXP", "10BTC", "100.0KM", "5K"].map((text) => [
    text,
    `<p><abbr class="small-caps">${text.toLowerCase()}</abbr></p>`,
  ])
  it.each(validCases)("should wrap %s correctly", (input, expected) => {
    expect(testTagAcronymsHTML(`<p>${input}</p>`)).toBe(expected)
  })

  // Test invalid cases
  const invalidCases = ["10", "", "5 K", "\nKM"]
  it.each(invalidCases)("should not wrap %s", (text) => {
    const input = `<p>${text}</p>`
    expect(testTagAcronymsHTML(input)).toBe(input)
  })
})

describe("All-caps and Roman Numerals", () => {
  // Test valid acronyms
  const validAcronyms = [...new Set([...allowAcronyms, "AUP", "FBI", "CHAI", "ALÉNA", "ELROND'S"])]
  it.each(validAcronyms)("should wrap valid acronym: %s", (text) => {
    expect(testTagAcronymsHTML(`<p>${text}</p>`)).toBe(
      `<p><abbr class="small-caps">${text.toLowerCase()}</abbr></p>`,
    )
  })

  // Test invalid cases
  const invalidCases = ["AI", "TlDR", "fbi", "FX.TE"]
  it.each(invalidCases)("should not wrap invalid case: %s", (text) => {
    const input = `<p>${text}</p>`
    expect(testTagAcronymsHTML(input)).toBe(input)
  })

  // Test roman numerals
  const romanNumerals = ["III", "VII", "MXC", "IV", "IX"]
  it.each(romanNumerals)("should preserve roman numeral: %s", (numeral) => {
    const input = `<p>${numeral}</p>`
    expect(testTagAcronymsHTML(input)).toBe(input)
  })
})

// Fuzz test for isRomanNumeral
describe("Roman numeral tests", () => {
  const rng = seedrandom("fixed-seed-for-deterministic-tests")

  // Helper function to generate valid Roman numerals
  function generateValidRomanNumeral(): string {
    const romanDigits = [
      ["", "M", "MM", "MMM"],
      ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM"],
      ["", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC"],
      ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
    ]

    return romanDigits.map((digit) => digit[Math.floor(rng() * digit.length)]).join("")
  }

  // Generate 100 valid Roman numerals
  const validNumerals = Array.from({ length: 100 }, generateValidRomanNumeral)

  it.each([...validNumerals, "IV"])("should identify %s as a valid Roman numeral", (numeral) => {
    expect(isRomanNumeral(numeral)).toBe(true)
  })

  const numeralSentences = ["I use the roman numeral XVII.", "I use the roman numeral XVII "]
  it.each(numeralSentences)("should identify %s to contain a valid Roman numeral", (sentence) => {
    const input = `<p>${sentence}</p>`
    const processedHtml: string = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input) // should not wrap the numeral in <abbr> tags
  })

  // Test some edge cases
  const edgeCases = ["", "MMMM", "CCCC", "XXXX", "IIII", "VV", "LL", "DD"]
  it.each(edgeCases)("should identify %s as an invalid Roman numeral", (numeral) => {
    expect(isRomanNumeral(numeral)).toBe(false)
  })

  // Test some invalid inputs
  const invalidInputs = ["ABC", "123", "MLKI", "IVXLCDM", "mxvi", "X I V"]
  it.each(invalidInputs)("should identify %s as an invalid Roman numeral", (input) => {
    expect(isRomanNumeral(input)).toBe(false)
  })
})

describe("REGEX_ACRONYM tests", () => {
  function testAcronym({
    input,
    expectedMatch,
    expectedAcronym,
    expectedSuffix = "",
  }: {
    input: string
    expectedMatch: string
    expectedAcronym: string
    expectedSuffix?: string
  }) {
    const match = REGEX_ACRONYM.exec(input)
    expect(match).not.toBeNull()
    if (match) {
      expect(match[0]).toBe(expectedMatch)
      expect(match.groups?.acronym).toBe(expectedAcronym)
      expect(match.groups?.suffix || "").toBe(expectedSuffix)
    }
  }

  const commonAcronyms = [
    "NASA",
    "FBI",
    "CIA",
    "NATO",
    "UNESCO",
    "WHO",
    "UNICEF",
    "OPEC",
    "NAFTA",
    "ASAP",
    "IAEA",
    "INTERPOL",
    "UNHCR",
    "LGBTQ",
    "POTUS",
  ]

  it.each(commonAcronyms)("should match common acronym: %s", (acronym) => {
    testAcronym({ input: acronym, expectedMatch: acronym, expectedAcronym: acronym })
  })

  it.each(commonAcronyms)("should not match when contiguous with lowercase: %sa", (acronym) => {
    expect(REGEX_ACRONYM.test(acronym + "a")).toBe(false)
  })

  it.each(commonAcronyms)("should match when ending with 's': %ss", (acronym) => {
    testAcronym({
      input: acronym + "s",
      expectedMatch: acronym + "s",
      expectedAcronym: acronym,
      expectedSuffix: "s",
    })
  })

  it.each(commonAcronyms)("should match when ending with 'x': %sx", (acronym) => {
    testAcronym({
      input: acronym + "x",
      expectedMatch: acronym + "x",
      expectedAcronym: acronym,
      expectedSuffix: "x",
    })
  })

  it.each(smallCapsSeparators.split(""))("should match acronyms separated by '%s'", (separator) => {
    testAcronym({
      input: `FBI${separator}CIA`,
      expectedMatch: `FBI${separator}CIA`,
      expectedAcronym: `FBI${separator}CIA`,
    })
  })

  const foreignAcronyms = ["CAFÉ", "RÉSUMÉ", "ÜBER", "FAÇADE"]
  it.each(foreignAcronyms)("should match foreign acronyms with accents: %s", (acronym) => {
    testAcronym({ input: acronym, expectedMatch: acronym, expectedAcronym: acronym })
  })

  it("Should match when sandwiched by accented uppercase characters", () => {
    testAcronym({ input: " ÉÉÉ ", expectedMatch: "ÉÉÉ", expectedAcronym: "ÉÉÉ" })
  })

  const punctuationCases = [
    ["NASA.", "NASA"],
    ["FBI,", "FBI"],
    ["CIA!", "CIA"],
    ["NATO?", "NATO"],
    ["UNESCO:", "UNESCO"],
    ["WHO;", "WHO"],
    ["UNICEF'", "UNICEF"],
    ['OPEC"', "OPEC"],
  ]
  it.each(punctuationCases)(
    "should match acronym followed by punctuation: %s",
    (input, expected) => {
      testAcronym({ input, expectedMatch: expected, expectedAcronym: expected, expectedSuffix: "" })
    },
  )

  const invalidCases = [
    "NASa",
    "fBI",
    "CIa",
    "NaTO",
    "UNESCo",
    "WHo",
    "UNICEf",
    "OPEc",
    "NAFTAing",
    "ASAPly",
    "IAEAish",
    "INTERPOLesque",
  ]
  it.each(invalidCases)("should not match invalid cases: %s", (case_) => {
    expect(REGEX_ACRONYM.test(case_)).toBe(false)
  })

  it.each(smallCapsSeparators.split(""))("should match acronyms separated by '%s'", (separator) => {
    testAcronym({
      input: `FBI${separator}CIA`,
      expectedMatch: `FBI${separator}CIA`,
      expectedAcronym: `FBI${separator}CIA`,
    })
  })

  it("should correctly capture multiple acronyms in a string", () => {
    const input = "The FBIs and CIAs work with NATOs"
    const globalRegex = new RegExp(REGEX_ACRONYM.source, "g")
    const matches = Array.from(input.matchAll(globalRegex))
    expect(matches).toHaveLength(3)
    expect(matches[0].groups?.acronym).toBe("FBI")
    expect(matches[0].groups?.suffix).toBe("s")
    expect(matches[1].groups?.acronym).toBe("CIA")
    expect(matches[1].groups?.suffix).toBe("s")
    expect(matches[2].groups?.acronym).toBe("NATO")
    expect(matches[2].groups?.suffix).toBe("s")
  })

  it("should correctly capture acronym with 's' suffix and punctuation", () => {
    testAcronym({
      input: "NASAs.",
      expectedMatch: "NASAs",
      expectedAcronym: "NASA",
      expectedSuffix: "s",
    })
  })

  it("should correctly capture acronym with 'x' suffix and punctuation", () => {
    testAcronym({
      input: "FBIx,",
      expectedMatch: "FBIx",
      expectedAcronym: "FBI",
      expectedSuffix: "x",
    })
  })
})

describe("REGEX_ABBREVIATION tests", () => {
  function testAbbreviation({
    input,
    expectedNumber,
    expectedAbbreviation,
  }: {
    input: string
    expectedNumber: string
    expectedAbbreviation: string
  }) {
    const fullExpectedMatch = `${expectedNumber}${expectedAbbreviation}`
    const match = REGEX_ABBREVIATION.exec(input)
    expect(match).not.toBeNull()
    if (match) {
      expect(match[0]).toBe(fullExpectedMatch)
      expect(match.groups?.number).toBe(expectedNumber)
      expect(match.groups?.abbreviation).toBe(expectedAbbreviation)
    }
  }

  it.each([
    ["100km", "100", "km"],
    ["3.3km", "3.3", "km"],
    ["5TB", "5", "TB"],
    ["-2.5MB", "2.5", "MB"],
    ["300k", "300", "k"],
    ["300W", "300", "W"],
  ])("should match abbreviation: %s", (input, expectedNumber, expectedAbbreviation) => {
    testAbbreviation({ input, expectedNumber, expectedAbbreviation })
  })

  it.each(["1000", "KM", "1000 km", "1000-km", "1000.km", "5N"])(
    "should not match invalid abbreviations: %s",
    (input) => {
      expect(REGEX_ABBREVIATION.test(input)).toBe(false)
    },
  )
})

const allCapsSentences = ["I LOVE SHREK", "WHERE DID YOU GO", "X-CAFÉ", "THE GPT-2 RESULTS"]
describe("validSmallCapsPhrase Regex Tests", () => {
  const validSmallCapsPhraseRegex = new RegExp(validSmallCapsPhrase)
  describe("Should Match", () => {
    it.each(allCapsSentences)("should match phrase: '%s'", (input) => {
      expect(validSmallCapsPhraseRegex.test(input)).toBe(true)
    })
  })

  describe("Should Not Match", () => {
    it.each(["I", "XY", "Wht A R E you T alKIng about"])("should not match: '%s'", (input) => {
      expect(validSmallCapsPhraseRegex.test(input)).toBe(false)
    })

    it.each(["C-A, POWER"])("should not match: '%s'", (input) => {
      const startingRegexp = new RegExp(`^${validSmallCapsPhraseRegex.source}`)
      expect(startingRegexp.test(input)).toBe(false)
    })
  })
})

describe("allCapsContinuation Regex Tests", () => {
  const allCapsContinuationRegex = new RegExp(allCapsContinuation)

  describe("Should Match", () => {
    const dashPhrases = ["-HI", " HI", "- - - -HI"]

    it.each(dashPhrases)("should match continuation: '%s'", (input) => {
      expect(allCapsContinuationRegex.test(input)).toBe(true)
    })

    it("should not match a single word", () => {
      expect(allCapsContinuationRegex.test("HI")).toBe(false)
    })
  })
})

const notAllCapsSentences = ["I AM HI", "YO YO YO how are you", "What ARE you TALKING about"]
describe("REGEX_ALL_CAPS_PHRASE Regex Tests", () => {
  describe("Should Match", () => {
    it.each(allCapsSentences.concat(["O'BRIEN'S", "What are you TALKING ABOUT ? !"]))(
      "should match phrase: '%s'",
      (input) => {
        expect(REGEX_ALL_CAPS_PHRASE.test(input)).toBe(true)
      },
    )
  })

  describe("Should Not Match", () => {
    it.each(notAllCapsSentences)("should not match phrase: '%s'", (input) => {
      expect(REGEX_ALL_CAPS_PHRASE.test(input)).toBe(false)
    })
  })
})

describe("skipFormatting", () => {
  const testCases = [
    {
      desc: "should return true for no-smallcaps class",
      element: h("div", { class: "no-smallcaps" }),
      expected: true,
    },
    {
      desc: "should return true for no-formatting class",
      element: h("div", { class: "no-formatting" }),
      expected: true,
    },
    {
      desc: "should return true for multiple classes including no-formatting",
      element: h("div", { class: "other-class no-formatting" }),
      expected: true,
    },
    {
      desc: "should return false for other classes",
      element: h("div", { class: "some-other-class" }),
      expected: false,
    },
    {
      desc: "should return false for no classes",
      element: h("div"),
      expected: false,
    },
    {
      desc: "should return true for bad-handwriting class",
      element: h("div", { class: "bad-handwriting" }),
      expected: true,
    },
  ]

  it.each(testCases)("$desc", ({ element, expected }) => {
    expect(skipSmallcaps(element)).toBe(expected)
  })
})

describe("no-formatting tests", () => {
  it.each(["AUP", ...allowAcronyms])(
    "should not wrap acronyms in no-formatting blocks: %s",
    (acronym: string) => {
      const input = `<div class="no-formatting"><p>${acronym}</p></div>`
      const processedHtml = testTagAcronymsHTML(input)
      expect(processedHtml).toBe(input)
    },
  )

  it("should not wrap acronyms in no-smallcaps blocks", () => {
    const input = '<div class="no-smallcaps"><p>NASA launched a new satellite.</p></div>'
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })

  it("should not error when no ancestors are provided", () => {
    const input = "test"
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })

  it("should not wrap acronyms in code blocks", () => {
    const input = "<code>NASA launched a new satellite.</code>"
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })

  it("should handle nested formatting blocks correctly", () => {
    const input = `
      <div class="no-formatting">
        <p>NASA outside</p>
        <div>
          <p>NASA inside</p>
        </div>
      </div>
      <p>NASA after</p>`
    const expected = `
      <div class="no-formatting">
        <p>NASA outside</p>
        <div>
          <p>NASA inside</p>
        </div>
      </div>
      <p><abbr class="small-caps">nasa</abbr> after</p>`
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(expected)
  })

  it("should handle elvish class correctly", () => {
    const input = '<span class="elvish">NASA</span>'
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })

  it("should not double-wrap abbreviations", () => {
    const input = "<abbr>NASA</abbr>"
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })

  it("should not wrap acronyms in language-tagged code blocks", () => {
    const input =
      '<code data-language="pseudocode"><em>IF human can understand THEN do something</em></code>'
    const processedHtml = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(input)
  })
})

describe("ignoreAcronym", () => {
  // Helper function to create a text node
  const createTextNode = (value: string): Text => ({ type: "text", value })

  const testCases = [
    {
      desc: "should return false for whitelisted acronyms",
      node: createTextNode("LLM"),
      ancestors: [h("p")],
      expected: false,
    },
    {
      desc: "should return true for roman numerals",
      node: createTextNode("III"),
      ancestors: [h("p")],
      expected: true,
    },
    {
      desc: "should return true for text in no-formatting div",
      node: createTextNode("NASA"),
      ancestors: [h("div", { class: "no-formatting" })],
      expected: true,
    },
    {
      desc: "should return true for text in no-smallcaps div",
      node: createTextNode("NASA"),
      ancestors: [h("div", { class: "no-smallcaps" })],
      expected: true,
    },
    {
      desc: "should return true for text in code element",
      node: createTextNode("NASA"),
      ancestors: [h("code")],
      expected: true,
    },
    {
      desc: "should return true for text in elvish class",
      node: createTextNode("NASA"),
      ancestors: [h("span", { class: "elvish" })],
      expected: true,
    },
    {
      desc: "should return true for text in abbr element",
      node: createTextNode("NASA"),
      ancestors: [h("abbr")],
      expected: true,
    },
    {
      desc: "should return true for text in nested no-formatting",
      node: createTextNode("NASA"),
      ancestors: [h("div", { class: "no-formatting" })],
      expected: true,
    },
  ]
  it.each(testCases)("$desc", ({ node, ancestors, expected }) => {
    expect(ignoreAcronym(node, ancestors)).toBe(expected)
  })

  // Test each whitelisted acronym
  allowAcronyms.forEach((acronym) => {
    it(`should return false for whitelisted acronym: ${acronym}`, () => {
      const result = ignoreAcronym(createTextNode(acronym), [])
      expect(result).toBe(false)
    })
  })

  // Test each item in ignoreList
  ignoreList.forEach((toIgnore: string) => {
    it(`should return true for ignored item: ${toIgnore}`, () => {
      expect(ignoreAcronym(createTextNode(toIgnore), [])).toBe(true)
    })
  })

  // Test some specific roman numerals
  const romanNumerals = ["III", "VII", "VIII", "XIV", "MXC"]
  it.each(romanNumerals)("should return true for roman numeral %s", (numeral) => {
    expect(ignoreAcronym(createTextNode(numeral), [])).toBe(true)
  })
})
