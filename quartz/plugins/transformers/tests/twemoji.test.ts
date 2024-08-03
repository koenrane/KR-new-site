import { visit } from "unist-util-visit"
import { h } from "hastscript"
import { Node, Parent } from "unist"
import { Element, Text } from "hast"
import {
  PLACEHOLDER,
  EMOJI_REPLACEMENT,
  TWEMOJI_BASE_URL,
  EMOJIS_TO_REPLACE,
  TwemojiOptions,
  createTwemojiCallback,
  parseAttributes,
  replaceEmoji,
  createNodes,
  processTree,
} from "../twemoji"
import { Node as UnistNode } from "unist"

interface CustomNode extends UnistNode {
  children?: CustomNode[]
  value?: string
}

function createEmoji(path: string, originalChar: any): any {
  if (!path.endsWith(".svg")) {
    throw new Error("Only SVGs are supported")
  }
  return {
    type: "element",
    tagName: "img",
    children: [],
    properties: {
      alt: originalChar,
      className: ["emoji"],
      draggable: "false",
      src: `${TWEMOJI_BASE_URL}${path}`,
    },
  }
}

// Mock the twemoji module
import { jest } from "@jest/globals"
jest.mock("../modules/twemoji.min", () => ({
  twemoji: {
    parse: jest.fn((content: string) =>
      content.replace("😀", `<img src="${TWEMOJI_BASE_URL}1f600.svg">")`),
    ),
  },
}))

type TwemojiCallback = (icon: string, options: TwemojiOptions) => string

describe("Twemoji functions", () => {
  describe("createTwemojiCallback", () => {
    it("should return the correct URL", () => {
      const mockCallback: TwemojiCallback = jest.fn((icon, options) => `mock-${icon}`)
      const options: TwemojiOptions = { folder: "svg", ext: ".svg", callback: mockCallback }
      const result = createTwemojiCallback("1f600", options)
      expect(result).toBe(`${TWEMOJI_BASE_URL}1f600.svg`)
    })
  })

  describe("parseAttributes", () => {
    it("should parse attributes correctly", () => {
      const imgTag = '<img src="test.png" alt="test" width="20" height="20">'
      const result = parseAttributes(imgTag)
      expect(result).toEqual({
        src: "test.png",
        alt: "test",
        width: "20",
        height: "20",
      })
    })
  })

  describe("createNodes", () => {
    it("should create nodes correctly", () => {
      const parsed = 'Hello <img src="test.png" alt="test"> World'
      const result = createNodes(parsed)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(h("img", { src: "test.png", alt: "test" }))
    })
  })

  describe("processTree", () => {
    it("should replace placeholders and emojis correctly", () => {
      const mockTree: CustomNode = {
        type: "root",
        children: [{ type: "text", value: "Hello ↩ 😀" }],
      }

      const result = processTree(mockTree as Node) as CustomNode

      expect(result).toEqual({
        type: "root",
        children: [{ type: "text", value: "Hello ⤴ " }, createEmoji("1f600.svg", "😀")],
      })
    })

    it("should handle multiple text nodes and emojis", () => {
      const mockTree: CustomNode = {
        type: "root",
        children: [
          { type: "text", value: "Hello ↩" },
          { type: "text", value: "😀 World ↩" },
          { type: "text", value: "👋" },
        ],
      }

      const result = processTree(mockTree as Node) as CustomNode

      expect(result).toEqual({
        type: "root",
        children: [
          { type: "text", value: "Hello ⤴" },
          createEmoji("1f600.svg", "😀"),
          { type: "text", value: " World ⤴" },
          createEmoji("1f44b.svg", "👋"),
        ],
      })
    })

    it("should not modify nodes without emojis or placeholders", () => {
      const mockTree: CustomNode = {
        type: "root",
        children: [{ type: "text", value: "Hello World" }],
      }

      const result = processTree(mockTree as Node) as CustomNode

      expect(result).toEqual(mockTree)
    })
  })
})
