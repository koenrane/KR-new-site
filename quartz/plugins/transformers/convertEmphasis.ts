import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { Text, Strong, Emphasis, Parent, PhrasingContent } from "mdast"

// TODO test
// Function to process a single text node and convert **bold** syntax to strong nodes
export const formatNode = (
  node: Text,
  index: number | undefined,
  parent: Parent | null,
  regex: RegExp,
  tag: string,
) => {
  if (!["em", "strong"].includes(tag)) throw new Error("Invalid tag")
  if (regex.test(node.value)) {
    const newNodes: PhrasingContent[] = []
    let lastIndex = 0

    // Process each match in the node's text
    node.value.replace(regex, (fullMatch, content, offset) => {
      // Add any text before the match as a regular text node
      if (offset > lastIndex) {
        newNodes.push({
          type: "text",
          value: node.value.slice(lastIndex, offset),
        } as Text)
      }

      // Add the matched content as a strong (bold) node

      newNodes.push({
        type: tag,
        children: [{ type: "text", value: content } as Text],
      } as any)

      lastIndex = offset + fullMatch.length
      return fullMatch // This return is not used, it's just to satisfy TypeScript
    })

    // Add any remaining text after the last match
    if (lastIndex < node.value.length) {
      newNodes.push({
        type: "text",
        value: node.value.slice(lastIndex),
      } as Text)
    }

    // Replace the original node with our new nodes
    if (parent && typeof index === "number") {
      parent.children.splice(index, 1, ...newNodes)
    }
  }
}

const convertEmphasisHelper: Plugin = () => {
  return (tree: any) => {
    const boldRegex = new RegExp("\\*\\*(.*?)\\*\\*", "g")
    const italicRegex = new RegExp("_(.*?)_", "g")
    for (const pair of [
      ["strong", boldRegex],
      ["em", italicRegex],
    ]) {
      const tagName = pair[0]
      const regex = pair[1]
      visit(tree, "text", (node: Text, index: number | undefined, parent: Parent | null) => {
        formatNode(node, index, parent, regex as RegExp, tagName as string)
      })
    }
  }
}

// Define the Quartz transformer plugin
export const ConvertEmphasis: QuartzTransformerPlugin = () => {
  return {
    name: "ReplaceAsterisksBold",
    htmlPlugins() {
      return [convertEmphasisHelper]
    },
  }
}
