import { QuartzTransformerPlugin } from "../types"
import { mdLinkRegex } from "./utils"
import { transformElement, markerChar } from "./formatting_improvement_html"

const prePunctuation = /(?<prePunct>[\“\"]*)/

// If the punctuation is found, it is captured
let postPunctuation, postReplaceTemplate

for (const surrounding of ["", "_", "\\*\\*", "\\*", "__"]) {
  const surroundingTag = surrounding.replaceAll("\\", "").replaceAll("*", "A").replaceAll("_", "U")
  const tempRegex = new RegExp(
    `${surrounding}(?<postPunct${surroundingTag}>[\”\"\`\.\,\?\:\!\;]+)?${surrounding}`,
    "g",
  )
  if (postPunctuation) {
    postPunctuation = new RegExp(`${postPunctuation.source}|${tempRegex.source}`)
    postReplaceTemplate = `${postReplaceTemplate}$<postPunct${surroundingTag}>`
  } else {
    postPunctuation = tempRegex
    postReplaceTemplate = `$<postPunct${surroundingTag}>`
  }
}
const preLinkRegex = new RegExp(
  `${prePunctuation.source}(?<mark1>${markerChar}?)${mdLinkRegex.source}`,
)
const fullRegex = new RegExp(
  `${preLinkRegex.source}(?<mark2>${markerChar}?)(?:${postPunctuation!.source})`,
  "g",
)
const replaceTemplate = `[$<prePunct>$<mark1>$<linkText>${postReplaceTemplate}]($<linkURL>)$<mark2>`

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
