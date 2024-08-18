import { QuartzTransformerPlugin } from "../types"
import { mdLinkRegex } from "./utils"
import { transformElement } from "./formatting_improvement_html"

const prePunctuation = /([\“\"]*)/ // group 1

// If the punctuation is found, it is captured
const postPunctuation = /(?:([\”\"\`\.\,\?\:\!\;]+))?/
// Contains group 4, duplicated to 5 later
const preLinkRegex = new RegExp(`${prePunctuation.source}${mdLinkRegex.source}`)
const fullRegex = new RegExp(
  `${preLinkRegex.source}(?:${postPunctuation.source}|[\*_]{1,2}${postPunctuation.source}[\*_]{1,2})`,
  "g",
)
const replaceTemplate = "[$1$2$4$5]($3)"

export const remarkLinkPunctuation = (element: HTMLElement) => {
  if (element.nodeType === Node.TEXT_NODE) {
    const text = element.textContent || ""
    const newText = text.replace(fullRegex, replaceTemplate)
    if (text !== newText) {
      element.textContent = newText
    }
  }
}

export const LinkTextPunctuation: QuartzTransformerPlugin = () => {
  return {
    name: "LinkTextPunctuation",
    htmlTransform(_ctx, html) {
      return transformElement(html, remarkLinkPunctuation)
    },
  }
}
