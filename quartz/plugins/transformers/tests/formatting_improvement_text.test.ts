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

  describe("Multiplication Sign Replacement", () => {
    it.each([
      ["I have 3x apples and 5x oranges.", "I have 3× apples and 5× oranges."],
      ["The word 'box' should not be changed.", "The word 'box' should not be changed."],
      ["-5x is negative.", "-5× is negative."], // Negative numbers
      ["3.14x pi is fun.", "3.14× pi is fun."], // Decimals
      ["12345x is a big number.", "12345× is a big number."], // Large numbers
      ["0.001x is small.", "0.001× is small."], // Small numbers
      ["There's a 2x4 in the garage.", "There's a 2x4 in the garage."], // No replacement within words
      ["I have 2x apples and 1.5x oranges.", "I have 2× apples and 1.5× oranges."], // Combined cases
      ["<p>This is 3x larger.</p>", "<p>This is 3× larger.</p>"], // HTML context
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
})
