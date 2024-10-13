import { QuartzTransformerPlugin } from "../types"
import { Root, Element } from "hast"
import { visit } from "unist-util-visit"
import { createSequenceLinksComponent } from "./sequenceLinks"

export function insertAfterTroutOrnament(tree: Root, component: Element) {
  visit(tree, "element", (node: Element, index, parent: Element | null) => {
    if (
      index !== undefined &&
      node.tagName === "div" &&
      node.properties &&
      node.properties.id === "trout-ornament" &&
      parent
    ) {
      parent.children.splice(index + 1, 0, component)
      return false // Stop traversing
    }
  })
}

export const AfterArticle: QuartzTransformerPlugin = () => {
  return {
    name: "AfterArticleTransformer",
    htmlPlugins: () => [
      () => (tree: Root, file) => {
        const sequenceLinksComponent = createSequenceLinksComponent(file.data)

        if (sequenceLinksComponent) {
          insertAfterTroutOrnament(tree, sequenceLinksComponent)
        }
      },
    ],
  }
}
