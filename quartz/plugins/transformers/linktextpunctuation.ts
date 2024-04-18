import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"

const prePunctuation = /([\(\”\“\"\[]*)/ // group 1
const linkText = /\[([^\]]+)\]/ // group 2

// Group 3:
const linkURL = /\(([^#].*?)\)/ // Ignore internal links, capture as little as possible

// If the punctuation is found, it is captured
const postPunctuation = /(?:([\”\"\`\.\,\?\:\!\;]+))?/
// Contains group 4, duplicated to 5 later
const preLinkRegex = new RegExp(`${prePunctuation.source}${linkText.source}${linkURL.source}`)
const fullRegex = new RegExp(
  `${preLinkRegex.source}(?:${postPunctuation.source}|[\*_]{1,2}${postPunctuation.source}[\*_]{1,2})`,
  "g",
)
const replaceTemplate = "[$1$2$4$5]($3)"

const remarkLinkPunctuation: Plugin = (text: string) => {
  return text.replaceAll(fullRegex, replaceTemplate)
}

export const LinkTextPunctuation: QuartzTransformerPlugin = () => {
  return {
    name: "LinkTextPunctuation",
    textTransform(_ctx, src) {
      if (src instanceof Buffer) {
        src = src.toString()
      }
      return remarkLinkPunctuation(src)
    },
  }
}
