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

function hyphenReplace(text: string) {
  // Create a regex for dashes surrounded by spaces
  const surroundedDash = new RegExp(`(?:\\s+|^)[–—-]+\\s+`, "g")

  // Replace surrounded dashes with em dash
  text = text.replace(surroundedDash, "—")

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(`\\s*—\\s*`, "g")

  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "—")

  const postQuote = /([.!?"”])\s*—\s*/g
  text = text.replace(postQuote, "$1 — ")

  const startOfLine = /^\s*—\s*/g
  text = text.replace(startOfLine, "— ")

  return text
}

export const formattingImprovement = (text: string) => {
  let newText = footnoteEndOfSentence(text)

  newText = newText.replaceAll(new RegExp(`(${numberRegex.source})x\\b`, "g"), "$1×") // Multiplication sign
  newText = hyphenReplace(newText)
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
