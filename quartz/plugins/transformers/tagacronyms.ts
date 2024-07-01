import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { replaceRegex } from "./utils"

import { visit } from "unist-util-visit"
// Custom Rehype plugin for tagging acronyms
const ignoreAcronym = (node, index, parent: any) => {
  let status = parent?.properties?.className?.includes("no-smallcaps")
  status = status || parent?.tagName === "abbr" || "code" === parent?.tagName
  return status
}

export const rehypeTagAcronyms: Plugin = () => {
  // TODO come up with more elegant whitelist for e.g. "if"
  const REGEX_ACRONYM = /(?:\b|^)(?<acronym>[A-Z\u00C0-\u00DC]{3,}|IF|TL;DR|IL)(?<plural>s?)\b/
  const globalRegexAcronym = new RegExp(REGEX_ACRONYM, "g")

  const REGEX_ABBREVIATION = /(?<number>[\d\,]*\.?\d+)(?<abbreviation>[A-Z]{1,})/g

  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
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
    })

    visit(tree, "text", (node, index, parent) => {
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
    })
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
