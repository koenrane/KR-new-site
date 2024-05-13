import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"

export const improveFormatting: Plugin = () => {}

export const MDFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "mdFormattingImprovement",
    htmlPlugins() {
      return [improveFormatting]
    },
  }
}
