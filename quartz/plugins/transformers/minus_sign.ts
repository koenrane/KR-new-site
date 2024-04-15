import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"

const numberMatch = /(^|\s)\-(\s?\d*\.?\d+)/g

const minusReplace: Plugin = (text: string) => {
  return text.replaceAll(numberMatch, "$1−$2")
}

export const RemarkMinusReplace: QuartzTransformerPlugin = () => {
  return {
    name: "remarkMinusReplace",
    textTransform(_ctx, src) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return minusReplace(src)
    },
  }
}
