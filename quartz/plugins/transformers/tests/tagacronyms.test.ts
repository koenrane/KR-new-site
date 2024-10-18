import { rehype } from "rehype"
import {
  allowAcronyms,
  rehypeTagAcronyms,
  isRomanNumeral,
  REGEX_ACRONYM,
  smallCapsSeparators,
} from "../tagacronyms"
import seedrandom from "seedrandom"

// Test: Should wrap acronyms in <abbr> tags with class "small-caps"
const nasaIn = "<p>NASA launched a new satellite for NOAA to study GCRs.</p>"
const nasaOut =
  '<p><abbr class="small-caps">NASA</abbr> launched a new satellite for <abbr class="small-caps">NOAA</abbr> to study <abbr class="small-caps">GCR</abbr>s.</p>'

const GPTJ =
  "<p>Similarly, recent work by [Hernandez et al. (2023)](https://arxiv.org/abs/2304.00740) edits factual associations and features in GPT-J (6B)</p>"
const GPTJOut =
  '<p>Similarly, recent work by [Hernandez et al. (2023)](https://arxiv.org/abs/2304.00740) edits factual associations and features in <abbr class="small-caps">GPT-J</abbr> (<abbr class="small-caps">6B</abbr>)</p>'

function testTagAcronymsHTML(inputHTML: string) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeTagAcronyms)
    .processSync(inputHTML)
    .toString()
}

describe("rehypeTagAcronyms", () => {
  it.each([
    [nasaIn, nasaOut],
    [GPTJ, GPTJOut],
    ["<p>GPT-2-XL</p>", '<p><abbr class="small-caps">GPT-2-XL</abbr></p>'],
    ["<p>MIRI-relevant math</p>", '<p><abbr class="small-caps">MIRI</abbr>-relevant math</p>'],
    [
      "<p>I HATE YOU but YOU ARE SWEET-I LIKE YOU</p>",
      '<p><abbr class="small-caps">I HATE YOU</abbr> but <abbr class="small-caps">YOU ARE SWEET-I LIKE YOU</abbr></p>',
    ],
  ])("should wrap acronyms in <abbr> tags with class 'small-caps'", (input, expectedOutput) => {
    const processedHtml: string = testTagAcronymsHTML(input)
    expect(processedHtml).toBe(expectedOutput)
  })
})

// Check that eg 100km becomes <abbr>100km</abbr>
describe("Abbreviations", () => {
  // Test: These should be wrapped in <abbr> tags
  const textIn: Array<string> = ["10ZB", ".1EXP", "10BTC", "100.0KM", "5K", "5k"]
  for (const text of textIn) {
    it(`should wrap ${text} in <abbr> tags`, () => {
      const processedHtml: string = testTagAcronymsHTML(`<p>${text}</p>`)
      expect(processedHtml).toBe(`<p><abbr class="small-caps">${text.toUpperCase()}</abbr></p>`)
    })
  }

  // Test: These should not be wrapped in <abbr> tags
  const ignoreIn: Array<string> = ["10", "", "5 K", "\nKM"]
  for (const text of ignoreIn) {
    it(`should not wrap ${text} in <abbr> tags`, () => {
      const processedHtml: string = testTagAcronymsHTML(`<p>${text}</p>`)
      expect(processedHtml).toBe(`<p>${text}</p>`)
    })
  }
})

describe("All-caps tests", () => {
  // Test: These should be wrapped in <abbr> tags
  const textIn: Array<string> = allowAcronyms.concat([
    "AUP",
    "FBI",
    "CHAI",
    "ALÉNA",
    "ELROND'S",
    "ELROND’S",
    "I HATE YOU",
  ])
  for (const text of textIn) {
    it(`should wrap ${text} in <abbr> tags`, () => {
      const processedHtml: string = testTagAcronymsHTML(`<p>${text}</p>`)
      expect(processedHtml).toBe(`<p><abbr class="small-caps">${text}</abbr></p>`)
    })
  }

  // Test: These should not be wrapped in <abbr> tags
  const ignoreIn: Array<string> = ["AI", "TlDR", "fbi", "FX.TE"]
  for (const text of ignoreIn) {
    it(`should not wrap ${text} in <abbr> tags`, () => {
      const processedHtml: string = testTagAcronymsHTML(`<p>${text}</p>`)
      expect(processedHtml).toBe(`<p>${text}</p>`)
    })
  }

  const romanNumerals: Array<string> = ["III", "VII", "MXC", "IV", "IX"]
  for (const numeral of romanNumerals) {
    it(`should not wrap ${numeral} in <abbr> tags`, () => {
      const input = `<p>${numeral}</p>`
      const processedHtml: string = testTagAcronymsHTML(input)
      expect(processedHtml).toBe(input)
    })
  }
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

  it.each(validNumerals)("should identify %s as a valid Roman numeral", (numeral) => {
    expect(isRomanNumeral(numeral)).toBe(true)
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
    console.log(REGEX_ACRONYM.source)
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
