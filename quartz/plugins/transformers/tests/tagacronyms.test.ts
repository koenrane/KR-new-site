import { rehype } from "rehype"
import { allowAcronyms, rehypeTagAcronyms, isRomanNumeral } from "../tagacronyms"
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
