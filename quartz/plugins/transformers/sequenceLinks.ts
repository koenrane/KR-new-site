import { QuartzTransformerPlugin } from "../types"
import { Root, Element } from "hast"
import { visit } from "unist-util-visit"
import { QuartzPluginData } from "../vfile"
import { h } from "hastscript"
import { TURNTROUT_FAVICON_PATH } from "./linkfavicons"

export const renderSequenceTitle = (fileData: QuartzPluginData) => {
  const sequence = fileData.frontmatter?.["lw-sequence-title"]
  if (!sequence) return null
  const sequenceLink: string = fileData.frontmatter?.["sequence-link"] as string

  return h("div.callout-title-inner", [
    h("b", "Sequence:"),
    " ",
    h("a", { href: sequenceLink, class: "internal" }, sequence as any),
  ])
}

export const renderPreviousPost = (fileData: QuartzPluginData) => {
  const prevPostSlug: string = (fileData.frontmatter?.["prev-post-slug"] as string) || ""
  const prevPostTitle: string = (fileData.frontmatter?.["prev-post-title"] as string) || ""
  if (!prevPostSlug) return null

  const faviconPathPrev = TURNTROUT_FAVICON_PATH

  return h("p", [
    h("b", "Previous"),
    h("br"),
    h("a", { href: prevPostSlug, className: "internal" }, prevPostTitle),
    faviconPathPrev && h("img", { src: faviconPathPrev, className: "favicon", alt: "" }),
  ])
}

export const renderNextPost = (fileData: QuartzPluginData) => {
  const nextPostSlug: string = (fileData.frontmatter?.["next-post-slug"] as string) || ""
  const nextPostTitle: string = (fileData.frontmatter?.["next-post-title"] as string) || ""
  if (!nextPostSlug) return null

  const faviconPathNext = TURNTROUT_FAVICON_PATH

  return h("p", [
    h("b", "Next"),
    h("br"),
    h("a", { href: nextPostSlug, className: "internal" }, nextPostTitle),
    faviconPathNext && h("img", { src: faviconPathNext, className: "favicon", alt: "" }),
  ])
}

export function createSequenceLinksDiv(
  sequenceTitle: Element | null,
  prevPost: Element | null,
  nextPost: Element | null,
): Element {
  const children = [
    prevPost &&
      h(
        "div",
        { className: "prev-post sequenceLinks-postNavigation", style: "text-align: right;" },
        prevPost,
      ),
    prevPost && nextPost && h("div", { className: "sequenceLinks-divider" }),
    nextPost &&
      h(
        "div",
        { className: "next-post sequenceLinks-postNavigation", style: "text-align: left;" },
        nextPost,
      ),
  ].filter(Boolean) as Element[]

  return h("div", { className: "sequence-links" }, [
    h(
      "div",
      { className: "sequence-title", style: "text-align: center;" },
      sequenceTitle ? [sequenceTitle as any] : [],
    ),
    h(
      "div",
      { className: "sequence-nav", style: "display: flex; justify-content: center;" },
      children,
    ),
  ])
}

export function insertAfterTroutOrnament(tree: Root, sequenceLinksDiv: Element): void {
  visit(tree, "element", (node: Element, index, parent: Element | null) => {
    if (
      index !== undefined &&
      node.tagName === "div" &&
      node.properties &&
      node.properties.id === "trout-ornament" &&
      parent
    ) {
      parent.children.splice(index + 1, 0, sequenceLinksDiv)
      return false // Stop traversing
    }
  })
}

export const SequenceLinksTransformer: QuartzTransformerPlugin = () => {
  return {
    name: "SequenceLinksTransformer",
    htmlPlugins: () => [
      () => (tree: Root, file: { data: QuartzPluginData }) => {
        const fileData = file.data
        const sequenceTitle = renderSequenceTitle(fileData)
        const prevPost = renderPreviousPost(fileData)
        const nextPost = renderNextPost(fileData)

        if (!sequenceTitle || (!prevPost && !nextPost)) {
          return // No sequence information to add
        }

        const sequenceLinksDiv = createSequenceLinksDiv(sequenceTitle, prevPost, nextPost)
        insertAfterTroutOrnament(tree, sequenceLinksDiv)
      },
    ],
  }
}
