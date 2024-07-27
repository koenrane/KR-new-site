import { QuartzTransformerPlugin } from "../types"
import smartquotes from "smartquotes"
import { replaceRegex, numberRegex } from "./utils"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"

function quotesInSmallString(text: string) {
  const numDoubleQuotes = text.match(/["]/g)
  // If two, replace with nice quotes
  if (numDoubleQuotes) {
    if (numDoubleQuotes.length === 2) {
      let newText = text.replace(/"/, "“")
      newText = newText.replace(/"/, "”")
      return newText
    } else {
      // This gambles that we're inside a closing slice, not an opening one
      return text.replace(/"/g, "”")
    }
  }
  const numSingleQuotes = text.match(/[']/g)
  if (numSingleQuotes) {
    if (numSingleQuotes.length === 2) {
      let newText = text.replace(/'/, "‘")
      newText = newText.replace(/'/, "’")
      return newText
    } else {
      return text.replace(/'/g, "’")
    }
  }
  return text
}

export function niceQuotes(text: string) {
  // Generally these are short strings, so we can just do a simple replace
  if (text.length < 5) {
    return quotesInSmallString(text)
  }

  text = smartquotes(text)
  text = text.replace(/([\s“])[\'’](?=\S)/gm, "$1‘") // Quotes at the beginning of a word
  text = text.replace(/(?<![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes

  return text
}

// Give extra breathing room to slashes
export function fullWidthSlashes(text: string): string {
  return text.replace(/(?<=[^\d\/]) ?\/(?!=\/) ?(?=[^\d])(?!\/)/g, "／")
}

export function hyphenReplace(text: string) {
  // Create a regex for dashes surrounded by spaces
  const surroundedDash = new RegExp("([^\\s>]|^) *[~–—-]+ +", "g")

  // Replace surrounded dashes with em dash
  text = text.replace(surroundedDash, "$1—")

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(" *— *", "g")

  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "—")

  const postQuote = /([.!?]["”])\s*—\s*/g
  text = text.replace(postQuote, "$1 — ")

  const startOfLine = /^\s*—\s*([A-Z0-9])/g
  text = text.replace(startOfLine, "— $1")

  return text
}

const fractionRegex = new RegExp(
  `(?<![\w\/]|${numberRegex.source})(${numberRegex.source})\/(${numberRegex.source})(?!${numberRegex.source})(?=[^\w\/]|$)`,
  "g",
)

function isInsideCode(node: any) {
  let ancestor = node
  while (ancestor) {
    if (ancestor.tagName === "code") {
      return true
    }
    ancestor = ancestor.parent
  }
  return false
}

export const improveFormatting: Plugin = () => {
  return (tree: any) => {
    visit(tree, (node, index, parent) => {
      // Wrap fn in span so that multiple <p> elements can be used
      if (node?.properties?.id?.includes("user-content-fn-")) {
        const newSpan = {
          type: "element",
          tagName: "span",
          properties: {
            className: ["footnote"],
          },
          children: node.children,
        }
        node.children = [newSpan]
      }

      if (node.type === "text" && node.value && !isInsideCode(parent)) {
        node.value = node.value.replaceAll(/\u00A0/g, " ") // Replace non-breaking spaces with regular spaces
        node.value = hyphenReplace(node.value)

        replaceRegex(
          node,
          index,
          parent,
          fractionRegex,
          (match: any) => {
            return {
              before: "",
              replacedMatch: match[0],
              after: "",
            }
          },
          (_nd: any, _idx: any, prnt: any) => {
            return prnt?.properties?.className?.includes("fraction")
          },
          "span.fraction",
        )

        node.value = niceQuotes(node.value)

        // Don't replace slashes in fractions, but give breathing room to others
        if (!parent.properties?.className?.includes("fraction") && parent?.tagName !== "a") {
          node.value = fullWidthSlashes(node.value)
        }
      }
    })
  }
}

export const HTMLFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "htmlFormattingImprovement",
    htmlPlugins() {
      return [improveFormatting]
    },
  }
}
