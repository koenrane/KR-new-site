import { visit } from "unist-util-visit"
import type { QuartzTransformerPlugin } from "../types"

interface Options {
  colorMapping: Record<string, string>
}

export const ColorVariables: QuartzTransformerPlugin<Options> = (opts) => {
  const colorMapping = opts?.colorMapping ?? {
    red: "var(--red)",
    blue: "var(--blue)",
    // Add more color mappings as needed
  }

  return {
    name: "ColorVariables",
    transform(ast) {
      visit(ast, "element", (node) => {
        if (node.properties && typeof node.properties.style === "string") {
          const styleString = node.properties.style
          Object.entries(colorMapping).forEach(([color, variable]) => {
            const regex = new RegExp(`color:\\s*${color}`, "gi")
            if (regex.test(styleString)) {
              node.properties.style = styleString.replace(regex, `color: ${variable}`)
            }
          })
        }
      })
    },
  }
}

export default ColorVariables
