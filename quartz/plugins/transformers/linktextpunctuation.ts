import { QuartzTransformerPlugin } from "../types"
import { mdLinkRegex } from "./utils"
import { transformElement, markerChar } from "./formatting_improvement_html"

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

export const applyLinkPunctuation = (text: string): string => {
  return text.replace(fullRegex, replaceTemplate)
}

export const remarkLinkPunctuation = (node: Node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || ""
    const newText = applyLinkPunctuation(text)
    if (text !== newText) {
      node.textContent = newText
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement
    for (const childNode of Array.from(element.childNodes)) {
      remarkLinkPunctuation(childNode)
    }
  }
}

export const LinkTextPunctuation: QuartzTransformerPlugin = () => {
  return {
    name: "LinkTextPunctuation",
    htmlTransform(_ctx: any, html: any) {
      return transformElement(html, applyLinkPunctuation)
    },
  }
}
