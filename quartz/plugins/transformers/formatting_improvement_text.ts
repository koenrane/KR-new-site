import { QuartzTransformerPlugin } from "../types"
import { numberRegex } from "./utils"
import { Plugin } from "unified"

// Not followed by a colon (the footnote definition) or an opening parenthesis (md URL)
const footnoteRegex = /\. (\[\^.*?\])(?![:\(\s])/g
const footnoteReplacement = ".$1 "

const footnoteEndOfSentence = (text: string) => {
  let tighterText = text.replaceAll(footnoteRegex, footnoteReplacement)

  return tighterText
}

export const formattingImprovement = (text: string) => {
  let newText = footnoteEndOfSentence(text)

  newText = newText.replaceAll(new RegExp(`(${numberRegex.source})x\\b`, "g"), "$1×") // Multiplication sign
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
