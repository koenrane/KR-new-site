import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { h } from "hastscript"

const replaceRegex = (
  node: any,
  index,
  parent: any,
  regex: RegExp,
  replaceFn: (match: string) => any,
) => {
  // replaceFn returns an HTML element triplet, [text, abbr, text]
  if (parent.tagName === "abbr" || parent?.properties?.className?.includes("no-smallcaps")) {
    return
  }

  var lastIndex = 0
  let matchIndexes = []
  let lastMatchEnd = 0

  var match = ""
  while ((match = regex.exec(node.value)) !== null) {
    if (match.index >= lastMatchEnd) {
      matchIndexes.push(match.index)
      lastMatchEnd = match.index + match[0].length
    }
  }

  if (!matchIndexes.length || !node.value) return

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
  if (lastIndex < node.value.length) {
    fragment.push({ type: "text", value: node.value.substring(lastIndex) })
  }

  // Replace the original text node with the new nodes
  if (parent.children && typeof index === "number") {
    parent.children.splice(index, 1, ...fragment)
  }
}

const replaceAcronyms = (match) => {
  // Extract the uppercase and lowercase parts
  const before = ""
  const abbr = match[0] // Uppercase part of the acronym
  const abbrIndex = match.index
  const after = match?.input?.slice(abbrIndex + abbr.length)

  return { before, abbr, after }
}

const REGEX_ABBREVIATION = /(?<number>[\d\,]?\.?\d+)(?<abbreviation>[KMBT]{1,}|[KMBT])/g
const replaceAbbreviation = (match) => {
  // For now just chuck everything into abbr, including number
  return { before: "", abbr: match[0], after: "" }
}

// Custom Rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      const regexAcronym = /\b[A-Z]{2,}\b/g
      replaceRegex(node, index, parent, regexAcronym, replaceAcronyms)

      replaceRegex(node, index, parent, REGEX_ABBREVIATION, replaceAbbreviation)
      // replaceRegex(node, index, parent, /[KMBT]{3,}/, replaceAbbreviation)
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
