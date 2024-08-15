import { transformElement, transformStyle, ColorVariables } from "../color_variables"
import { Element } from "hast"

const colorMapping = {
  red: "var(--red)",
  blue: "var(--blue)",
  green: "var(--green)",
}

describe("transformStyle", () => {
  it("should replace color names with CSS variables in inline styles", () => {
    const input = "color: red;"
    const result = transformStyle(input, colorMapping)
    expect(result).toBe("color: var(--red);")
  })

  it("should handle multiple color replacements in a single style", () => {
    const input = "color: blue; background-color: red; border: 1px solid green;"
    const result = transformStyle(input, colorMapping)
    expect(result).toBe("color: var(--blue); background-color: var(--red); border: 1px solid var(--green);")
  })

  it("should not modify colors that are not in the mapping", () => {
    const input = "color: azalea;"
    const result = transformStyle(input, colorMapping)
    expect(result).toBe("color: azalea;")
  })

  it("should handle case-insensitive color names", () => {
    const input = "color: RED;"
    const result = transformStyle(input, colorMapping)
    expect(result).toBe("color: var(--red);")
  })

  it("should handle empty style", () => {
    const input = ""
    const result = transformStyle(input, colorMapping)
    expect(result).toBe("")
  })
})

describe("transformElement", () => {
  it("should apply transformStyle to element's style property", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: { style: "color: red;" },
      children: [],
    }
    const result = transformElement(input, colorMapping)
    expect(result.properties?.style).toBe("color: var(--red);")
  })

  it("should not modify elements without style attribute", () => {
    const input: Element = {
      type: "element",
      tagName: "p",
      properties: {},
      children: [],
    }
    const result = transformElement(input, colorMapping)
    expect(result.properties?.style).toBeUndefined()
  })
})

function expectFirstChildStyleToBe(node: Element, style: string) {
  if ("properties" in node.children[0]) {
    expect(node.children[0].properties?.style).toBe(style)
  } else {
    expect(false).toBe(true)
  }
}

describe("KaTeX element handling", () => {
  it("should handle KaTeX elements with inline color styles", () => {
    const input: Element = {
      type: "element",
      tagName: "span",
      properties: { className: ["katex"] },
      children: [
        {
          type: "element",
          tagName: "span",
          properties: { className: ["katex-html"] },
          children: [
            {
              type: "element",
              tagName: "span",
              properties: { className: ["base"] },
              children: [
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["mord"], style: "color:red;" },
                  children: [{ type: "text", value: "x" }],
                },
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["mrel"], style: "color:blue;" },
                  children: [{ type: "text", value: "=" }],
                },
                {
                  type: "element",
                  tagName: "span",
                  properties: { className: ["mord"], style: "color:green;" },
                  children: [{ type: "text", value: "y" }],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = transformElement(input, colorMapping)

    const katexHtml = result.children[0] as Element
    const baseSpan = katexHtml.children[0] as Element
    const [xSpan, equalSpan, ySpan] = baseSpan.children as Element[]

    expect(xSpan.properties?.style).toBe("color:var(--red);")
    expect(equalSpan.properties?.style).toBe("color:var(--blue);")
    expect(ySpan.properties?.style).toBe("color:var(--green);")
  })
})
