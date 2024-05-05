import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"

// Todo write unit tests
function niceQuotes(text: string) {
  text = text.replace(/(?=^|\b|[\(\[])[\"”](?=[^\s\)\.\,\!\?])/g, "“") // Quotes at the beginning of a word
  text = text.replace(/([^\s\(])[\"“](?=[\s\)\.\,]|$)/g, "$1”") // Quotes at the end of a word
  text = text.replace(/([\s“])[\'’](?=\S)/g, "$1‘") // Quotes at the beginning of a word
  text = text.replace(/(?=[^\s“])[\'‘](?=[\s]|\$)/g, "’") // Quotes at the end of a word
  text = text.replace(/(?![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes
  return text
}

const hyphenReplace: Plugin = (text: string) => {
  text = text.replaceAll(/(\w)?\s+[\-–—]\s+(\w)/g, "$1—$2")
  text = text.replaceAll(/(\w)— (\w)/g, "$1–$2")
  text = text.replaceAll(/(\w) —(\w)/g, "$1–$2") // Em dashes shouldn't have spaces around them
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
                node.value = node.value.replaceAll(/\u00A0/g, " ") // Replace non-breaking spaces with regular spaces
                node.value = niceQuotes(node.value)
                node.value = hyphenReplace(node.value)
              }
            })
          }
        },
      ]
    },
  }
}
