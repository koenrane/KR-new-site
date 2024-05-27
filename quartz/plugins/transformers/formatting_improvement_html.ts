import { start } from "repl"
import { QuartzTransformerPlugin } from "../types"
import { replaceRegex, numberRegex } from "./utils"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"

function niceQuotes(text: string) {
  text = text.replace(/(?<=^|\b|\s|[\(\[])[\"”](?=[^\s\)\—\-\.\,\!\?])/gm, "“") // Quotes at the beginning of a word
  text = text.replace(/([^\s\(])[\"“](?=[\s\)\.\,\;]|$)/g, "$1”") // Quotes at the end of a word
  text = text.replace(/([\s“])[\'’](?=\S)/g, "$1‘") // Quotes at the beginning of a word
  text = text.replace(/(?<=[^\s“])[\'‘](?=\s|\$|$)/gm, "’") // Quotes at the end of a word
  text = text.replace(/(?<![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes
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
        node.value = niceQuotes(node.value)

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
