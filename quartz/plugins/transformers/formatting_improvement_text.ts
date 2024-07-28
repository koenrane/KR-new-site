import { QuartzTransformerPlugin } from "../types"
import { numberRegex, mdLinkRegex } from "./utils"

// Not followed by a colon (the footnote definition) or an opening parenthesis (md URL)
const footnoteRegex = /(\S) (\[\^.*?\])(?![:\(]) ?/g
const footnoteReplacement = "$1$2 "

const footnoteEndOfSentence = (text: string) => {
  let tighterText = text.replace(footnoteRegex, footnoteReplacement)

  return tighterText
}

const concentrateEmphasisAroundLinks = (text: string): string => {
  const emphRegex = new RegExp(
    `(?<emph>[*_]+)(?<whitespace1>\\s*)(?<url>${mdLinkRegex.source})(?<whitespace2>\\s*)(\\k<emph>)`,
    "gm",
  )
  return text.replace(emphRegex, "$<whitespace1>$<emph>$<url>$<emph>$<whitespace2>")
}

export const formattingImprovement = (text: string) => {
  const yamlHeaderMatch = text.match(/^\s*---\n(.*?)\n---\n/s)
  let yamlHeader = ""
  let content = text

  if (yamlHeaderMatch) {
    yamlHeader = yamlHeaderMatch[0]
    content = text.substring(yamlHeader.length)
  }

  // Format the content (non-YAML part)
  let newContent = footnoteEndOfSentence(content)
  // Pretty multiplication for 3x, 4x, etc.
  newContent = newContent.replace(new RegExp(`(${numberRegex.source})[x\\*]\\b`, "g"), "$1×")
  newContent = concentrateEmphasisAroundLinks(newContent)
  newContent = newContent.replace(/ *\,/g, ",")

  return yamlHeader + newContent // Concatenate YAML header and formatted content
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
