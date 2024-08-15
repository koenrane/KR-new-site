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
  if (typeof element?.properties?.style === "string") {
    element.properties.style = transformStyle(element.properties.style, colorMapping)
  }
  return element
}

function innerFunc() {
  return (ast: Root) => {
    const colorMapping = {
      red: "var(--red)",
      blue: "var(--blue)",
    }
    visit(ast, "element", (node: Element) => {
      transformElement(node, colorMapping)
    })
  }
}

/**
 * Transforms color names in inline styles and KaTeX elements to CSS variables
 * @param opts - Options for the transformer
 * @returns A QuartzTransformerPlugin that replaces color names with CSS variables
 */
export const ColorVariables: QuartzTransformerPlugin<Options> = (_opts) => {
  return {
    name: "ColorVariables",
    htmlPlugins() {
      return [innerFunc]
    },
  }
}

export default ColorVariables
