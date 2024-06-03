import { rehype } from "rehype"
import { rehypeTagAcronyms } from "../tagacronyms"

// Test: Should wrap acronyms in <abbr> tags with class "small-caps"
const htmlIn = "<p>NASA launched a new satellite for NOAA to study GCRs.</p>"
const expectedOutput =
  '<p><abbr class="small-caps">NASA</abbr> launched a new satellite for <abbr class="small-caps">NOAA</abbr> to study <abbr class="small-caps">GCR</abbr>s.</p>'

function testTagAcronymsHTML(inputHTML: string) {
  return rehype()
    .data("settings", { fragment: true })
    .use(rehypeTagAcronyms)
    .processSync(inputHTML)
    .toString()
}

describe("rehypeTagAcronyms", () => {
  it("should wrap acronyms in <abbr> tags with class 'small-caps'", () => {
    const processedHtml: string = testTagAcronymsHTML(htmlIn)
    expect(processedHtml).toBe(expectedOutput) // Use Jest's `expect`
  })
})

// Check that eg 100km becomes <abbr>100km</abbr>
describe("Abbreviations", () => {
  // Test: These should be wrapped in <abbr> tags
  const textIn: Array<string> = ["10ZB", ".1EXP", "10BTC", "100.0KM", "5K"]
  for (const text of textIn) {
    it(`should wrap ${text} in <abbr> tags`, () => {
      const processedHtml: string = testTagAcronymsHTML(`<p>${text}</p>`)
      expect(processedHtml).toBe(`<p><abbr class="small-caps">${text}</abbr></p>`)
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

describe("Acronyms", () => {
  // Test: These should be wrapped in <abbr> tags
  const textIn: Array<string> = ["AUP", "FBI", "TL;DR", "CHAI", "ALÉNA"]
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
})
