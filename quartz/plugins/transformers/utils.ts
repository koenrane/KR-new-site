import { Parent, RootContent, Text, Element } from "hast"
import { h } from "hastscript"

export const urlRegex = new RegExp(
  /(https?:\/\/)(?<domain>([\da-z.-]+\.)+)(?<path>[/?=\w.-]+(\([\w.\-,() ]*\))?)(?=\))/g,
)

const linkText = /\[(?<linkText>[^\]]+)\]/
const linkURL = /\((?<linkURL>[^#].*?)\)/ // Ignore internal links, capture as little as possible
export const mdLinkRegex = new RegExp(linkText.source + linkURL.source, "g")

export const numberRegex = /[-−]?\d{1,3}(,?\d{3})*(\.\d+)?/u

// A fraction is a digit followed by a slash and another digit
export const fractionRegex = new RegExp(
  `(?<![\\w/\\.]|${numberRegex.source})([+-]?\\d{1,2})\\/(\\d)(?!${numberRegex.source})(?=[^\\w/]|$)`,
  "gm",
)

export interface ReplaceFnResult {
  before: string
  replacedMatch: string | Element | Element[]
  after: string
}

/**
 * Replaces text in a node based on a regex pattern and a replacement function.
 *
 * @param node - The text node to process.
 * @param index - The index of the node in its parent's children array.
 * @param parent - The parent node containing the text node.
 * @param regex - The regular expression to match against the node's text.
 * @param replaceFn - A function that takes a regex match and returns an object with before, replacedMatch, and after properties.
 * @param ignorePredicate - An optional function that determines whether to ignore a node. Default is to never ignore.
 * @param newNodeStyle - The HTML tag name for the new node created for replacedMatch. Default is "span". "abbr.small-caps" yields e.g. <abbr class="small-caps">{content}</abbr>.
 */
export const replaceRegex = (
  node: Text,
  index: number,
  parent: Parent,
  regex: RegExp,
  replaceFn: (match: RegExpMatchArray) => ReplaceFnResult,
  ignorePredicate: (nd: Text, idx: number, prnt: Parent) => boolean = () => false,
  newNodeStyle = "span",
): void => {
  // If the node should be ignored or has no value, return early
  // deepsource-ignore-line
  if (ignorePredicate(node, index, parent) || !node?.value) {
    return
  }

  let lastIndex = 0
  const matchIndexes = []
  let lastMatchEnd = 0
  let match

  // Find all non-overlapping matches in the node's text
  while ((match = regex.exec(node.value)) !== null) {
    if (match.index >= lastMatchEnd) {
      matchIndexes.push(match.index)
      lastMatchEnd = match.index + match[0]?.length
    }
  }

  // If no matches found or node has no value, return early
  if (!matchIndexes?.length || !node.value) return

  const fragment = []
  lastIndex = 0

  for (const index of matchIndexes) {
    // Add any text before the match to the fragment
    if (index > lastIndex) {
      fragment.push({ type: "text", value: node.value.substring(lastIndex, index) })
    }

    // Use exec() instead of match() to get capture groups
    regex.lastIndex = index
    const match = regex.exec(node.value)
    if (!match) continue

    const { before, replacedMatch, after } = replaceFn(match)
    if (before) {
      fragment.push({ type: "text", value: before })
    }
    if (replacedMatch) {
      if (Array.isArray(replacedMatch)) {
        // For each element in the array, ensure it has text content
        fragment.push(...replacedMatch)
      } else if (typeof replacedMatch === "string") {
        fragment.push(h(newNodeStyle, replacedMatch))
      } else {
        fragment.push(replacedMatch)
      }
    }
    if (after) {
      fragment.push({ type: "text", value: after })
    }

    // Update lastIndex to the end of the match
    if (match) {
      lastIndex = index + match[0].length
    }
  }

  // Add any remaining text after the last match
  if (lastIndex < node.value?.length) {
    fragment.push({ type: "text", value: node.value.substring(lastIndex) })
  }

  // Replace the original text node with the new nodes in the parent's children array
  if (parent.children && typeof index === "number") {
    parent.children.splice(index, 1, ...(fragment as RootContent[]))
  }
}
