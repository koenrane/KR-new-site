import { transformNode, ColorVariables } from "../color_variables"
import { Root, Element } from "hast"
import { fromHtml } from "hast-util-from-html"

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
      "color: var(--blue); background-color: var(--red); border: 1px solid var(--green);"
    )
  })

  it("should not modify colors that are not in the mapping", () => {
    const input: Element = {
      type: "element",
      tagName: "span",
      properties: { style: "color: purple;" },
      children: [],
    }
    const result = transformNode(input, colorMapping)
    expect(result.properties?.style).toBe("color: purple;")
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

describe("ColorVariables Plugin", () => {
  const plugin = ColorVariables({ colorMapping })

  const transform = (html: string): Root => {
    const ast = fromHtml(html, { fragment: true })
    plugin.transform(ast as unknown as Root)
    return ast
  }

  it("should handle multiple elements in the AST", () => {
    const input = `
      <p style="color: red;">Red paragraph</p>
      <div style="background-color: blue;">Blue background</div>
      <span style="border: 1px solid green;">Green border</span>
    `
    const result = transform(input)
    const elements = result.children.filter((child): child is Element => child.type === "element")
    
    expect(elements[0].properties?.style).toBe("color: var(--red);")
    expect(elements[1].properties?.style).toBe("background-color: var(--blue);")
    expect(elements[2].properties?.style).toBe("border: 1px solid var(--green);")
  })
})
