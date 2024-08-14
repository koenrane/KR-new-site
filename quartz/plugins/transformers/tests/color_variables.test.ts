import { ColorVariables } from "../color_variables"
import { Root, Element } from "hast"
import { fromHtml } from "hast-util-from-html"

describe("ColorVariables Plugin", () => {
  const plugin = ColorVariables({
    colorMapping: {
      red: "var(--red)",
      blue: "var(--blue)",
      green: "var(--green)",
    },
  })

  const transform = (html: string): Root => {
    const ast = fromHtml(html, { fragment: true })
    plugin.transform(ast as unknown as Root)
    return ast
  }

  it("should replace color names with CSS variables in inline styles", () => {
    const input = '<p style="color: red;">Red text</p>'
    const result = transform(input)
    const paragraph = result.children[0] as Element
    expect(paragraph.properties?.style).toBe("color: var(--red);")
  })

  it("should handle multiple color replacements in a single element", () => {
    const input =
      '<div style="color: blue; background-color: red; border: 1px solid green;">Colorful div</div>'
    const result = transform(input)
    const div = result.children[0] as Element
    expect(div.properties?.style).toBe(
      "color: var(--blue); background-color: var(--red); border: 1px solid var(--green);"
    )
  })

  it("should not modify colors that are not in the mapping", () => {
    const input = '<span style="color: purple;">Purple text</span>'
    const result = transform(input)
    const span = result.children[0] as Element
    expect(span.properties?.style).toBe("color: purple;")
  })

  it("should handle case-insensitive color names", () => {
    const input = '<p style="color: RED;">Red text</p>'
    const result = transform(input)
    const paragraph = result.children[0] as Element
    expect(paragraph.properties?.style).toBe("color: var(--red);")
  })

  it("should not modify elements without style attribute", () => {
    const input = "<p>Normal paragraph</p>"
    const result = transform(input)
    const paragraph = result.children[0] as Element
    expect(paragraph.properties?.style).toBeUndefined()
  })

  it("should handle elements with empty style attribute", () => {
    const input = '<p style="">Empty style</p>'
    const result = transform(input)
    const paragraph = result.children[0] as Element
    expect(paragraph.properties?.style).toBe("")
  })

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
