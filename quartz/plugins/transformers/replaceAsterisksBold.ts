import { QuartzTransformerPlugin } from "../types"
import { Plugin } from "unified"
import { visit } from "unist-util-visit"
import { Text, Strong, Parent, PhrasingContent } from "mdast"

// TODO test
// Function to process a single text node and convert **bold** syntax to strong nodes
export const boldNode = (node: Text, index: number | undefined, parent: Parent | null) => {
  const regex = /\*\*(.*?)\*\*/g
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
        type: "strong",
        children: [{ type: "text", value: content } as Text],
      } as Strong)

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

const replaceAsterisksBold: Plugin = () => {
  return (tree: any) => {
    visit(tree, "text", boldNode)
  }
}

// Define the Quartz transformer plugin
export const ReplaceAsterisksBold: QuartzTransformerPlugin = () => {
  return {
    name: "ReplaceAsterisksBold",
    htmlPlugins() {
      return [replaceAsterisksBold]
    },
  }
}
