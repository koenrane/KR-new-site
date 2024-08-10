import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { replaceRegex } from "./utils"
import { Node, Parent } from "unist"

import { visit } from "unist-util-visit"
// Custom Rehype plugin for tagging acronyms
const ignoreAcronym = (_node: Node, _index: number, parent: any) => {
  let status = parent?.properties?.className?.includes("no-smallcaps")
  status = status || parent?.tagName === "abbr" || "code" === parent?.tagName
  return status
}

// TODO come up with more elegant whitelist for e.g. "if"
const REGEX_ACRONYM =
  /(?:\b|^)(?![ICLVXM]{3,}\b)(?<acronym>IF|TL;DR|IL|GPT-?2-XL|[A-Z\u00C0-\u00DC]{3,})(?<plural>s?)\b/
const globalRegexAcronym = new RegExp(REGEX_ACRONYM, "g")

const REGEX_ABBREVIATION = /(?<number>[\d\,]*\.?\d+)(?<abbreviation>[A-Z]{1,})/g

export function replaceSCInNode(node: Node, index: number, parent: Parent): void {
  replaceRegex(
    node,
    index,
    parent,
    globalRegexAcronym,
    (match: any) => {
      // Extract the uppercase and lowercase parts
      const { acronym, plural } = match[0].match(REGEX_ACRONYM).groups // Uppercase part of the acronym

      return { before: "", replacedMatch: acronym, after: plural }
    },
    ignoreAcronym,
  )
  replaceRegex(
    node,
    index,
    parent,
    REGEX_ABBREVIATION,
    (match: any) => {
      // For now just chuck everything into abbr, including number
      return { before: "", replacedMatch: match[0], after: "" }
    },
    ignoreAcronym,
  )
}

export const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, "text", replaceSCInNode)
  }
}

// The main Quartz plugin export
export const TagAcronyms: QuartzTransformerPlugin = () => {
  return {
    name: "TagAcronyms",
    htmlPlugins() {
      return [rehypeTagAcronyms]
    },
  }
}
