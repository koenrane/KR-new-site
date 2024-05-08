import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"

const footnoteRegex = /\. (\[\^.*?\])(?!:)/g
const footnoteReplacement = ".$1"

const fnNoSpaceAfter = /(\[\^(.*?)\])(?![\s\:])/g

const footnoteEndOfSentence: Plugin = (text: string) => {
  let tighterText = text.replaceAll(footnoteRegex, footnoteReplacement)
  tighterText = tighterText.replaceAll(fnNoSpaceAfter, "$1 ")
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
