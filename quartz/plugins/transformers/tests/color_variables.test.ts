import { transformNode, ColorVariables } from "../color_variables"
import { Element } from "hast"

const colorMapping = {
  red: "var(--red)",
  blue: "var(--blue)",
  green: "var(--green)",
}

describe("transformNode", () => {
  it("should replace color names with CSS variables in inline styles", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: { style: "color: red;" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe("color: var(--red);")
  })

  it("should handle multiple color replacements in a single element", () => {
    const input: Element = {
      type: "element",
      tagName: "div",
      properties: { style: "color: blue; background-color: red; border: 1px solid green;" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe(
      "color: var(--blue); background-color: var(--red); border: 1px solid var(--green);",
    )
  })

  it("should not modify colors that are not in the mapping", () => {
    const input: Element = {
      type: "element",
      tagName: "span",
      properties: { style: "color: azalea;" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe("color: azalea;")
  })

  it("should handle case-insensitive color names", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: { style: "color: RED;" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe("color: var(--red);")
  })

  it("should not modify elements without style attribute", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBeUndefined()
  })

  it("should handle elements with empty style attribute", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: { style: "" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe("")
  })
})
