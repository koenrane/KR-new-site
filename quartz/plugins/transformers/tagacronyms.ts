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

  const matches = node.value.match(regex)
  if (!matches) return

  const fragment = []
  let lastIndex = 0

  matches.forEach((match) => {
    // Figure out where the match starts in the text node
    const index = node.value.indexOf(match, lastIndex)

    // If there's text before the match, add it to the fragment
    if (index > lastIndex) {
      fragment.push({ type: "text", value: node.value.substring(lastIndex, index) })
    }

    // Replace the match with the new nodes, where abbr has small-caps styling
    const { before, abbr, after } = replaceFn(match, fragment)
    fragment.push({ type: "text", value: before })
    fragment.push(h("abbr.small-caps", abbr))
    fragment.push({ type: "text", value: after })
    console.log(before, abbr, after)

    // Update the lastIndex to the end of the match
    lastIndex = index + match.length
  })
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
  const abbr = match.match(/[A-Z]+/)[0] // Uppercase part of the acronym
  const after = match.slice(abbr.length)

  return { before, abbr, after }
}

// Custom Rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      const regexAcronym = /\b[A-Z]{2,}\b/g
      replaceRegex(node, index, parent, regexAcronym, replaceAcronyms)
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
