import { h } from "hastscript"

export const urlRegex = new RegExp(
  /(https?:\/\/)(?<domain>([\da-z\.-]+\.)+)(?<path>[\/\?\=\w\.\-]+(\([\w\.\-,\(\) ]*\))?)(?=\))/g,
)

const linkText = /\[([^\]]+)\]/ // group 2

// Group 3:
const linkURL = /\(([^#].*?)\)/ // Ignore internal links, capture as little as possible
export const mdLinkRegex = new RegExp(linkText.source + linkURL.source, "g")

export const numberRegex = /[\-−]?\d{1,3}(\,?\d{3})*(\.\d+)?/
export const replaceRegex = (
  node: any,
  index: any,
  parent: any,
  regex: RegExp,
  replaceFn: (match: any) => any, // replaceFn returns an HTML element triplet, [text, abbr, text]
  ignorePredicate: (nd: any, idx: any, prnt: any) => boolean = () => false,
  newNodeStyle = "abbr.small-caps",
) => {
  if (ignorePredicate(node, index, parent)) {
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

    // Replace the match with the new nodes
    const match = node.value.slice(index).match(regex)
    const { before, replacedMatch, after } = replaceFn(match)
    fragment.push({ type: "text", value: before })
    fragment.push(h(newNodeStyle, replacedMatch))
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
