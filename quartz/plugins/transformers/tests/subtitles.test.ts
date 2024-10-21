import { unified } from "unified"
import rehypeParse from "rehype-parse"
import rehypeStringify from "rehype-stringify"
import {
  transformAST,
  SUBTITLE_REGEX,
  createSubtitleNode,
  modifyNode,
  processParagraph,
} from "../subtitles"
import { Element, Parent } from "hast"
import { h } from "hastscript"
import { expect } from "@jest/globals"

function removePositions(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removePositions)
  } else if (typeof obj === "object" && obj !== null) {
    const newObj: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key !== "position") {
        newObj[key] = removePositions(value)
      }
    }
    return newObj
  }
  return obj
}

async function process(input: string) {
  const result = await unified()
    .use(rehypeParse, { fragment: true })
    .use(() => transformAST)
    .use(rehypeStringify)
    .process(input)
  return result.toString()
}

describe("rehype-custom-subtitle", () => {
  it.each([
    ["<p>sub: This is a subtitle</p>", "simple subtitle"],
    ["<p>sub:This is a subtitle without space</p>", "subtitle without space"],
    ["<p>sub: Subtitle with <em>formatting</em></p>", "subtitle with formatting"],
  ])("transforms subtitle paragraph to custom subtitle element (%s)", async (input) => {
    const output = await process(input)
    expect(output).toMatch(/<p class="subtitle"[^>]*>/)
    expect(output).not.toContain("sub:")
  })

  it.each([
    ["<p>This is not a subtitle</p>", "regular paragraph"],
    [
      "<p>Not at start. sub: This is not at the start of the paragraph</p>",
      "subtitle not at start",
    ],
  ])("does not transform non-subtitle content (%s)", async (input) => {
    const output = await process(input)
    expect(output).toBe(input)
  })

  describe("SUBTITLE_REGEX", () => {
    it.each([
      ["sub: This is a subtitle", "This is a subtitle"],
      ["sub:This is a subtitle without space", "This is a subtitle without space"],
      ["sub: Subtitle with multiple words", "Subtitle with multiple words"],
    ])("matches valid subtitle syntax (%s)", (input, expected) => {
      const match = input.match(SUBTITLE_REGEX)
      expect(match).not.toBeNull()
      expect(match![1]).toBe(expected)
    })

    it.each([
      ["This is not a subtitle"],
      ["Not at start. sub: This is not at the start of the paragraph"],
      ["Sub: Capitalized prefix"],
    ])("does not match invalid subtitle syntax (%s)", (input) => {
      const match = input.match(SUBTITLE_REGEX)
      expect(match).toBeNull()
    })
  })

  test("createSubtitleNode function", () => {
    const node = createSubtitleNode("Subtitle content") as Element

    expect(node.tagName).toBe("p")
    expect(node.properties?.className).toContain("subtitle")
    expect(node.children).toHaveLength(1)
    expect(node.children[0]).toEqual({ type: "text", value: "Subtitle content" })
  })

  describe("processParagraph function", () => {
    it.each([
      {
        name: "simple subtitle paragraph",
        input: h("p", {}, "sub: This is a subtitle"),
        expected: "This is a subtitle",
      },
      {
        name: "non-subtitle paragraph",
        input: h("p", {}, "This is not a subtitle"),
        expected: null,
      },
      {
        name: "paragraph with multiple children",
        input: h("p", {}, ["sub: ", h("em", "Not a subtitle")]),
        expected: "Not a subtitle",
      },
    ])("$name", ({ input, expected }) => {
      const result = processParagraph(input as Element)
      expect(result).toEqual(expected)
    })
  })

  describe("modifyNode function", () => {
    it.each([
      {
        name: "simple subtitle paragraph",
        input: h("p", {}, "sub: This is a subtitle"),
        expected: createSubtitleNode("This is a subtitle"),
      },
      {
        name: "non-subtitle paragraph",
        input: h("p", {}, "This is not a subtitle"),
        expected: h("p", {}, "This is not a subtitle"),
      },
    ])("$name", ({ input, expected }) => {
      const parent: Parent = { type: "root", children: [input] }
      modifyNode(input as Element, 0, parent)
      expect(removePositions(parent.children[0])).toEqual(removePositions(expected))
    })
  })
})
