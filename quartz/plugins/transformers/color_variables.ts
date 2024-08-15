import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../types"
import type { Element } from "hast"
import type { Root } from "mdast"

interface Options {
  colorMapping: Record<string, string>
}

export const transformStyle = (style: string, colorMapping: Record<string, string>): string => {
  let newStyle = style
  Object.entries(colorMapping).forEach(([color, variable]) => {
    const regex = new RegExp(`\\b${color}\\b`, "gi")
    console.log(regex, style, variable)
    newStyle = newStyle.replace(regex, `${variable}`)
  })
  return newStyle
}

/**
 * Transforms color names in inline styles and KaTeX elements to CSS variables for a single node
 * @param node - The HAST Element node to transform
 * @param colorMapping - The mapping of color names to CSS variables
 * @returns The transformed node
 */
export const transformElement = (
  element: Element,
  colorMapping: Record<string, string>,
): Element => {
  if (element.properties && typeof element.properties.style === "string") {
    element.properties.style = transformStyle(element.properties.style, colorMapping)
  }
  element.children.forEach((child) => {
    if (child.type === "element") {
      transformElement(child, colorMapping)
    }
  })
  return element
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
        transformElement(node, colorMapping)
      })
    },
  }
}

export default ColorVariables
