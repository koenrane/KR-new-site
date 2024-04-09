import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { h } from "hastscript"

// Custom Rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, "text", (node, index, parent) => {
      if (parent.tagName === "abbr" || parent?.properties?.className?.includes("no-smallcaps")) {
        return
      }
      const regex = /\b([A-Z]{2,})(s?)\b/g

      const matches = node.value.match(regex)
      if (matches) {
        const fragment = []
        let lastIndex = 0

        matches.forEach((match) => {
          const index = node.value.indexOf(match, lastIndex)

          if (index > lastIndex) {
            fragment.push({ type: "text", value: node.value.substring(lastIndex, index) })
          }

          // Extract the uppercase and lowercase parts
          const uppercaseMatch = match.match(/[A-Z]+/)[0]
          const lowercaseMatch = match.slice(uppercaseMatch.length)

          fragment.push(h("abbr.small-caps", uppercaseMatch))
          fragment.push({ type: "text", value: lowercaseMatch }) // Add the lowercase part

          lastIndex = index + match.length
        })

        if (lastIndex < node.value.length) {
          fragment.push({ type: "text", value: node.value.substring(lastIndex) })
        }

        // Replace the original text node with the new nodes
        if (parent.children && typeof index === "number") {
          parent.children.splice(index, 1, ...fragment)
        }
      }
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
