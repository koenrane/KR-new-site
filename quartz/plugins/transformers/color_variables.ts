import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../types"
import type { Element } from "hast"
import type { Root } from "mdast"

interface Options {
  colorMapping: Record<string, string>
}

/**
 * Transforms color names in inline styles and KaTeX elements to CSS variables for a single node
 * @param node - The HAST Element node to transform
 * @param colorMapping - The mapping of color names to CSS variables
 * @returns The transformed node
 */
export function transformNode(node: Element, colorMapping: Record<string, string>): Element {
  const transformStyle = (style: string): string => {
    let newStyle = style
    Object.entries(colorMapping).forEach(([color, variable]) => {
      const regex = new RegExp(`(^|\\s|;|:)(${color})\\b`, "gi")
      newStyle = newStyle.replace(regex, `$1${variable}`)
    })
    return newStyle
  }

  // Transform inline styles
  if (node.properties && typeof node.properties.style === "string") {
    node.properties.style = transformStyle(node.properties.style)
  }

  // Transform KaTeX elements and their children
  const transformKaTeX = (element: Element) => {
    if (element.properties && typeof element.properties.style === "string") {
      element.properties.style = transformStyle(element.properties.style)
    }
    element.children.forEach((child) => {
      if (child.type === "element") {
        transformKaTeX(child)
      }
    })
  }

  const className = node.properties.className
  if (node.tagName === "span" && typeof className === "string" && className.includes("katex")) {
    transformKaTeX(node)
  }

  return node
}

/**
 * Transforms color names in inline styles and KaTeX elements to CSS variables
 * @param opts - Options for the transformer
 * @returns A QuartzTransformerPlugin that replaces color names with CSS variables
 */
export const ColorVariables: QuartzTransformerPlugin<Options> = (opts) => {
  const colorMapping = opts?.colorMapping ?? {
    red: "var(--red)",
    blue: "var(--blue)",
    // Add more color mappings as needed
  }

  return {
    name: "ColorVariables",
    transform(ast: Root) {
      visit(ast, "element", (node: Element) => {
        transformNode(node, colorMapping)
      })
    },
  }
}

export default ColorVariables
