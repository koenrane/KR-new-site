import { QuartzTransformerPlugin } from "../types"
import { Root, Element } from "hast"
import { visit } from "unist-util-visit"
import { h } from "hastscript"
import { createSequenceLinksComponent } from "./sequenceLinks"

export function createRSSElement(): Element {
  return h("a", { href: "/rss.xml", class: "rss-link" }, [
    h("img", { src: "/static/images/rss.svg", alt: "RSS Feed", class: "rss-icon" }),
    " Subscribe via RSS",
  ])
}

export function insertAfterTroutOrnament(tree: Root, components: Element[]) {
  visit(tree, "element", (node: Element, index, parent: Element | null) => {
    if (
      index !== undefined &&
      node.tagName === "div" &&
      node.properties &&
      node.properties.id === "trout-ornament" &&
      parent
    ) {
      const wrapperDiv = h("div", { class: "after-article-components" }, components)
      parent.children.splice(index + 1, 0, wrapperDiv)
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
        const rssElement = createRSSElement()

        const components = [sequenceLinksComponent, rssElement].filter(Boolean) as Element[]

        if (components.length > 0) {
          insertAfterTroutOrnament(tree, components)
        }
      },
    ],
  }
}
