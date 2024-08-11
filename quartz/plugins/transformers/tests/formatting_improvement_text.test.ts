import {
  formattingImprovement,
  editAdmonition,
  noteAdmonition,
} from "../formatting_improvement_text"

// Test Helper Function (adapted from your existing code)
function processtext(inputtext: string): string {
  return formattingImprovement(inputtext)
}

describe("TextFormattingImprovement Plugin", () => {
  describe("Footnote Formatting", () => {
    it.each([
      [
        "This sentence has a footnote.[^1] Another sentence.",
        "This sentence has a footnote.[^1] Another sentence.",
      ],
      ['defined [^16] "values" to', 'defined[^16] "values" to'],
    ])("Correctly formats footnotes.", (input: string, expected: string): void => {
      const result = processtext(input)
      expect(result).toBe(expected)
    })
  })

  describe("Comma spacing", () => {
    it.each([
      ["  ,", ","],
      ["Hi, he said", "Hi, he said"],
    ])("Removes spaces before commas.", (input: string, expected: string): void => {
      const result = processtext(input)
      expect(result).toBe(expected)
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
})

describe("editAdmonition", () => {
  it('should replace a basic "edit" command with the admonition', () => {
    const input = "edit 08-10-2023: This is some edited text."
    const expected = "> [!info] Edited on 08-10-2023\n> This is some edited text."
    expect(editAdmonition(input)).toBe(expected)
  })

  it('should replace a basic "eta" command with the admonition', () => {
    const input = "eta 8/10/2023: Updated information here."
    const expected = "> [!info] Edited on 8/10/2023\n> Updated information here."
    expect(editAdmonition(input)).toBe(expected)
  })

  it("should be case-insensitive", () => {
    const input = "Edit 06-15-2023: Some case-insensitive text."
    const expected = "> [!info] Edited on 06-15-2023\n> Some case-insensitive text."
    expect(editAdmonition(input)).toBe(expected)
  })

  it("should not modify text without the edit/eta command", () => {
    const input = "This is some regular text without an edit command."
    expect(editAdmonition(input)).toBe(input)
  })
})

describe("noteAdmonition", () => {
  it('should handle multiple "note:" occurrences', () => {
    const input = "note: First note.\nSome other text.\nnote: Second note."
    const expected = "> [!note]\n > First note.\nSome other text.\n> [!note]\n > Second note."
    expect(noteAdmonition(input)).toBe(expected)
  })

  it("should be case-insensitive", () => {
    const input = "NOTE: This is a case-insensitive note."
    const expected = "> [!note]\n > This is a case-insensitive note."
    expect(noteAdmonition(input)).toBe(expected)
  })

  it('should not modify text without the "note:" prefix', () => {
    const input = "This is some regular text without a note."
    expect(noteAdmonition(input)).toBe(input)
  })

  it('should handle "note:" at the beginning of a line', () => {
    const input = "Some text.\nnote: A note at the start of a line."
    const expected = "Some text.\n> [!note]\n > A note at the start of a line."
    expect(noteAdmonition(input)).toBe(expected)
  })

  it('should not handle "note:" at the end of a line', () => {
    const input = "Some text. note: A note at the end of a line."
    expect(noteAdmonition(input)).toBe(input)
  })
})
