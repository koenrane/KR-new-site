import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"

// Todo write unit tests
function niceQuotes(text: string) {
  text = text.replace(/(?=^|\b|[\(\[])[\"”](?=[^\s\)\.\,\!\?])/g, "“") // Quotes at the beginning of a word
  text = text.replace(/(?=[^\s\(])[\"“](?=[\s\)\.\,]|$)/g, "”") // Quotes at the end of a word
  text = text.replace(/(?=\s)[\'’](?=\S)/g, "‘") // Quotes at the beginning of a word
  text = text.replace(/(?=[^\s“])[\'‘](?=[\s]|$)/g, "’") // Quotes at the end of a word
  text = text.replace(/(?![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes
  return text
}

function isInsideCode(node) {
  let ancestor = node
  while (ancestor) {
    if (ancestor.tagName === "code") {
      return true
    }
    ancestor = ancestor.parent
  }
  return false
}

export const HTMLFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "htmlFormattingImprovement",
    htmlPlugins() {
      return [
        () => {
          return (tree) => {
            visit(tree, (node, index, parent) => {
              if (node.type === "text" && node.value && !isInsideCode(parent)) {
                node.value = niceQuotes(node.value)
              }
            })
          }
        },
      ]
    },
  }
}
