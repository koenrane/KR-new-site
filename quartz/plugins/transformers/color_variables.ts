import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../types"
import type { Element } from "hast"
import type { Root } from "mdast"

interface Options {
  colorMapping: Record<string, string>
}

/**
 * Transforms color names in inline styles to CSS variables for a single node
 * @param node - The HAST Element node to transform
 * @param colorMapping - The mapping of color names to CSS variables
 * @returns The transformed node
 */
export function transformNode(node: Element, colorMapping: Record<string, string>): Element {
  if (node.properties && typeof node.properties.style === "string") {
    const styleString = node.properties.style
    let newStyleString = styleString

    Object.entries(colorMapping).forEach(([color, variable]) => {
      const regex = new RegExp(`color:\\s*${color}`, "gi")
      if (regex.test(newStyleString)) {
        console.log(color, variable)
        newStyleString = newStyleString.replace(regex, `color: ${variable}`)
      }
    })

    node.properties.style = newStyleString
  }
  return node
}

/**
 * Transforms color names in inline styles to CSS variables
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
