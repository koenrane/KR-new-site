import { emphasisRenderHelper } from "../emphasis_render"

describe("TextFormattingImprovement Plugin", () => {
  describe("Skip YAML header", () => {
    it("ignores YAML header", () => {
      const input = `
---
title: My Document
author: John Doe * d *
---
`
      const result = emphasisRenderHelper(input)
      expect(result).toBe(input)
    })
  })

  describe("Emphasis replacement", () => {
    it.each([
      ["This is *emphasized* text.", "This is <em>emphasized</em> text."],
      ["This is **strong** text.", "This is <strong>strong</strong> text."],
      ["This is ***both***.", "This is <em><strong>both</strong></em>."],
      [
        "This is *emphasized* and **strong**.",
        "This is <em>emphasized</em> and <strong>strong</strong>.",
      ],
      ["> a test.", "> a test."],
      [
        "This is a *list* item:\n* Item 1\n* Item 2",
        "This is a <em>list</em> item:\n* Item 1\n* Item 2",
      ],
      [
        "---\ntitle: My Doc\n---\nThis is *in the content*.",
        "---\ntitle: My Doc\n---\nThis is <em>in the content</em>.",
      ],
      ["---\ntitle: My *Doc*\n---\nThis is normal.", "---\ntitle: My *Doc*\n---\nThis is normal."], // YAML emphasis ignored
    ])("correctly handles '%s'", (input, expected) => {
      const result = emphasisRenderHelper(input)
      expect(result).toBe(expected)
    })
  })
})
