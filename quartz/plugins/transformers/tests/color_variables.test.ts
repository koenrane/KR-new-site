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

function expectFirstChildStyleToBe(node: Element, style: string) {
  if ("properties" in node.children[0]) {
    expect(node.children[0].properties?.style).toBe(style)
  } else {
    expect(false).toBe(true)
  }
}

describe("KaTeX element handling", () => {
  it("should replace colors in KaTeX elements", () => {
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
                  properties: { className: ["mord"], style: "color: red;" },
                  children: [{ type: "text", value: "x" }],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = transformNode(input, colorMapping)
    expect((result.children[0] as Element).children[0].properties?.style).toBe("color: var(--red);")
  })

  it("should handle nested KaTeX elements with MathML", () => {
    const input: Element = {
      type: "element",
      tagName: "span",
      properties: { className: ["katex"] },
      children: [
        {
          type: "element",
          tagName: "math",
          properties: { xmlns: "http://www.w3.org/1998/Math/MathML" },
          children: [
            {
              type: "element",
              tagName: "semantics",
              children: [
                {
                  type: "element",
                  tagName: "mrow",
                  children: [
                    {
                      type: "element",
                      tagName: "mstyle",
                      properties: { mathcolor: "blue" },
                      children: [{ type: "text", value: "x" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
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
                  properties: { className: ["mord"], style: "color: blue;" },
                  children: [{ type: "text", value: "x" }],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = transformNode(input, colorMapping)
    
    // Check MathML part
    const mathmlPart = result.children[0] as Element
    const mstyle = mathmlPart.children[0].children[0].children[0] as Element
    expect(mstyle.properties?.mathcolor).toBe("var(--blue)")
    
    // Check HTML part
    const htmlPart = result.children[1] as Element
    const coloredSpan = htmlPart.children[0].children[0] as Element
    expect(coloredSpan.properties?.style).toBe("color: var(--blue);")
  })
})
