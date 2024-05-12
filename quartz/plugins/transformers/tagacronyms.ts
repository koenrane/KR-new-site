import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { h } from "hastscript"

const replaceRegex = (
  node: any,
  index: number,
  parent: any,
  regex: RegExp,
  replaceFn: (match: any) => any,
) => {
  // replaceFn returns an HTML element triplet, [text, abbr, text]
  if (parent.tagName === "abbr" || parent?.properties?.className?.includes("no-smallcaps")) {
    return
  }

  var lastIndex = 0
  let matchIndexes = []
  let lastMatchEnd = 0
  let match

  while ((match = regex.exec(node.value)) !== null) {
    if (match.index >= lastMatchEnd) {
      matchIndexes.push(match.index)
      lastMatchEnd = match.index + match[0]?.length
    }
  }

  if (!matchIndexes?.length || !node.value) return

  const fragment = []
  var lastIndex = 0

  for (const index of matchIndexes) {
    // If there's text before the match, add it to the fragment
    if (index > lastIndex) {
      fragment.push({ type: "text", value: node.value.substring(lastIndex, index) })
    }

    // Replace the match with the new nodes, where abbr has small-caps styling
    const match = node.value.slice(index).match(regex)
    const { before, abbr, after } = replaceFn(match)
    fragment.push({ type: "text", value: before })
    fragment.push(h("abbr.small-caps", abbr))
    fragment.push({ type: "text", value: after })

    // Update the lastIndex to the end of the match
    lastIndex = index + match[0].length
  }

  // If there's text after last match, add to fragment
  if (lastIndex < node.value?.length) {
    fragment.push({ type: "text", value: node.value.substring(lastIndex) })
  }

  // Replace the original text node with the new nodes
  if (parent.children && typeof index === "number") {
    parent.children.splice(index, 1, ...fragment)
  }
}

// TODO come up with more elegant whitelist for e.g. "if"
const REGEX_ACRONYM = /(?:\b|^)(?<acronym>[A-Z\u00C0-\u00DC]{3,}|IF|TL;DR)(?<plural>s?)\b/
export const globalRegexAcronym = new RegExp(REGEX_ACRONYM, "g")
const replaceAcronyms = (match: any) => {
  // Extract the uppercase and lowercase parts
  const { acronym, plural } = match[0].match(REGEX_ACRONYM).groups // Uppercase part of the acronym

  return { before: "", abbr: acronym, after: plural }
}

export const REGEX_ABBREVIATION = /(?<number>[\d\,]*\.?\d+)(?<abbreviation>[A-Z]{1,})/g
const replaceAbbreviation = (match: any) => {
  // For now just chuck everything into abbr, including number
  return { before: "", abbr: match[0], after: "" }
}

// Custom Rehype plugin for tagging acronyms
export const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node, index: number, parent) => {
      replaceRegex(node, index, parent, globalRegexAcronym, replaceAcronyms)
    })
    visit(tree, "text", (node, index: number, parent) => {
      replaceRegex(node, index, parent, REGEX_ABBREVIATION, replaceAbbreviation)
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
