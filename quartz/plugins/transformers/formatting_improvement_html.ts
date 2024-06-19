import { QuartzTransformerPlugin } from "../types"
import { replaceRegex, numberRegex } from "./utils"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"

export function niceQuotes(text: string) {
  text = text.replace(/(?<=^|\b|\s|[\(\/\[])[\"”](?=[^\s\)\—\-\.\,\!\?])/gm, "“") // Quotes at the beginning of a word
  text = text.replace(/([^\s\(])[\"“](?=[\s\/\)\.\,\;]|$)/g, "$1”") // Quotes at the end of a word
  text = text.replace(/([\s“])[\'’](?=\S)/gm, "$1‘") // Quotes at the beginning of a word
  text = text.replace(/(?<=[^\s“])[\'‘](?=\s|\$|$)/gm, "’") // Quotes at the end of a word
  text = text.replace(/^\'/g, "’") // Apostrophe at beginning of element
  text = text.replace(/(?<![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes
  return text
}

// Give extra breathing room to slashes
export function fullWidthSlashes(text: string): string {
  return text.replace(/([^\d]) ?\/ ?([^\d])/g, "$1／$2")
}

export function hyphenReplace(text: string) {
  // Create a regex for dashes surrounded by spaces
  const surroundedDash = new RegExp("([^\\s>](?: +)|^)[~–—-]+ +", "g")

  // Replace surrounded dashes with em dash
  text = text.replace(surroundedDash, "$1—")

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(" *— *", "g")

  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "—")

  const postQuote = /([.!?]["”])\s*—\s*/g
  text = text.replace(postQuote, "$1 — ")

  const startOfLine = /^\s*—\s*/g
  text = text.replace(startOfLine, "— ")

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
          (nd: any, idx: any, prnt: any) => {
            return prnt?.properties?.className?.includes("fraction")
          },
          "span.fraction",
        )

        node.value = niceQuotes(node.value)

        // Don't replace slashes in fractions, but give breathing room to others
        if (!parent.properties?.className?.includes("fraction")) {
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
