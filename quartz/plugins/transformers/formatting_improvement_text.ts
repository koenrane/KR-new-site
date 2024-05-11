import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"

// Not followed by a colon (the footnote definition) or an opening parenthesis (md URL)
const footnoteRegex = /\. (\[\^.*?\])(?![:\(\s])/g
const footnoteReplacement = ".$1 "

const footnoteEndOfSentence: Plugin = (text: string) => {
  let tighterText = text.replaceAll(footnoteRegex, footnoteReplacement)

  return tighterText
}

const formattingImprovement = (text: string) => {
  let newText = footnoteEndOfSentence(text)
  return newText
}

export const TextFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "textFormattingImprovement",
    textTransform(_ctx, src) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return formattingImprovement(src)
    },
  }
}
