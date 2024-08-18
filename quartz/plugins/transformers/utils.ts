import { h } from "hastscript"
import { Parent, Text } from "hast"

export const urlRegex = new RegExp(
  /(https?:\/\/)(?<domain>([\da-z\.-]+\.)+)(?<path>[\/\?\=\w\.\-]+(\([\w\.\-,\(\) ]*\))?)(?=\))/g,
)

const linkText = /\[(?<linkText>[^\]]+)\]/
const linkURL = /\((?<linkURL>[^#].*?)\)/ // Ignore internal links, capture as little as possible
export const mdLinkRegex = new RegExp(linkText.source + linkURL.source, "g")

export const numberRegex = /[\-−]?\d{1,3}(\,?\d{3})*(\.\d+)?/

// A fraction is a digit followed by a slash and another digit
export const fractionRegex = new RegExp(
  `(?<![\\w/]|${numberRegex.source})([+-]?\\d)\\/(\\d)(?!${numberRegex.source})(?=[^\\w/]|$)`,
  "gm",
)

export interface ReplaceFnResult {
  before: string
  replacedMatch: string
  after: string
}

export const replaceRegex = (
  node: Text,
  index: number,
  parent: Parent,
  regex: RegExp,
  replaceFn: (match: RegExpMatchArray) => ReplaceFnResult,
  ignorePredicate: (nd: Text, idx: number, prnt: Parent) => boolean = () => false,
  newNodeStyle: string = "span",
) => {
  if (ignorePredicate(node, index, parent) || !node?.value) {
    return
  }

  let lastIndex = 0
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
  lastIndex = 0

  for (const index of matchIndexes) {
    // If there's text before the match, add it to the fragment
    if (index > lastIndex) {
      fragment.push({ type: "text", value: node.value.substring(lastIndex, index) })
    }

    // Replace the match with the new nodes
    const match = node.value.slice(index).match(regex)
    if (!match) continue
    const { before, replacedMatch, after } = replaceFn(match)
    if (before) {
      fragment.push({ type: "text", value: before })
    }
    if (replacedMatch) {
      fragment.push(h(newNodeStyle, replacedMatch))
    }
    if (after) {
      fragment.push({ type: "text", value: after })
    }

    // Update the lastIndex to the end of the match
    if (match) {
      lastIndex = index + match[0].length
    }
  }

  // If there's text after last match, add to fragment
  if (lastIndex < node.value?.length) {
    fragment.push({ type: "text", value: node.value.substring(lastIndex) })
  }

  // Replace the original text node with the new nodes
  if (parent.children && typeof index === "number") {
    parent.children.splice(index, 1, ...(fragment as any))
  }
}
