import type { Text, InlineCode, Code, Link, Emphasis } from "mdast"

import { describe, expect, it } from "@jest/globals"

import { customToString } from "./toc"

// Helper to create nodes with proper types
const h = <T extends { type: string }>(type: T["type"], props: Omit<T, "type">): T =>
  ({
    type,
    ...props,
  }) as T

describe("customToString", () => {
  it.each([
    ["text", h<Text>("text", { value: "Hello world" }), "Hello world"],
    ["inlineCode", h<InlineCode>("inlineCode", { value: "const x = 1" }), "`const x = 1`"],
    ["code", h<Code>("code", { value: "function test() {}", lang: "js" }), "`function test() {}`"],
    [
      "link",
      h<Link>("link", {
        url: "https://example.com",
        children: [h<Text>("text", { value: "Link text" })],
      }),
      "Link text",
    ],
    [
      "emphasis",
      h<Emphasis>("emphasis", { children: [h<Text>("text", { value: "emphasized text" })] }),
      "emphasized text",
    ],
  ])("handles %s nodes", (_, node, expected) => {
    expect(customToString(node)).toBe(expected)
  })
})
