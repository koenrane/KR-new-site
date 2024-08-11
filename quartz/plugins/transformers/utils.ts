import { h } from "hastscript"
import { createLogger } from "./logger_utils"

export const urlRegex = new RegExp(
  /(https?:\/\/)(?<domain>([\da-z\.-]+\.)+)(?<path>[\/\?\=\w\.\-]+(\([\w\.\-,\(\) ]*\))?)(?=\))/g,
)

const linkText = /\[([^\]]+)\]/
const linkURL = /\(([^#].*?)\)/ // Ignore internal links, capture as little as possible
export const mdLinkRegex = new RegExp(linkText.source + linkURL.source, "g")

export const numberRegex = /[\-−]?\d{1,3}(\,?\d{3})*(\.\d+)?/
// A fraction is a number followed by a slash and another number. There
// are a few checks to avoid false positives like dates (1/1/2001).
export const fractionRegex = new RegExp(
  `(?<![\\w/]|${numberRegex.source})([+-]?\\d)\\/(\\d)(?!${numberRegex.source})(?=[^\\w/]|$)`,
  "gm",
)

export const replaceRegex = (
  node: any,
  index: any,
  parent: any,
  regex: RegExp,
  replaceFn: (match: any) => any, // replaceFn returns an HTML element triplet, [text, abbr, text]
  ignorePredicate: (nd: any, idx: any, prnt: any) => boolean = () => false,
  newNodeStyle = "abbr.small-caps",
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

let logger = createLogger("utils")
export async function followRedirects(url: URL, maxRedirects = 10) {
  let currentUrl = url
  let redirectCount = 0

  while (redirectCount < maxRedirects) {
    try {
      const response = await fetch(currentUrl, { method: "HEAD", redirect: "manual" })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location")
        if (!location) {
          throw new Error("Redirect location not found")
        }
        currentUrl = new URL(location, currentUrl)
        redirectCount++
      } else {
        return currentUrl // Final URL reached
      }
    } catch (error) {
      logger.info("Error following redirect:", error)
      return currentUrl // Return the last successful URL
    }
  }

  throw new Error("Max redirects reached")
}
