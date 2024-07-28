import { QuartzTransformerPlugin } from "../types"

const numberMatch = /(^|\s)\-(\s?\d*\.?\d+)/g

const minusReplace = (text: string) => {
  return text.replace(numberMatch, "$1−$2")
}

export const MinusReplaceTransform: QuartzTransformerPlugin = () => {
  return {
    name: "MinusReplace",
    textTransform(_ctx, src) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return minusReplace(src)
    },
  }
}
