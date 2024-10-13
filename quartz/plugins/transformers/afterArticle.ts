import { QuartzTransformerPlugin } from "../types"
import { Root, Element } from "hast"
import { visit } from "unist-util-visit"
import { h } from "hastscript"
import { createSequenceLinksComponent } from "./sequenceLinks"
import { CreateFaviconElement } from "./linkfavicons"

export function createRSSElement(): Element {
  return h("a", { href: "/rss.xml", id: "rss-link" }, [
    "Subscribe via RSS",
    h("img", {
      src: "https://assets.turntrout.com/static/images/rss.svg",
      id: "rss-svg",
      alt: "RSS icon",
      className: "inline-img",
    }),
  ])
}

const SUBSTACK_URL =
  "https://assets.turntrout.com/static/images/external-favicons/substack_com.avif"
function createNewsletterElement(): Element {
  return h("a", { href: "https://turntrout.substack.com/subscribe" }, [
    "Sign up for my newsletter",
    CreateFaviconElement(SUBSTACK_URL),
  ])
}

export function createSubscriptionElement(): Element {
  return h("span", { id: "subscription-links" }, [
    h("b", "Find out when I post more content"),
    h("br"),
    createNewsletterElement(),
    "  |  ",
    createRSSElement(),
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
        const subscriptionElement = createSubscriptionElement()

        const components = [sequenceLinksComponent, subscriptionElement].filter(
          Boolean,
        ) as Element[]

        if (components.length > 0) {
          insertAfterTroutOrnament(tree, components)
        }
      },
    ],
  }
}
