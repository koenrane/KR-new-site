import { jest } from "@jest/globals"
import { Parent, Text } from "hast"
import { h } from "hastscript"

import { replaceRegex, ReplaceFnResult, nodeBeginsWithCapital } from "../utils"

const acceptAll = () => false
describe("replaceRegex", () => {
  const createNode = (value: string): Text => ({ type: "text", value })

  it("should replace matches with the provided function", () => {
    const node = createNode("The quick brown fox jumps over the lazy dog.")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /\bfox\b/g

    const replaceFn = (): ReplaceFnResult => ({
      before: "",
      replacedMatch: "clever fox",
      after: "",
    })

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll, "abbr.small-caps")

    expect(parent.children).toEqual([
      createNode("The quick brown "),
      h("abbr.small-caps", "clever fox"),
      createNode(" jumps over the lazy dog."),
    ])
  })

  it("should handle multiple matches", () => {
    const node = createNode("apple banana apple")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /apple/g

    // Reuse the ReplaceFnResult type
    const replaceFn = (): ReplaceFnResult => ({
      before: "",
      replacedMatch: "fruit",
      after: "",
    })

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(parent.children).toEqual([
      h("span", "fruit"),
      createNode(" banana "),
      h("span", [createNode("fruit")]),
    ])
  })

  it("should respect the ignorePredicate", () => {
    const node = createNode("Hello world!")
    const parent = { type: "span", children: [node] } as Parent
    const regex = /world/g
    const replaceFn = jest.fn().mockImplementation((match: unknown): ReplaceFnResult => {
      return { before: "", replacedMatch: (match as RegExpMatchArray)[0].toUpperCase(), after: "" }
    }) as jest.MockedFunction<(match: RegExpMatchArray) => ReplaceFnResult>

    replaceRegex(node, 0, parent, regex, replaceFn, () => true)

    expect(replaceFn).not.toHaveBeenCalled()
    expect(parent.children).toEqual([node]) // Original node should remain unchanged
  })

  it("should handle nodes without value", () => {
    const node = { type: "text" } as Text
    const parent = { children: [node], type: "span" } as Parent
    const regex = /.*/g
    const replaceFn = jest.fn() as jest.Mock<(match: RegExpMatchArray) => ReplaceFnResult>

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(replaceFn).not.toHaveBeenCalled()
    expect(parent.children).toEqual([node])
  })

  it("should handle empty matchIndexes", () => {
    const node = createNode("No matches here")
    const parent = { children: [node], type: "span" } as Parent
    const regex = /nonexistent/g
    const replaceFn = jest.fn() as jest.Mock<(match: RegExpMatchArray) => ReplaceFnResult>

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(replaceFn).not.toHaveBeenCalled()
    expect(parent.children).toEqual([node])
  })

  it("should handle Element array replacements", () => {
    const node = createNode("2nd place")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /(\d)(nd|st|rd|th)\b/g

    const replaceFn = (match: RegExpMatchArray): ReplaceFnResult => {
      const [fullMatch, num, suffix] = match
      console.log("Match groups:", { fullMatch, num, suffix }) // Debug log

      return {
        before: "",
        replacedMatch: [
          h("span", { className: ["num"] }, num),
          h("span", { className: ["suffix"] }, suffix),
        ],
        after: "",
      }
    }

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(parent.children).toEqual([
      h("span", { className: ["num"] }, "2"),
      h("span", { className: ["suffix"] }, "nd"),
      createNode(" place"),
    ])
  })

  it("should handle overlapping matches by taking first match", () => {
    const node = createNode("aaaa")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /aa/g // Will match "aa" twice, overlapping

    const replaceFn = (): ReplaceFnResult => ({
      before: "",
      replacedMatch: "b",
      after: "",
    })

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(parent.children).toEqual([h("span", "b"), h("span", "b")])
  })

  it("should handle before and after text correctly", () => {
    const node = createNode("test123test")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /123/g

    const replaceFn = (): ReplaceFnResult => ({
      before: "<<",
      replacedMatch: "456",
      after: ">>",
    })

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(parent.children).toEqual([
      createNode("test"),
      createNode("<<"),
      h("span", "456"),
      createNode(">>"),
      createNode("test"),
    ])
  })

  it("should handle single element replacement", () => {
    const node = createNode("test123")
    const parent: Parent = { type: "span", children: [node] }
    const regex = /123/g

    const replaceFn = (): ReplaceFnResult => ({
      before: "",
      replacedMatch: h("span.number", "one-two-three"),
      after: "",
    })

    replaceRegex(node, 0, parent, regex, replaceFn, acceptAll)

    expect(parent.children).toEqual([createNode("test"), h("span.number", "one-two-three")])
  })
})

describe("hasPeriodBefore", () => {
  type TestNode = { type: string; value?: string; prev?: { type: string; value?: string } }

  it.each<[string, TestNode, boolean]>([
    ["no previous sibling", { type: "text", value: "test" }, true],
    [
      "ends with period",
      { type: "text", value: "test", prev: { type: "text", value: "sentence." } },
      true,
    ],
    [
      "ends with period + space",
      { type: "text", value: "test", prev: { type: "text", value: "sentence. " } },
      true,
    ],
    [
      "ends with period + spaces",
      { type: "text", value: "test", prev: { type: "text", value: "sentence.  " } },
      true,
    ],
    [
      "no period",
      { type: "text", value: "test", prev: { type: "text", value: "sentence" } },
      false,
    ],
    ["non-text element", { type: "text", value: "test", prev: { type: "element" } }, false],
  ])("should handle %s", (_case, node, expected) => {
    const typedNode = node as unknown as Node & { prev?: { type: string; value?: string } }
    expect(nodeBeginsWithCapital(typedNode)).toBe(expected)
  })
})
