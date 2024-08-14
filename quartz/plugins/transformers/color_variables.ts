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
  // Transform inline styles
  if (node.properties && typeof node.properties.style === "string") {
    let newStyleString = node.properties.style

    Object.entries(colorMapping).forEach(([color, variable]) => {
      const regex = new RegExp(`(^|\\s|;)(\\w+(-\\w+)*\\s*:\\s*.*)(${color})\\b`, "gi")
      newStyleString = newStyleString.replace(regex, `$1$2${variable}`)
    })

    node.properties.style = newStyleString
  }

  // Transform KaTeX elements
  const className = node.properties?.className
  if (node.tagName === "span" && typeof className === "string" && className.includes("katex")) {
    visit(node, "element", (child: Element) => {
      if (child.properties && child.properties.style) {
        let newStyle = child.properties.style as string
        Object.entries(colorMapping).forEach(([color, variable]) => {
          const regex = new RegExp(`(^|\\s|;)(\\w+(-\\w+)*\\s*:\\s*.*)(${color})\\b`, "gi")
          newStyle = newStyle.replace(regex, `$1$2${variable}`)
        })
        child.properties.style = newStyle
      }
    })
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
