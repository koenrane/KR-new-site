/**
 * @jest-environment jsdom
 */

import type { Parent } from "hast"

import { describe, it, expect, beforeEach } from "@jest/globals"

import { processInlineCode, processKatex, processSmallCaps } from "../component_utils"

let parent: Parent
beforeEach(() => {
  parent = { type: "element", tagName: "div", children: [] } as Parent
})

describe("processKatex", () => {
  it("should output katex node", () => {
    const latex = "E = mc^2"
    processKatex(latex, parent)

    expect(parent.children).toHaveLength(1)
    expect(parent.children[0]).toHaveProperty("tagName", "span")
    expect(parent.children[0]).toHaveProperty("properties.className", ["katex-toc"])
    // The value itself is HTML so it's clunky to test
  })
})

describe("processSmallCaps", () => {
  beforeEach(() => {
    parent = { type: "element", tagName: "div", children: [] } as Parent
  })

  it("processes small caps correctly", () => {
    processSmallCaps("Test SMALLCAPS", parent)
    expect(parent.children).toMatchObject([
      { type: "text", value: "Test " },
      {
        type: "element",
        tagName: "abbr",
        properties: { className: ["small-caps"] },
        children: [{ type: "text", value: "smallcaps" }],
      },
    ])
  })

  it("handles text without small caps", () => {
    processSmallCaps("No small caps here", parent)
    expect(parent.children).toMatchObject([{ type: "text", value: "No small caps here" }])
  })

  it("handles multiple small caps", () => {
    processSmallCaps("^SMALLCAPS-A normal SMALLCAPS-B", parent)
    expect(parent.children).toMatchObject([
      { type: "text", value: "^" },
      {
        type: "element",
        tagName: "abbr",
        properties: { className: ["small-caps"] },
        children: [{ type: "text", value: "smallcaps-a" }],
      },
      { type: "text", value: " normal " },
      {
        type: "element",
        tagName: "abbr",
        properties: { className: ["small-caps"] },
        children: [{ type: "text", value: "smallcaps-b" }],
      },
    ])
  })

  it("handles parent with existing children", () => {
    parent.children = [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["number-prefix"] },
        children: [{ type: "text", value: "8: " }],
      },
    ]

    processSmallCaps("Estimating the CDF and Statistical Functionals", parent)

    expect(parent.children).toMatchObject([
      {
        type: "element",
        tagName: "span",
        properties: { className: ["number-prefix"] },
        children: [{ type: "text", value: "8: " }],
      },
      { type: "text", value: "Estimating the " },
      {
        type: "element",
        tagName: "abbr",
        properties: { className: ["small-caps"] },
        children: [{ type: "text", value: "cdf" }],
      },
      { type: "text", value: " and Statistical Functionals" },
    ])
  })
})

describe("Code Processing", () => {
  let parent: Parent

  beforeEach(() => {
    parent = { type: "element", tagName: "div", children: [] } as Parent
  })

  describe("processInlineCode", () => {
    it("should wrap code in code element", () => {
      processInlineCode("const x = 1", parent)

      expect(parent.children).toHaveLength(1)
      expect(parent.children[0]).toMatchObject({
        type: "element",
        tagName: "code",
        children: [{ type: "text", value: "const x = 1" }],
      })
    })

    it("should handle code with special characters", () => {
      processInlineCode("x => x * 2", parent)

      expect(parent.children[0]).toMatchObject({
        type: "element",
        tagName: "code",
        children: [{ type: "text", value: "x => x * 2" }],
      })
    })
  })

  describe("Mixed Content Processing", () => {
    it("should handle mixed text and code", () => {
      processInlineCode("code", parent)
      processKatex("x^2", parent)

      expect(parent.children).toHaveLength(2)
      expect(parent.children[0]).toMatchObject({
        type: "element",
        tagName: "code",
        children: [{ type: "text", value: "code" }],
      })
      expect(parent.children[1]).toMatchObject({
        type: "element",
        tagName: "span",
        properties: { className: ["katex-toc"] },
      })
    })
  })
})
