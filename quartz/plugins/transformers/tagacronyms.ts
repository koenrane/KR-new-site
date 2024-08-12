import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { replaceRegex } from "./utils"
import { Node, Parent, Text } from "hast"

import { visit } from "unist-util-visit"
// Custom Rehype plugin for tagging acronyms
const ignoreAcronym = (_node: Node, _index: number, parent: any) => {
  let noSmallCaps = parent?.properties?.className?.includes("no-smallcaps")
  return noSmallCaps || parent?.tagName === "abbr" || "code" === parent?.tagName
}

// TODO come up with more elegant whitelist for e.g. "if"
// Note that we are ignoring roman numerals
const REGEX_ACRONYM =
  /(?:\b|^)(?![ICLVXM]{3,}\b)(?<acronym>IF|TL;DR|IL|GPT-?2-XL|[A-Z\u00C0-\u00DC]{3,})(?<plural>s?)\b/
const globalRegexAcronym = new RegExp(REGEX_ACRONYM, "g")

const REGEX_ABBREVIATION = /(?<number>[\d\,]*\.?\d+)(?<abbreviation>[A-Z]{1,})/g
const combinedRegex = new RegExp(`${REGEX_ACRONYM.source}|${REGEX_ABBREVIATION.source}`, "g")

export function replaceSCInNode(node: Text, index: number, parent: Parent): void {
  replaceRegex(
    node,
    index,
    parent,
    combinedRegex,
    (match: any) => {
      if (match[0].match(REGEX_ACRONYM)) {
        const { acronym, plural } = match[0].match(REGEX_ACRONYM).groups
        return { before: "", replacedMatch: acronym, after: plural }
      } else {
        return { before: "", replacedMatch: match[0], after: "" }
      }
    },
    ignoreAcronym,
    "abbr.small-caps",
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
