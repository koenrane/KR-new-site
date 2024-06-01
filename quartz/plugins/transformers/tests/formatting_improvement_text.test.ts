import { formattingImprovement } from "../formatting_improvement_text"

// Test Helper Function (adapted from your existing code)
function processtext(inputtext: string): string {
  return formattingImprovement(inputtext)
}

describe("TextFormattingImprovement Plugin", () => {
  describe("Footnote Formatting", () => {
    it("correctly formats footnotes at the end of a sentence", () => {
      // const input = "This sentence has a footnote.[^1] Another sentence.";
      // const expected = "This sentence has a footnote.[^1] Another sentence.";
      // const result = processtext(input);
      // expect(result).toBe(expected);
    })
  })

  describe("YAML Header Handling", () => {
    it("ignores YAML header and processes content correctly", () => {
      const input = `
---
title: My Document
author: John Doe
---

This is the main content of the document. It has a footnote.[^1]
And some hyphens-to-be-ignored.
This text is 3x larger.`

      const expectedOutput = `
---
title: My Document
author: John Doe
---

This is the main content of the document. It has a footnote.[^1]
And some hyphens-to-be-ignored.
This text is 3× larger.`

      const result = processtext(input)
      expect(result).toBe(expectedOutput)
    })
  })

  describe("Multiplication Sign Replacement", () => {
    it.each([
      ["I have 3x apples and 5x oranges.", "I have 3× apples and 5× oranges."],
      ["The word 'box' should not be changed.", "The word 'box' should not be changed."],
      ["-5x is negative.", "-5× is negative."], // Negative numbers
      ["3.14x pi is fun.", "3.14× pi is fun."], // Decimals
      ["5*5 area", "5×5 area"], // Asterisk
      ["12345x is a big number.", "12345× is a big number."], // Large numbers
      ["0.001x is small.", "0.001× is small."], // Small numbers
      ["There's a 2x4 in the garage.", "There's a 2x4 in the garage."], // No replacement within words
      ["I have 2x apples and 1.5x oranges.", "I have 2× apples and 1.5× oranges."], // Combined cases
      ["This is 3x larger.", "This is 3× larger."], // HTML context
    ])("correctly handles '%s'", (input, expected) => {
      const result = processtext(input)
      expect(result).toBe(expected)
    })
    it("doesn't replace 'x' in words", () => {
      const input = "The word 'box' should not be changed."
      const result = processtext(input)
      expect(result).toBe(input) // No change expected
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
      ['" - Me', '" — Me'],
      ["- Me", "— Me"], // Don't delete space after dash at the start of a line
    ])('should replace hyphens in "%s"', (input, expected) => {
      const processedHtml = processtext(input)
      expect(processedHtml).toBe(expected)
    })
  })
})
